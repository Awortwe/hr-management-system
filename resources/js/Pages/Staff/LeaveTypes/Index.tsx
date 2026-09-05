import { router, useForm } from '@inertiajs/react';
import Head from '../../../Components/PageHead';
import SearchBar from '../../../Components/SearchBar';
import { useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import AppLayout from '../../../Layouts/AppLayout';
import type { LeaveType } from '../../../types';

type Props = {
    filters: { search: string };
    leaveTypes: LeaveType[];
};

type LeaveTypeForm = {
    name: string;
    annual_allowance_days: string;
    is_paid: boolean;
    color: string;
    is_active: boolean;
};

const emptyForm: LeaveTypeForm = {
    name: '',
    annual_allowance_days: '0',
    is_paid: true,
    color: '#2563eb',
    is_active: true,
};

export default function Index({ leaveTypes, filters }: Props) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<LeaveType | null>(null);
    const [deleting, setDeleting] = useState<LeaveType | null>(null);
    const form = useForm<LeaveTypeForm>(emptyForm);

    const title = useMemo(() => (editing ? 'Edit Leave Type' : 'New Leave Type'), [editing]);
    const activeCount = leaveTypes.filter((leaveType) => leaveType.is_active).length;
    const paidCount = leaveTypes.filter((leaveType) => leaveType.is_paid).length;

    function openCreateDialog() {
        setEditing(null);
        form.setData(emptyForm);
        form.clearErrors();
        setDialogOpen(true);
    }

    function openEditDialog(leaveType: LeaveType) {
        setEditing(leaveType);
        form.setData({
            name: leaveType.name,
            annual_allowance_days: String(leaveType.annual_allowance_days),
            is_paid: leaveType.is_paid,
            color: leaveType.color ?? '#2563eb',
            is_active: leaveType.is_active,
        });
        form.clearErrors();
        setDialogOpen(true);
    }

    function submit(event: FormEvent) {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setDialogOpen(false);
                setEditing(null);
                form.reset();
            },
        };

        if (editing) {
            form.put(`/staff/leave-types/${editing.id}`, options);
            return;
        }

        form.post('/staff/leave-types', options);
    }

    function destroyLeaveType() {
        if (! deleting) {
            return;
        }

        router.delete(`/staff/leave-types/${deleting.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleting(null),
        });
    }

    return (
        <AppLayout>
            <Head title="Leave Types" />

            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Leave Types</h1>
                        <p className="mt-1 text-sm text-zinc-600">
                            Configure the stable leave categories used by balances and requests.
                        </p>
                    </div>
                    <button
                        className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                        onClick={openCreateDialog}
                        type="button"
                    >
                        Add Leave Type
                    </button>
                </div>

                <SearchBar href="/staff/leave-types" filters={filters} label="Search leave types" />
                <section className="grid gap-3 sm:grid-cols-3">
                    <Metric label="Leave Types" value={String(leaveTypes.length)} />
                    <Metric label="Active" value={String(activeCount)} />
                    <Metric label="Paid" value={String(paidCount)} />
                </section>

                <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-zinc-200 text-sm">
                            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                <tr>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Allowance</th>
                                    <th className="px-4 py-3">Paid</th>
                                    <th className="px-4 py-3">Balances</th>
                                    <th className="px-4 py-3">Requests</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {leaveTypes.map((leaveType) => (
                                    <tr key={leaveType.id}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <span className="h-4 w-4 rounded-sm border border-zinc-200" style={{ backgroundColor: leaveType.color ?? '#2563eb' }} />
                                                <div>
                                                    <p className="font-medium text-zinc-950">{leaveType.name}</p>
                                                    <p className="mt-1 text-xs text-zinc-500">{leaveType.color}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-zinc-700">{leaveType.annual_allowance_days} days</td>
                                        <td className="px-4 py-3">
                                            <BooleanBadge active={leaveType.is_paid} falseLabel="Unpaid" trueLabel="Paid" />
                                        </td>
                                        <td className="px-4 py-3 text-zinc-700">{leaveType.balances_count ?? 0}</td>
                                        <td className="px-4 py-3 text-zinc-700">{leaveType.requests_count ?? 0}</td>
                                        <td className="px-4 py-3">
                                            <BooleanBadge active={leaveType.is_active} falseLabel="Inactive" trueLabel="Active" />
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-50" onClick={() => openEditDialog(leaveType)} type="button">
                                                    Edit
                                                </button>
                                                <button className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50" onClick={() => setDeleting(leaveType)} type="button">
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {leaveTypes.length === 0 && (
                                    <tr>
                                        <td className="px-4 py-8 text-center text-zinc-500" colSpan={7}>
                                            No leave types have been configured.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {dialogOpen && (
                <div className="fixed inset-0 z-40 grid place-items-center bg-zinc-950/40 px-4">
                    <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">{title}</h2>
                            <button className="rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100" onClick={() => setDialogOpen(false)} type="button">
                                Close
                            </button>
                        </div>
                        <form className="mt-5 space-y-4" onSubmit={submit}>
                            <Field error={form.errors.name} label="Name">
                                <input className="form-input" onChange={(event) => form.setData('name', event.target.value)} value={form.data.name} />
                            </Field>
                            <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
                                <Field error={form.errors.annual_allowance_days} label="Annual Allowance Days">
                                    <input className="form-input" min="0" onChange={(event) => form.setData('annual_allowance_days', event.target.value)} type="number" value={form.data.annual_allowance_days} />
                                </Field>
                                <Field error={form.errors.color} label="Color">
                                    <input className="h-10 w-full rounded-md border border-zinc-300 p-1" onChange={(event) => form.setData('color', event.target.value)} type="color" value={form.data.color} />
                                </Field>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3 text-sm font-medium text-zinc-700">
                                    <input checked={form.data.is_paid} onChange={(event) => form.setData('is_paid', event.target.checked)} type="checkbox" />
                                    Paid leave
                                </label>
                                <label className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3 text-sm font-medium text-zinc-700">
                                    <input checked={form.data.is_active} onChange={(event) => form.setData('is_active', event.target.checked)} type="checkbox" />
                                    Active type
                                </label>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50" onClick={() => setDialogOpen(false)} type="button">
                                    Cancel
                                </button>
                                <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50" disabled={form.processing} type="submit">
                                    {editing ? 'Save Changes' : 'Create Leave Type'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleting && (
                <div className="fixed inset-0 z-40 grid place-items-center bg-zinc-950/40 px-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
                        <h2 className="text-lg font-semibold">Delete Leave Type</h2>
                        <p className="mt-2 text-sm text-zinc-600">
                            Delete {deleting.name}? Types with balances or requests are protected by the controller.
                        </p>
                        <div className="mt-5 flex justify-end gap-3">
                            <button className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50" onClick={() => setDeleting(null)} type="button">
                                Cancel
                            </button>
                            <button className="rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600" onClick={destroyLeaveType} type="button">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
    );
}

function BooleanBadge({ active, falseLabel, trueLabel }: { active: boolean; falseLabel: string; trueLabel: string }) {
    return (
        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>
            {active ? trueLabel : falseLabel}
        </span>
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
