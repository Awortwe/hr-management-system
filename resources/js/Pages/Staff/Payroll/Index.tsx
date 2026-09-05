import { Head, router, useForm } from '@inertiajs/react';
import AppLayout from '../../../Layouts/AppLayout';
import type { Payroll, PayrollItem } from '../../../types';

type Props = {
    filters: {
        month: number;
        year: number;
    };
    payroll: Payroll | null;
    items: PayrollItem[];
    activeEmployeeCount: number;
    months: {
        value: number;
        label: string;
    }[];
    years: number[];
};

type RunPayrollForm = {
    month: number;
    year: number;
};

export default function Index({ activeEmployeeCount, filters, items, months, payroll, years }: Props) {
    const form = useForm<RunPayrollForm>({
        month: filters.month,
        year: filters.year,
    });

    function updateFilter(field: keyof RunPayrollForm, value: number) {
        form.setData(field, value);

        router.get('/staff/payroll', { ...filters, [field]: value }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    }

    function runPayroll() {
        form.post('/staff/payroll/run', {
            preserveScroll: true,
        });
    }

    return (
        <AppLayout>
            <Head title="Payroll" />

            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Payroll</h1>
                        <p className="mt-1 text-sm text-zinc-600">
                            Run monthly payroll once, then print browser-native payslips for each employee.
                        </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[180px_140px_auto]">
                        <label className="block">
                            <span className="text-sm font-medium text-zinc-700">Month</span>
                            <select className="form-input mt-1" onChange={(event) => updateFilter('month', Number(event.target.value))} value={form.data.month}>
                                {months.map((month) => (
                                    <option key={month.value} value={month.value}>
                                        {month.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-sm font-medium text-zinc-700">Year</span>
                            <select className="form-input mt-1" onChange={(event) => updateFilter('year', Number(event.target.value))} value={form.data.year}>
                                {years.map((year) => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div className="flex items-end">
                            <button
                                className="w-full rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={form.processing}
                                onClick={runPayroll}
                                type="button"
                            >
                                Run Payroll
                            </button>
                        </div>
                    </div>
                </div>

                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <Metric label="Active Employees" value={activeEmployeeCount} />
                    <Metric label="Payslips" value={payroll?.items_count ?? 0} />
                    <Metric label="Gross" value={money(payroll?.gross_total)} />
                    <Metric label="Deductions" value={money(payroll?.deduction_total)} />
                    <Metric label="Net" value={money(payroll?.net_total)} />
                </section>

                <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
                    <div className="border-b border-zinc-200 px-4 py-3">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                            {periodName(filters.month, filters.year, months)}
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-zinc-200 text-sm">
                            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                <tr>
                                    <th className="px-4 py-3">Employee</th>
                                    <th className="px-4 py-3">Department</th>
                                    <th className="px-4 py-3">Basic</th>
                                    <th className="px-4 py-3">Allowances</th>
                                    <th className="px-4 py-3">Deductions</th>
                                    <th className="px-4 py-3">Net Pay</th>
                                    <th className="px-4 py-3 text-right">Document</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-zinc-950">{item.employee_name}</p>
                                            <p className="mt-1 text-xs text-zinc-500">{item.employee_number}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-zinc-800">{item.department_name ?? 'No department'}</p>
                                            <p className="mt-1 text-xs text-zinc-500">{item.position_title ?? 'No position'}</p>
                                        </td>
                                        <td className="px-4 py-3 text-zinc-700">{money(item.basic_salary, item.currency)}</td>
                                        <td className="px-4 py-3 text-zinc-700">{money(item.allowances_total, item.currency)}</td>
                                        <td className="px-4 py-3 text-zinc-700">{money(item.deductions_total, item.currency)}</td>
                                        <td className="px-4 py-3 font-semibold text-zinc-950">{money(item.net_pay, item.currency)}</td>
                                        <td className="px-4 py-3 text-right">
                                            <a
                                                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-50"
                                                href={`/staff/payroll-items/${item.id}/payslip`}
                                                rel="noreferrer"
                                                target="_blank"
                                            >
                                                Print Payslip
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                                {items.length === 0 && (
                                    <tr>
                                        <td className="px-4 py-8 text-center text-zinc-500" colSpan={7}>
                                            No payslips exist for this month yet. Run payroll to generate them.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}

function Metric({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
    );
}

function money(value?: number | string | null, currency = 'GHS') {
    return new Intl.NumberFormat(undefined, {
        currency,
        style: 'currency',
    }).format(Number(value ?? 0));
}

function periodName(month: number, year: number, months: Props['months']) {
    return `${months.find((option) => option.value === month)?.label ?? month} ${year}`;
}
