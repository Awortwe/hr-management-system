import { Link, usePage } from '@inertiajs/react';
import Head from '../../Components/PageHead';
import AppLayout from '../../Layouts/AppLayout';
import type { PageProps } from '../../types';

export default function Home() {
    const { auth } = usePage<PageProps>().props;
    return (
        <AppLayout>
            <Head title="Home" />
            <h1 className="text-2xl font-semibold">
                Welcome, {auth.user?.name}
            </h1>
            <nav className="mt-6 divide-y divide-zinc-200 border-y border-zinc-200">
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
