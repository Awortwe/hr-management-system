<?php

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
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

afterEach(function (): void {
    Carbon::setTestNow();
});

it('loads the platform launch pages for the right roles', function (): void {
    Carbon::setTestNow('2026-09-05 10:00:00');

    $admin = capstoneActor('admin');
    $hr = capstoneActor('hr');
    $manager = capstoneActor('manager');
    $employee = capstoneActor('employee', managerId: $manager->id);

    LeaveType::factory()->create(['name' => 'Annual Leave']);

    $this->actingAs($admin->user)->get(route('dashboard'))->assertOk();
    $this->actingAs($hr->user)->get(route('organization.departments.index'))->assertOk();
    $this->actingAs($hr->user)->get(route('organization.positions.index'))->assertOk();
    $this->actingAs($hr->user)->get(route('staff.employees.index'))->assertOk();
    $this->actingAs($hr->user)->get(route('staff.leave-types.index'))->assertOk();
    $this->actingAs($manager->user)->get(route('staff.leave-requests.index'))->assertOk();
    $this->actingAs($manager->user)->get(route('manager.attendance.index'))->assertOk();
    $this->actingAs($employee->user)->get(route('self-service.attendance.index'))->assertOk();
});

it('holds the role boundaries across staff, manager, and admin areas', function (): void {
    $hr = capstoneActor('hr');
    $manager = capstoneActor('manager');
    $employee = capstoneActor('employee', managerId: $manager->id);

    $this->actingAs($employee->user)->get(route('staff.employees.index'))->assertForbidden();
    $this->actingAs($employee->user)->get(route('organization.departments.index'))->assertForbidden();
    $this->actingAs($employee->user)->get(route('manager.attendance.index'))->assertForbidden();
    $this->actingAs($manager->user)->get(route('staff.payroll.index'))->assertForbidden();
    $this->actingAs($hr->user)->get(route('admin.users.index'))->assertForbidden();
});

it('streams employee and payroll csv exports from the reusable helper', function (): void {
    $hr = capstoneActor('hr');
    $employee = capstoneActor('employee', [
        'employee_number' => 'PHQ-9001',
        'first_name' => 'Ama',
        'middle_name' => null,
        'last_name' => 'Mensah',
        'work_email' => 'ama@example.test',
    ]);
    $payroll = Payroll::factory()->create([
        'month' => 9,
        'year' => 2026,
    ]);
    PayrollItem::factory()->create([
        'payroll_id' => $payroll->id,
        'employee_id' => $employee->id,
        'employee_number' => $employee->employee_number,
        'employee_name' => $employee->full_name,
        'basic_salary' => 5000,
        'allowances_total' => 600,
        'gross_pay' => 5600,
        'deductions_total' => 784,
        'net_pay' => 4816,
        'snapshot' => ['currency' => 'GHS'],
    ]);

    $employeeExport = $this->actingAs($hr->user)->get(route('staff.employees.export'));
    $payrollExport = $this->actingAs($hr->user)->get(route('staff.payroll.export', [
        'month' => 9,
        'year' => 2026,
    ]));

    $employeeExport->assertOk();
    $payrollExport->assertOk();

    $employeeCsv = $employeeExport->streamedContent();
    $payrollCsv = $payrollExport->streamedContent();

    foreach ([$employeeCsv, $payrollCsv] as $csv) {
        $rows = array_map(fn (string $line): array => str_getcsv($line, ',', '"', ''), explode("\n", trim($csv)));
        expect(array_slice($rows[0], 0, 3))->toBe(['Employee Number', 'Name', 'Department']);
        $employeeRow = collect($rows)->first(fn (array $row): bool => $row[0] === 'PHQ-9001');
        expect($employeeRow[1])->toBe('Ama Mensah');
    }
});

it('proves the full approval workflow updates balances only once', function (): void {
    Carbon::setTestNow('2026-09-05 10:00:00');

    $manager = capstoneActor('manager');
    $employee = capstoneActor('employee', managerId: $manager->id);
    $leaveType = LeaveType::factory()->create([
        'name' => 'Annual Leave',
        'annual_allowance_days' => 20,
    ]);
    $request = LeaveRequest::factory()->create([
        'employee_id' => $employee->id,
        'leave_type_id' => $leaveType->id,
        'start_date' => '2026-09-10',
        'end_date' => '2026-09-12',
        'requested_days' => 99,
        'status' => 'pending',
    ]);

    $this->actingAs($manager->user)
        ->patch(route('staff.leave-requests.approve', $request), [
            'decision_comment' => 'Approved.',
        ])
        ->assertRedirect();

    $this->actingAs($manager->user)
        ->patch(route('staff.leave-requests.approve', $request), [
            'decision_comment' => 'Double click.',
        ])
        ->assertRedirect();

    $balance = LeaveBalance::query()
        ->where('employee_id', $employee->id)
        ->where('leave_type_id', $leaveType->id)
        ->where('year', 2026)
        ->firstOrFail();

    expect($request->fresh()->status)->toBe('approved')
        ->and($request->fresh()->requested_days)->toBe('3.00')
        ->and($balance->used_days)->toBe('3.00')
        ->and($balance->remaining_days)->toBe(17.0);
});

function capstoneActor(string $role, array $employeeAttributes = [], ?int $managerId = null): Employee
{
    $user = User::factory()->role($role)->create();
    $department = Department::factory()->create();
    $position = Position::factory()->create([
        'department_id' => $department->id,
    ]);

    return Employee::factory()->create([
        'user_id' => $user->id,
        'department_id' => $department->id,
        'position_id' => $position->id,
        'manager_id' => $managerId,
        ...$employeeAttributes,
    ]);
}
