<?php

use App\Models\CompanySetting;
use App\Models\Department;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\Position;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $department = Department::factory()->create();
    $this->employeeAttributes = [
        'department_id' => $department->id,
        'position_id' => Position::factory()->create(['department_id' => $department->id])->id,
        'user_id' => User::factory()->role('employee'),
    ];
});

it('searches accounts by login details and linked employee number across pages', function (): void {
    $admin = User::factory()->role('admin')->create();
    User::factory()->count(23)->create(['name' => 'Matching Account']);
    $employee = Employee::factory()->create([...$this->employeeAttributes, 'employee_number' => 'UNIQUE-EMP-0042']);
    $this->actingAs($admin)->get('/admin/users?search=Matching')
        ->assertInertia(fn (Assert $page) => $page->has('users.data', 20)->where('users.total', 23)
            ->where('users.next_page_url', fn ($url) => str_contains($url, 'search=Matching')));
    $this->get('/admin/users?search=UNIQUE-EMP-0042')
        ->assertInertia(fn (Assert $page) => $page->has('users.data', 1)->where('users.data.0.id', $employee->user_id));
    $this->get('/admin/users?search=no-such-account')->assertInertia(fn (Assert $page) => $page->has('users.data', 0));
    $this->get('/admin/users?search[]=invalid')->assertSessionHasErrors('search');
});

it('searches employee full names and keeps existing filters and CSV results aligned', function (): void {
    $employee = Employee::factory()->create([...$this->employeeAttributes, 'first_name' => 'UniqueAma', 'last_name' => 'Mensah', 'status' => 'active']);
    Employee::factory()->create([...$this->employeeAttributes, 'first_name' => 'UniqueAma', 'last_name' => 'Mensah', 'status' => 'suspended']);
    $query = '?search=UniqueAma%20Mensah&status=active';
    $this->actingAs(User::factory()->role('admin')->create())->get('/staff/employees'.$query)
        ->assertInertia(fn (Assert $page) => $page->has('employees.data', 1)->where('employees.data.0.id', $employee->id));
    $csv = $this->get('/staff/employees/export'.$query)->assertOk()->streamedContent();
    expect(substr_count(trim($csv), "\n"))->toBe(1);
});

it('keeps attendance and team search inside a managers direct reports', function (): void {
    $manager = Employee::factory()->create([...$this->employeeAttributes, 'user_id' => User::factory()->role('manager')]);
    $report = Employee::factory()->create([...$this->employeeAttributes, 'manager_id' => $manager->id, 'first_name' => 'UniqueReport']);
    Employee::factory()->create([...$this->employeeAttributes, 'first_name' => 'UniqueReport']);
    $this->actingAs($manager->user)->get('/manager/team?search=UniqueReport')
        ->assertInertia(fn (Assert $page) => $page->has('members.data', 1)->where('members.data.0.id', $report->id));
    $this->get('/manager/attendance?search=UniqueReport&date=2026-09-05')
        ->assertInertia(fn (Assert $page) => $page->has('rows', 1)->where('summary.expected', 1)->where('workDate', '2026-09-05'));
    $this->actingAs(User::factory()->role('admin')->create())->get('/staff/attendance?search=UniqueReport')
        ->assertInertia(fn (Assert $page) => $page->has('rows', 2)->where('summary.expected', 2));
});

it('filters leave requests and balances without exposing other employees', function (): void {
    $employee = Employee::factory()->create([...$this->employeeAttributes, 'first_name' => 'UniqueLeave']);
    $other = Employee::factory()->create([...$this->employeeAttributes, 'first_name' => 'UniqueLeave']);
    $type = LeaveType::factory()->create();
    foreach ([$employee, $other] as $person) {
        LeaveRequest::factory()->create(['employee_id' => $person->id, 'leave_type_id' => $type->id, 'status' => 'pending']);
        LeaveBalance::factory()->create(['employee_id' => $person->id, 'leave_type_id' => $type->id, 'year' => now()->year]);
    }
    $this->actingAs($employee->user)->get('/staff/leave-requests?search=UniqueLeave&status=pending')
        ->assertInertia(fn (Assert $page) => $page->has('leaveRequests.data', 1)->has('balances', 1)
            ->where('leaveRequests.data.0.employee_id', $employee->id));
    $this->get('/staff/leave-requests?search=nobody')->assertInertia(fn (Assert $page) => $page->has('leaveRequests.data', 0)->has('balances', 0));
});

