<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'employee_id',
    'leave_type_id',
    'year',
    'entitled_days',
    'used_days',
    'adjusted_days',
    'adjustment_reason',
])]
class LeaveBalance extends Model
{
    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'entitled_days' => 'decimal:2',
            'used_days' => 'decimal:2',
            'adjusted_days' => 'decimal:2',
        ];
    }

    protected function remainingDays(): Attribute
    {
        return Attribute::get(fn (): float => (float) $this->entitled_days + (float) $this->adjusted_days - (float) $this->used_days);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function leaveType(): BelongsTo
    {
        return $this->belongsTo(LeaveType::class);
    }
}
