import { Link, router, useForm, usePage } from '@inertiajs/react';
import { CalendarDays, CheckCircle2, FileUp, MessageSquarePlus, Paperclip, Send, SquarePen, UserRound } from 'lucide-react';
import { useState } from 'react';
import Head from '../../Components/PageHead';
import AppLayout from '../../Layouts/AppLayout';
import type { ChatThread, ChatThreadDetail, PageProps, User, WorkTask } from '../../types';

type Props = {
    threads: ChatThread[];
    selectedThread: ChatThreadDetail | null;
    tasks: WorkTask[];
    users: User[];
    canAssignTasks: boolean;
    taskAssignableUsers: User[];
};

export default function Index({ canAssignTasks, selectedThread, taskAssignableUsers, tasks, threads, users }: Props) {
    const { auth } = usePage<PageProps>().props;
    const [selectedTaskForUpload, setSelectedTaskForUpload] = useState<number | null>(null);
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
        documents: [] as File[],
    });
    const documentForm = useForm<{ document: File | null }>({ document: null });
    const taskDocumentForm = useForm<{ documents: File[] }>({ documents: [] });

    const selectedChatEmployee = users.find((user) => user.id === threadForm.data.participant_ids[0]);

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
                                <h2 className="font-semibold">Send Message</h2>
                            </div>
                            <div className="mt-4 space-y-3">
                                <label className="block text-sm font-semibold text-zinc-700">
                                    Employee
                                    <select className="form-input mt-1 w-full" value={threadForm.data.participant_ids[0] ?? ''} onChange={(event) => threadForm.setData('participant_ids', event.target.value ? [Number(event.target.value)] : [])}>
                                        <option value="">Choose employee...</option>
                                        {users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.role}</option>)}
                                    </select>
                                </label>
                                <input className="form-input w-full" placeholder={selectedChatEmployee ? `Message with ${selectedChatEmployee.name}` : 'Subject'} value={threadForm.data.subject} onChange={(event) => threadForm.setData('subject', event.target.value)} />
                                <textarea className="form-input min-h-28 w-full" placeholder="Write the message you want to send" value={threadForm.data.message} onChange={(event) => threadForm.setData('message', event.target.value)} />
                                <button
                                    className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                                    disabled={threadForm.processing}
                                    onClick={() => {
                                        if (! threadForm.data.subject && selectedChatEmployee) {
                                            threadForm.setData('subject', `Message with ${selectedChatEmployee.name}`);
                                        }
                                        threadForm.post('/collaboration/threads', { preserveScroll: true, onSuccess: () => threadForm.reset() });
                                    }}
                                    type="button"
                                >
                                    Send Message
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
                            <label className="block text-sm font-semibold text-zinc-700">
                                Task name
                                <input className="form-input mt-1 w-full" placeholder="What needs to be done?" value={taskForm.data.title} onChange={(event) => taskForm.setData('title', event.target.value)} />
                            </label>
                            {canAssignTasks ? (
                                <label className="block text-sm font-semibold text-zinc-700">
                                    Assignee
                                    <select className="form-input mt-1 w-full" value={taskForm.data.assigned_to} onChange={(event) => taskForm.setData('assigned_to', event.target.value)}>
                                        <option value="">Choose employee...</option>
                                        {taskAssignableUsers.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.role}</option>)}
                                    </select>
                                </label>
                            ) : (
                                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                    Task assignment is available to admin, HR, and managers only.
                                </div>
                            )}
                            <label className="block text-sm font-semibold text-zinc-700">
                                Deadline
                                <input className="form-input mt-1 w-full" type="date" value={taskForm.data.due_date} onChange={(event) => taskForm.setData('due_date', event.target.value)} />
                            </label>
                            <textarea className="form-input min-h-24 w-full" placeholder="Description" value={taskForm.data.description} onChange={(event) => taskForm.setData('description', event.target.value)} />
                            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-zinc-300 px-3 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
                                <Paperclip size={16} />
                                {taskForm.data.documents.length ? `${taskForm.data.documents.length} document(s) selected` : 'Attach task documents'}
                                <input className="hidden" type="file" multiple onChange={(event) => taskForm.setData('documents', Array.from(event.target.files ?? []))} />
                            </label>
                            <button className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" disabled={! canAssignTasks || taskForm.processing} type="button" onClick={() => taskForm.post('/collaboration/tasks', { forceFormData: true, preserveScroll: true, onSuccess: () => taskForm.reset() })}>
                                Assign Task
                            </button>
                        </div>
                    </div>

                    <div className="rounded-lg border border-zinc-200 bg-white p-4">
                        <h2 className="font-semibold">Tasks</h2>
                        <div className="mt-4 divide-y divide-zinc-100">
                            {tasks.map((task) => (
                                <div className="py-4" key={task.id}>
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-medium">{task.title}</p>
                                                <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">{titleCase(task.status)}</span>
                                            </div>
                                            <p className="mt-1 text-sm text-zinc-600">{task.description || 'No description'}</p>
                                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-600">
                                                <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1"><UserRound size={13} /> {task.assigner.name} → {task.assignee.name}</span>
                                                <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1"><CalendarDays size={13} /> Due {formatDate(task.due_date)}</span>
                                                {task.thread_subject && <span className="rounded-md border border-zinc-200 px-2 py-1">{task.thread_subject}</span>}
                                            </div>
                                            {task.documents && task.documents.length > 0 && (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {task.documents.map((document) => (
                                                        <a className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100" href={document.url} key={document.id} target="_blank">
                                                            <Paperclip size={13} /> {document.original_name}
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                                            <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold hover:bg-zinc-50">
                                                <FileUp size={16} /> Add files
                                                <input className="hidden" type="file" multiple onChange={(event) => {
                                                    setSelectedTaskForUpload(task.id);
                                                    taskDocumentForm.setData('documents', Array.from(event.target.files ?? []));
                                                }} />
                                            </label>
                                            {selectedTaskForUpload === task.id && taskDocumentForm.data.documents.length > 0 && (
                                                <button className="rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white" type="button" onClick={() => taskDocumentForm.post(`/collaboration/tasks/${task.id}/documents`, { forceFormData: true, preserveScroll: true, onSuccess: () => { taskDocumentForm.reset(); setSelectedTaskForUpload(null); } })}>
                                                    Upload {taskDocumentForm.data.documents.length}
                                                </button>
                                            )}
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
