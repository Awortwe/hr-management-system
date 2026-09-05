<?php

use App\Models\AttendanceRecord;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Position;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

afterEach(function (): void {
    Carbon::setTestNow();
});

it('shows the attendance page without creating a blank record', function (): void {
    Carbon::setTestNow('2026-09-05 07:45:00');

    $employee = attendanceEmployee();

    $response = $this->actingAs($employee->user)->get(route('self-service.attendance.index'));
    $page = $response->getOriginalContent()->getData()['page'];

    $response->assertOk();
    expect($page['props']['todayRecord']['exists'])->toBeFalse()
        ->and(AttendanceRecord::query()->count())->toBe(0);
});

it('gives a friendly message when no employee profile is linked', function (): void {
    $user = User::factory()->role('employee')->create();

    $this->actingAs($user)
        ->post(route('self-service.attendance.clock-in'))
        ->assertRedirect()
        ->assertSessionHas('error', 'We could not find an employee profile linked to your login yet.');
});

it('clocks in once and derives present status from the server clock', function (): void {
    Carbon::setTestNow('2026-09-05 08:15:00');

    $employee = attendanceEmployee();

    $this->actingAs($employee->user)
        ->post(route('self-service.attendance.clock-in'))
        ->assertRedirect()
        ->assertSessionHas('success', 'You are clocked in. Have a good shift.');

    $record = AttendanceRecord::query()->firstOrFail();

    expect($record->status)->toBe('present')
        ->and($record->work_date->toDateString())->toBe('2026-09-05');

    $this->actingAs($employee->user)
        ->post(route('self-service.attendance.clock-in'))
        ->assertRedirect()
        ->assertSessionHas('error', 'You are already clocked in for today.');

    expect(AttendanceRecord::query()->count())->toBe(1);
});

it('derives late status and clocks out after clocking in', function (): void {
    Carbon::setTestNow('2026-09-05 08:16:00');

    $employee = attendanceEmployee();

    $this->actingAs($employee->user)->post(route('self-service.attendance.clock-in'));

    Carbon::setTestNow('2026-09-05 17:01:00');

    $this->actingAs($employee->user)
        ->post(route('self-service.attendance.clock-out'))
        ->assertRedirect()
        ->assertSessionHas('success', 'You are clocked out. Nice work today.');

    $record = AttendanceRecord::query()->firstOrFail();

    expect($record->status)->toBe('late')
        ->and($record->clock_out_at)->not->toBeNull()
        ->and($record->worked_minutes)->toBe(525);
});

it('requires clock in before clock out', function (): void {
    Carbon::setTestNow('2026-09-05 17:00:00');

    $employee = attendanceEmployee();

    $this->actingAs($employee->user)
        ->post(route('self-service.attendance.clock-out'))
        ->assertRedirect()
        ->assertSessionHas('error', 'Please clock in before you clock out.');

    expect(AttendanceRecord::query()->count())->toBe(0);
});

function attendanceEmployee(): Employee
{
    $user = User::factory()->role('employee')->create();
    $department = Department::factory()->create();
    $position = Position::factory()->create([
        'department_id' => $department->id,
    ]);

    return Employee::factory()->create([
        'user_id' => $user->id,
        'department_id' => $department->id,
        'position_id' => $position->id,
    ]);
}
