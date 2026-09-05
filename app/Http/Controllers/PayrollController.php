<?php

namespace App\Http\Controllers;

use App\Models\CompanySetting;
use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Support\CsvExporter;
use App\Support\EmployeeSearch;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PayrollController extends Controller
{
    public function index(Request $request): Response
    {
        $search = EmployeeSearch::term($request);
        $filters = $request->validate([
            'month' => ['nullable', 'integer', 'between:1,12'],
            'year' => ['nullable', 'integer', 'between:2000,2100'],
        ]);
        $month = (int) ($filters['month'] ?? now()->month);
        $year = (int) ($filters['year'] ?? now()->year);
        $payroll = Payroll::query()
            ->withCount('items')
            ->where('month', $month)
            ->where('year', $year)
            ->first();

        return Inertia::render('Staff/Payroll/Index', [
            'filters' => [
                'search' => $search,
                'month' => $month,
                'year' => $year,
            ],
            'payroll' => $payroll ? $this->payrollRow($payroll) : null,
            'items' => $payroll
                ? $payroll->items()
                    ->where(fn ($query) => EmployeeSearch::apply($query, $search, ['employee_name', 'employee_number', 'department_name', 'position_title']))
                    ->orderBy('employee_name')
                    ->get()
                    ->map(fn (PayrollItem $item): array => $this->payrollItemRow($item))
                : [],
            'activeEmployeeCount' => Employee::query()->where('status', 'active')->count(),
            'months' => collect(range(1, 12))->map(fn (int $month): array => [
                'value' => $month,
                'label' => now()->month($month)->format('F'),
            ]),
            'years' => range(now()->year - 2, now()->year + 1),
        ]);
    }

    public function run(Request $request): RedirectResponse
    {
        $attributes = $request->validate([
            'month' => ['required', 'integer', 'between:1,12'],
            'year' => ['required', 'integer', 'between:2000,2100'],
        ]);
        $created = 0;
        $skipped = 0;

        DB::transaction(function () use ($attributes, &$created, &$skipped, $request): void {
            $payroll = Payroll::query()->firstOrCreate(
                [
                    'month' => $attributes['month'],
                    'year' => $attributes['year'],
                ],
                [
                    'status' => 'finalized',
                    'created_by' => $request->user()->id,
                    'finalized_by' => $request->user()->id,
                    'finalized_at' => now(),
                ],
            );

            Employee::query()
                ->with(['department:id,name', 'position:id,title', 'user:id,role'])
                ->where('status', 'active')
                ->orderBy('first_name')
                ->get()
                ->each(function (Employee $employee) use ($payroll, &$created, &$skipped): void {
                    $basicSalary = (float) $employee->basic_salary;
                    $allowances = round($basicSalary * 0.12, 2);
                    $grossPay = round($basicSalary + $allowances, 2);
                    $deductions = round($grossPay * 0.14, 2);
                    $netPay = round($grossPay - $deductions, 2);

                    $item = PayrollItem::query()->firstOrCreate(
                        [
                            'payroll_id' => $payroll->id,
                            'employee_id' => $employee->id,
                        ],
                        [
                            'employee_number' => $employee->employee_number,
                            'employee_name' => $employee->full_name,
                            'department_name' => $employee->department?->name,
                            'position_title' => $employee->position?->title,
                            'basic_salary' => $basicSalary,
                            'allowances_total' => $allowances,
                            'gross_pay' => $grossPay,
                            'deductions_total' => $deductions,
                            'net_pay' => $netPay,
                            'snapshot' => [
                                'currency' => $employee->currency,
                                'role' => $employee->user?->role,
                                'department_id' => $employee->department_id,
                                'position_id' => $employee->position_id,
                                'month' => $payroll->month,
                                'year' => $payroll->year,
                            ],
                        ],
                    );

                    $item->wasRecentlyCreated ? $created++ : $skipped++;
                });

            $totals = $payroll->items()
                ->selectRaw('COALESCE(SUM(gross_pay), 0) as gross_total, COALESCE(SUM(deductions_total), 0) as deduction_total, COALESCE(SUM(net_pay), 0) as net_total')
                ->first();

            $payroll->update([
                'status' => 'finalized',
                'gross_total' => $totals->gross_total,
                'deduction_total' => $totals->deduction_total,
                'net_total' => $totals->net_total,
                'finalized_by' => $request->user()->id,
                'finalized_at' => now(),
            ]);
        });

        return back()->with('success', "Payroll run complete. {$created} payslips generated, {$skipped} already paid.");
    }

    public function payslip(PayrollItem $payrollItem): View
    {
        $payrollItem->load('payroll');

        return view('payroll.payslip', [
            'item' => $payrollItem,
            'payroll' => $payrollItem->payroll,
            'currency' => ($payrollItem->snapshot ?? [])['currency'] ?? 'GHS',
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $search = EmployeeSearch::term($request);
        $attributes = $request->validate([
            'month' => ['required', 'integer', 'between:1,12'],
            'year' => ['required', 'integer', 'between:2000,2100'],
        ]);

        $query = PayrollItem::query()
            ->where(fn ($query) => EmployeeSearch::apply($query, $search, ['employee_name', 'employee_number', 'department_name', 'position_title']))
            ->whereHas('payroll', fn ($query): mixed => $query
                ->where('month', $attributes['month'])
                ->where('year', $attributes['year']))
            ->orderBy('employee_name');

        return CsvExporter::streamCsv(
            CompanySetting::exportPrefix()."-payroll-{$attributes['year']}-{$attributes['month']}.csv",
            ['Employee Number', 'Name', 'Department', 'Position', 'Basic Salary', 'Allowances', 'Gross Pay', 'Deductions', 'Net Pay', 'Currency'],
            $query,
            fn (PayrollItem $item): array => [
                $item->employee_number,
                $item->employee_name,
                $item->department_name,
                $item->position_title,
                $item->basic_salary,
                $item->allowances_total,
                $item->gross_pay,
                $item->deductions_total,
                $item->net_pay,
                ($item->snapshot ?? [])['currency'] ?? 'GHS',
            ],
        );
    }

    private function payrollRow(Payroll $payroll): array
    {
        return [
            'id' => $payroll->id,
            'month' => $payroll->month,
            'year' => $payroll->year,
            'status' => $payroll->status,
            'gross_total' => $payroll->gross_total,
            'deduction_total' => $payroll->deduction_total,
            'net_total' => $payroll->net_total,
            'items_count' => $payroll->items_count,
            'finalized_at' => $payroll->finalized_at?->toISOString(),
        ];
    }

    private function payrollItemRow(PayrollItem $item): array
    {
        return [
            'id' => $item->id,
            'payroll_id' => $item->payroll_id,
            'employee_id' => $item->employee_id,
            'employee_number' => $item->employee_number,
            'employee_name' => $item->employee_name,
            'department_name' => $item->department_name,
            'position_title' => $item->position_title,
            'basic_salary' => $item->basic_salary,
            'allowances_total' => $item->allowances_total,
            'gross_pay' => $item->gross_pay,
            'deductions_total' => $item->deductions_total,
            'net_pay' => $item->net_pay,
            'currency' => ($item->snapshot ?? [])['currency'] ?? 'GHS',
        ];
    }
}
