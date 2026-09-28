<?php

namespace App\Http\Middleware;

use App\Models\CompanySetting;
use App\Models\AppNotification;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'company' => fn () => CompanySetting::current()->only(['name', 'tagline']),
            'auth' => [
                'user' => $request->user(),
            ],
            'notifications' => fn () => $request->user() ? [
                'unread_count' => $request->user()->appNotifications()->whereNull('read_at')->count(),
                'recent' => $request->user()
                    ->appNotifications()
                    ->whereNull('read_at')
                    ->latest()
                    ->limit(5)
                    ->get()
                    ->map(fn (AppNotification $notification): array => [
                        'id' => $notification->id,
                        'title' => $notification->title,
                        'body' => $notification->body,
                        'url' => $notification->url,
                        'created_at' => $notification->created_at?->toISOString(),
                    ]),
            ] : ['unread_count' => 0, 'recent' => []],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ];
    }
}
