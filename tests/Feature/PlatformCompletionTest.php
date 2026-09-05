<?php

use App\Models\Department;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\Position;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('redirects guests without exposing dashboard or HR data', function (string $path): void {
    $this->get($path)->assertRedirect('/login');
})->with(['/', '/staff/employees', '/staff/leave-requests', '/staff/attendance', '/admin/users', '/self-service/profile']);

it('authenticates credentials and invalidates the session on logout', function (): void {
    $user = User::factory()->create(['password' => 'correct-password']);
    $this->get('/login')->assertOk()->assertInertia(fn (Assert $page) => $page->component('Auth/Login'));
    $this->post('/login', ['email' => $user->email, 'password' => 'wrong'])->assertSessionHasErrors('email');
    $this->assertGuest();
    $this->post('/login', ['email' => $user->email, 'password' => 'correct-password'])->assertRedirect('/');
    $this->assertAuthenticatedAs($user);
    $this->post('/logout')->assertRedirect('/login');
    $this->assertGuest();
});

it('throttles repeated login attempts', function (): void {
    for ($i = 0; $i < 6; $i++) {
        $this->post('/login', ['email' => 'missing@example.test', 'password' => 'wrong']);
    }
    $this->post('/login', ['email' => 'missing@example.test', 'password' => 'wrong'])->assertStatus(429);
});

it('enforces every page role boundary', function (string $role): void {
    $this->actingAs(User::factory()->role($role)->create());
    $pages = [
        '/' => ['admin', 'hr', 'manager', 'employee'],
        '/organization/departments' => ['admin', 'hr'],
        '/organization/positions' => ['admin', 'hr'],
        '/staff/employees' => ['admin', 'hr'],
        '/staff/leave-types' => ['admin', 'hr'],
        '/staff/leave-requests' => ['admin', 'hr', 'manager', 'employee'],
        '/staff/attendance' => ['admin', 'hr'],
        '/staff/payroll' => ['admin', 'hr'],
        '/staff/employees/export' => ['admin', 'hr'],
        '/staff/payroll/export?month=9&year=2026' => ['admin', 'hr'],
        '/admin/users' => ['admin'],
        '/manager/team' => ['manager'],
        '/manager/attendance' => ['manager'],
        '/self-service/profile' => ['admin', 'hr', 'manager', 'employee'],
        '/self-service/attendance' => ['admin', 'hr', 'manager', 'employee'],
    ];
    foreach ($pages as $path => $allowed) {
        $this->get($path)->assertStatus(in_array($role, $allowed, true) ? 200 : 403);
    }
})->with(['admin', 'hr', 'manager', 'employee']);

it('keeps company dashboard data out of personal home props', function (string $role): void {
    $this->actingAs(User::factory()->role($role)->create())->get('/')
        ->assertInertia(fn (Assert $page) => $page->component('SelfService/Home')->missing('pendingRequests')->missing('recentHires')->missing('kpis'));
})->with(['employee', 'manager']);

it('lets employees request leave only for themselves and never approve it', function (): void {
    $employee = completionEmployee();
    $other = completionEmployee();
    $type = LeaveType::factory()->create(['is_active' => true]);
    $payload = ['employee_id' => $employee->id, 'leave_type_id' => $type->id, 'start_date' => '2026-09-10', 'end_date' => '2026-09-12', 'reason' => 'Family time', 'requested_days' => 99, 'status' => 'approved'];
    $this->actingAs($employee->user)->post('/staff/leave-requests', $payload)->assertSessionHasNoErrors()->assertRedirect();
    $leave = LeaveRequest::firstOrFail();
    expect($leave->employee_id)->toBe($employee->id)->and($leave->status)->toBe('pending')->and($leave->requested_days)->toBe('3.00');
    $this->post('/staff/leave-requests', [...$payload, 'employee_id' => $other->id])->assertForbidden();
    $this->patch("/staff/leave-requests/{$leave->id}/approve")->assertForbidden();
    $this->get('/staff/leave-requests')->assertInertia(fn (Assert $page) => $page->has('employees', 1)->where('employees.0.id', $employee->id)->has('leaveRequests.data', 1));
});

it('scopes manager leave listings and submissions to their team', function (): void {
    $manager = completionEmployee('manager');
    $report = completionEmployee(managerId: $manager->id);
    $other = completionEmployee();
    $type = LeaveType::factory()->create(['is_active' => true]);
    foreach ([$report, $other] as $employee) {
        LeaveRequest::factory()->create(['employee_id' => $employee->id, 'leave_type_id' => $type->id]);
    }
    $this->actingAs($manager->user)->get('/staff/leave-requests')->assertInertia(fn (Assert $page) => $page->has('leaveRequests.data', 1)->where('leaveRequests.data.0.employee_id', $report->id));
    $this->post('/staff/leave-requests', ['employee_id' => $other->id, 'leave_type_id' => $type->id, 'start_date' => '2026-09-10', 'end_date' => '2026-09-12', 'reason' => 'Test'])->assertForbidden();
});

it('shows all employees to HR attendance and only reports to a manager', function (): void {
    $manager = completionEmployee('manager');
    $report = completionEmployee(managerId: $manager->id);
    completionEmployee();
    $this->actingAs(User::factory()->role('hr')->create())->get('/staff/attendance')
        ->assertInertia(fn (Assert $page) => $page->where('companyWide', true)->has('rows', 3));
    $this->actingAs($manager->user)->get('/manager/attendance')
        ->assertInertia(fn (Assert $page) => $page->where('companyWide', false)->has('rows', 1)->where('rows.0.employee_id', $report->id));
});

