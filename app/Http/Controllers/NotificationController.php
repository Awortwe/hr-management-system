<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Notifications/Index', [
            'notificationPage' => $request->user()
                ->appNotifications()
                ->with('actor:id,name,email,role')
                ->latest()
                ->paginate(15)
                ->through(fn (AppNotification $notification): array => $this->row($notification)),
        ]);
    }

    public function markRead(Request $request, AppNotification $notification): RedirectResponse
    {
        abort_unless($notification->user_id === $request->user()->id, 403);

        $notification->update(['read_at' => now()]);

        return back();
    }

    public function markAllRead(Request $request): RedirectResponse
    {
        $request->user()
            ->appNotifications()
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return back()->with('success', 'Notifications marked as read.');
    }

    private function row(AppNotification $notification): array
    {
        return [
            'id' => $notification->id,
            'type' => $notification->type,
            'title' => $notification->title,
            'body' => $notification->body,
            'url' => $notification->url,
            'data' => $notification->data,
            'read_at' => $notification->read_at?->toISOString(),
            'created_at' => $notification->created_at?->toISOString(),
            'actor' => $notification->actor ? [
                'id' => $notification->actor->id,
                'name' => $notification->actor->name,
                'email' => $notification->actor->email,
                'role' => $notification->actor->role,
            ] : null,
        ];
    }
}
