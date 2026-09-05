<?php

use App\Models\Department;
use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\Position;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->actingAs(User::factory()->role('admin')->create());
});

afterEach(function (): void {
    Carbon::setTestNow();
});

it('renders dashboard aggregates from small focused queries', function (): void {
    Carbon::setTestNow('2026-09-05 10:00:00');

    $engineering = Department::factory()->create([
        'name' => 'Engineering',
        'code' => 'ENG',
    ]);
    $finance = Department::factory()->create([
        'name' => 'Finance',
        'code' => 'FIN',
    ]);
    $engineeringPosition = Position::factory()->create([
        'department_id' => $engineering->id,
        'title' => 'Software Engineer',
    ]);
    $financePosition = Position::factory()->create([
        'department_id' => $finance->id,
        'title' => 'Accountant',
    ]);
    $leaveType = LeaveType::factory()->create([
        'name' => 'Annual Leave',
    ]);

    $firstEmployee = dashboardEmployee($engineering, $engineeringPosition, [
        'first_name' => 'Ama',
        'last_name' => 'Mensah',
        'employee_number' => 'PHQ-1001',
        'hire_date' => '2026-09-01',
        'status' => 'active',
    ]);
    dashboardEmployee($engineering, $engineeringPosition, [
        'hire_date' => '2026-08-20',
        'status' => 'probation',
    ]);
    dashboardEmployee($finance, $financePosition, [
        'hire_date' => '2026-09-03',
        'status' => 'active',
    ]);

    LeaveRequest::factory()->create([
        'employee_id' => $firstEmployee->id,
        'leave_type_id' => $leaveType->id,
        'start_date' => '2026-09-05',
        'end_date' => '2026-09-06',
        'requested_days' => 2,
        'status' => 'approved',
    ]);
    LeaveRequest::factory()->create([
        'employee_id' => $firstEmployee->id,
        'leave_type_id' => $leaveType->id,
        'start_date' => '2026-09-10',
        'end_date' => '2026-09-12',
        'requested_days' => 3,
        'status' => 'pending',
    ]);

    $response = $this->get(route('dashboard'));
    $page = $response->getOriginalContent()->getData()['page'];

    $response->assertOk();
    expect($page['component'])->toBe('Dashboard')
        ->and($page['props']['kpis'][0])->toMatchArray([
            'label' => 'Headcount',
            'value' => 3,
            'detail' => '2 active employees',
        ])
        ->and($page['props']['kpis'][2]['value'])->toBe(2)
        ->and($page['props']['kpis'][3]['value'])->toBe(1)
        ->and($page['props']['kpis'][4]['value'])->toBe(1)
        ->and($page['props']['statusTotals'])->toMatchArray([
            'active' => 2,
            'probation' => 1,
        ])
        ->and($page['props']['pendingRequests'])->toHaveCount(1)
        ->and($page['props']['recentHires'])->toHaveCount(3);
});

it('ranks departments by headcount and computes proportional bar widths', function (): void {
    $engineering = Department::factory()->create([
        'name' => 'Engineering',
        'code' => 'ENG',
    ]);
    $finance = Department::factory()->create([
        'name' => 'Finance',
        'code' => 'FIN',
    ]);
    $engineeringPosition = Position::factory()->create([
        'department_id' => $engineering->id,
    ]);
    $financePosition = Position::factory()->create([
        'department_id' => $finance->id,
    ]);

    dashboardEmployee($engineering, $engineeringPosition);
    dashboardEmployee($engineering, $engineeringPosition);
    dashboardEmployee($finance, $financePosition);

    $response = $this->get(route('dashboard'));
    $departments = $response->getOriginalContent()->getData()['page']['props']['departments'];

    expect($departments[0])->toMatchArray([
        'name' => 'Engineering',
        'employees_count' => 2,
        'percentage' => 100,
    ])
        ->and($departments[1])->toMatchArray([
            'name' => 'Finance',
            'employees_count' => 1,
            'percentage' => 50,
        ]);
});

function dashboardEmployee(Department $department, Position $position, array $attributes = []): Employee
{
    return Employee::factory()->create([
        'department_id' => $department->id,
        'position_id' => $position->id,
        ...$attributes,
    ]);
}