it('shows only the current employee profile and safe team directory data', function (): void {
    $manager = completionEmployee('manager');
    $employee = completionEmployee(managerId: $manager->id);
    $this->actingAs($employee->user)->get('/self-service/profile')->assertInertia(fn (Assert $page) => $page->component('SelfService/Profile')->where('employee.id', $employee->id));
    $this->actingAs($manager->user)->get('/manager/team')->assertInertia(fn (Assert $page) => $page->component('Manager/Team')->has('members.data', 1)->where('members.data.0.id', $employee->id)->missing('members.data.0.basic_salary')->missing('members.data.0.bank_account_number'));
});

it('creates and edits accounts while protecting the current administrator', function (): void {
    $admin = User::factory()->role('admin')->create();
    $data = ['name' => 'New User', 'email' => 'new@example.test', 'role' => 'employee', 'password' => 'long-password-123', 'password_confirmation' => 'long-password-123'];
    $this->actingAs($admin)->post('/admin/users', $data)->assertSessionHasNoErrors();
    $user = User::where('email', $data['email'])->firstOrFail();
    expect(Hash::check($data['password'], $user->password))->toBeTrue();
    $this->patch("/admin/users/{$user->id}", [...$data, 'role' => 'hr', 'password' => '', 'password_confirmation' => ''])->assertSessionHasNoErrors();
    expect($user->fresh()->role)->toBe('hr')->and(Hash::check($data['password'], $user->fresh()->password))->toBeTrue();
    $this->patch("/admin/users/{$admin->id}", ['name' => $admin->name, 'email' => $admin->email, 'role' => 'employee'])->assertSessionHasErrors('role');
    $this->delete("/admin/users/{$admin->id}")->assertSessionHas('error');
    expect($admin->fresh())->not->toBeNull();
    $this->delete("/admin/users/{$user->id}")->assertRedirect();
    expect($user->fresh())->toBeNull();
});

it('rejects unauthorized account and organization mutations', function (string $role): void {
    $this->actingAs(User::factory()->role($role)->create());
    $this->post('/admin/users', [])->assertForbidden();
    if ($role !== 'hr') {
        $this->post('/organization/departments', [])->assertForbidden();
        $this->post('/organization/positions', [])->assertForbidden();
        $this->post('/staff/payroll/run', [])->assertForbidden();
    }
})->with(['hr', 'manager', 'employee']);

it('rejects a position from another department on create and update', function (): void {
    $employee = completionEmployee();
    $other = completionEmployee();
    $payload = completionPayload($employee->department, $other->position);
    $this->actingAs(User::factory()->role('hr')->create())->post('/staff/employees', $payload)->assertSessionHasErrors('position_id');
    $this->patch("/staff/employees/{$employee->id}", $payload)->assertSessionHasErrors('position_id');
    expect($employee->fresh()->position_id)->toBe($employee->position_id);
});

it('streams every row across chunk boundaries with correct CSV quoting', function (): void {
    $employee = completionEmployee();
    Employee::factory()->count(204)->create(['department_id' => $employee->department_id, 'position_id' => $employee->position_id, 'user_id' => null]);
    $employee->update(['first_name' => 'Ama, "A"', 'middle_name' => null, 'last_name' => 'Mensah']);
    $response = $this->actingAs(User::factory()->role('hr')->create())->get('/staff/employees/export')->assertOk();
    $rows = array_map(fn ($line) => str_getcsv($line, ',', '"', ''), explode("\n", trim($response->streamedContent())));
    expect($rows)->toHaveCount(206);
    $row = collect($rows)->first(fn ($row) => $row[0] === $employee->employee_number);
    expect($row[1])->toBe('Ama, "A" Mensah');
});

it('rolls back approval if updating the balance fails', function (): void {
    $employee = completionEmployee();
    $type = LeaveType::factory()->create();
    $leave = LeaveRequest::factory()->create([
        'employee_id' => $employee->id, 'leave_type_id' => $type->id,
        'start_date' => '2026-10-10', 'end_date' => '2026-10-12', 'status' => 'pending',
    ]);
    $balance = LeaveBalance::create([
        'employee_id' => $employee->id, 'leave_type_id' => $type->id, 'year' => 2026,
        'entitled_days' => 20, 'used_days' => 0, 'adjusted_days' => 0,
    ]);
    LeaveBalance::updating(fn () => throw new RuntimeException('Simulated balance failure'));
    $this->withoutExceptionHandling()->actingAs(User::factory()->role('hr')->create());
    try {
        expect(fn () => $this->patch("/staff/leave-requests/{$leave->id}/approve"))->toThrow(RuntimeException::class, 'Simulated balance failure');
    } finally {
        LeaveBalance::flushEventListeners();
    }
    expect($leave->fresh()->status)->toBe('pending')->and($balance->fresh()->used_days)->toBe('0.00');
});

function completionEmployee(string $role = 'employee', ?int $managerId = null): Employee
{
    $user = User::factory()->role($role)->create();
    $department = Department::factory()->create();
    $position = Position::factory()->create(['department_id' => $department->id]);

    return Employee::factory()->create([
        'user_id' => $user->id,
        'department_id' => $department->id,
        'position_id' => $position->id,
        'manager_id' => $managerId,
    ]);
}

function completionPayload(Department $department, Position $position): array
{
    return [
        'department_id' => $department->id,
        'position_id' => $position->id,
        'employee_number' => 'PHQ-COMPLETION',
        'first_name' => 'Test',
        'last_name' => 'Employee',
        'hire_date' => '2024-01-15',
        'employment_type' => 'full_time',
        'status' => 'active',
        'basic_salary' => 5000,
        'currency' => 'GHS',
    ];
}
