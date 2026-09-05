import { Head, router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import AppLayout from '../../../Layouts/AppLayout';
import type { Employee, LeaveRequest, LeaveType, Paginated } from '../../../types';

type Props = {
    leaveRequests: Paginated<LeaveRequest>;
    employees: Pick<Employee, 'id' | 'employee_number' | 'full_name'>[];
    leaveTypes: LeaveType[];
    filters: {
        status: string;
        employee: string;
    };
    statuses: string[];
};

type RequestForm = {
    employee_id: string;
    leave_type_id: string;
    start_date: string;
    end_date: string;
    reason: string;
};

type DecisionForm = {
    decision_comment: string;
};

const emptyRequestForm: RequestForm = {
    employee_id: '',
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
};

export default function Index({ leaveRequests, employees, leaveTypes, filters, statuses }: Props) {
    const [requestDialogOpen, setRequestDialogOpen] = useState(false);
    const [approving, setApproving] = useState<LeaveRequest | null>(null);
    const [rejecting, setRejecting] = useState<LeaveRequest | null>(null);

    const requestForm = useForm<RequestForm>(emptyRequestForm);
    const decisionForm = useForm<DecisionForm>({ decision_comment: '' });

    const totals = useMemo(() => ({
        pending: leaveRequests.data.filter((request) => request.status === 'pending').length,
        approved: leaveRequests.data.filter((request) => request.status === 'approved').length,
        rejected: leaveRequests.data.filter((request) => request.status === 'rejected').length,
    }), [leaveRequests.data]);

    function openRequestDialog() {
        requestForm.setData(emptyRequestForm);
        requestForm.clearErrors();
        setRequestDialogOpen(true);
    }

    function submitRequest(event: FormEvent) {
        event.preventDefault();

        requestForm.post('/staff/leave-requests', {
            preserveScroll: true,
            onSuccess: () => {
                requestForm.reset();
                setRequestDialogOpen(false);
            },
        });
    }

    function openApproveDialog(leaveRequest: LeaveRequest) {
        decisionForm.setData('decision_comment', '');
        decisionForm.clearErrors();
        setApproving(leaveRequest);
    }

    function openRejectDialog(leaveRequest: LeaveRequest) {
        decisionForm.setData('decision_comment', '');
        decisionForm.clearErrors();
        setRejecting(leaveRequest);
    }

    function approveRequest(event: FormEvent) {
        event.preventDefault();

        if (! approving) {
            return;
        }

        decisionForm.patch(`/staff/leave-requests/${approving.id}/approve`, {
            preserveScroll: true,
            onSuccess: () => {
                decisionForm.reset();
                setApproving(null);
            },
        });
    }

    function rejectRequest(event: FormEvent) {
        event.preventDefault();

        if (! rejecting) {
            return;
        }

        decisionForm.patch(`/staff/leave-requests/${rejecting.id}/reject`, {
            preserveScroll: true,
            onSuccess: () => {
                decisionForm.reset();
                setRejecting(null);
            },
        });
    }

    function updateFilters(nextFilters: Partial<Props['filters']>) {
        router.get('/staff/leave-requests', { ...filters, ...nextFilters }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    }

    return (
        <AppLayout>
            <Head title="Leave Requests" />

            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Leave Requests</h1>
                        <p className="mt-1 text-sm text-zinc-600">
                            Review pending leave, record decisions, and keep employee balances in sync.
                        </p>
                    </div>
                    <button
                        className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                        onClick={openRequestDialog}
                        type="button"
                    >
                        New Request
                    </button>
                </div>

                <section className="grid gap-3 sm:grid-cols-3">
                    <Metric label="Pending" tone="amber" value={String(totals.pending)} />
                    <Metric label="Approved" tone="emerald" value={String(totals.approved)} />
                    <Metric label="Rejected" tone="rose" value={String(totals.rejected)} />
                </section>

                <section className="rounded-lg border border-zinc-200 bg-white p-4">
                    <div className="grid gap-3 md:grid-cols-[220px_1fr]">
                        <select className="form-input" onChange={(event) => updateFilters({ status: event.target.value })} value={filters.status}>
                            <option value="">All statuses</option>
                            {statuses.map((status) => (
                                <option key={status} value={status}>
                                    {titleCase(status)}
                                </option>
                            ))}
                        </select>
                        <select className="form-input" onChange={(event) => updateFilters({ employee: event.target.value })} value={filters.employee}>
                            <option value="">All employees</option>
                            {employees.map((employee) => (
                                <option key={employee.id} value={employee.id}>
                                    {employee.full_name} ({employee.employee_number})
                                </option>
                            ))}
                        </select>
                    </div>
                </section>

                <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-zinc-200 text-sm">
                            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                <tr>
                                    <th className="px-4 py-3">Employee</th>
                                    <th className="px-4 py-3">Leave</th>
                                    <th className="px-4 py-3">Dates</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Decision</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {leaveRequests.data.map((leaveRequest) => (
                                    <tr key={leaveRequest.id}>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-zinc-950">{leaveRequest.employee?.full_name ?? 'Unknown employee'}</p>
                                            <p className="mt-1 text-xs text-zinc-500">
                                                {leaveRequest.employee?.department?.name ?? 'No department'} / {leaveRequest.employee?.position?.title ?? 'No position'}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="h-3 w-3 rounded-sm border border-zinc-200" style={{ backgroundColor: leaveRequest.leave_type?.color ?? '#2563eb' }} />
                                                <span className="font-medium">{leaveRequest.leave_type?.name ?? 'Leave'}</span>
                                            </div>
                                            <p className="mt-1 text-xs text-zinc-500">{leaveRequest.requested_days} server-counted days</p>
                                        </td>
                                        <td className="px-4 py-3 text-zinc-700">
                                            <p>{formatDate(leaveRequest.start_date)}</p>
                                            <p className="mt-1 text-xs text-zinc-500">to {formatDate(leaveRequest.end_date)}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={leaveRequest.status} />
                                        </td>
                                        <td className="max-w-xs px-4 py-3 text-zinc-700">
                                            <p className="line-clamp-2">{leaveRequest.decision_comment || 'No decision yet'}</p>
                                            {leaveRequest.approver && <p className="mt-1 text-xs text-zinc-500">By {leaveRequest.approver.full_name}</p>}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {leaveRequest.can_approve ? (
                                                <div className="flex justify-end gap-2">
                                                    <button className="rounded-md border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50" onClick={() => openApproveDialog(leaveRequest)} type="button">
                                                        Approve
                                                    </button>
                                                    <button className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50" onClick={() => openRejectDialog(leaveRequest)} type="button">
                                                        Reject
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-xs font-medium text-zinc-500">No action</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {leaveRequests.data.length === 0 && (
                                    <tr>
                                        <td className="px-4 py-8 text-center text-zinc-500" colSpan={6}>
                                            No leave requests match the current filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <Pagination links={leaveRequests.links} />
                </section>
            </div>

            {requestDialogOpen && (
                <Modal title="New Leave Request" onClose={() => setRequestDialogOpen(false)}>
                    <form className="space-y-4" onSubmit={submitRequest}>
                        <Field error={requestForm.errors.employee_id} label="Employee">
                            <select className="form-input" onChange={(event) => requestForm.setData('employee_id', event.target.value)} value={requestForm.data.employee_id}>
                                <option value="">Select employee</option>
                                {employees.map((employee) => (
                                    <option key={employee.id} value={employee.id}>
                                        {employee.full_name} ({employee.employee_number})
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field error={requestForm.errors.leave_type_id} label="Leave Type">
                            <select className="form-input" onChange={(event) => requestForm.setData('leave_type_id', event.target.value)} value={requestForm.data.leave_type_id}>
                                <option value="">Select leave type</option>
                                {leaveTypes.map((leaveType) => (
                                    <option key={leaveType.id} value={leaveType.id}>
                                        {leaveType.name} ({leaveType.annual_allowance_days} days)
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field error={requestForm.errors.start_date} label="Start Date">
                                <input className="form-input" onChange={(event) => requestForm.setData('start_date', event.target.value)} type="date" value={requestForm.data.start_date} />
                            </Field>
                            <Field error={requestForm.errors.end_date} label="End Date">
                                <input className="form-input" onChange={(event) => requestForm.setData('end_date', event.target.value)} type="date" value={requestForm.data.end_date} />
                            </Field>
                        </div>
                        <Field error={requestForm.errors.reason} label="Reason">
                            <textarea className="form-input min-h-28" onChange={(event) => requestForm.setData('reason', event.target.value)} value={requestForm.data.reason} />
                        </Field>
                        <DialogActions processing={requestForm.processing} submitLabel="Submit Request" onCancel={() => setRequestDialogOpen(false)} />
                    </form>
                </Modal>
            )}

            {approving && (
                <Modal title="Approve Request" onClose={() => setApproving(null)}>
                    <form className="space-y-4" onSubmit={approveRequest}>
                        <DecisionSummary leaveRequest={approving} />
                        <Field error={decisionForm.errors.decision_comment} label="Decision Comment">
                            <textarea className="form-input min-h-24" onChange={(event) => decisionForm.setData('decision_comment', event.target.value)} value={decisionForm.data.decision_comment} />
                        </Field>
                        <DialogActions processing={decisionForm.processing} submitLabel="Approve" onCancel={() => setApproving(null)} />
                    </form>
                </Modal>
            )}

            {rejecting && (
                <Modal title="Reject Request" onClose={() => setRejecting(null)}>
                    <form className="space-y-4" onSubmit={rejectRequest}>
                        <DecisionSummary leaveRequest={rejecting} />
                        <Field error={decisionForm.errors.decision_comment} label="Decision Comment">
                            <textarea className="form-input min-h-24" onChange={(event) => decisionForm.setData('decision_comment', event.target.value)} value={decisionForm.data.decision_comment} />
                        </Field>
                        <DialogActions processing={decisionForm.processing} submitLabel="Reject" onCancel={() => setRejecting(null)} />
                    </form>
                </Modal>
            )}
        </AppLayout>
    );
}

function Modal({ children, onClose, title }: { children: ReactNode; onClose: () => void; title: string }) {
    return (
        <div className="fixed inset-0 z-40 grid place-items-center bg-zinc-950/40 px-4">
            <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <button className="rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100" onClick={onClose} type="button">
                        Close
                    </button>
                </div>
                <div className="mt-5">{children}</div>
            </div>
        </div>
    );
}

function Field({ children, error, label }: { children: ReactNode; error?: string; label: string }) {
    return (
        <label className="block">
            <span className="text-sm font-medium text-zinc-700">{label}</span>
            <div className="mt-1">{children}</div>
            {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
        </label>
    );
}

function DialogActions({ onCancel, processing, submitLabel }: { onCancel: () => void; processing: boolean; submitLabel: string }) {
    return (
        <div className="flex justify-end gap-3 border-t border-zinc-100 pt-4">
            <button className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50" onClick={onCancel} type="button">
                Cancel
            </button>
            <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50" disabled={processing} type="submit">
                {submitLabel}
            </button>
        </div>
    );
}

function DecisionSummary({ leaveRequest }: { leaveRequest: LeaveRequest }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
            <p className="font-semibold">{leaveRequest.employee?.full_name ?? 'Unknown employee'}</p>
            <p className="mt-1 text-zinc-600">
                {leaveRequest.leave_type?.name ?? 'Leave'} from {formatDate(leaveRequest.start_date)} to {formatDate(leaveRequest.end_date)}
            </p>
            <p className="mt-1 text-xs font-medium text-zinc-500">{leaveRequest.requested_days} days will be used if approved.</p>
        </div>
    );
}

function Metric({ label, tone, value }: { label: string; tone: 'amber' | 'emerald' | 'rose'; value: string }) {
    const tones = {
        amber: 'border-amber-200 bg-amber-50 text-amber-800',
        emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        rose: 'border-rose-200 bg-rose-50 text-rose-800',
    };

    return (
        <div className={`rounded-lg border p-4 ${tones[tone]}`}>
            <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const classes = {
        pending: 'bg-amber-50 text-amber-700',
        approved: 'bg-emerald-50 text-emerald-700',
        rejected: 'bg-rose-50 text-rose-700',
    }[status] ?? 'bg-zinc-100 text-zinc-600';

    return <span className={`rounded-md px-2 py-1 text-xs font-semibold ${classes}`}>{titleCase(status)}</span>;
}

function Pagination({ links }: { links: { url: string | null; label: string; active: boolean }[] }) {
    return (
        <div className="flex flex-wrap gap-2 border-t border-zinc-200 px-4 py-3">
            {links.map((link, index) => (
                <button
                    className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                        link.active ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50'
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                    disabled={! link.url}
                    key={`${link.label}-${index}`}
                    onClick={() => link.url && router.visit(link.url, { preserveScroll: true })}
                    type="button"
                >
                    <span dangerouslySetInnerHTML={{ __html: link.label }} />
                </button>
            ))}
        </div>
    );
}

function formatDate(value?: string | null) {
    if (! value) {
        return 'Not set';
    }

    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function titleCase(value: string) {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
