<?php

namespace App\Http\Controllers;

use App\Models\AttendanceRecord;
use App\Models\AttendanceAuditLog;
use App\Models\Employee;
use App\Models\ProjectSite;
use App\Support\EmployeeSearch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SelfServiceAttendanceController extends Controller
{
    public function index(Request $request): Response
    {
        $employee = $request->user()?->employee?->load([
            'department:id,name',
            'position:id,title',
            'shift:id,name,starts_at,ends_at,grace_minutes,unpaid_break_minutes,overtime_rate,overtime_cap_hours',
            'projectSites:id,name,code,address,latitude,longitude,geofence_radius_meters,status',
        ]);
        $activeSites = ProjectSite::query()
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'address', 'latitude', 'longitude', 'geofence_radius_meters', 'status']);
        $assignedSites = $employee?->projectSites ?? collect();
        $todayRecord = $employee ? $this->todayRecord($employee) : null;

        return Inertia::render('SelfService/Attendance/Index', [
            'employee' => $employee ? [
                'id' => $employee->id,
                'employee_number' => $employee->employee_number,
                'full_name' => $employee->full_name,
                'avatar_url' => $employee->avatar_url,
                'department' => $employee->department,
                'position' => $employee->position,
                'shift' => $employee->shift,
                'project_sites' => $assignedSites->isNotEmpty() ? $assignedSites->values() : $activeSites,
                'has_project_site_assignment' => $assignedSites->isNotEmpty(),
            ] : null,
            'hasActiveProjectSites' => $activeSites->isNotEmpty(),
            'todayRecord' => $todayRecord ? $this->attendanceRow($todayRecord) : null,
            'recentRecords' => $employee
                ? $employee->attendanceRecords()
                    ->with('projectSite:id,name,code')
                    ->latest('work_date')
                    ->limit(7)
                    ->get()
                    ->map(fn (AttendanceRecord $record): array => $this->attendanceRow($record))
                : [],
            'workDate' => today()->toDateString(),
            'lateAfter' => $employee?->shift
                ? Carbon::parse($employee->shift->starts_at)->addMinutes($employee->shift->grace_minutes)->format('H:i')
                : '08:15',
        ]);
    }

    public function manager(Request $request): Response
    {
        $search = EmployeeSearch::term($request);
        $attributes = $request->validate([
            'date' => ['nullable', 'date'],
        ]);
        $workDate = isset($attributes['date'])
            ? Carbon::parse($attributes['date'])->toDateString()
            : today()->toDateString();
        $manager = $request->user()?->employee;

        $companyWide = $request->user()->hasRole('admin', 'hr');
        $teamMembers = $companyWide || $manager
            ? ($companyWide ? Employee::query() : $manager->subordinates())
                ->where(fn ($query) => EmployeeSearch::apply($query, $search))
                ->with(['department:id,name', 'position:id,title'])
                ->orderBy('first_name')
                ->get()
            : collect();

        $records = AttendanceRecord::query()
            ->with('projectSite:id,name,code')
            ->whereIn('employee_id', $teamMembers->pluck('id'))
            ->whereDate('work_date', $workDate)
            ->get()
            ->keyBy('employee_id');

        $rows = $teamMembers->map(function (Employee $employee) use ($records, $workDate): array {
            $record = $records->get($employee->id);
            $hoursWorked = $record?->clock_in_at && $record?->clock_out_at
                ? round($record->clock_in_at->diffInHours($record->clock_out_at), 2)
                : 0.0;

            return [
                'employee_id' => $employee->id,
                'employee_number' => $employee->employee_number,
                'employee_name' => $employee->full_name,
                'department' => $employee->department?->name,
                'position' => $employee->position?->title,
                'work_date' => $workDate,
                'clock_in_at' => $record?->clock_in_at?->toISOString(),
                'clock_out_at' => $record?->clock_out_at?->toISOString(),
                'status' => $record?->status ?? 'absent',
                'hours_worked' => $hoursWorked,
                'project_site' => $record?->projectSite?->name,
                'zone_status' => $record?->zone_status,
                'approval_status' => $record?->approval_status,
                'overtime_hours' => (float) ($record?->overtime_hours ?? 0),
            ];
        });

        return Inertia::render('Manager/Attendance/Index', [
            'companyWide' => $companyWide,
            'filters' => ['search' => $search],
            'workDate' => $workDate,
            'rows' => $rows->values(),
            'summary' => [
                'expected' => $rows->count(),
                'present' => $rows->where('status', 'present')->count(),
                'late' => $rows->where('status', 'late')->count(),
                'absent' => $rows->where('status', 'absent')->count(),
                'clocked_out' => $rows->whereNotNull('clock_out_at')->count(),
                'total_hours' => round($rows->sum('hours_worked'), 2),
            ],
        ]);
    }

    public function clockIn(Request $request): RedirectResponse
    {
        $employee = $request->user()?->employee;

        if (! $employee) {
            return back()->with('error', 'We could not find an employee profile linked to your login yet.');
        }

        $attributes = $this->validatedPunch($request, 'check_in_selfie');

        return DB::transaction(function () use ($employee, $attributes, $request): RedirectResponse {
            Employee::query()->whereKey($employee->id)->lockForUpdate()->firstOrFail();
            $attendance = $this->todayRecord($employee);

            if ($attendance->clock_in_at) {
                return back()->with('error', 'You are already clocked in for today.');
            }

            $clockIn = now();
            $siteMatch = $this->nearestSite($employee, (float) $attributes['latitude'], (float) $attributes['longitude']);
            $selfiePath = $request->file('check_in_selfie')->store('attendance-selfies/check-in', 'public');

            $attendance->fill([
                'clock_in_at' => $clockIn,
                'check_in_selfie_path' => $selfiePath,
                'check_in_latitude' => $attributes['latitude'],
                'check_in_longitude' => $attributes['longitude'],
                'project_site_id' => $siteMatch['site']?->id,
                'distance_from_site' => $siteMatch['distance'],
                'zone_status' => $siteMatch['zone_status'],
                'approval_status' => $siteMatch['zone_status'] === 'out_of_zone' ? 'pending' : 'approved',
                'approved_at' => $siteMatch['zone_status'] === 'out_of_zone' ? null : now(),
                'approved_by' => $siteMatch['zone_status'] === 'out_of_zone' ? null : $request->user()->id,
                'status' => $this->statusFromClockIn($employee, $clockIn),
                'worked_minutes' => 0,
            ])->save();

            $this->audit($attendance, $request, $siteMatch['zone_status'] === 'out_of_zone' ? 'attendance.out_of_zone' : 'attendance.clock_in', [
                'latitude' => $attributes['latitude'],
                'longitude' => $attributes['longitude'],
                'distance_from_site' => $siteMatch['distance'],
            ]);

            return back()->with('success', 'You are clocked in. Have a good shift.');
        });
    }

    public function clockOut(Request $request): RedirectResponse
    {
        $employee = $request->user()?->employee;

        if (! $employee) {
            return back()->with('error', 'We could not find an employee profile linked to your login yet.');
        }

        $attributes = $this->validatedPunch($request, 'check_out_selfie');

        return DB::transaction(function () use ($employee, $attributes, $request): RedirectResponse {
            Employee::query()->whereKey($employee->id)->lockForUpdate()->firstOrFail();
            $attendance = $this->todayRecord($employee);

            if (! $attendance->clock_in_at) {
                return back()->with('error', 'Please clock in before you clock out.');
            }

            if ($attendance->clock_out_at) {
                return back()->with('error', 'You are already clocked out for today.');
            }

            $clockOut = now();
            $siteMatch = $this->nearestSite($employee, (float) $attributes['latitude'], (float) $attributes['longitude']);
            $selfiePath = $request->file('check_out_selfie')->store('attendance-selfies/check-out', 'public');
            $workedMinutes = (int) $attendance->clock_in_at->diffInMinutes($clockOut);
            $overtimeHours = $this->overtimeHours($employee, $attendance->work_date, $clockOut);

            $attendance->fill([
                'clock_out_at' => $clockOut,
                'check_out_selfie_path' => $selfiePath,
                'check_out_latitude' => $attributes['latitude'],
                'check_out_longitude' => $attributes['longitude'],
                'project_site_id' => $attendance->project_site_id ?: $siteMatch['site']?->id,
                'distance_from_site' => $siteMatch['distance'] ?? $attendance->distance_from_site,
                'zone_status' => $attendance->zone_status === 'out_of_zone' || $siteMatch['zone_status'] === 'out_of_zone' ? 'out_of_zone' : $siteMatch['zone_status'],
                'approval_status' => $attendance->zone_status === 'out_of_zone' || $siteMatch['zone_status'] === 'out_of_zone' ? 'pending' : $attendance->approval_status,
                'worked_minutes' => $workedMinutes,
                'overtime_hours' => $overtimeHours,
            ])->save();

            $this->audit($attendance, $request, $attendance->zone_status === 'out_of_zone' ? 'attendance.out_of_zone' : 'attendance.clock_out', [
                'latitude' => $attributes['latitude'],
                'longitude' => $attributes['longitude'],
                'distance_from_site' => $siteMatch['distance'],
                'overtime_hours' => $overtimeHours,
            ]);

            return back()->with('success', 'You are clocked out. Nice work today.');
        });
    }

    private function todayRecord(Employee $employee): AttendanceRecord
    {
        return AttendanceRecord::query()->whereDate('work_date', today())->where('employee_id', $employee->id)->firstOrNew([
            'employee_id' => $employee->id,
        ], [
            'work_date' => today()->toDateString(),
        ]);
    }

    private function statusFromClockIn(Employee $employee, Carbon $clockIn): string
    {
        $lateAfter = $employee->shift
            ? Carbon::parse($clockIn->toDateString().' '.$employee->shift->starts_at)->addMinutes($employee->shift->grace_minutes)
            : Carbon::parse($clockIn->toDateString().' 08:15:00');

        return $clockIn->greaterThan($lateAfter) ? 'late' : 'present';
    }

    private function attendanceRow(AttendanceRecord $record): array
    {
        return [
            'id' => $record->id,
            'work_date' => $record->work_date?->toDateString(),
            'clock_in_at' => $record->clock_in_at?->toISOString(),
            'clock_out_at' => $record->clock_out_at?->toISOString(),
            'status' => $record->exists ? $record->status : 'not_started',
            'worked_minutes' => $record->worked_minutes,
            'check_in_selfie_url' => $record->check_in_selfie_url,
            'check_out_selfie_url' => $record->check_out_selfie_url,
            'check_in_latitude' => $record->check_in_latitude,
            'check_in_longitude' => $record->check_in_longitude,
            'check_out_latitude' => $record->check_out_latitude,
            'check_out_longitude' => $record->check_out_longitude,
            'project_site' => $record->projectSite ? [
                'id' => $record->projectSite->id,
                'name' => $record->projectSite->name,
                'code' => $record->projectSite->code,
            ] : null,
            'distance_from_site' => $record->distance_from_site,
            'zone_status' => $record->zone_status,
            'approval_status' => $record->approval_status,
            'overtime_hours' => (float) $record->overtime_hours,
            'overtime_approved_at' => $record->overtime_approved_at?->toISOString(),
            'exists' => $record->exists,
        ];
    }

    private function validatedPunch(Request $request, string $selfieField): array
    {
        return $request->validate([
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            $selfieField => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ], [
            'latitude.required' => 'GPS is required before you can submit attendance.',
            'longitude.required' => 'GPS is required before you can submit attendance.',
            "{$selfieField}.required" => 'A selfie is required before you can submit attendance.',
        ]);
    }

    /**
     * @return array{site: ?ProjectSite, distance: ?float, zone_status: string}
     */
    private function nearestSite(Employee $employee, float $latitude, float $longitude): array
    {
        $sites = $employee->projectSites()
            ->where('status', 'active')
            ->get();

        if ($sites->isEmpty()) {
            $sites = ProjectSite::query()->where('status', 'active')->get();
        }

        $nearest = $sites
            ->map(fn (ProjectSite $site): array => [
                'site' => $site,
                'distance' => $site->distanceTo($latitude, $longitude),
            ])
            ->sortBy('distance')
            ->first();

        if (! $nearest) {
            return ['site' => null, 'distance' => null, 'zone_status' => 'unknown'];
        }

        return [
            'site' => $nearest['site'],
            'distance' => $nearest['distance'],
            'zone_status' => $nearest['distance'] <= $nearest['site']->geofence_radius_meters ? 'in_zone' : 'out_of_zone',
        ];
    }

    private function overtimeHours(Employee $employee, Carbon $workDate, Carbon $clockOut): float
    {
        if (! $employee->shift) {
            return 0.0;
        }

        $shiftEnd = Carbon::parse($workDate->toDateString().' '.$employee->shift->ends_at);

        if ($employee->shift->is_night_shift && $shiftEnd->lessThanOrEqualTo(Carbon::parse($workDate->toDateString().' '.$employee->shift->starts_at))) {
            $shiftEnd->addDay();
        }

        if ($clockOut->lessThanOrEqualTo($shiftEnd)) {
            return 0.0;
        }

        return round(min($clockOut->diffInMinutes($shiftEnd) / 60, (float) $employee->shift->overtime_cap_hours), 2);
    }

    private function audit(AttendanceRecord $record, Request $request, string $event, array $metadata = []): void
    {
        AttendanceAuditLog::create([
            'employee_id' => $record->employee_id,
            'attendance_record_id' => $record->id,
            'actor_id' => $request->user()?->id,
            'event' => $event,
            'metadata' => $metadata,
        ]);
    }
}
