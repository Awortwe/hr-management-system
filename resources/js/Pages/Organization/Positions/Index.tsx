import { Head, router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import AppLayout from '../../../Layouts/AppLayout';
import type { Department, Paginated, Position } from '../../../types';

type Props = {
    positions: Paginated<Position>;
    departments: Pick<Department, 'id' | 'name'>[];
    filters: {
        search: string;
        department: string;
        status: string;
    };
};

type PositionForm = {
    department_id: string;
    title: string;
    code: string;
    description: string;
    is_active: boolean;
};

const emptyForm: PositionForm = {
    department_id: '',
    title: '',
    code: '',
    description: '',
    is_active: true,
};

export default function Index({ positions, departments, filters }: Props) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Position | null>(null);
    const [deleting, setDeleting] = useState<Position | null>(null);
    const form = useForm<PositionForm>(emptyForm);

    const title = useMemo(() => (editing ? 'Edit Position' : 'New Position'), [editing]);

    function openCreateDialog() {
        setEditing(null);
        form.setData({ ...emptyForm, department_id: filters.department });
        form.clearErrors();
        setDialogOpen(true);
    }

    function openEditDialog(position: Position) {
        setEditing(position);
        form.setData({
            department_id: position.department_id ? String(position.department_id) : '',
            title: position.title,
            code: position.code,
            description: position.description ?? '',
            is_active: position.is_active,
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
            form.put(`/organization/positions/${editing.id}`, options);
            return;
        }

        form.post('/organization/positions', options);
    }

    function destroyPosition() {
        if (! deleting) {
            return;
        }

        router.delete(`/organization/positions/${deleting.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleting(null),
        });
    }

    function updateFilters(nextFilters: Partial<Props['filters']>) {
        router.get(
            '/organization/positions',
            { ...filters, ...nextFilters },
            { preserveScroll: true, preserveState: true, replace: true },
        );
    }

    return (
        <AppLayout>
            <Head title="Positions" />

            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Positions</h1>
                        <p className="mt-1 text-sm text-zinc-600">
                            Manage job titles and their department mapping before employee controllers exist.
                        </p>
                    </div>
                    <button
                        className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                        onClick={openCreateDialog}
                        type="button"
                    >
                        Add Position
                    </button>
                </div>

                <section className="rounded-lg border border-zinc-200 bg-white p-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_220px_180px]">
                        <input
                            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            onChange={(event) => updateFilters({ search: event.target.value })}
                            placeholder="Search title, code, or description"
                            type="search"
                            value={filters.search}
                        />
                        <select
                            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            onChange={(event) => updateFilters({ department: event.target.value })}
                            value={filters.department}
                        >
                            <option value="">All departments</option>
                            {departments.map((department) => (
                                <option key={department.id} value={department.id}>
                                    {department.name}
                                </option>
                            ))}
                        </select>
                        <select
                            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            onChange={(event) => updateFilters({ status: event.target.value })}
                            value={filters.status}
                        >
                            <option value="all">All statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </section>

                <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-zinc-200 text-sm">
                            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                <tr>
                                    <th className="px-4 py-3">Position</th>
                                    <th className="px-4 py-3">Department</th>
                                    <th className="px-4 py-3">Employees</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {positions.data.map((position) => (
                                    <tr key={position.id}>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-zinc-950">{position.title}</p>
                                            <p className="mt-1 text-xs text-zinc-500">{position.code}</p>
                                        </td>
                                        <td className="px-4 py-3 text-zinc-700">{position.department?.name ?? 'Unassigned'}</td>
                                        <td className="px-4 py-3 text-zinc-700">{position.employees_count}</td>
                                        <td className="px-4 py-3">
                                            <span className={`rounded-md px-2 py-1 text-xs font-semibold ${position.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>
                                                {position.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-50" onClick={() => openEditDialog(position)} type="button">
                                                    Edit
                                                </button>
                                                <button className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50" onClick={() => setDeleting(position)} type="button">
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {positions.data.length === 0 && (
                                    <tr>
                                        <td className="px-4 py-8 text-center text-zinc-500" colSpan={5}>
                                            No positions match the selected department or filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <Pagination links={positions.links} />
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
                            <Field error={form.errors.department_id} label="Department">
                                <select className="form-input" onChange={(event) => form.setData('department_id', event.target.value)} value={form.data.department_id}>
                                    <option value="">No department</option>
                                    {departments.map((department) => (
                                        <option key={department.id} value={department.id}>
                                            {department.name}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field error={form.errors.title} label="Title">
                                <input className="form-input" onChange={(event) => form.setData('title', event.target.value)} value={form.data.title} />
                            </Field>
                            <Field error={form.errors.code} label="Code">
                                <input className="form-input" onChange={(event) => form.setData('code', event.target.value.toUpperCase())} value={form.data.code} />
                            </Field>
                            <Field error={form.errors.description} label="Description">
                                <textarea className="form-input min-h-24" onChange={(event) => form.setData('description', event.target.value)} value={form.data.description} />
                            </Field>
                            <label className="flex items-center gap-3 text-sm font-medium text-zinc-700">
                                <input checked={form.data.is_active} onChange={(event) => form.setData('is_active', event.target.checked)} type="checkbox" />
                                Active position
                            </label>
                            <div className="flex justify-end gap-3 pt-2">
                                <button className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50" onClick={() => setDialogOpen(false)} type="button">
                                    Cancel
                                </button>
                                <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50" disabled={form.processing} type="submit">
                                    {editing ? 'Save Changes' : 'Create Position'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleting && (
                <div className="fixed inset-0 z-40 grid place-items-center bg-zinc-950/40 px-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
                        <h2 className="text-lg font-semibold">Delete Position</h2>
                        <p className="mt-2 text-sm text-zinc-600">
                            Delete {deleting.title}? Positions assigned to employees are protected by the controller.
                        </p>
                        <div className="mt-5 flex justify-end gap-3">
                            <button className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50" onClick={() => setDeleting(null)} type="button">
                                Cancel
                            </button>
                            <button className="rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600" onClick={destroyPosition} type="button">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
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
