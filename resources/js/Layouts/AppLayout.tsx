import { Link, usePage } from '@inertiajs/react';
import { Bell, LogOut, Menu, MessageSquare, X } from 'lucide-react';
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
    { label: 'Notifications', href: '/notifications', roles: ['admin', 'hr', 'manager', 'employee'] },
    { label: 'Chat, Tasks & Docs', href: '/collaboration', roles: ['admin', 'hr', 'manager', 'employee'] },
    { label: 'Departments', href: '/organization/departments', roles: ['admin', 'hr'] },
    { label: 'Positions', href: '/organization/positions', roles: ['admin', 'hr'] },
    { label: 'Employees', href: '/staff/employees', roles: ['admin', 'hr'] },
    { label: 'Leave Requests', href: '/staff/leave-requests', roles: ['admin', 'hr', 'manager', 'employee'] },
    { label: 'Leave Types', href: '/staff/leave-types', roles: ['admin', 'hr'] },
    { label: 'Payroll', href: '/staff/payroll', roles: ['admin', 'hr'] },
    { label: 'Team Attendance', href: '/manager/attendance', roles: ['manager'] },
    { label: 'Company Attendance', href: '/staff/attendance', roles: ['admin', 'hr'] },
    { label: 'My Team', href: '/manager/team', roles: ['manager'] },
    { label: 'User Accounts', href: '/admin/users', roles: ['admin'] },
    { label: 'Company Settings', href: '/admin/company', roles: ['admin'] },
    { label: 'My Profile', href: '/self-service/profile', roles: ['admin', 'hr', 'manager', 'employee'] },
    { label: 'My Attendance', href: '/self-service/attendance', roles: ['admin', 'hr', 'manager', 'employee'] },
];

function canSee(roles: Role[], role?: Role) {
    return role ? roles.includes(role) : false;
}

export default function AppLayout({ children }: PropsWithChildren) {
    const { auth, flash, company } = usePage<PageProps>().props;
    const { notifications } = usePage<PageProps>().props;
    const [menuOpen, setMenuOpen] = useState(false);
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
            <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col overflow-y-auto border-r border-zinc-200 bg-white px-4 py-5 lg:flex">
                <Link href="/" className="block">
                    <p className="break-words text-lg font-semibold">{company.name}</p>
                    <p className="mt-1 break-words text-xs font-medium text-zinc-500">{company.tagline}</p>
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
                    <div className="mt-6 break-words rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                        <p className="text-sm font-semibold">{auth.user.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">{auth.user.role}</p>
                    </div>
                )}
            </aside>

            <div className="lg:pl-64">
                <header className="border-b border-zinc-200 bg-white px-5 py-4 lg:px-8">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3"><button type="button" className="shrink-0 rounded-md p-2 lg:hidden" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} title={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button><p className="min-w-0 break-words text-sm font-semibold text-zinc-700">{company.name}</p></div>
                        <div className="flex min-w-0 items-center gap-2 text-sm text-zinc-500">
                            {auth.user && (
                                <>
                                    <Link href="/collaboration" className="rounded-md p-2 text-zinc-600 hover:bg-zinc-100" aria-label="Open chat and tasks" title="Chat, tasks and documents"><MessageSquare size={18} /></Link>
                                    <Link href="/notifications" className="relative rounded-md p-2 text-zinc-600 hover:bg-zinc-100" aria-label="Open notifications" title="Notifications">
                                        <Bell size={18} />
                                        {notifications.unread_count > 0 && (
                                            <span className="absolute -right-1 -top-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                                {notifications.unread_count > 9 ? '9+' : notifications.unread_count}
                                            </span>
                                        )}
                                    </Link>
                                </>
                            )}
                            <span className="min-w-0 break-all">{auth.user ? `${auth.user.email}` : 'Guest session'}</span>
                            {auth.user && <Link href="/logout" method="post" as="button" className="shrink-0 rounded-md p-2" aria-label="Sign out" title="Sign out"><LogOut size={18} /></Link>}
                        </div>
                    </div>
                </header>
                {menuOpen && <nav id="mobile-navigation" className="border-b border-zinc-200 bg-white px-5 py-3 lg:hidden">{visibleNav.map(item => <Link className="block rounded-md px-3 py-3 text-sm font-medium hover:bg-zinc-100" href={item.href} key={item.href} onClick={() => setMenuOpen(false)}>{item.label}</Link>)}</nav>}

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
