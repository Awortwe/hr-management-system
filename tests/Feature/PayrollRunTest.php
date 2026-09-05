<?php

use App\Models\Department;
use App\Models\Employee;
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

it('runs monthly payroll for active employees and safely skips existing payslips', function (): void {
    Carbon::setTestNow('2026-09-05 12:00:00');

    $hr = User::factory()->role('hr')->create();
    $activeEmployee = payrollEmployee([
        'employee_number' => 'PHQ-1001',
        'first_name' => 'Ama',
        'last_name' => 'Mensah',
        'basic_salary' => 5000,
        'currency' => 'GHS',
        'status' => 'active',
    ]);
    payrollEmployee([
        'employee_number' => 'PHQ-1002',
        'status' => 'terminated',
    ]);

    $this->actingAs($hr)
        ->post(route('staff.payroll.run'), [
            'month' => 9,
            'year' => 2026,
        ])
        ->assertRedirect()
        ->assertSessionHas('success', 'Payroll run complete. 1 payslips generated, 0 already paid.');

    $this->actingAs($hr)
        ->post(route('staff.payroll.run'), [
            'month' => 9,
            'year' => 2026,
        ])
        ->assertRedirect()
        ->assertSessionHas('success', 'Payroll run complete. 0 payslips generated, 1 already paid.');

    $payroll = Payroll::query()->where('month', 9)->where('year', 2026)->firstOrFail();
    $item = PayrollItem::query()->where('employee_id', $activeEmployee->id)->firstOrFail();

    expect(Payroll::query()->count())->toBe(1)
        ->and(PayrollItem::query()->count())->toBe(1)
        ->and($item->gross_pay)->toBe('5600.00')
        ->and($item->deductions_total)->toBe('784.00')
        ->and($item->net_pay)->toBe('4816.00')
        ->and($payroll->gross_total)->toBe('5600.00')
        ->and($payroll->deduction_total)->toBe('784.00')
        ->and($payroll->net_total)->toBe('4816.00');
});

it('renders payroll items in inertia and opens a blade payslip document', function (): void {
    $hr = User::factory()->role('hr')->create();
    $employee = payrollEmployee([
        'employee_number' => 'PHQ-2001',
        'first_name' => 'Kojo',
        'last_name' => 'Owusu',
    ]);
    $payroll = Payroll::factory()->create([
        'month' => 8,
        'year' => 2026,
        'gross_total' => 5600,
        'deduction_total' => 784,
        'net_total' => 4816,
    ]);
    $item = PayrollItem::factory()->create([
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

    $response = $this->actingAs($hr)->get(route('staff.payroll.index', [
        'month' => 8,
        'year' => 2026,
    ]));
    $page = $response->getOriginalContent()->getData()['page'];

    $response->assertOk();
    expect($page['props']['items'])->toHaveCount(1)
        ->and($page['props']['items'][0]['id'])->toBe($item->id);

    $this->actingAs($hr)
        ->get(route('staff.payroll-items.payslip', $item))
        ->assertOk()
        ->assertSee('Employee Payslip')
        ->assertSee('Kojo Owusu')
        ->assertSee('@media print', false);
});

function payrollEmployee(array $attributes = []): Employee
{
    $department = Department::factory()->create();
    $position = Position::factory()->create([
        'department_id' => $department->id,
    ]);

    return Employee::factory()->create([
        'department_id' => $department->id,
        'position_id' => $position->id,
        'status' => 'active',
        ...$attributes,
    ]);
}
