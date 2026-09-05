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
use Illuminate\Support\Facades\Mail;

class EmployeeNotifications
{
    public static function salaryPayment(PayrollItem $item): void
    {
        $item->loadMissing(['employee', 'payroll']);
        self::sendToEmployee($item->employee, new SalaryPaymentProcessed($item));
    }

    public static function attendanceUpdated(AttendanceRecord $record, string $event): void
    {
        $record->loadMissing('employee');
        self::sendToEmployee($record->employee, new AttendanceUpdated($record, $event));
    }

    public static function leaveSubmitted(LeaveRequest $leaveRequest): void
    {
        $leaveRequest->loadMissing(['employee', 'leaveType']);
        self::sendToEmployee($leaveRequest->employee, new LeaveRequestSubmitted($leaveRequest));
    }

    public static function leaveDecided(LeaveRequest $leaveRequest): void
    {
        $leaveRequest->loadMissing(['employee', 'leaveType', 'approver']);
        self::sendToEmployee($leaveRequest->employee, new LeaveRequestDecision($leaveRequest));
    }

    private static function sendToEmployee(?Employee $employee, Mailable $mailable): void
    {
        $email = collect([$employee?->work_email, $employee?->personal_email])
            ->filter(fn (?string $email): bool => self::isDeliverableAddress($email))
            ->first();

        if (! $email) {
            return;
        }

        rescue(
            fn () => Mail::to($email)->send($mailable),
            report: true,
        );
    }

    private static function isDeliverableAddress(?string $email): bool
    {
        if (! $email || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        $domain = strtolower((string) str($email)->afterLast('@'));

        return ! str($domain)->endsWith([
            '.example',
            '.invalid',
            '.localhost',
            '.test',
            'example.com',
            'example.net',
            'example.org',
            'localhost',
        ]);
    }
}
