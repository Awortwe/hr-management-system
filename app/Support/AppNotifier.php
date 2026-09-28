<?php

namespace App\Support;

use App\Models\AppNotification;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;

class AppNotifier
{
    public static function notify(User $user, string $type, string $title, ?string $body = null, ?string $url = null, ?User $actor = null, array $data = []): AppNotification
    {
        return AppNotification::create([
            'user_id' => $user->id,
            'actor_id' => $actor?->id,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'url' => $url,
            'data' => $data,
        ]);
    }

    /**
     * @param  iterable<User>|Collection<int, User>|EloquentCollection<int, User>  $users
     */
    public static function notifyMany(iterable $users, string $type, string $title, ?string $body = null, ?string $url = null, ?User $actor = null, array $data = []): void
    {
        collect($users)
            ->filter(fn (User $user): bool => $actor === null || $user->id !== $actor->id)
            ->unique('id')
            ->each(fn (User $user): AppNotification => self::notify($user, $type, $title, $body, $url, $actor, $data));
    }

    public static function notifyRoles(array $roles, string $type, string $title, ?string $body = null, ?string $url = null, ?User $actor = null, array $data = []): void
    {
        self::notifyMany(
            User::query()->whereIn('role', $roles)->get(),
            $type,
            $title,
            $body,
            $url,
            $actor,
            $data,
        );
    }
}
