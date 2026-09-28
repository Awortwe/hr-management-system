import { Link, router, useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, FileUp, MessageSquarePlus, Send, SquarePen } from 'lucide-react';
import Head from '../../Components/PageHead';
import AppLayout from '../../Layouts/AppLayout';
import type { ChatThread, ChatThreadDetail, PageProps, User, WorkTask } from '../../types';

type Props = {
    threads: ChatThread[];
    selectedThread: ChatThreadDetail | null;
    tasks: WorkTask[];
    users: User[];
};

export default function Index({ selectedThread, tasks, threads, users }: Props) {
    const { auth } = usePage<PageProps>().props;
    const threadForm = useForm<{ subject: string; participant_ids: number[]; message: string }>({
        subject: '',
        participant_ids: [],
        message: '',
    });
    const messageForm = useForm({ body: '' });
    const taskForm = useForm({
        assigned_to: '',
        chat_thread_id: selectedThread?.id ? String(selectedThread.id) : '',
        title: '',
        description: '',
        due_date: '',
    });
    const documentForm = useForm<{ document: File | null }>({ document: null });

    function toggleParticipant(userId: number) {
        threadForm.setData('participant_ids', threadForm.data.participant_ids.includes(userId)
            ? threadForm.data.participant_ids.filter((id) => id !== userId)
            : [...threadForm.data.participant_ids, userId]);
    }

    return (
        <AppLayout>
            <Head title="Chat, Tasks & Documents" />

            <div className="flex flex-col gap-5">
                <div>
                    <h1 className="text-2xl font-semibold">Chat, Tasks & Documents</h1>
                    <p className="mt-1 text-sm text-zinc-600">Discuss work, assign tasks, and share files with employees from one workspace.</p>
                </div>

                <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
                    <div className="space-y-5">
                        <section className="rounded-lg border border-zinc-200 bg-white p-4">
                            <div className="flex items-center gap-2">
                                <MessageSquarePlus size={18} />
                                <h2 className="font-semibold">Start Chat</h2>
                            </div>
                            <div className="mt-4 space-y-3">
                                <input className="form-input w-full" placeholder="Subject" value={threadForm.data.subject} onChange={(event) => threadForm.setData('subject', event.target.value)} />
                                <textarea className="form-input min-h-24 w-full" placeholder="First message" value={threadForm.data.message} onChange={(event) => threadForm.setData('message', event.target.value)} />
                                <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-zinc-200 p-2">
                                    {users.map((user) => (
                                        <label className="flex items-start gap-2 rounded-md px-2 py-1 text-sm hover:bg-zinc-50" key={user.id}>
                                            <input type="checkbox" checked={threadForm.data.participant_ids.includes(user.id)} onChange={() => toggleParticipant(user.id)} />
                                            <span>
                                                <span className="font-medium">{user.name}</span>
                                                <span className="block text-xs text-zinc-500">{user.role} · {user.email}</span>
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                <button
                                    className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                                    disabled={threadForm.processing}
                                    onClick={() => threadForm.post('/collaboration/threads', { preserveScroll: true, onSuccess: () => threadForm.reset() })}
                                    type="button"
                                >
                                    Create Thread
                                </button>
                            </div>
                        </section>

                        <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
                            <div className="border-b border-zinc-200 px-4 py-3">
                                <h2 className="font-semibold">Threads</h2>
                            </div>
                            <div className="divide-y divide-zinc-100">
                                {threads.map((thread) => (
                                    <Link className={`block p-4 hover:bg-zinc-50 ${selectedThread?.id === thread.id ? 'bg-blue-50' : ''}`} href={`/collaboration?thread=${thread.id}`} key={thread.id}>
                                        <p className="font-medium">{thread.subject}</p>
                                        <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{thread.latest_message?.body ?? 'No messages yet.'}</p>
                                        <p className="mt-2 text-xs text-zinc-500">{thread.participants.length} participant(s)</p>
                                    </Link>
                                ))}
                                {threads.length === 0 && <p className="p-4 text-sm text-zinc-500">No chat threads yet.</p>}
                            </div>
                        </section>
                    </div>

                    <div className="space-y-5">
                        <section className="rounded-lg border border-zinc-200 bg-white">
                            {selectedThread ? (
                                <>
                                    <div className="border-b border-zinc-200 p-4">
                                        <h2 className="text-lg font-semibold">{selectedThread.subject}</h2>
                                        <p className="mt-1 text-sm text-zinc-500">
                                            {selectedThread.participants.map((user) => user.name).join(', ')}
                                        </p>
                                    </div>
                                    <div className="max-h-[520px] space-y-3 overflow-y-auto p-4">
                                        {selectedThread.messages.map((message) => (
                                            <div className={`max-w-2xl rounded-lg border px-3 py-2 ${message.user.id === auth.user?.id ? 'ml-auto border-blue-200 bg-blue-50' : 'border-zinc-200 bg-zinc-50'}`} key={message.id}>
                                                <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                                                    <span className="font-semibold text-zinc-700">{message.user.name}</span>
                                                    <span>{formatDateTime(message.created_at)}</span>
                                                </div>
                                                <p className="mt-2 whitespace-pre-wrap text-sm">{message.body}</p>
                                            </div>
                                        ))}
                                        {selectedThread.messages.length === 0 && <p className="text-sm text-zinc-500">No messages yet.</p>}
                                    </div>
                                    <div className="border-t border-zinc-200 p-4">
                                        <textarea className="form-input min-h-24 w-full" placeholder="Write a message" value={messageForm.data.body} onChange={(event) => messageForm.setData('body', event.target.value)} />
                                        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold hover:bg-zinc-50">
                                                <FileUp size={16} /> Share document
                                                <input className="hidden" type="file" onChange={(event) => documentForm.setData('document', event.target.files?.[0] ?? null)} />
                                            </label>
                                            <div className="flex gap-2">
                                                {documentForm.data.document && (
                                                    <button className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold" type="button" onClick={() => documentForm.post(`/collaboration/threads/${selectedThread.id}/documents`, { forceFormData: true, preserveScroll: true, onSuccess: () => documentForm.reset() })}>
                                                        Upload {documentForm.data.document.name}
                                                    </button>
                                                )}
                                                <button className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" disabled={messageForm.processing} type="button" onClick={() => messageForm.post(`/collaboration/threads/${selectedThread.id}/messages`, { preserveScroll: true, onSuccess: () => messageForm.reset() })}>
                                                    <Send size={16} /> Send
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <p className="p-8 text-center text-sm text-zinc-500">Create a chat thread to begin.</p>
                            )}
                        </section>

                        {selectedThread && selectedThread.documents.length > 0 && (
                            <section className="rounded-lg border border-zinc-200 bg-white p-4">
                                <h2 className="font-semibold">Shared Documents</h2>
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                    {selectedThread.documents.map((document) => (
                                        <a className="rounded-lg border border-zinc-200 p-3 text-sm hover:bg-zinc-50" href={document.url} key={document.id} target="_blank">
                                            <span className="block truncate font-medium">{document.original_name}</span>
                                            <span className="mt-1 block text-xs text-zinc-500">{document.uploader.name} · {formatBytes(document.size)}</span>
                                        </a>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </section>

                <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
                    <div className="rounded-lg border border-zinc-200 bg-white p-4">
                        <div className="flex items-center gap-2">
                            <SquarePen size={18} />
                            <h2 className="font-semibold">Assign Task</h2>
                        </div>
                        <div className="mt-4 space-y-3">
                            <input className="form-input w-full" placeholder="Task title" value={taskForm.data.title} onChange={(event) => taskForm.setData('title', event.target.value)} />
                            <select className="form-input w-full" value={taskForm.data.assigned_to} onChange={(event) => taskForm.setData('assigned_to', event.target.value)}>
                                <option value="">Assign to...</option>
                                {users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.role}</option>)}
                            </select>
                            <input className="form-input w-full" type="date" value={taskForm.data.due_date} onChange={(event) => taskForm.setData('due_date', event.target.value)} />
                            <textarea className="form-input min-h-24 w-full" placeholder="Description" value={taskForm.data.description} onChange={(event) => taskForm.setData('description', event.target.value)} />
                            <button className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" disabled={taskForm.processing} type="button" onClick={() => taskForm.post('/collaboration/tasks', { preserveScroll: true, onSuccess: () => taskForm.reset() })}>
                                Assign Task
                            </button>
                        </div>
                    </div>

                    <div className="rounded-lg border border-zinc-200 bg-white p-4">
                        <h2 className="font-semibold">Tasks</h2>
                        <div className="mt-4 divide-y divide-zinc-100">
                            {tasks.map((task) => (
                                <div className="py-3" key={task.id}>
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <p className="font-medium">{task.title}</p>
                                            <p className="mt-1 text-sm text-zinc-600">{task.description || 'No description'}</p>
                                            <p className="mt-2 text-xs text-zinc-500">
                                                {task.assigner.name} → {task.assignee.name} · Due {formatDate(task.due_date)}
                                                {task.thread_subject ? ` · ${task.thread_subject}` : ''}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">{titleCase(task.status)}</span>
                                            {task.status !== 'done' && (
                                                <button className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white" type="button" onClick={() => router.patch(`/collaboration/tasks/${task.id}`, { status: 'done' }, { preserveScroll: true })}>
                                                    <CheckCircle2 size={16} /> Done
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {tasks.length === 0 && <p className="py-8 text-center text-sm text-zinc-500">No tasks yet.</p>}
                        </div>
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}

function formatDate(value?: string | null) {
    return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : 'Not set';
}

function formatDateTime(value?: string | null) {
    return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not set';
}

function formatBytes(value: number) {
    if (value < 1024) {
        return `${value} B`;
    }

    if (value < 1024 * 1024) {
        return `${(value / 1024).toFixed(1)} KB`;
    }

    return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function titleCase(value: string) {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
