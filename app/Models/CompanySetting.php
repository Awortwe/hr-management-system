<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

#[Fillable(['name', 'tagline', 'email', 'phone', 'website', 'address', 'registration_number'])]
class CompanySetting extends Model
{
    public $incrementing = false;

    public static function exportPrefix(): string
    {
        return Str::slug(static::current()->name) ?: 'company';
    }

    public static function current(): self
    {
        // Keep existing installations usable until the settings migration is applied.
        return (Schema::hasTable('company_settings') ? static::find(1) : null)
            ?? new static(['name' => 'PeopleHQ', 'tagline' => 'HR Management']);
    }
}
