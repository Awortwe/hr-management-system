import { router } from '@inertiajs/react';
import Head from '../../../Components/PageHead';
import SearchBar from '../../../Components/SearchBar';
import AppLayout from '../../../Layouts/AppLayout';
import type { AttendanceOverviewRow, AttendanceSummary } from '../../../types';

type Props = {
    filters: { search: string };
    companyWide: boolean;
    workDate: string;
    rows: AttendanceOverviewRow[];
    summary: AttendanceSummary;
};

export default function Index({ workDate, rows, summary, companyWide, filters }: Props) {
    const title = companyWide ? 'Company Attendance' : 'Team Attendance';
    function updateDate(date: string) {
        router.get(companyWide ? '/staff/attendance' : '/manager/attendance', { ...filters, date }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    }

    return (
        <AppLayout>
            <Head title={title} />

            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">{title}</h1>
                    </div>
                    <label className="block">
                        <span className="text-sm font-medium text-zinc-700">Work Date</span>
                        <input
                            className="form-input mt-1 min-w-48"
                            onChange={(event) => updateDate(event.target.value)}
                            type="date"
                            value={workDate}
                        />
                    </label>
                </div>

                <SearchBar href={companyWide ? '/staff/attendance' : '/manager/attendance'} filters={{ ...filters, date: workDate }} />
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                    <Metric label="Expected" value={summary.expected} />
                    <Metric label="Present" value={summary.present} tone="emerald" />
                    <Metric label="Late" value={summary.late} tone="amber" />
                    <Metric label="Absent" value={summary.absent} tone="rose" />
                    <Metric label="Clocked Out" value={summary.clocked_out} />
                    <Metric label="Hours" value={summary.total_hours.toFixed(2)} />
                </section>

                <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-zinc-200 text-sm">
                            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                <tr>
                                    <th className="px-4 py-3">Employee</th>
                                    <th className="px-4 py-3">Department</th>
                                    <th className="px-4 py-3">Clock In</th>
                                    <th className="px-4 py-3">Clock Out</th>
                                    <th className="px-4 py-3">Hours</th>
                                    <th className="px-4 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {rows.map((row) => (
                                    <tr key={row.employee_id}>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-zinc-950">{row.employee_name}</p>
                                            <p className="mt-1 text-xs text-zinc-500">{row.employee_number ?? 'No employee number'}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-zinc-800">{row.department ?? 'No department'}</p>
                                            <p className="mt-1 text-xs text-zinc-500">{row.position ?? 'No position'}</p>
                                        </td>
                                        <td className="px-4 py-3 text-zinc-700">{formatTime(row.clock_in_at)}</td>
                                        <td className="px-4 py-3 text-zinc-700">{formatTime(row.clock_out_at)}</td>
                                        <td className="px-4 py-3 text-zinc-700">{row.hours_worked.toFixed(2)}</td>
                                        <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                                    </tr>
                                ))}
                                {rows.length === 0 && (
                                    <tr>
                                        <td className="px-4 py-8 text-center text-zinc-500" colSpan={6}>
                                            No employees found.
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

function Metric({ label, tone = 'zinc', value }: { label: string; tone?: 'zinc' | 'emerald' | 'amber' | 'rose'; value: number | string }) {
    const classes = {
        zinc: 'border-zinc-200 bg-white text-zinc-900',
        emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        amber: 'border-amber-200 bg-amber-50 text-amber-800',
        rose: 'border-rose-200 bg-rose-50 text-rose-800',
    };

    return (
        <div className={`rounded-lg border p-4 ${classes[tone]}`}>
            <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const classes = {
        present: 'bg-emerald-50 text-emerald-700',
        late: 'bg-amber-50 text-amber-700',
        absent: 'bg-rose-50 text-rose-700',
    }[status] ?? 'bg-zinc-100 text-zinc-600';

    return <span className={`rounded-md px-2 py-1 text-xs font-semibold ${classes}`}>{titleCase(status)}</span>;
}

function formatTime(value?: string | null) {
    if (! value) {
        return '--';
    }

    return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function titleCase(value: string) {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
