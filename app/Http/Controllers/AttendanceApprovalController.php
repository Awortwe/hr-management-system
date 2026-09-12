<?php

namespace App\Http\Controllers;

use App\Models\AttendanceAuditLog;
use App\Models\AttendanceRecord;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AttendanceApprovalController extends Controller
{
    public function approve(Request $request, AttendanceRecord $attendanceRecord): RedirectResponse
    {
        $attendanceRecord->update([
            'approval_status' => 'approved',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        $this->audit($request, $attendanceRecord, 'attendance.approved');

        return back()->with('success', 'Attendance record approved.');
    }

    public function reject(Request $request, AttendanceRecord $attendanceRecord): RedirectResponse
    {
        $attendanceRecord->update([
            'approval_status' => 'rejected',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        $this->audit($request, $attendanceRecord, 'attendance.rejected');

        return back()->with('success', 'Attendance record rejected.');
    }

    public function approveOvertime(Request $request, AttendanceRecord $attendanceRecord): RedirectResponse
    {
        $attendanceRecord->update([
            'overtime_approved_by' => $request->user()->id,
            'overtime_approved_at' => now(),
        ]);

        $this->audit($request, $attendanceRecord, 'overtime.approved');

        return back()->with('success', 'Overtime approved.');
    }

    public function rejectOvertime(Request $request, AttendanceRecord $attendanceRecord): RedirectResponse
    {
        $attendanceRecord->update([
            'overtime_approved_by' => null,
            'overtime_approved_at' => null,
        ]);

        $this->audit($request, $attendanceRecord, 'overtime.rejected');

        return back()->with('success', 'Overtime approval removed.');
    }

    private function audit(Request $request, AttendanceRecord $attendanceRecord, string $event): void
    {
        AttendanceAuditLog::create([
            'employee_id' => $attendanceRecord->employee_id,
            'attendance_record_id' => $attendanceRecord->id,
            'actor_id' => $request->user()?->id,
            'event' => $event,
            'metadata' => ['zone_status' => $attendanceRecord->zone_status],
        ]);
    }
}
