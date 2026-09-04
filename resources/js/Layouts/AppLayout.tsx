import { Link, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import type { PageProps, Role } from '../types';

type NavItem = {
    label: string;
    href: string;
    roles: Role[];
};

const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/', roles: ['admin', 'hr', 'manager', 'employee'] },
    { label: 'Departments', href: '/organization/departments', roles: ['admin', 'hr'] },
    { label: 'Positions', href: '/organization/positions', roles: ['admin', 'hr'] },
    { label: 'Employees', href: '/staff/employees', roles: ['admin', 'hr'] },
    { label: 'My Profile', href: '/self-service/profile', roles: ['admin', 'hr', 'manager', 'employee'] },
];

function canSee(roles: Role[], role?: Role) {
    return role ? roles.includes(role) : false;
}

export default function AppLayout({ children }: PropsWithChildren) {
    const { auth, flash } = usePage<PageProps>().props;
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        if (flash.success) {
            setToast({ type: 'success', message: flash.success });
        } else if (flash.error) {
            setToast({ type: 'error', message: flash.error });
        }
    }, [flash.success, flash.error]);

    useEffect(() => {
        if (! toast) {
            return;
        }

        const timer = window.setTimeout(() => setToast(null), 3500);
        return () => window.clearTimeout(timer);
    }, [toast]);

    const visibleNav = useMemo(
        () => navItems.filter((item) => canSee(item.roles, auth.user?.role)),
        [auth.user?.role],
    );

    return (
        <div className="min-h-screen bg-zinc-50 text-zinc-950">
            <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-zinc-200 bg-white px-4 py-5 lg:block">
                <Link href="/" className="block">
                    <p className="text-lg font-semibold">PeopleHQ</p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500">HR Management</p>
                </Link>

                <nav className="mt-8 space-y-1">
                    {visibleNav.map((item) => (
                        <Link
                            className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                            href={item.href}
                            key={item.href}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                {auth.user && (
                    <div className="absolute inset-x-4 bottom-5 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                        <p className="text-sm font-semibold">{auth.user.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">{auth.user.role}</p>
                    </div>
                )}
            </aside>

            <div className="lg:pl-64">
                <header className="border-b border-zinc-200 bg-white px-5 py-4 lg:px-8">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold text-zinc-700">Organization Setup</p>
                        <p className="text-sm text-zinc-500">
                            {auth.user ? `${auth.user.email}` : 'Guest session'}
                        </p>
                    </div>
                </header>

                <main className="px-5 py-6 lg:px-8">{children}</main>
            </div>

            {toast && (
                <div
                    className={`fixed right-5 top-5 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
                        toast.type === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-rose-200 bg-rose-50 text-rose-800'
                    }`}
                    role="status"
                >
                    {toast.message}
                </div>
            )}
        </div>
    );
}
