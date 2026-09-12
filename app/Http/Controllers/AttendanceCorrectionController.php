<?php

namespace App\Http\Controllers;

use App\Models\AttendanceAuditLog;
use App\Models\AttendanceCorrection;
use App\Models\AttendanceRecord;
use App\Models\Employee;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AttendanceCorrectionController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $manager = $user?->employee;

        $corrections = AttendanceCorrection::query()
            ->with(['employee.department:id,name', 'employee.position:id,title', 'attendanceRecord:id,work_date,clock_in_at,clock_out_at,status'])
            ->when($user->hasRole('manager') && ! $user->hasRole('admin', 'hr'), fn ($query): mixed => $query
                ->whereHas('employee', fn ($employeeQuery): mixed => $employeeQuery->where('manager_id', $manager?->id ?? 0)))
            ->latest()
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('Staff/AttendanceCorrections/Index', [
            'corrections' => $corrections,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $employee = $request->user()?->employee;

        if (! $employee) {
            return back()->with('error', 'We could not find an employee profile linked to your login yet.');
        }

        $attributes = $request->validate([
            'type' => ['required', Rule::in(['missed_check_in', 'missed_check_out', 'wrong_time', 'wrong_location', 'other'])],
            'work_date' => ['required', 'date'],
            'requested_clock_in_at' => ['nullable', 'date'],
            'requested_clock_out_at' => ['nullable', 'date'],
            'requested_latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'requested_longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'reason' => ['required', 'string', 'max:2000'],
        ]);

        $record = AttendanceRecord::query()
            ->where('employee_id', $employee->id)
            ->whereDate('work_date', $attributes['work_date'])
            ->first();

        $correction = AttendanceCorrection::create([
            ...$attributes,
            'employee_id' => $employee->id,
            'attendance_record_id' => $record?->id,
        ]);

        AttendanceAuditLog::create([
            'employee_id' => $employee->id,
            'attendance_record_id' => $record?->id,
            'actor_id' => $request->user()->id,
            'event' => 'attendance_correction.requested',
            'metadata' => ['correction_id' => $correction->id, 'type' => $correction->type],
        ]);

        return back()->with('success', 'Attendance correction request submitted.');
    }

    public function approve(Request $request, AttendanceCorrection $attendanceCorrection): RedirectResponse
    {
        $attributes = $request->validate([
            'review_remarks' => ['nullable', 'string', 'max:1000'],
        ]);

        return DB::transaction(function () use ($request, $attendanceCorrection, $attributes): RedirectResponse {
            $record = AttendanceRecord::query()->firstOrNew([
                'employee_id' => $attendanceCorrection->employee_id,
                'work_date' => $attendanceCorrection->work_date->toDateString(),
            ]);

            $clockIn = $attendanceCorrection->requested_clock_in_at ?? $record->clock_in_at;
            $clockOut = $attendanceCorrection->requested_clock_out_at ?? $record->clock_out_at;

            $record->fill([
                'clock_in_at' => $clockIn,
                'clock_out_at' => $clockOut,
                'worked_minutes' => $clockIn && $clockOut ? (int) $clockIn->diffInMinutes($clockOut) : (int) ($record->worked_minutes ?? 0),
                'status' => $clockIn ? $record->status ?: 'present' : 'absent',
                'correction_reason' => $attendanceCorrection->reason,
                'corrected_by' => $request->user()->id,
                'corrected_at' => now(),
                'approval_status' => 'approved',
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
            ])->save();

            $attendanceCorrection->update([
                'attendance_record_id' => $record->id,
                'status' => 'approved',
                'reviewed_by' => $request->user()->id,
                'review_remarks' => $attributes['review_remarks'] ?? null,
                'reviewed_at' => now(),
            ]);

            AttendanceAuditLog::create([
                'employee_id' => $attendanceCorrection->employee_id,
                'attendance_record_id' => $record->id,
                'actor_id' => $request->user()->id,
                'event' => 'attendance_correction.approved',
                'metadata' => ['correction_id' => $attendanceCorrection->id],
            ]);

            return back()->with('success', 'Attendance correction approved.');
        });
    }

    public function reject(Request $request, AttendanceCorrection $attendanceCorrection): RedirectResponse
    {
        $attributes = $request->validate([
            'review_remarks' => ['required', 'string', 'max:1000'],
        ]);

        $attendanceCorrection->update([
            'status' => 'rejected',
            'reviewed_by' => $request->user()->id,
            'review_remarks' => $attributes['review_remarks'],
            'reviewed_at' => now(),
        ]);

        AttendanceAuditLog::create([
            'employee_id' => $attendanceCorrection->employee_id,
            'attendance_record_id' => $attendanceCorrection->attendance_record_id,
            'actor_id' => $request->user()->id,
            'event' => 'attendance_correction.rejected',
            'metadata' => ['correction_id' => $attendanceCorrection->id],
        ]);

        return back()->with('success', 'Attendance correction rejected.');
    }
}
