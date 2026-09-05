import { Head, useForm } from '@inertiajs/react';
import AppLayout from '../../../Layouts/AppLayout';
import type { AttendanceRecord, Department, Employee, Position } from '../../../types';

type Props = {
    employee: (Pick<Employee, 'id' | 'employee_number' | 'full_name' | 'avatar_url'> & {
        department?: Pick<Department, 'id' | 'name'> | null;
        position?: Pick<Position, 'id' | 'title'> | null;
    }) | null;
    todayRecord: AttendanceRecord | null;
    recentRecords: AttendanceRecord[];
    workDate: string;
    lateAfter: string;
};

export default function Index({ employee, todayRecord, recentRecords, workDate, lateAfter }: Props) {
    const clockInForm = useForm({});
    const clockOutForm = useForm({});

    const hasClockedIn = Boolean(todayRecord?.clock_in_at);
    const hasClockedOut = Boolean(todayRecord?.clock_out_at);
    const canClockIn = Boolean(employee) && ! hasClockedIn && ! clockInForm.processing;
    const canClockOut = Boolean(employee) && hasClockedIn && ! hasClockedOut && ! clockOutForm.processing;

    function clockIn() {
        clockInForm.post('/self-service/attendance/clock-in', {
            preserveScroll: true,
        });
    }

    function clockOut() {
        clockOutForm.post('/self-service/attendance/clock-out', {
            preserveScroll: true,
        });
    }

    return (
        <AppLayout>
            <Head title="My Attendance" />

            <div className="flex flex-col gap-5">
                <div>
                    <h1 className="text-2xl font-semibold">My Attendance</h1>
                    <p className="mt-1 text-sm text-zinc-600">
                        Clock in and out for today. Your status is calculated from the clock-in time.
                    </p>
                </div>

                <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
                    <div className="rounded-lg border border-zinc-200 bg-white p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex items-start gap-4">
                                <Avatar employee={employee} />
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{employee?.employee_number ?? 'No employee link'}</p>
                                    <h2 className="mt-1 text-xl font-semibold">{employee?.full_name ?? 'Employee profile not linked'}</h2>
                                    <p className="mt-2 text-sm text-zinc-600">
                                        {employee?.position?.title ?? 'No position'} in {employee?.department?.name ?? 'No department'}
                                    </p>
                                </div>
                            </div>
                            <StatusBadge status={todayRecord?.status ?? 'not_started'} />
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-3">
                            <Metric label="Work Date" value={formatDate(workDate)} />
                            <Metric label="Clock In" value={formatTime(todayRecord?.clock_in_at)} />
                            <Metric label="Clock Out" value={formatTime(todayRecord?.clock_out_at)} />
                        </div>

                        <div className="mt-6 flex flex-col gap-3 border-t border-zinc-100 pt-5 sm:flex-row">
                            <button
                                className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                                disabled={! canClockIn}
                                onClick={clockIn}
                                type="button"
                            >
                                Clock In
                            </button>
                            <button
                                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                                disabled={! canClockOut}
                                onClick={clockOut}
                                type="button"
                            >
                                Clock Out
                            </button>
                        </div>
                    </div>

                    <aside className="rounded-lg border border-zinc-200 bg-white p-5">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Today</h2>
                        <dl className="mt-4 space-y-4">
                            <Detail label="Late After" value={lateAfter} />
                            <Detail label="Worked Time" value={formatMinutes(todayRecord?.worked_minutes)} />
                            <Detail label="Current State" value={stateMessage(employee, hasClockedIn, hasClockedOut)} />
                        </dl>
                    </aside>
                </section>

                <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
                    <div className="border-b border-zinc-200 px-4 py-3">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Recent Attendance</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-zinc-200 text-sm">
                            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                <tr>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Clock In</th>
                                    <th className="px-4 py-3">Clock Out</th>
                                    <th className="px-4 py-3">Worked</th>
                                    <th className="px-4 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {recentRecords.map((record) => (
                                    <tr key={`${record.work_date}-${record.id ?? 'new'}`}>
                                        <td className="px-4 py-3 font-medium">{formatDate(record.work_date)}</td>
                                        <td className="px-4 py-3 text-zinc-700">{formatTime(record.clock_in_at)}</td>
                                        <td className="px-4 py-3 text-zinc-700">{formatTime(record.clock_out_at)}</td>
                                        <td className="px-4 py-3 text-zinc-700">{formatMinutes(record.worked_minutes)}</td>
                                        <td className="px-4 py-3"><StatusBadge status={record.status} /></td>
                                    </tr>
                                ))}
                                {recentRecords.length === 0 && (
                                    <tr>
                                        <td className="px-4 py-8 text-center text-zinc-500" colSpan={5}>
                                            No attendance records yet.
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

function Avatar({ employee }: { employee: Props['employee'] }) {
    if (employee?.avatar_url) {
        return <img alt="" className="h-16 w-16 rounded-lg object-cover" src={employee.avatar_url} />;
    }

    return (
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-blue-50 text-lg font-semibold text-blue-700">
            {employee ? initials(employee.full_name) : '--'}
        </div>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">{value}</p>
        </div>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</dt>
            <dd className="mt-1 text-sm font-medium text-zinc-900">{value}</dd>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const classes = {
        not_started: 'bg-zinc-100 text-zinc-600',
        present: 'bg-emerald-50 text-emerald-700',
        late: 'bg-amber-50 text-amber-700',
        absent: 'bg-rose-50 text-rose-700',
    }[status] ?? 'bg-zinc-100 text-zinc-600';

    return <span className={`rounded-md px-2 py-1 text-xs font-semibold ${classes}`}>{titleCase(status)}</span>;
}

function stateMessage(employee: Props['employee'], hasClockedIn: boolean, hasClockedOut: boolean) {
    if (! employee) {
        return 'Ask HR to link your login to an employee profile.';
    }

    if (! hasClockedIn) {
        return 'Ready to clock in.';
    }

    if (! hasClockedOut) {
        return 'Clocked in. Clock out when your shift ends.';
    }

    return 'Attendance complete for today.';
}

function formatDate(value?: string | null) {
    if (! value) {
        return 'Not set';
    }

    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function formatTime(value?: string | null) {
    if (! value) {
        return '--';
    }

    return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function formatMinutes(value?: number) {
    if (! value) {
        return '0h 0m';
    }

    const hours = Math.floor(value / 60);
    const minutes = value % 60;

    return `${hours}h ${minutes}m`;
}

function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

function titleCase(value: string) {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
