import { Link, router, useForm, usePage } from '@inertiajs/react';
import Head from '../../Components/PageHead';
import SearchBar from '../../Components/SearchBar';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import type { Paginated, PageProps, Role, User } from '../../types';

export default function Users({
    users,
    roles,
    filters,
}: {
    users: Paginated<User>;
    roles: Role[];
    filters: { search: string };
}) {
    const { auth } = usePage<PageProps>().props;
    const [editing, setEditing] = useState<User | null>(null);
    const [open, setOpen] = useState(false);
    const [deleting, setDeleting] = useState<User | null>(null);
    const [deletingBusy, setDeletingBusy] = useState(false);
    const form = useForm({
        name: '',
        email: '',
        role: 'employee' as Role,
        password: '',
        password_confirmation: '',
    });
    function edit(user: User | null) {
        setEditing(user);
        form.setData({
            name: user?.name ?? '',
            email: user?.email ?? '',
            role: user?.role ?? 'employee',
            password: '',
            password_confirmation: '',
        });
        form.clearErrors();
        setOpen(true);
    }
    function submit(event: FormEvent) {
        event.preventDefault();
        const options = {
            onSuccess: () => {
                setOpen(false);
                form.reset();
            },
        };
        if (editing) form.patch(`/admin/users/${editing.id}`, options);
        else form.post('/admin/users', options);
    }
    return (
        <AppLayout>
            <Head title="User Accounts" />
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold">User Accounts</h1>
                <button
                    title="Add account"
                    aria-label="Add account"
                    className="rounded-md bg-zinc-950 p-2 text-white"
                    onClick={() => edit(null)}
                >
                    <Plus size={20} />
                </button>
            </div>
            <SearchBar href="/admin/users" filters={filters} label="Search name, email, or employee number" />
            <p className="text-sm text-zinc-500">{users.total} accounts</p>
            <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr>
                            {['Name', 'Email', 'Role', 'Actions'].map(
                                (label) => (
                                    <th className="p-3" key={label}>
                                        {label}
                                    </th>
                                ),
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {users.data.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-zinc-500">No accounts match your search.</td></tr>}
                        {users.data.map((user) => (
                            <tr
                                className="border-t border-zinc-200"
                                key={user.id}
                            >
                                <td className="p-3">{user.name}</td>
                                <td className="p-3">{user.email}</td>
                                <td className="p-3 uppercase">{user.role}</td>
                                <td className="p-3">
                                    <div className="flex gap-2">
                                        <button
                                            className="p-2"
                                            title={`Edit ${user.name}`}
                                            aria-label={`Edit ${user.name}`}
                                            onClick={() => edit(user)}
                                        >
                                            <Pencil size={18} />
                                        </button>
                                        <button
                                            className="p-2 text-rose-700 disabled:opacity-30"
                                            disabled={auth.user?.id === user.id}
                                            title={`Delete ${user.name}`}
                                            aria-label={`Delete ${user.name}`}
                                            onClick={() => setDeleting(user)}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <nav className="mt-4 flex justify-between">
                {users.prev_page_url ? (
                    <Link href={users.prev_page_url}>Previous</Link>
                ) : (
                    <span />
                )}
                {users.next_page_url && (
                    <Link href={users.next_page_url}>Next</Link>
                )}
            </nav>
            {open && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="account-title"
                        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-5"
                    >
                        <div className="flex justify-between">
                            <h2
                                id="account-title"
                                className="text-lg font-semibold"
                            >
                                {editing ? 'Edit Account' : 'New Account'}
                            </h2>
                            <button
                                title="Close"
                                aria-label="Close"
                                onClick={() => setOpen(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form className="mt-5 space-y-4" onSubmit={submit}>
                            <label className="block text-sm">
                                Name
                                <input
                                    required
                                    className="form-input mt-1"
                                    value={form.data.name}
                                    onChange={(event) =>
                                        form.setData('name', event.target.value)
                                    }
                                />
                            </label>
                            <label className="block text-sm">
                                Email
                                <input
                                    required
                                    type="email"
                                    className="form-input mt-1"
                                    value={form.data.email}
                                    onChange={(event) =>
                                        form.setData(
                                            'email',
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                            <label className="block text-sm">
                                Role
                                <select
                                    className="form-input mt-1"
                                    value={form.data.role}
                                    onChange={(event) =>
                                        form.setData(
                                            'role',
                                            event.target.value as Role,
                                        )
                                    }
                                >
                                    {roles.map((role) => (
                                        <option value={role} key={role}>
                                            {role.toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block text-sm">
                                {editing
                                    ? 'New Password (optional)'
                                    : 'Password'}
                                <input
                                    required={!editing}
                                    minLength={12}
                                    autoComplete="new-password"
                                    type="password"
                                    className="form-input mt-1"
                                    value={form.data.password}
                                    onChange={(event) =>
                                        form.setData(
                                            'password',
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                            <label className="block text-sm">
                                Confirm Password
                                <input
                                    autoComplete="new-password"
                                    type="password"
                                    className="form-input mt-1"
                                    value={form.data.password_confirmation}
                                    onChange={(event) =>
                                        form.setData(
                                            'password_confirmation',
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                            {Object.values(form.errors).map((error) => (
                                <p
                                    role="alert"
                                    className="text-sm text-rose-700"
                                    key={error}
                                >
                                    {error}
                                </p>
                            ))}
                            <button
                                disabled={form.processing}
                                className="rounded-md bg-zinc-950 px-4 py-2 text-white disabled:opacity-50"
                            >
                                Save Account
                            </button>
                        </form>
                    </section>
                </div>
            )}
            {deleting && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-title"
                        className="w-full max-w-sm rounded-lg bg-white p-5"
                    >
                        <h2 id="delete-title" className="font-semibold">
                            Delete {deleting.name}'s account?
                        </h2>
                        <p className="mt-3 text-sm text-zinc-600">
                            This removes their login access.
                        </p>
                        <div className="mt-5 flex justify-end gap-3">
                            <button
                                disabled={deletingBusy}
                                onClick={() => setDeleting(null)}
                            >
                                Cancel
                            </button>
                            <button
                                disabled={deletingBusy}
                                className="rounded-md bg-rose-700 px-3 py-2 text-white disabled:opacity-50"
                                onClick={() => {
                                    setDeletingBusy(true);
                                    router.delete(
                                        `/admin/users/${deleting.id}`,
                                        {
                                            onSuccess: () => setDeleting(null),
                                            onFinish: () =>
                                                setDeletingBusy(false),
                                        },
                                    );
                                }}
                            >
                                Delete Account
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </AppLayout>
    );
}
