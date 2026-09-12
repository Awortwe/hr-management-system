<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'name',
    'code',
    'address',
    'latitude',
    'longitude',
    'geofence_radius_meters',
    'status',
])]
class ProjectSite extends Model
{
    use HasFactory, SoftDeletes;

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'geofence_radius_meters' => 'integer',
        ];
    }

    public function employees(): BelongsToMany
    {
        return $this->belongsToMany(Employee::class)->withTimestamps();
    }

    public function attendanceRecords(): HasMany
    {
        return $this->hasMany(AttendanceRecord::class);
    }

    public function distanceTo(float $latitude, float $longitude): float
    {
        $earthRadius = 6371000;
        $latFrom = deg2rad((float) $this->latitude);
        $lonFrom = deg2rad((float) $this->longitude);
        $latTo = deg2rad($latitude);
        $lonTo = deg2rad($longitude);

        $latDelta = $latTo - $latFrom;
        $lonDelta = $lonTo - $lonFrom;

        $angle = 2 * asin(sqrt(
            (sin($latDelta / 2) ** 2) +
            cos($latFrom) * cos($latTo) * (sin($lonDelta / 2) ** 2)
        ));

        return round($angle * $earthRadius, 2);
    }
}