it('filters payroll snapshots and exports by employee while retaining the month', function (): void {
    $item = PayrollItem::factory()->create(['payroll_id' => Payroll::factory(), 'employee_id' => Employee::factory()->state($this->employeeAttributes), 'employee_name' => 'Unique Payroll Person']);
    PayrollItem::factory()->create(['payroll_id' => $item->payroll_id, 'employee_id' => Employee::factory()->state($this->employeeAttributes), 'employee_name' => 'Someone Else']);
    $query = '?month='.$item->payroll->month.'&year='.$item->payroll->year.'&search=Unique';
    $this->actingAs(User::factory()->role('admin')->create())->get('/staff/payroll'.$query)
        ->assertInertia(fn (Assert $page) => $page->has('items', 1)->where('items.0.id', $item->id));
    $csv = $this->get('/staff/payroll/export'.$query)->assertOk()->streamedContent();
    expect($csv)->toContain('Unique Payroll Person')->not->toContain('Someone Else');
});

it('searches leave types', function (): void {
    LeaveType::factory()->create(['name' => 'Special Sabbatical']);
    LeaveType::factory()->create(['name' => 'Annual']);
    $this->actingAs(User::factory()->role('hr')->create())->get('/staff/leave-types?search=Sabbatical')
        ->assertInertia(fn (Assert $page) => $page->has('leaveTypes', 1)->where('leaveTypes.0.name', 'Special Sabbatical'));
});

it('saves one company profile and shares updated branding and printable details', function (): void {
    $data = ['name' => 'Acme People', 'tagline' => 'Our Team', 'email' => 'office@acme.test', 'phone' => '+233 123456',
        'website' => 'https://acme.test', 'address' => "10 Main Street\nAccra", 'registration_number' => 'REG-123'];
    $admin = User::factory()->role('admin')->create();
    $this->actingAs($admin)->put('/admin/company', $data)->assertSessionHasNoErrors()->assertRedirect('/admin/company');
    $this->put('/admin/company', [...$data, 'name' => 'Acme Updated'])->assertSessionHasNoErrors();
    expect(CompanySetting::count())->toBe(1)->and(CompanySetting::current()->name)->toBe('Acme Updated');
    $this->get('/admin/company')->assertInertia(fn (Assert $page) => $page->where('company.name', 'Acme Updated')->where('settings.email', 'office@acme.test'));
    $item = PayrollItem::factory()->create(['payroll_id' => Payroll::factory(), 'employee_id' => Employee::factory()->state($this->employeeAttributes)]);
    $this->get('/staff/payroll-items/'.$item->id.'/payslip')->assertSee('Acme Updated')->assertSee('REG-123')->assertSee('office@acme.test');
    $this->post('/logout');
    $this->get('/login')->assertInertia(fn (Assert $page) => $page->where('company.name', 'Acme Updated')->missing('company.registration_number'));
});

it('rejects invalid company details without changing saved settings', function (): void {
    $this->actingAs(User::factory()->role('admin')->create())->put('/admin/company', ['name' => '', 'email' => 'bad', 'website' => 'javascript:alert(1)'])
        ->assertSessionHasErrors(['name', 'email', 'website']);
    expect(CompanySetting::count())->toBe(0);
});

it('protects company settings from every non administrator role', function (string $role): void {
    $this->actingAs(User::factory()->role($role)->create());
    $this->get('/admin/company')->assertForbidden();
    $this->put('/admin/company', ['name' => 'Unauthorized'])->assertForbidden();
})->with(['hr', 'manager', 'employee']);

it('handles an installation awaiting its settings migration', function (): void {
    Schema::drop('company_settings');
    $this->get('/login')->assertInertia(fn (Assert $page) => $page->where('company.name', 'PeopleHQ'));
    $this->actingAs(User::factory()->role('admin')->create())->get('/admin/company')
        ->assertInertia(fn (Assert $page) => $page->where('ready', false));
    $this->put('/admin/company', ['name' => 'Not yet'])->assertSessionHas('error');
});
