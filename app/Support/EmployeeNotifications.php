<?php

namespace App\Support;

use App\Mail\AttendanceUpdated;
use App\Mail\LeaveRequestDecision;
use App\Mail\LeaveRequestSubmitted;
use App\Mail\SalaryPaymentProcessed;
use App\Models\AttendanceRecord;
use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\PayrollItem;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class EmployeeNotifications
{
    public static function salaryPayment(PayrollItem $item): void
    {
        $item->loadMissing(['employee.user', 'payroll']);
        self::sendToEmployee($item->employee, new SalaryPaymentProcessed($item));
    }

    public static function attendanceUpdated(AttendanceRecord $record, string $event): void
    {
        $record->loadMissing('employee.user');
        self::sendToEmployee($record->employee, new AttendanceUpdated($record, $event));
    }

    public static function leaveSubmitted(LeaveRequest $leaveRequest): void
    {
        $leaveRequest->loadMissing(['employee.user', 'leaveType']);
        self::sendToEmployee($leaveRequest->employee, new LeaveRequestSubmitted($leaveRequest));
    }

    public static function leaveDecided(LeaveRequest $leaveRequest): void
    {
        $leaveRequest->loadMissing(['employee.user', 'leaveType', 'approver']);
        self::sendToEmployee($leaveRequest->employee, new LeaveRequestDecision($leaveRequest));
    }

    private static function sendToEmployee(?Employee $employee, Mailable $mailable): void
    {
        $email = $employee?->user?->email;

        if (! $email) {
            Log::warning('Employee notification skipped because no linked user email exists.', [
                'employee_id' => $employee?->id,
                'mailable' => $mailable::class,
            ]);

            return;
        }

        try {
            Mail::to($email)->send($mailable);

            Log::info('Employee notification sent.', [
                'employee_id' => $employee?->id,
                'user_id' => $employee?->user_id,
                'recipient' => $email,
                'mailable' => $mailable::class,
            ]);
        } catch (\Throwable $exception) {
            report($exception);

            Log::error('Employee notification failed.', [
                'employee_id' => $employee?->id,
                'user_id' => $employee?->user_id,
                'recipient' => $email,
                'mailable' => $mailable::class,
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
