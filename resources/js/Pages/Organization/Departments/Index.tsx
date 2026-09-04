import { Head, router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import AppLayout from '../../../Layouts/AppLayout';
import type { Department, Employee, Paginated } from '../../../types';

type Props = {
    departments: Paginated<Department>;
    managers: Employee[];
    filters: {
        search: string;
        status: string;
    };
};

type DepartmentForm = {
    name: string;
    code: string;
    description: string;
    manager_id: string;
    is_active: boolean;
};

const emptyForm: DepartmentForm = {
    name: '',
    code: '',
    description: '',
    manager_id: '',
    is_active: true,
};

export default function Index({ departments, managers, filters }: Props) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Department | null>(null);
    const [deleting, setDeleting] = useState<Department | null>(null);

    const form = useForm<DepartmentForm>(emptyForm);

    const title = useMemo(() => (editing ? 'Edit Department' : 'New Department'), [editing]);

    function openCreateDialog() {
        setEditing(null);
        form.setData(emptyForm);
        form.clearErrors();
        setDialogOpen(true);
    }

    function openEditDialog(department: Department) {
        setEditing(department);
        form.setData({
            name: department.name,
            code: department.code,
            description: department.description ?? '',
            manager_id: department.manager_id ? String(department.manager_id) : '',
            is_active: department.is_active,
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
            form.put(`/organization/departments/${editing.id}`, options);
            return;
        }

        form.post('/organization/departments', options);
    }

    function destroyDepartment() {
        if (! deleting) {
            return;
        }

        router.delete(`/organization/departments/${deleting.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleting(null),
        });
    }

    function updateFilters(nextFilters: Partial<Props['filters']>) {
        router.get(
            '/organization/departments',
            { ...filters, ...nextFilters },
            { preserveScroll: true, preserveState: true, replace: true },
        );
    }

    return (
        <AppLayout>
            <Head title="Departments" />

            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Departments</h1>
                        <p className="mt-1 text-sm text-zinc-600">
                            Manage organization units, assigned managers, and related employee totals.
                        </p>
                    </div>
                    <button
                        className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                        onClick={openCreateDialog}
                        type="button"
                    >
                        Add Department
                    </button>
                </div>

                <section className="rounded-lg border border-zinc-200 bg-white p-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                        <input
                            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            onChange={(event) => updateFilters({ search: event.target.value })}
                            placeholder="Search name, code, or description"
                            type="search"
                            value={filters.search}
                        />
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
                                    <th className="px-4 py-3">Department</th>
                                    <th className="px-4 py-3">Manager</th>
                                    <th className="px-4 py-3">Employees</th>
                                    <th className="px-4 py-3">Positions</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {departments.data.map((department) => (
                                    <tr key={department.id}>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-zinc-950">{department.name}</p>
                                            <p className="mt-1 text-xs text-zinc-500">{department.code}</p>
                                        </td>
                                        <td className="px-4 py-3 text-zinc-700">{department.manager?.full_name ?? 'Unassigned'}</td>
                                        <td className="px-4 py-3 text-zinc-700">{department.employees_count}</td>
                                        <td className="px-4 py-3 text-zinc-700">{department.positions_count}</td>
                                        <td className="px-4 py-3">
                                            <span className={`rounded-md px-2 py-1 text-xs font-semibold ${department.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>
                                                {department.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-50" onClick={() => openEditDialog(department)} type="button">
                                                    Edit
                                                </button>
                                                <button className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50" onClick={() => setDeleting(department)} type="button">
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {departments.data.length === 0 && (
                                    <tr>
                                        <td className="px-4 py-8 text-center text-zinc-500" colSpan={6}>
                                            No departments match the current filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <Pagination links={departments.links} />
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
                            <Field error={form.errors.code} label="Code">
                                <input className="form-input" onChange={(event) => form.setData('code', event.target.value.toUpperCase())} value={form.data.code} />
                            </Field>
                            <Field error={form.errors.manager_id} label="Manager">
                                <select className="form-input" onChange={(event) => form.setData('manager_id', event.target.value)} value={form.data.manager_id}>
                                    <option value="">No manager</option>
                                    {managers.map((manager) => (
                                        <option key={manager.id} value={manager.id}>
                                            {manager.full_name}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field error={form.errors.description} label="Description">
                                <textarea className="form-input min-h-24" onChange={(event) => form.setData('description', event.target.value)} value={form.data.description} />
                            </Field>
                            <label className="flex items-center gap-3 text-sm font-medium text-zinc-700">
                                <input checked={form.data.is_active} onChange={(event) => form.setData('is_active', event.target.checked)} type="checkbox" />
                                Active department
                            </label>
                            <div className="flex justify-end gap-3 pt-2">
                                <button className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50" onClick={() => setDialogOpen(false)} type="button">
                                    Cancel
                                </button>
                                <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50" disabled={form.processing} type="submit">
                                    {editing ? 'Save Changes' : 'Create Department'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleting && (
                <div className="fixed inset-0 z-40 grid place-items-center bg-zinc-950/40 px-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
                        <h2 className="text-lg font-semibold">Delete Department</h2>
                        <p className="mt-2 text-sm text-zinc-600">
                            Delete {deleting.name}? Departments with employees are protected by the controller.
                        </p>
                        <div className="mt-5 flex justify-end gap-3">
                            <button className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50" onClick={() => setDeleting(null)} type="button">
                                Cancel
                            </button>
                            <button className="rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600" onClick={destroyDepartment} type="button">
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
