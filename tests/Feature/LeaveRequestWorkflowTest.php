<?php

use App\Models\Department;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\Position;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('calculates requested leave days on the server when creating a request', function (): void {
    $hr = User::factory()->create([
        'role' => 'hr',
    ]);
    [$employee, $leaveType] = leaveWorkflowEmployeeAndType();

    $this->actingAs($hr)
        ->post(route('staff.leave-requests.store'), [
            'employee_id' => $employee->id,
            'leave_type_id' => $leaveType->id,
            'start_date' => '2026-04-10',
            'end_date' => '2026-04-12',
            'requested_days' => 99,
            'reason' => 'Family event.',
        ])
        ->assertRedirect();

    $leaveRequest = LeaveRequest::query()->firstOrFail();

    expect($leaveRequest->requested_days)->toBe('3.00')
        ->and($leaveRequest->status)->toBe('pending');
});

it('approves idempotently and deducts the balance only once', function (): void {
    $hrEmployee = leaveWorkflowActor('hr');
    [$employee, $leaveType] = leaveWorkflowEmployeeAndType();
    $leaveRequest = LeaveRequest::factory()->create([
        'employee_id' => $employee->id,
        'leave_type_id' => $leaveType->id,
        'start_date' => '2026-06-01',
        'end_date' => '2026-06-03',
        'requested_days' => 99,
        'status' => 'pending',
    ]);

    $this->actingAs($hrEmployee->user)
        ->patch(route('staff.leave-requests.approve', $leaveRequest), [
            'decision_comment' => 'Enjoy the break.',
        ])
        ->assertRedirect();

    $this->actingAs($hrEmployee->user)
        ->patch(route('staff.leave-requests.approve', $leaveRequest), [
            'decision_comment' => 'Double click.',
        ])
        ->assertRedirect();

    $leaveRequest->refresh();
    $balance = LeaveBalance::query()
        ->where('employee_id', $employee->id)
        ->where('leave_type_id', $leaveType->id)
        ->where('year', 2026)
        ->firstOrFail();

    expect($leaveRequest->status)->toBe('approved')
        ->and($leaveRequest->requested_days)->toBe('3.00')
        ->and($leaveRequest->approver_id)->toBe($hrEmployee->id)
        ->and($balance->used_days)->toBe('3.00')
        ->and($balance->remaining_days)->toBe(17.0);
});

it('lets a manager approve only direct report requests', function (): void {
    $manager = leaveWorkflowActor('manager');
    [$employee, $leaveType] = leaveWorkflowEmployeeAndType([
        'manager_id' => $manager->id,
    ]);
    $directReportRequest = LeaveRequest::factory()->create([
        'employee_id' => $employee->id,
        'leave_type_id' => $leaveType->id,
        'start_date' => '2026-07-01',
        'end_date' => '2026-07-01',
        'status' => 'pending',
    ]);
    [$otherEmployee] = leaveWorkflowEmployeeAndType();
    $otherRequest = LeaveRequest::factory()->create([
        'employee_id' => $otherEmployee->id,
        'leave_type_id' => $leaveType->id,
        'start_date' => '2026-07-02',
        'end_date' => '2026-07-02',
        'status' => 'pending',
    ]);

    $this->actingAs($manager->user)
        ->patch(route('staff.leave-requests.approve', $directReportRequest))
        ->assertRedirect();

    $this->actingAs($manager->user)
        ->patch(route('staff.leave-requests.approve', $otherRequest))
        ->assertForbidden();
});

it('rejects pending requests without changing leave balances', function (): void {
    $hrEmployee = leaveWorkflowActor('hr');
    [$employee, $leaveType] = leaveWorkflowEmployeeAndType();
    $leaveRequest = LeaveRequest::factory()->create([
        'employee_id' => $employee->id,
        'leave_type_id' => $leaveType->id,
        'start_date' => '2026-08-04',
        'end_date' => '2026-08-06',
        'status' => 'pending',
    ]);

    $this->actingAs($hrEmployee->user)
        ->patch(route('staff.leave-requests.reject', $leaveRequest), [
            'decision_comment' => 'Coverage is too thin that week.',
        ])
        ->assertRedirect();

    expect($leaveRequest->fresh()->status)->toBe('rejected')
        ->and(LeaveBalance::query()->where('employee_id', $employee->id)->exists())->toBeFalse();
});

function leaveWorkflowActor(string $role): Employee
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
    ]);
}

function leaveWorkflowEmployeeAndType(array $employeeAttributes = []): array
{
    $department = Department::factory()->create();
    $position = Position::factory()->create([
        'department_id' => $department->id,
    ]);
    $employee = Employee::factory()->create([
        'department_id' => $department->id,
        'position_id' => $position->id,
        ...$employeeAttributes,
    ]);
    $leaveType = LeaveType::factory()->create([
        'name' => fake()->unique()->words(2, true),
        'annual_allowance_days' => 20,
    ]);

    return [$employee, $leaveType];
}
