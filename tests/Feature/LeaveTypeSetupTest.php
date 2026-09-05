<?php

use App\Models\Department;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use App\Models\Position;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

it('renders leave types as a short unpaginated list', function (): void {
    $hr = User::factory()->create([
        'role' => 'hr',
    ]);

    LeaveType::factory()->create([
        'name' => 'Annual Leave',
        'is_paid' => true,
    ]);
    LeaveType::factory()->create([
        'name' => 'Unpaid Leave',
        'annual_allowance_days' => 0,
        'is_paid' => false,
    ]);

    $response = $this->actingAs($hr)->get(route('staff.leave-types.index'));
    $page = $response->getOriginalContent()->getData()['page'];

    $response->assertOk();
    expect($page['props']['leaveTypes'])->toHaveCount(2)
        ->and($page['props']['leaveTypes'])->not->toHaveKey('links');
});

it('keeps checkbox booleans as real booleans through validation and casts', function (): void {
    $hr = User::factory()->create([
        'role' => 'hr',
    ]);

    $this->actingAs($hr)
        ->post(route('staff.leave-types.store'), [
            'name' => 'Unpaid Leave',
            'annual_allowance_days' => 0,
            'is_paid' => false,
            'color' => '#71717a',
            'is_active' => true,
        ])
        ->assertRedirect();

    $leaveType = LeaveType::query()->where('name', 'Unpaid Leave')->firstOrFail();

    expect($leaveType->is_paid)->toBeFalse()
        ->and($leaveType->is_active)->toBeTrue();
});

it('derives remaining leave days and enforces one balance per employee type and year', function (): void {
    $department = Department::factory()->create();
    $position = Position::factory()->create([
        'department_id' => $department->id,
    ]);
    $employee = Employee::factory()->create([
        'department_id' => $department->id,
        'position_id' => $position->id,
    ]);
    $leaveType = LeaveType::factory()->create();

    $balance = LeaveBalance::factory()->create([
        'employee_id' => $employee->id,
        'leave_type_id' => $leaveType->id,
        'year' => 2026,
        'entitled_days' => 20,
        'used_days' => 7.5,
        'adjusted_days' => 2,
    ]);

    expect(Schema::hasColumn('leave_balances', 'remaining_days'))->toBeFalse()
        ->and($balance->remaining_days)->toBe(14.5);

    expect(fn (): LeaveBalance => LeaveBalance::factory()->create([
        'employee_id' => $employee->id,
        'leave_type_id' => $leaveType->id,
        'year' => 2026,
    ]))->toThrow(QueryException::class);
});
