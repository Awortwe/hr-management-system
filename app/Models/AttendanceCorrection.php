<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'attendance_record_id',
    'employee_id',
    'reviewed_by',
    'type',
    'work_date',
    'requested_clock_in_at',
    'requested_clock_out_at',
    'requested_latitude',
    'requested_longitude',
    'reason',
    'status',
    'review_remarks',
    'reviewed_at',
])]
class AttendanceCorrection extends Model
{
    protected function casts(): array
    {
        return [
            'work_date' => 'date',
            'requested_clock_in_at' => 'datetime',
            'requested_clock_out_at' => 'datetime',
            'requested_latitude' => 'decimal:7',
            'requested_longitude' => 'decimal:7',
            'reviewed_at' => 'datetime',
        ];
    }

    public function attendanceRecord(): BelongsTo
    {
        return $this->belongsTo(AttendanceRecord::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
