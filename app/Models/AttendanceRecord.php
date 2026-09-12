<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

#[Fillable([
    'employee_id',
    'project_site_id',
    'work_date',
    'clock_in_at',
    'clock_out_at',
    'check_in_selfie_path',
    'check_out_selfie_path',
    'check_in_latitude',
    'check_in_longitude',
    'check_out_latitude',
    'check_out_longitude',
    'distance_from_site',
    'zone_status',
    'approval_status',
    'status',
    'worked_minutes',
    'overtime_hours',
    'overtime_approved_at',
    'overtime_approved_by',
    'approved_at',
    'approved_by',
    'correction_reason',
    'corrected_by',
    'corrected_at',
])]
class AttendanceRecord extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'work_date' => 'date',
            'clock_in_at' => 'datetime',
            'clock_out_at' => 'datetime',
            'check_in_latitude' => 'decimal:7',
            'check_in_longitude' => 'decimal:7',
            'check_out_latitude' => 'decimal:7',
            'check_out_longitude' => 'decimal:7',
            'distance_from_site' => 'decimal:2',
            'worked_minutes' => 'integer',
            'overtime_hours' => 'decimal:2',
            'overtime_approved_at' => 'datetime',
            'approved_at' => 'datetime',
            'corrected_at' => 'datetime',
        ];
    }

    protected function checkInSelfieUrl(): Attribute
    {
        return Attribute::get(fn (): ?string => $this->check_in_selfie_path
            ? Storage::disk('public')->url($this->check_in_selfie_path)
            : null);
    }

    protected function checkOutSelfieUrl(): Attribute
    {
        return Attribute::get(fn (): ?string => $this->check_out_selfie_path
            ? Storage::disk('public')->url($this->check_out_selfie_path)
            : null);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function projectSite(): BelongsTo
    {
        return $this->belongsTo(ProjectSite::class);
    }

    public function correctedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'corrected_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function overtimeApprovedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'overtime_approved_by');
    }

    public function corrections(): HasMany
    {
        return $this->hasMany(AttendanceCorrection::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AttendanceAuditLog::class);
    }
}
