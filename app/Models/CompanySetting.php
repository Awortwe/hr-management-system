<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

#[Fillable([
    'name',
    'tagline',
    'email',
    'phone',
    'website',
    'address',
    'registration_number',
    'allow_offline_punch',
    'require_device_binding',
    'default_geofence_radius_meters',
    'late_threshold_minutes',
    'weekend_days',
    'attendance_approval_rule',
])]
class CompanySetting extends Model
{
    public $incrementing = false;

    protected function casts(): array
    {
        return [
            'allow_offline_punch' => 'boolean',
            'require_device_binding' => 'boolean',
            'default_geofence_radius_meters' => 'integer',
            'late_threshold_minutes' => 'integer',
            'weekend_days' => 'array',
        ];
    }

    public static function exportPrefix(): string
    {
        return Str::slug(static::current()->name) ?: 'company';
    }

    public static function current(): self
    {
        // Keep existing installations usable until the settings migration is applied.
        return (Schema::hasTable('company_settings') ? static::find(1) : null)
            ?? new static([
                'name' => 'PeopleHQ',
                'tagline' => 'HR Management',
                'allow_offline_punch' => true,
                'require_device_binding' => false,
                'default_geofence_radius_meters' => 150,
                'late_threshold_minutes' => 15,
                'weekend_days' => ['Saturday', 'Sunday'],
                'attendance_approval_rule' => 'out_of_zone_only',
            ]);
    }
}
