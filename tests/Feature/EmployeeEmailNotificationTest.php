<?php

use App\Mail\AttendanceUpdated;
use App\Mail\EmployeeAccountCreated;
use App\Mail\LeaveRequestDecision;
use App\Mail\LeaveRequestSubmitted;
use App\Mail\SalaryPaymentProcessed;
use App\Models\AttendanceRecord;
use App\Models\Department;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\PayrollItem;
use App\Models\Position;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

afterEach(function (): void {
    Carbon::setTestNow();
});

it('emails a salary payment notice only for newly generated payslips', function (): void {
    Mail::fake();

    $hr = User::factory()->role('hr')->create();
    $user = User::factory()->role('employee')->create([
        'email' => 'payroll.account@hr-manager.pankhost.com',
    ]);
    $employee = notificationEmployee([
        'user_id' => $user->id,
        'work_email' => 'payroll.work@hr-manager.pankhost.com',
        'first_name' => 'Payroll',
        'last_name' => 'Person',
        'basic_salary' => 5000,
    ]);

    $this->actingAs($hr)->post(route('staff.payroll.run'), [
        'month' => 9,
        'year' => 2026,
    ])->assertRedirect();

    $this->actingAs($hr)->post(route('staff.payroll.run'), [
        'month' => 9,
        'year' => 2026,
    ])->assertRedirect();

    Mail::assertSent(SalaryPaymentProcessed::class, 1);
    Mail::assertSent(SalaryPaymentProcessed::class, fn (SalaryPaymentProcessed $mail): bool => $mail->hasTo('payroll.account@hr-manager.pankhost.com')
        && ! $mail->hasTo('payroll.work@hr-manager.pankhost.com')
        && $mail->item->employee_id === $employee->id
        && $mail->item->payroll->period_label === 'September 2026');

    expect(PayrollItem::query()->count())->toBe(1);
});

it('emails login credentials when an admin creates an account', function (): void {
    Mail::fake();

    $admin = User::factory()->role('admin')->create();

    $this->actingAs($admin)->post(route('admin.users.store'), [
        'name' => 'New Employee',
        'email' => 'new.employee@example.test',
        'role' => 'employee',
        'password' => 'secure-password-123',
        'password_confirmation' => 'secure-password-123',
    ])->assertRedirect();

    $user = User::query()->where('email', 'new.employee@example.test')->firstOrFail();

    Mail::assertSent(EmployeeAccountCreated::class, fn (EmployeeAccountCreated $mail): bool => $mail->hasTo('new.employee@example.test')
        && $mail->user->is($user)
        && $mail->plainPassword === 'secure-password-123');

    expect($user->password)->not->toBe('secure-password-123');
});

it('emails attendance confirmations after successful clock in and clock out', function (): void {
    Mail::fake();
    Carbon::setTestNow('2026-09-05 08:10:00');

    $user = User::factory()->role('employee')->create([
        'email' => 'attendance.account@hr-manager.pankhost.com',
    ]);
    $employee = notificationEmployee([
        'user_id' => $user->id,
        'work_email' => 'attendance.work@hr-manager.pankhost.com',
    ]);

    $this->actingAs($employee->user)
        ->post(route('self-service.attendance.clock-in'))
        ->assertRedirect();

    $this->actingAs($employee->user)
        ->post(route('self-service.attendance.clock-in'))
        ->assertRedirect()
        ->assertSessionHas('error', 'You are already clocked in for today.');

    Carbon::setTestNow('2026-09-05 17:00:00');

    $this->actingAs($employee->user)
        ->post(route('self-service.attendance.clock-out'))
        ->assertRedirect();

    Mail::assertSent(AttendanceUpdated::class, 2);
    Mail::assertSent(AttendanceUpdated::class, fn (AttendanceUpdated $mail): bool => $mail->hasTo('attendance.account@hr-manager.pankhost.com')
        && ! $mail->hasTo('attendance.work@hr-manager.pankhost.com')
        && $mail->event === 'clock-in');
    Mail::assertSent(AttendanceUpdated::class, fn (AttendanceUpdated $mail): bool => $mail->hasTo('attendance.account@hr-manager.pankhost.com')
        && ! $mail->hasTo('attendance.work@hr-manager.pankhost.com')
        && $mail->event === 'clock-out');

    expect(AttendanceRecord::query()->count())->toBe(1);
});

