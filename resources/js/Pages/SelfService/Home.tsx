import { Link, usePage } from '@inertiajs/react';
import Head from '../../Components/PageHead';
import AppLayout from '../../Layouts/AppLayout';
import type { PageProps } from '../../types';

export default function Home() {
    const { auth, notifications } = usePage<PageProps>().props;
    return (
        <AppLayout>
            <Head title="Home" />
            <h1 className="text-2xl font-semibold">
                Welcome, {auth.user?.name}
            </h1>
            <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="font-semibold">Dashboard Notifications</h2>
                        <p className="mt-1 text-sm text-zinc-600">{notifications.unread_count} unread update(s)</p>
                    </div>
                    <Link className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white" href="/notifications">
                        Open
                    </Link>
                </div>
                <div className="mt-4 space-y-2">
                    {notifications.recent.map((notification) => (
                        <Link className="block rounded-md border border-zinc-200 p-3 text-sm hover:bg-zinc-50" href={notification.url ?? '/notifications'} key={notification.id}>
                            <span className="block font-medium">{notification.title}</span>
                            {notification.body && <span className="mt-1 block text-zinc-600">{notification.body}</span>}
                        </Link>
                    ))}
                    {notifications.recent.length === 0 && <p className="rounded-md border border-dashed border-zinc-300 px-3 py-5 text-center text-sm text-zinc-500">No unread notifications.</p>}
                </div>
            </section>
            <nav className="mt-6 divide-y divide-zinc-200 border-y border-zinc-200">
                <Link
                    className="block py-4 font-medium"
                    href="/collaboration"
                >
                    Chat, Tasks and Documents
                </Link>
                <Link
                    className="block py-4 font-medium"
                    href="/self-service/attendance"
                >
                    My Attendance
                </Link>
                <Link
                    className="block py-4 font-medium"
                    href="/staff/leave-requests"
                >
                    My Leave Requests
                </Link>
                <Link
                    className="block py-4 font-medium"
                    href="/self-service/profile"
                >
                    My Profile and Leave Balances
                </Link>
                {auth.user?.role === 'manager' && (
                    <>
                        <Link
                            className="block py-4 font-medium"
                            href="/manager/team"
                        >
                            My Team
                        </Link>
                        <Link
                            className="block py-4 font-medium"
                            href="/manager/attendance"
                        >
                            Team Attendance
                        </Link>
                    </>
                )}
            </nav>
        </AppLayout>
    );
}
