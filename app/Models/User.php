<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'email', 'password', 'role'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function hasRole(string ...$roles): bool
    {
        return in_array($this->role, $roles, true);
    }

    public function employee(): HasOne
    {
        return $this->hasOne(Employee::class);
    }

    public function appNotifications(): HasMany
    {
        return $this->hasMany(AppNotification::class);
    }

    public function unreadAppNotifications(): HasMany
    {
        return $this->appNotifications()->whereNull('read_at');
    }

    public function chatThreads(): BelongsToMany
    {
        return $this->belongsToMany(ChatThread::class)->withPivot('last_read_at')->withTimestamps();
    }

    public function sentChatMessages(): HasMany
    {
        return $this->hasMany(ChatMessage::class);
    }

    public function assignedTasks(): HasMany
    {
        return $this->hasMany(WorkTask::class, 'assigned_to');
    }

    public function createdTasks(): HasMany
    {
        return $this->hasMany(WorkTask::class, 'assigned_by');
    }
}
