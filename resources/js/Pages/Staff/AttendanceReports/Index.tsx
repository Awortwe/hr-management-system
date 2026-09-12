import { Link, router } from '@inertiajs/react';
import Head from '../../../Components/PageHead';
import AppLayout from '../../../Layouts/AppLayout';
import type { AttendanceReportRow, Department, Paginated, ProjectSite } from '../../../types';

type Props = {
    filters: Record<string, string>;
    records: Paginated<AttendanceReportRow>;
    summary: { total: number; late: number; out_of_zone: number; pending: number; overtime_hours: number };
    departments: Pick<Department, 'id' | 'name'>[];
    projectSites: Pick<ProjectSite, 'id' | 'name' | 'code'>[];
    employees: { id: number; label: string }[];
};

export default function Index({ filters, records, summary, departments, projectSites, employees }: Props) {
    function update(key: string, value: string) {
        router.get('/staff/attendance-reports', { ...filters, [key]: value }, { preserveScroll: true, preserveState: true, replace: true });
    }

    return (
        <AppLayout>
            <Head title="Attendance Reports" />
            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Attendance Reports</h1>
                        <p className="mt-1 text-sm text-zinc-600">Daily, monthly, late, out-of-zone, corrections and overtime-ready attendance export.</p>
                    </div>
                    <Link className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white" href={`/staff/attendance-reports/export?${new URLSearchParams(filters).toString()}`}>Export CSV</Link>
                </div>

                <section className="grid gap-3 sm:grid-cols-5">
                    <Metric label="Records" value={summary.total} />
                    <Metric label="Late" value={summary.late} tone="amber" />
                    <Metric label="Out of Zone" value={summary.out_of_zone} tone="rose" />
                    <Metric label="Pending" value={summary.pending} tone="amber" />
                    <Metric label="Overtime" value={summary.overtime_hours.toFixed(2)} />
                </section>

                <section className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-3 xl:grid-cols-6">
                    <input className="form-input" placeholder="Search employee" value={filters.search ?? ''} onChange={(event) => update('search', event.target.value)} />
                    <input className="form-input" type="date" value={filters.from ?? ''} onChange={(event) => update('from', event.target.value)} />
                    <input className="form-input" type="date" value={filters.to ?? ''} onChange={(event) => update('to', event.target.value)} />
                    <select className="form-input" value={filters.department ?? ''} onChange={(event) => update('department', event.target.value)}>
                        <option value="">All departments</option>
                        {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                    </select>
                    <select className="form-input" value={filters.project_site ?? ''} onChange={(event) => update('project_site', event.target.value)}>
                        <option value="">All sites</option>
                        {projectSites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
                    </select>
                    <select className="form-input" value={filters.zone_status ?? ''} onChange={(event) => update('zone_status', event.target.value)}>
                        <option value="">All zones</option>
                        <option value="in_zone">In zone</option>
                        <option value="out_of_zone">Out of zone</option>
                    </select>
                </section>

                <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-zinc-200 text-sm">
                            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                <tr>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Employee</th>
                                    <th className="px-4 py-3">Site</th>
                                    <th className="px-4 py-3">Clock</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Zone</th>
                                    <th className="px-4 py-3">Overtime</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {records.data.map((record) => (
                                    <tr key={record.id}>
                                        <td className="px-4 py-3">{formatDate(record.work_date)}</td>
                                        <td className="px-4 py-3"><p className="font-medium">{record.employee_name}</p><p className="text-xs text-zinc-500">{record.employee_number}</p></td>
                                        <td className="px-4 py-3">{record.project_site ?? '--'}</td>
                                        <td className="px-4 py-3">{formatTime(record.clock_in_at)} - {formatTime(record.clock_out_at)}</td>
                                        <td className="px-4 py-3"><Badge value={record.status} /></td>
                                        <td className="px-4 py-3"><Badge value={record.zone_status ?? 'unknown'} /></td>
                                        <td className="px-4 py-3">{record.overtime_hours}h {record.overtime_approved_at ? '(approved)' : ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}

function Metric({ label, value, tone = 'zinc' }: { label: string; value: number | string; tone?: 'zinc' | 'amber' | 'rose' }) {
    const classes = { zinc: 'border-zinc-200 bg-white', amber: 'border-amber-200 bg-amber-50', rose: 'border-rose-200 bg-rose-50' };
    return <div className={`rounded-lg border p-4 ${classes[tone]}`}><p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>;
}

function Badge({ value }: { value: string }) {
    const classes = value === 'out_of_zone' || value === 'absent' ? 'bg-rose-50 text-rose-700' : value === 'late' || value === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700';
    return <span className={`rounded-md px-2 py-1 text-xs font-semibold ${classes}`}>{value.replace(/_/g, ' ')}</span>;
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function formatTime(value?: string | null) {
    return value ? new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '--';
}
