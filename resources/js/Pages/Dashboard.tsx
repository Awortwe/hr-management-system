import { Link } from '@inertiajs/react';
import Head from '../Components/PageHead';
import type { ReactNode } from 'react';
import AppLayout from '../Layouts/AppLayout';

type Kpi = {
    label: string;
    value: number;
    detail: string;
};

type DepartmentHeadcount = {
    id: number;
    name: string;
    code: string;
    employees_count: number;
    percentage: number;
};

type PendingRequest = {
    id: number;
    employee_name: string | null;
    department_name: string | null;
    leave_type: string | null;
    color: string | null;
    start_date: string | null;
    end_date: string | null;
    requested_days: number | string;
};

type RecentHire = {
    id: number;
    full_name: string;
    employee_number: string | null;
    hire_date: string | null;
    department: string | null;
    position: string | null;
};

type Props = {
    kpis: Kpi[];
    statusTotals: Record<string, number>;
    departments: DepartmentHeadcount[];
    pendingRequests: PendingRequest[];
    recentHires: RecentHire[];
};

export default function Dashboard({ departments, kpis, pendingRequests, recentHires, statusTotals }: Props) {
    return (
        <AppLayout>
            <Head title="Dashboard" />

            <div className="flex flex-col gap-5">
                <div>
                    <h1 className="text-2xl font-semibold">Dashboard</h1>
                    <p className="mt-1 text-sm text-zinc-600">
                        Headcount, leave, and hiring signals from the HR data already powering the app.
                    </p>
                </div>

                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {kpis.map((kpi) => (
                        <KpiCard detail={kpi.detail} key={kpi.label} label={kpi.label} value={kpi.value} />
                    ))}
                </section>

                <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-lg border border-zinc-200 bg-white p-5">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-base font-semibold">Headcount by Department</h2>
                            <Link className="text-sm font-semibold text-blue-700 hover:text-blue-600" href="/organization/departments">
                                Departments
                            </Link>
                        </div>
                        <div className="mt-5 space-y-4">
                            {departments.map((department) => (
                                <div key={department.id}>
                                    <div className="flex items-center justify-between gap-3 text-sm">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">{department.name}</p>
                                            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500">{department.code}</p>
                                        </div>
                                        <p className="font-semibold">{department.employees_count}</p>
                                    </div>
                                    <div className="mt-2 h-3 overflow-hidden rounded-md bg-zinc-100">
                                        <div className="h-full rounded-md bg-blue-700" style={{ width: `${department.percentage}%` }} />
                                    </div>
                                </div>
                            ))}
                            {departments.length === 0 && <EmptyState message="No departments yet." />}
                        </div>
                    </div>

                    <div className="rounded-lg border border-zinc-200 bg-white p-5">
                        <h2 className="text-base font-semibold">Employee Status</h2>
                        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                            {Object.entries(statusTotals).map(([status, total]) => (
                                <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2" key={status}>
                                    <span className="text-sm font-medium">{titleCase(status)}</span>
                                    <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">{total}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="grid gap-5 xl:grid-cols-2">
                    <Widget title="Pending Requests" href="/staff/leave-requests?status=pending" linkLabel="Review Leave">
                        <div className="space-y-3">
                            {pendingRequests.map((request) => (
                                <div className="rounded-lg border border-zinc-200 p-3" key={request.id}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">{request.employee_name ?? 'Unknown employee'}</p>
                                            <p className="mt-1 text-xs text-zinc-500">{request.department_name ?? 'No department'}</p>
                                        </div>
                                        <span className="shrink-0 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                                            {request.requested_days} days
                                        </span>
                                    </div>
                                    <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                                        <span className="h-3 w-3 rounded-sm border border-zinc-200" style={{ backgroundColor: request.color ?? '#2563eb' }} />
                                        <span>{request.leave_type ?? 'Leave'}</span>
                                        <span>{formatDateRange(request.start_date, request.end_date)}</span>
                                    </div>
                                </div>
                            ))}
                            {pendingRequests.length === 0 && <EmptyState message="No pending leave requests." />}
                        </div>
                    </Widget>

                    <Widget title="Recent Hires" href="/staff/employees" linkLabel="Open Employees">
                        <div className="space-y-3">
                            {recentHires.map((employee) => (
                                <Link className="block rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50" href={`/staff/employees/${employee.id}`} key={employee.id}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">{employee.full_name}</p>
                                            <p className="mt-1 text-xs text-zinc-500">
                                                {employee.position ?? 'No position'} in {employee.department ?? 'No department'}
                                            </p>
                                        </div>
                                        <span className="shrink-0 text-xs font-semibold text-zinc-500">{employee.employee_number}</span>
                                    </div>
                                    <p className="mt-3 text-xs text-zinc-500">Hired {formatDate(employee.hire_date)}</p>
                                </Link>
                            ))}
                            {recentHires.length === 0 && <EmptyState message="No hires recorded yet." />}
                        </div>
                    </Widget>
                </section>
            </div>
        </AppLayout>
    );
}

function KpiCard({ detail, label, value }: Kpi) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
            <p className="mt-2 text-sm text-zinc-600">{detail}</p>
        </div>
    );
}

function Widget({ children, href, linkLabel, title }: { children: ReactNode; href: string; linkLabel: string; title: string }) {
    return (
        <section className="rounded-lg border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">{title}</h2>
                <Link className="text-sm font-semibold text-blue-700 hover:text-blue-600" href={href}>
                    {linkLabel}
                </Link>
            </div>
            <div className="mt-5">{children}</div>
        </section>
    );
}

function EmptyState({ message }: { message: string }) {
    return <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-6 text-center text-sm text-zinc-500">{message}</p>;
}

function formatDate(value?: string | null) {
    if (! value) {
        return 'Not set';
    }

    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function formatDateRange(start?: string | null, end?: string | null) {
    return `${formatDate(start)} to ${formatDate(end)}`;
}

function titleCase(value: string) {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
