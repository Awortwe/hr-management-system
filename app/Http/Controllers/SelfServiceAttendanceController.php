<?php

namespace App\Http\Controllers;

use App\Models\AttendanceRecord;
use App\Models\Employee;
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
        $employee = $request->user()?->employee;
        $todayRecord = $employee ? $this->todayRecord($employee) : null;

        return Inertia::render('SelfService/Attendance/Index', [
            'employee' => $employee ? [
                'id' => $employee->id,
                'employee_number' => $employee->employee_number,
                'full_name' => $employee->full_name,
                'avatar_url' => $employee->avatar_url,
                'department' => $employee->department,
                'position' => $employee->position,
            ] : null,
            'todayRecord' => $todayRecord ? $this->attendanceRow($todayRecord) : null,
            'recentRecords' => $employee
                ? $employee->attendanceRecords()
                    ->latest('work_date')
                    ->limit(7)
                    ->get()
                    ->map(fn (AttendanceRecord $record): array => $this->attendanceRow($record))
                : [],
            'workDate' => today()->toDateString(),
            'lateAfter' => '08:15',
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

        return DB::transaction(function () use ($employee): RedirectResponse {
            Employee::query()->whereKey($employee->id)->lockForUpdate()->firstOrFail();
            $attendance = $this->todayRecord($employee);

            if ($attendance->clock_in_at) {
                return back()->with('error', 'You are already clocked in for today.');
            }

            $clockIn = now();

            $attendance->fill([
                'clock_in_at' => $clockIn,
                'status' => $this->statusFromClockIn($clockIn),
                'worked_minutes' => 0,
            ])->save();

            return back()->with('success', 'You are clocked in. Have a good shift.');
        });
    }

    public function clockOut(Request $request): RedirectResponse
    {
        $employee = $request->user()?->employee;

        if (! $employee) {
            return back()->with('error', 'We could not find an employee profile linked to your login yet.');
        }

        return DB::transaction(function () use ($employee): RedirectResponse {
            Employee::query()->whereKey($employee->id)->lockForUpdate()->firstOrFail();
            $attendance = $this->todayRecord($employee);

            if (! $attendance->clock_in_at) {
                return back()->with('error', 'Please clock in before you clock out.');
            }

            if ($attendance->clock_out_at) {
                return back()->with('error', 'You are already clocked out for today.');
            }

            $clockOut = now();

            $attendance->fill([
                'clock_out_at' => $clockOut,
                'worked_minutes' => (int) $attendance->clock_in_at->diffInMinutes($clockOut),
            ])->save();

            return back()->with('success', 'You are clocked out. Nice work today.');
        });
    }

    private function todayRecord(Employee $employee): AttendanceRecord
    {
        return AttendanceRecord::query()->whereDate('work_date', today())->firstOrNew([
            'employee_id' => $employee->id,
        ], [
            'work_date' => today()->toDateString(),
        ]);
    }

    private function statusFromClockIn(Carbon $clockIn): string
    {
        return $clockIn->format('H:i') > '08:15' ? 'late' : 'present';
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
            'exists' => $record->exists,
        ];
    }
}
