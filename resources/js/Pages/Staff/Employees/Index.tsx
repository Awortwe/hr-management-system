import { Head, Link, router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import AppLayout from '../../../Layouts/AppLayout';
import type { Department, Employee, Paginated, Position, User } from '../../../types';

type Props = {
    employees: Paginated<Employee>;
    departments: Pick<Department, 'id' | 'name'>[];
    positions: Pick<Position, 'id' | 'department_id' | 'title'>[];
    managers: Pick<Employee, 'id' | 'full_name'>[];
    users: User[];
    filters: {
        search: string;
        department: string;
        status: string;
    };
    statuses: string[];
};

type EmployeeForm = {
    user_id: string;
    department_id: string;
    position_id: string;
    manager_id: string;
    employee_number: string;
    first_name: string;
    middle_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    profile_photo: File | null;
    delete_profile_photo: boolean;
    work_email: string;
    personal_email: string;
    phone: string;
    residential_address: string;
    city_region: string;
    hire_date: string;
    employment_type: string;
    status: string;
    work_location: string;
    emergency_contact_name: string;
    emergency_contact_relationship: string;
    emergency_contact_phone: string;
    basic_salary: string;
    currency: string;
    bank_name: string;
    bank_account_name: string;
    bank_account_number: string;
    tax_reference: string;
    ssnit_reference: string;
};

const emptyForm: EmployeeForm = {
    user_id: '',
    department_id: '',
    position_id: '',
    manager_id: '',
    employee_number: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    profile_photo: null,
    delete_profile_photo: false,
    work_email: '',
    personal_email: '',
    phone: '',
    residential_address: '',
    city_region: '',
    hire_date: '',
    employment_type: 'full_time',
    status: 'active',
    work_location: '',
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_phone: '',
    basic_salary: '',
    currency: 'GHS',
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    tax_reference: '',
    ssnit_reference: '',
};

export default function Index({ employees, departments, positions, managers, users, filters, statuses }: Props) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Employee | null>(null);
    const [deleting, setDeleting] = useState<Employee | null>(null);

    const form = useForm<EmployeeForm>(emptyForm);

    const filteredPositions = useMemo(
        () => positions.filter((position) => String(position.department_id) === form.data.department_id),
        [positions, form.data.department_id],
    );
    const title = editing ? 'Edit Employee' : 'New Employee';

    function openCreateDialog() {
        setEditing(null);
        form.transform((data) => data);
        form.setData({ ...emptyForm, department_id: filters.department });
        form.clearErrors();
        setDialogOpen(true);
    }

    function openEditDialog(employee: Employee) {
        setEditing(employee);
        form.transform((data) => data);
        form.setData({
            ...emptyForm,
            user_id: employee.user_id ? String(employee.user_id) : '',
            department_id: employee.department_id ? String(employee.department_id) : '',
            position_id: employee.position_id ? String(employee.position_id) : '',
            manager_id: employee.manager_id ? String(employee.manager_id) : '',
            employee_number: employee.employee_number ?? '',
            first_name: employee.first_name ?? '',
            middle_name: employee.middle_name ?? '',
            last_name: employee.last_name ?? '',
            date_of_birth: employee.date_of_birth ?? '',
            gender: employee.gender ?? '',
            work_email: employee.work_email ?? '',
            personal_email: employee.personal_email ?? '',
            phone: employee.phone ?? '',
            residential_address: employee.residential_address ?? '',
            city_region: employee.city_region ?? '',
            hire_date: employee.hire_date ?? '',
            employment_type: employee.employment_type ?? 'full_time',
            work_location: employee.work_location ?? '',
            emergency_contact_name: employee.emergency_contact_name ?? '',
            emergency_contact_relationship: employee.emergency_contact_relationship ?? '',
            emergency_contact_phone: employee.emergency_contact_phone ?? '',
            basic_salary: employee.basic_salary ?? '0',
            currency: employee.currency ?? 'GHS',
            bank_name: employee.bank_name ?? '',
            bank_account_name: employee.bank_account_name ?? '',
            bank_account_number: employee.bank_account_number ?? '',
            tax_reference: employee.tax_reference ?? '',
            ssnit_reference: employee.ssnit_reference ?? '',
            status: employee.status ?? 'active',
        });
        form.clearErrors();
        setDialogOpen(true);
    }

    function updateDepartment(departmentId: string) {
        form.setData((data) => {
            const selectedPosition = positions.find((position) => String(position.id) === data.position_id);

            return {
                ...data,
                department_id: departmentId,
                position_id: selectedPosition && String(selectedPosition.department_id) === departmentId ? data.position_id : '',
            };
        });
    }

    function submit(event: FormEvent) {
        event.preventDefault();

        const options = {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setDialogOpen(false);
                setEditing(null);
                form.reset();
            },
        };

        if (editing) {
            form.transform((data) => ({ ...data, _method: 'patch' }));
            form.post(`/staff/employees/${editing.id}`, options);
            return;
        }

        form.transform((data) => data);
        form.post('/staff/employees', options);
    }

    function destroyEmployee() {
        if (! deleting) {
            return;
        }

        router.delete(`/staff/employees/${deleting.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleting(null),
        });
    }

    function updateFilters(nextFilters: Partial<Props['filters']>) {
        router.get('/staff/employees', { ...filters, ...nextFilters }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    }

    return (
        <AppLayout>
            <Head title="Employees" />

            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Employees</h1>
                        <p className="mt-1 text-sm text-zinc-600">
                            Manage profiles, reporting lines, photos, and employment details.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <a
                            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
                            href={`/staff/employees/export?${new URLSearchParams(filters).toString()}`}
                        >
                            Export CSV
                        </a>
                        <button
                            className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                            onClick={openCreateDialog}
                            type="button"
                        >
                            Add Employee
                        </button>
                    </div>
                </div>

                <section className="rounded-lg border border-zinc-200 bg-white p-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_220px_180px]">
                        <input
                            className="form-input"
                            onChange={(event) => updateFilters({ search: event.target.value })}
                            placeholder="Search name, number, email, or phone"
                            type="search"
                            value={filters.search}
                        />
                        <select className="form-input" onChange={(event) => updateFilters({ department: event.target.value })} value={filters.department}>
                            <option value="">All departments</option>
                            {departments.map((department) => (
                                <option key={department.id} value={department.id}>
                                    {department.name}
                                </option>
                            ))}
                        </select>
                        <select className="form-input" onChange={(event) => updateFilters({ status: event.target.value })} value={filters.status}>
                            <option value="">All statuses</option>
                            {statuses.map((status) => (
                                <option key={status} value={status}>
                                    {titleCase(status)}
                                </option>
                            ))}
                        </select>
                    </div>
                </section>

                <section>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {employees.data.map((employee) => (
                            <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm" key={employee.id}>
                                <div className="flex items-start gap-4">
                                    <Avatar employee={employee} size="lg" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h2 className="truncate text-base font-semibold">{employee.full_name}</h2>
                                                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500">{employee.employee_number}</p>
                                            </div>
                                            <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                                                {titleCase(employee.status ?? 'active')}
                                            </span>
                                        </div>
                                        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                            <Stat label="Department" value={employee.department?.name ?? 'Unassigned'} />
                                            <Stat label="Position" value={employee.position?.title ?? 'Unassigned'} />
                                            <Stat label="Manager" value={employee.manager?.full_name ?? 'None'} />
                                            <Stat label="Leave" value={`${employee.leave_requests_count ?? 0} requests`} />
                                        </dl>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-zinc-100 pt-4">
                                    <Link className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-50" href={`/staff/employees/${employee.id}`}>
                                        View Profile
                                    </Link>
                                    <div className="flex gap-2">
                                        <button className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-50" onClick={() => openEditDialog(employee)} type="button">
                                            Edit
                                        </button>
                                        <button className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50" onClick={() => setDeleting(employee)} type="button">
                                            Archive
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>

                    {employees.data.length === 0 && (
                        <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-12 text-center text-sm text-zinc-500">
                            No employees match the current filters.
                        </div>
                    )}

                    <Pagination links={employees.links} />
                </section>
            </div>

            {dialogOpen && (
                <div className="fixed inset-0 z-40 overflow-y-auto bg-zinc-950/40 px-4 py-8">
                    <div className="mx-auto w-full max-w-4xl rounded-lg bg-white p-5 shadow-xl">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">{title}</h2>
                            <button className="rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100" onClick={() => setDialogOpen(false)} type="button">
                                Close
                            </button>
                        </div>

                        <form className="mt-5 space-y-5" onSubmit={submit}>
                            <div className="grid gap-4 md:grid-cols-3">
                                <Field error={form.errors.employee_number} label="Employee Number">
                                    <input className="form-input" onChange={(event) => form.setData('employee_number', event.target.value.toUpperCase())} value={form.data.employee_number} />
                                </Field>
                                <Field error={form.errors.user_id} label="User Account">
                                    <select className="form-input" onChange={(event) => form.setData('user_id', event.target.value)} value={form.data.user_id}>
                                        <option value="">No login account</option>
                                        {editing?.user && (
                                            <option value={editing.user.id}>
                                                {editing.user.name} ({editing.user.email})
                                            </option>
                                        )}
                                        {users.map((user) => (
                                            <option key={user.id} value={user.id}>
                                                {user.name} ({user.role})
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field error={form.errors.status} label="Status">
                                    <select className="form-input" onChange={(event) => form.setData('status', event.target.value)} value={form.data.status}>
                                        {statuses.map((status) => (
                                            <option key={status} value={status}>
                                                {titleCase(status)}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <Field error={form.errors.first_name} label="First Name">
                                    <input className="form-input" onChange={(event) => form.setData('first_name', event.target.value)} value={form.data.first_name} />
                                </Field>
                                <Field error={form.errors.middle_name} label="Middle Name">
                                    <input className="form-input" onChange={(event) => form.setData('middle_name', event.target.value)} value={form.data.middle_name} />
                                </Field>
                                <Field error={form.errors.last_name} label="Last Name">
                                    <input className="form-input" onChange={(event) => form.setData('last_name', event.target.value)} value={form.data.last_name} />
                                </Field>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <Field error={form.errors.department_id} label="Department">
                                    <select className="form-input" onChange={(event) => updateDepartment(event.target.value)} value={form.data.department_id}>
                                        <option value="">Select department</option>
                                        {departments.map((department) => (
                                            <option key={department.id} value={department.id}>
                                                {department.name}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field error={form.errors.position_id} label="Position">
                                    <select className="form-input" disabled={! form.data.department_id} onChange={(event) => form.setData('position_id', event.target.value)} value={form.data.position_id}>
                                        <option value="">Select position</option>
                                        {filteredPositions.map((position) => (
                                            <option key={position.id} value={position.id}>
                                                {position.title}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field error={form.errors.manager_id} label="Manager">
                                    <select className="form-input" onChange={(event) => form.setData('manager_id', event.target.value)} value={form.data.manager_id}>
                                        <option value="">No manager</option>
                                        {managers
                                            .filter((manager) => manager.id !== editing?.id)
                                            .map((manager) => (
                                                <option key={manager.id} value={manager.id}>
                                                    {manager.full_name}
                                                </option>
                                            ))}
                                    </select>
                                </Field>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <Field error={form.errors.hire_date} label="Hire Date">
                                    <input className="form-input" onChange={(event) => form.setData('hire_date', event.target.value)} type="date" value={form.data.hire_date} />
                                </Field>
                                <Field error={form.errors.employment_type} label="Employment Type">
                                    <select className="form-input" onChange={(event) => form.setData('employment_type', event.target.value)} value={form.data.employment_type}>
                                        <option value="full_time">Full Time</option>
                                        <option value="part_time">Part Time</option>
                                        <option value="contract">Contract</option>
                                    </select>
                                </Field>
                                <Field error={form.errors.basic_salary} label="Basic Salary">
                                    <input className="form-input" min="0" onChange={(event) => form.setData('basic_salary', event.target.value)} type="number" value={form.data.basic_salary} />
                                </Field>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <Field error={form.errors.work_email} label="Work Email">
                                    <input className="form-input" onChange={(event) => form.setData('work_email', event.target.value)} type="email" value={form.data.work_email} />
                                </Field>
                                <Field error={form.errors.phone} label="Phone">
                                    <input className="form-input" onChange={(event) => form.setData('phone', event.target.value)} value={form.data.phone} />
                                </Field>
                                <Field error={form.errors.work_location} label="Work Location">
                                    <input className="form-input" onChange={(event) => form.setData('work_location', event.target.value)} value={form.data.work_location} />
                                </Field>
                            </div>

                            <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                                <Field error={form.errors.profile_photo} label="Profile Photo">
                                    <input
                                        accept="image/jpeg,image/png,image/webp"
                                        className="form-input"
                                        onChange={(event) => form.setData('profile_photo', event.target.files?.[0] ?? null)}
                                        type="file"
                                    />
                                </Field>
                                <div className="flex items-end">
                                    <label className="flex items-center gap-3 pb-2 text-sm font-medium text-zinc-700">
                                        <input checked={form.data.delete_profile_photo} onChange={(event) => form.setData('delete_profile_photo', event.target.checked)} type="checkbox" />
                                        Remove current photo
                                    </label>
                                </div>
                            </div>

                            {form.progress && (
                                <div>
                                    <div className="h-2 overflow-hidden rounded-md bg-zinc-100">
                                        <div className="h-full bg-blue-700 transition-all" style={{ width: `${form.progress.percentage}%` }} />
                                    </div>
                                    <p className="mt-1 text-xs font-medium text-zinc-500">{form.progress.percentage}% uploaded</p>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 border-t border-zinc-100 pt-4">
                                <button className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50" onClick={() => setDialogOpen(false)} type="button">
                                    Cancel
                                </button>
                                <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50" disabled={form.processing} type="submit">
                                    {editing ? 'Save Changes' : 'Create Employee'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleting && (
                <div className="fixed inset-0 z-40 grid place-items-center bg-zinc-950/40 px-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
                        <h2 className="text-lg font-semibold">Archive Employee</h2>
                        <p className="mt-2 text-sm text-zinc-600">
                            Archive {deleting.full_name}? Their profile photo file will be removed and the employee record will be soft deleted.
                        </p>
                        <div className="mt-5 flex justify-end gap-3">
                            <button className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50" onClick={() => setDeleting(null)} type="button">
                                Cancel
                            </button>
                            <button className="rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600" onClick={destroyEmployee} type="button">
                                Archive
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}

function Avatar({ employee, size = 'md' }: { employee: Employee; size?: 'md' | 'lg' }) {
    const classes = size === 'lg' ? 'h-16 w-16 text-lg' : 'h-12 w-12 text-sm';

    if (employee.avatar_url) {
        return <img alt="" className={`${classes} shrink-0 rounded-lg object-cover`} src={employee.avatar_url} />;
    }

    return (
        <div className={`${classes} grid shrink-0 place-items-center rounded-lg bg-blue-50 font-semibold text-blue-700`}>
            {initials(employee.full_name)}
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

function Pagination({ links }: { links: { url: string | null; label: string; active: boolean }[] }) {
    return (
        <div className="mt-5 flex flex-wrap gap-2">
            {links.map((link, index) => (
                <button
                    className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                        link.active ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
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

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
            <dd className="mt-1 truncate font-medium text-zinc-800">{value}</dd>
        </div>
    );
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
