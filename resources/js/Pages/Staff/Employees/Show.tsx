import { Link } from '@inertiajs/react';
import Head from '../../../Components/PageHead';
import type { ReactNode } from 'react';
import AppLayout from '../../../Layouts/AppLayout';
import SafeAvatar from '../../../Components/Avatar';
import type { AttendanceRecord, Employee, EmployeeProfile, LeaveBalance, LeaveRequest, PayrollItem } from '../../../types';

type Props = {
    employee: EmployeeProfile;
};

export default function Show({ employee }: Props) {
    return (
        <AppLayout>
            <Head title={employee.full_name} />

            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex items-start gap-4">
                        <Avatar employee={employee} />
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{employee.employee_number}</p>
                            <h1 className="mt-1 text-2xl font-semibold">{employee.full_name}</h1>
                            <p className="mt-2 text-sm text-zinc-600">
                                {employee.position?.title ?? 'Unassigned position'} in {employee.department?.name ?? 'Unassigned department'}
                            </p>
                        </div>
                    </div>
                    <Link className="w-fit rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50" href="/staff/employees">
                        Back to Employees
                    </Link>
                </div>

                <section className="grid gap-4 lg:grid-cols-3">
                    <InfoPanel title="Profile">
                        <Detail label="Status" value={titleCase(employee.status ?? 'active')} />
                        <Detail label="Work Email" value={employee.work_email} />
                        <Detail label="Phone" value={employee.phone} />
                        <Detail label="Personal Email" value={employee.personal_email} />
                        <Detail label="City / Region" value={employee.city_region} />
                        <Detail label="Address" value={employee.residential_address} />
                    </InfoPanel>

                    <InfoPanel title="Employment">
                        <Detail label="Hire Date" value={formatDate(employee.hire_date)} />
                        <Detail label="Employment Type" value={titleCase(employee.employment_type)} />
                        <Detail label="Work Location" value={employee.work_location} />
                        <Detail label="Basic Salary" value={`${employee.currency} ${employee.basic_salary}`} />
                        <Detail label="Tax Reference" value={employee.tax_reference} />
                        <Detail label="SSNIT Reference" value={employee.ssnit_reference} />
                    </InfoPanel>

                    <InfoPanel title="Reporting">
                        <Detail label="Manager" value={employee.manager?.full_name ?? 'No manager'} />
                        <Detail label="Manager Position" value={employee.manager?.position?.title ?? null} />
                        <Detail label="Department Manager" value={employee.department?.manager?.full_name ?? null} />
                        <Detail label="Login Account" value={employee.user ? `${employee.user.name} (${employee.user.role})` : 'No login account'} />
                    </InfoPanel>
                </section>

                <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                    <InfoPanel title="Leave Balances">
                        <div className="grid gap-3 sm:grid-cols-2">
                            {employee.leave_balances.map((balance) => (
                                <LeaveBalanceCard balance={balance} key={balance.id} />
                            ))}
                            {employee.leave_balances.length === 0 && <EmptyState message="No leave balances recorded." />}
                        </div>
                    </InfoPanel>

                    <InfoPanel title="Org Chart">
                        <div className="space-y-3">
                            {employee.subordinates.map((subordinate) => (
                                <PersonRow employee={subordinate} key={subordinate.id} />
                            ))}
                            {employee.subordinates.length === 0 && <EmptyState message="No direct reports." />}
                        </div>
                    </InfoPanel>
                </section>

                <section className="grid gap-4 xl:grid-cols-3">
                    <InfoPanel title="Recent Leave">
                        <div className="space-y-3">
                            {employee.leave_requests.map((request) => (
                                <LeaveRequestRow request={request} key={request.id} />
                            ))}
                            {employee.leave_requests.length === 0 && <EmptyState message="No leave requests yet." />}
                        </div>
                    </InfoPanel>

                    <InfoPanel title="Attendance">
                        <div className="space-y-3">
                            {employee.attendance_records.map((record) => (
                                <AttendanceRow record={record} key={record.id} />
                            ))}
                            {employee.attendance_records.length === 0 && <EmptyState message="No attendance records yet." />}
                        </div>
                    </InfoPanel>

                    <InfoPanel title="Payroll">
                        <div className="space-y-3">
                            {employee.payroll_items.map((item) => (
                                <PayrollRow item={item} key={item.id} />
                            ))}
                            {employee.payroll_items.length === 0 && <EmptyState message="No payslips generated yet." />}
                        </div>
                    </InfoPanel>
                </section>
            </div>
        </AppLayout>
    );
}

function Avatar({ employee }: { employee: EmployeeProfile }) {
    return <SafeAvatar name={employee.full_name} src={employee.avatar_url} className="h-24 w-24 text-2xl" />;
}

function InfoPanel({ children, title }: { children: ReactNode; title: string }) {
    return (
        <section className="rounded-lg border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{title}</h2>
            <div className="mt-4 space-y-3">{children}</div>
        </section>
    );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
    return (
        <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
            <dd className="mt-1 break-words text-sm font-medium text-zinc-800">{value || 'Not recorded'}</dd>
        </div>
    );
}

function LeaveBalanceCard({ balance }: { balance: LeaveBalance }) {
    return (
        <div className="rounded-lg border border-zinc-200 p-3">
            <p className="font-medium">{balance.leave_type?.name ?? 'Leave'}</p>
            <p className="mt-1 text-2xl font-semibold">{balance.remaining_days ?? '0'}</p>
            <p className="mt-1 text-xs text-zinc-500">
                {balance.used_days} of {balance.entitled_days} days used
            </p>
        </div>
    );
}

function PersonRow({ employee }: { employee: Employee }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2">
            <div className="min-w-0">
                <p className="truncate text-sm font-medium">{employee.full_name}</p>
                <p className="mt-1 truncate text-xs text-zinc-500">{employee.position?.title ?? 'Unassigned'}</p>
            </div>
        </div>
    );
}

function LeaveRequestRow({ request }: { request: LeaveRequest }) {
    return (
        <div className="rounded-lg border border-zinc-200 px-3 py-2 text-sm">
            <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{request.leave_type?.name ?? 'Leave'}</p>
                <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">{titleCase(request.status)}</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
                {formatDate(request.start_date)} to {formatDate(request.end_date)} - {request.requested_days} days
            </p>
        </div>
    );
}

function AttendanceRow({ record }: { record: AttendanceRecord }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm">
            <div>
                <p className="font-medium">{formatDate(record.work_date)}</p>
                <p className="mt-1 text-xs text-zinc-500">
                    {record.clock_in_at ?? '--'} to {record.clock_out_at ?? '--'}
                </p>
            </div>
            <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">{titleCase(record.status)}</span>
        </div>
    );
}

function PayrollRow({ item }: { item: PayrollItem }) {
    return (
        <div className="rounded-lg border border-zinc-200 px-3 py-2 text-sm">
            <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{payrollPeriod(item)}</p>
                <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">{titleCase(item.payroll?.status ?? 'draft')}</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">Net pay: {item.net_pay}</p>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-6 text-center text-sm text-zinc-500">{message}</p>;
}


function formatDate(value?: string | null) {
    if (! value) {
        return null;
    }

    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function payrollPeriod(item: PayrollItem) {
    if (! item.payroll) {
        return 'Payroll item';
    }

    return `${item.payroll.month}/${item.payroll.year}`;
}

function titleCase(value: string) {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