it('emails leave submission and a single approval decision', function (): void {
    Mail::fake();

    $hr = notificationEmployee(['user_id' => User::factory()->role('hr')->create()->id]);
    $user = User::factory()->role('employee')->create([
        'email' => 'leave.account@hr-manager.pankhost.com',
    ]);
    $employee = notificationEmployee([
        'user_id' => $user->id,
        'work_email' => 'leave.work@hr-manager.pankhost.com',
    ]);
    $leaveType = LeaveType::factory()->create([
        'annual_allowance_days' => 20,
        'is_active' => true,
    ]);

    $this->actingAs($employee->user)->post(route('staff.leave-requests.store'), [
        'employee_id' => $employee->id,
        'leave_type_id' => $leaveType->id,
        'start_date' => '2026-09-14',
        'end_date' => '2026-09-15',
        'reason' => 'Family appointment.',
    ])->assertRedirect();

    $leaveRequest = LeaveRequest::query()->firstOrFail();

    $this->actingAs($hr->user)
        ->patch(route('staff.leave-requests.approve', $leaveRequest), [
            'decision_comment' => 'Approved.',
        ])
        ->assertRedirect();

    $this->actingAs($hr->user)
        ->patch(route('staff.leave-requests.approve', $leaveRequest), [
            'decision_comment' => 'Double click.',
        ])
        ->assertRedirect();

    Mail::assertSent(LeaveRequestSubmitted::class, fn (LeaveRequestSubmitted $mail): bool => $mail->hasTo('leave.account@hr-manager.pankhost.com')
        && ! $mail->hasTo('leave.work@hr-manager.pankhost.com')
        && $mail->leaveRequest->id === $leaveRequest->id);
    Mail::assertSent(LeaveRequestDecision::class, 1);
    Mail::assertSent(LeaveRequestDecision::class, fn (LeaveRequestDecision $mail): bool => $mail->hasTo('leave.account@hr-manager.pankhost.com')
        && ! $mail->hasTo('leave.work@hr-manager.pankhost.com')
        && $mail->leaveRequest->status === 'approved');

    $balance = LeaveBalance::query()
        ->where('employee_id', $employee->id)
        ->where('leave_type_id', $leaveType->id)
        ->firstOrFail();

    expect($balance->used_days)->toBe('2.00');
});

it('emails leave rejection decisions', function (): void {
    Mail::fake();

    $hr = notificationEmployee(['user_id' => User::factory()->role('hr')->create()->id]);
    $user = User::factory()->role('employee')->create([
        'email' => 'leave-rejected.account@hr-manager.pankhost.com',
    ]);
    $employee = notificationEmployee([
        'user_id' => $user->id,
        'work_email' => 'leave-rejected.work@hr-manager.pankhost.com',
    ]);
    $leaveType = LeaveType::factory()->create();
    $leaveRequest = LeaveRequest::factory()->create([
        'employee_id' => $employee->id,
        'leave_type_id' => $leaveType->id,
        'status' => 'pending',
    ]);

    $this->actingAs($hr->user)
        ->patch(route('staff.leave-requests.reject', $leaveRequest), [
            'decision_comment' => 'Coverage is too thin.',
        ])
        ->assertRedirect();

    Mail::assertSent(LeaveRequestDecision::class, fn (LeaveRequestDecision $mail): bool => $mail->hasTo('leave-rejected.account@hr-manager.pankhost.com')
        && ! $mail->hasTo('leave-rejected.work@hr-manager.pankhost.com')
        && $mail->leaveRequest->status === 'rejected');
});

it('does not send operational notifications when an employee has no linked user account', function (): void {
    Mail::fake();

    $hr = notificationEmployee(['user_id' => User::factory()->role('hr')->create()->id]);
    $employee = notificationEmployee([
        'user_id' => null,
        'work_email' => 'seed.employee@hr-manager.pankhost.com',
        'personal_email' => 'real.employee@hr-manager.pankhost.com',
    ]);
    $leaveType = LeaveType::factory()->create();
    $leaveRequest = LeaveRequest::factory()->create([
        'employee_id' => $employee->id,
        'leave_type_id' => $leaveType->id,
        'status' => 'pending',
    ]);

    $this->actingAs($hr->user)
        ->patch(route('staff.leave-requests.approve', $leaveRequest))
        ->assertRedirect();

    Mail::assertNothingSent();
});

function notificationEmployee(array $attributes = []): Employee
{
    $department = Department::factory()->create();
    $position = Position::factory()->create([
        'department_id' => $department->id,
    ]);
    $user = $attributes['user_id'] ?? User::factory()->role('employee')->create()->id;

    return Employee::factory()->create([
        'user_id' => $user,
        'department_id' => $department->id,
        'position_id' => $position->id,
        'status' => 'active',
        ...$attributes,
    ]);
}
