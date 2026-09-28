import { Link, router } from '@inertiajs/react';
import Head from '../../Components/PageHead';
import AppLayout from '../../Layouts/AppLayout';
import type { AppNotification, Paginated } from '../../types';

type Props = {
    notificationPage: Paginated<AppNotification>;
};

export default function Index({ notificationPage }: Props) {
    return (
        <AppLayout>
            <Head title="Notifications" />

            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Notifications</h1>
                        <p className="mt-1 text-sm text-zinc-600">Leave, payroll, attendance, chat, document, and task activity in one place.</p>
                    </div>
                    <button
                        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                        disabled={notificationPage.data.every((notification) => notification.read_at)}
                        onClick={() => router.patch('/notifications/read-all', {}, { preserveScroll: true })}
                        type="button"
                    >
                        Mark all read
                    </button>
                </div>

                <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
                    <div className="divide-y divide-zinc-100">
                        {notificationPage.data.map((notification) => (
                            <article className={`p-4 ${notification.read_at ? 'bg-white' : 'bg-blue-50/60'}`} key={notification.id}>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                        <p className="font-semibold">{notification.title}</p>
                                        {notification.body && <p className="mt-1 text-sm text-zinc-600">{notification.body}</p>}
                                        <p className="mt-2 text-xs text-zinc-500">
                                            {titleCase(notification.type)} · {formatDateTime(notification.created_at)}
                                            {notification.actor ? ` · ${notification.actor.name}` : ''}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 flex-wrap gap-2">
                                        {notification.url && (
                                            <Link className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold hover:bg-zinc-50" href={notification.url}>
                                                Open
                                            </Link>
                                        )}
                                        {! notification.read_at && (
                                            <button className="rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white" type="button" onClick={() => router.patch(`/notifications/${notification.id}/read`, {}, { preserveScroll: true })}>
                                                Mark read
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </article>
                        ))}
                        {notificationPage.data.length === 0 && <p className="p-8 text-center text-sm text-zinc-500">No notifications yet.</p>}
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}

function formatDateTime(value?: string | null) {
    return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not set';
}

function titleCase(value: string) {
    return value.replace(/[._]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
