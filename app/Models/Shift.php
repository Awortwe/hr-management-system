<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'name',
    'starts_at',
    'ends_at',
    'grace_minutes',
    'unpaid_break_minutes',
    'is_night_shift',
    'overtime_rate',
    'overtime_cap_hours',
    'is_active',
])]
class Shift extends Model
{
    protected function casts(): array
    {
        return [
            'grace_minutes' => 'integer',
            'unpaid_break_minutes' => 'integer',
            'is_night_shift' => 'boolean',
            'overtime_rate' => 'decimal:2',
            'overtime_cap_hours' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }
}
