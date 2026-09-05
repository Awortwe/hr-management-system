<?php

namespace App\Support;

use App\Mail\EmployeeAccountCreated;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

class UserAccountNotifications
{
    public static function accountCreated(User $user, string $plainPassword): void
    {
        rescue(
            fn () => Mail::to($user->email)->send(new EmployeeAccountCreated($user, $plainPassword)),
            report: true,
        );
    }
}
