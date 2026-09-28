<?php

namespace App\Http\Controllers;

use App\Models\ChatMessage;
use App\Models\ChatThread;
use App\Models\SharedDocument;
use App\Models\User;
use App\Models\WorkTask;
use App\Support\AppNotifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CollaborationController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $selectedThreadId = $request->integer('thread');

        $threads = $user->chatThreads()
            ->with(['participants:id,name,email,role', 'messages' => fn ($query) => $query->latest()->limit(1)])
            ->latest('chat_threads.updated_at')
            ->get();

        $selectedThread = $threads->firstWhere('id', $selectedThreadId) ?? $threads->first();

        if ($selectedThread) {
            $selectedThread->load([
                'participants:id,name,email,role',
                'messages' => fn ($query) => $query->with('user:id,name,email,role')->oldest(),
                'documents.uploader:id,name,email,role',
                'tasks.assigner:id,name,email,role',
                'tasks.assignee:id,name,email,role',
                'tasks.documents.uploader:id,name,email,role',
            ]);

            $selectedThread->participants()->updateExistingPivot($user->id, ['last_read_at' => now()]);
        }

        return Inertia::render('Collaboration/Index', [
            'threads' => $threads->map(fn (ChatThread $thread): array => $this->threadRow($thread)),
            'selectedThread' => $selectedThread ? $this->threadDetail($selectedThread) : null,
            'tasks' => WorkTask::query()
                ->with(['assigner:id,name,email,role', 'assignee:id,name,email,role', 'thread:id,subject', 'documents.uploader:id,name,email,role'])
                ->where(fn ($query) => $query
                    ->where('assigned_to', $user->id)
                    ->orWhere('assigned_by', $user->id))
                ->latest()
                ->limit(20)
                ->get()
                ->map(fn (WorkTask $task): array => $this->taskRow($task)),
            'users' => User::query()
                ->whereKeyNot($user->id)
                ->orderBy('name')
                ->get(['id', 'name', 'email', 'role']),
            'canAssignTasks' => $this->canAssignTasks($user),
            'taskAssignableUsers' => $this->assignableTaskUsers($user)
                ->orderBy('name')
                ->get(['id', 'name', 'email', 'role']),
        ]);
    }

    public function storeThread(Request $request): RedirectResponse
    {
        $attributes = $request->validate([
            'subject' => ['nullable', 'string', 'max:120'],
            'participant_ids' => ['required', 'array', 'min:1'],
            'participant_ids.*' => ['integer', Rule::exists('users', 'id')],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $thread = DB::transaction(function () use ($attributes, $request): ChatThread {
            $recipient = User::query()->whereKey($attributes['participant_ids'][0] ?? null)->first();
            $thread = ChatThread::create([
                'subject' => $attributes['subject'] ?: 'Message with '.($recipient?->name ?? 'employee'),
                'created_by' => $request->user()->id,
            ]);
            $participantIds = collect($attributes['participant_ids'])
                ->push($request->user()->id)
                ->unique()
                ->values()
                ->all();

            $thread->participants()->sync($participantIds);
            $thread->messages()->create([
                'user_id' => $request->user()->id,
                'body' => $attributes['message'],
            ]);

            AppNotifier::notifyMany(
                User::query()->whereIn('id', $participantIds)->get(),
                'chat.thread_started',
                'New chat started',
                "{$request->user()->name} started: {$thread->subject}",
                "/collaboration?thread={$thread->id}",
                $request->user(),
            );

            return $thread;
        });

        return to_route('collaboration.index', ['thread' => $thread->id])->with('success', 'Chat thread created.');
    }

    public function storeMessage(Request $request, ChatThread $thread): RedirectResponse
    {
        $this->authorizeParticipant($request, $thread);

        $attributes = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $message = $thread->messages()->create([
            'user_id' => $request->user()->id,
            'body' => $attributes['body'],
        ]);
        $thread->touch();
        $thread->participants()->updateExistingPivot($request->user()->id, ['last_read_at' => now()]);

        AppNotifier::notifyMany(
            $thread->participants()->whereKeyNot($request->user()->id)->get(),
            'chat.message',
            'New chat message',
            "{$request->user()->name} replied in {$thread->subject}.",
            "/collaboration?thread={$thread->id}",
            $request->user(),
            ['message_id' => $message->id],
        );

        return back()->with('success', 'Message sent.');
    }

    public function storeDocument(Request $request, ChatThread $thread): RedirectResponse
    {
        $this->authorizeParticipant($request, $thread);

        $attributes = $request->validate([
            'document' => ['required', 'file', 'max:10240'],
        ]);
        $file = $attributes['document'];
        $path = $file->store('shared-documents', 'public');

        $document = SharedDocument::create([
            'uploaded_by' => $request->user()->id,
            'chat_thread_id' => $thread->id,
            'disk' => 'public',
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getClientMimeType(),
            'size' => $file->getSize() ?: 0,
        ]);
        $thread->touch();

        AppNotifier::notifyMany(
            $thread->participants()->whereKeyNot($request->user()->id)->get(),
            'document.shared',
            'Document shared',
            "{$request->user()->name} shared {$document->original_name}.",
            "/collaboration?thread={$thread->id}",
            $request->user(),
        );

        return back()->with('success', 'Document shared.');
    }

    public function storeTask(Request $request): RedirectResponse
    {
        abort_unless($this->canAssignTasks($request->user()), 403);

        $attributes = $request->validate([
            'assigned_to' => ['required', 'integer', Rule::exists('users', 'id')],
            'chat_thread_id' => ['nullable', 'integer', Rule::exists('chat_threads', 'id')],
            'title' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:5000'],
            'due_date' => ['nullable', 'date'],
            'documents' => ['nullable', 'array'],
            'documents.*' => ['file', 'max:10240'],
        ]);

        if (! empty($attributes['chat_thread_id'])) {
            $thread = ChatThread::findOrFail($attributes['chat_thread_id']);
            $this->authorizeParticipant($request, $thread);
        }

        abort_unless($this->assignableTaskUsers($request->user())->whereKey($attributes['assigned_to'])->exists(), 403);

        $task = WorkTask::create([
            'assigned_to' => $attributes['assigned_to'],
            'chat_thread_id' => $attributes['chat_thread_id'] ?? null,
            'title' => $attributes['title'],
            'description' => $attributes['description'] ?? null,
            'due_date' => $attributes['due_date'] ?? null,
            'assigned_by' => $request->user()->id,
            'status' => 'open',
        ]);
        $uploadedCount = $this->storeTaskDocuments($request, $task);

        AppNotifier::notify(
            User::findOrFail($attributes['assigned_to']),
            'task.assigned',
            'New task assigned',
            "{$request->user()->name} assigned you: {$task->title}".($uploadedCount ? " with {$uploadedCount} document(s)." : '.'),
            $task->chat_thread_id ? "/collaboration?thread={$task->chat_thread_id}" : '/collaboration',
            $request->user(),
            ['task_id' => $task->id],
        );

        return back()->with('success', 'Task assigned.');
    }

    public function storeTaskDocument(Request $request, WorkTask $task): RedirectResponse
    {
        abort_unless(in_array($request->user()->id, [$task->assigned_to, $task->assigned_by], true), 403);

        $request->validate([
            'documents' => ['required', 'array', 'min:1'],
            'documents.*' => ['file', 'max:10240'],
        ]);

        $uploadedCount = $this->storeTaskDocuments($request, $task);

        AppNotifier::notify(
            $task->assignee,
            'task.document_added',
            'Task document added',
            "{$request->user()->name} added {$uploadedCount} document(s) to {$task->title}.",
            $task->chat_thread_id ? "/collaboration?thread={$task->chat_thread_id}" : '/collaboration',
            $request->user(),
            ['task_id' => $task->id],
        );

        return back()->with('success', 'Task document uploaded.');
    }

    public function updateTask(Request $request, WorkTask $task): RedirectResponse
    {
        abort_unless(in_array($request->user()->id, [$task->assigned_to, $task->assigned_by], true), 403);

        $attributes = $request->validate([
            'status' => ['required', Rule::in(['open', 'in_progress', 'done'])],
        ]);

        $task->update([
            'status' => $attributes['status'],
            'completed_at' => $attributes['status'] === 'done' ? now() : null,
        ]);

        if ($request->user()->id === $task->assigned_to) {
            AppNotifier::notify(
                $task->assigner,
                'task.updated',
                'Task status updated',
                "{$request->user()->name} marked {$task->title} as ".str_replace('_', ' ', $task->status).'.',
                $task->chat_thread_id ? "/collaboration?thread={$task->chat_thread_id}" : '/collaboration',
                $request->user(),
                ['task_id' => $task->id],
            );
        }

        return back()->with('success', 'Task updated.');
    }

    private function authorizeParticipant(Request $request, ChatThread $thread): void
    {
        abort_unless($thread->participants()->whereKey($request->user()->id)->exists(), 403);
    }

    private function canAssignTasks(User $user): bool
    {
        return $user->hasRole('admin', 'hr', 'manager');
    }

    private function assignableTaskUsers(User $user)
    {
        $query = User::query()->whereKeyNot($user->id);

        if ($user->hasRole('admin', 'hr')) {
            return $query;
        }

        if ($user->hasRole('manager') && $user->employee) {
            return $query->whereHas('employee', fn ($employee) => $employee->where('manager_id', $user->employee->id));
        }

        return $query->whereRaw('1 = 0');
    }

    private function threadRow(ChatThread $thread): array
    {
        $latest = $thread->messages->first();

        return [
            'id' => $thread->id,
            'subject' => $thread->subject,
            'created_at' => $thread->created_at?->toISOString(),
            'updated_at' => $thread->updated_at?->toISOString(),
            'participants' => $thread->participants->map(fn (User $user): array => $this->userRow($user))->values(),
            'latest_message' => $latest ? [
                'body' => $latest->body,
                'created_at' => $latest->created_at?->toISOString(),
            ] : null,
        ];
    }

    private function threadDetail(ChatThread $thread): array
    {
        return [
            ...$this->threadRow($thread),
            'messages' => $thread->messages->map(fn (ChatMessage $message): array => [
                'id' => $message->id,
                'body' => $message->body,
                'created_at' => $message->created_at?->toISOString(),
                'user' => $this->userRow($message->user),
            ]),
            'documents' => $thread->documents->map(fn (SharedDocument $document): array => [
                'id' => $document->id,
                'original_name' => $document->original_name,
                'mime_type' => $document->mime_type,
                'size' => $document->size,
                'url' => $document->url,
                'created_at' => $document->created_at?->toISOString(),
                'uploader' => $this->userRow($document->uploader),
            ]),
            'tasks' => $thread->tasks->map(fn (WorkTask $task): array => $this->taskRow($task)),
        ];
    }

    private function taskRow(WorkTask $task): array
    {
        return [
            'id' => $task->id,
            'title' => $task->title,
            'description' => $task->description,
            'status' => $task->status,
            'due_date' => $task->due_date?->toDateString(),
            'completed_at' => $task->completed_at?->toISOString(),
            'created_at' => $task->created_at?->toISOString(),
            'thread_id' => $task->chat_thread_id,
            'thread_subject' => $task->thread?->subject,
            'assigner' => $this->userRow($task->assigner),
            'assignee' => $this->userRow($task->assignee),
            'documents' => $task->documents->map(fn (SharedDocument $document): array => [
                'id' => $document->id,
                'original_name' => $document->original_name,
                'mime_type' => $document->mime_type,
                'size' => $document->size,
                'url' => $document->url,
                'created_at' => $document->created_at?->toISOString(),
                'uploader' => $this->userRow($document->uploader),
            ]),
        ];
    }

    private function storeTaskDocuments(Request $request, WorkTask $task): int
    {
        $files = $request->file('documents', []);

        foreach ($files as $file) {
            $path = $file->store('task-documents', 'public');

            SharedDocument::create([
                'uploaded_by' => $request->user()->id,
                'chat_thread_id' => $task->chat_thread_id,
                'work_task_id' => $task->id,
                'disk' => 'public',
                'path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getClientMimeType(),
                'size' => $file->getSize() ?: 0,
            ]);
        }

        return count($files);
    }

    private function userRow(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
        ];
    }
}
