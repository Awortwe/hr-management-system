<?php

use App\Models\AttendanceRecord;
use App\Models\AttendanceCorrection;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Position;
use App\Models\ProjectSite;
use App\Models\Shift;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

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
    Storage::fake('public');

    $employee = attendanceEmployeeWithSite();

    $this->actingAs($employee->user)
        ->post(route('self-service.attendance.clock-in'), punchPayload('check_in_selfie'))
        ->assertRedirect()
        ->assertSessionHas('success', 'You are clocked in. Have a good shift.');

    $record = AttendanceRecord::query()->firstOrFail();

    expect($record->status)->toBe('present')
        ->and($record->work_date->toDateString())->toBe('2026-09-05');

    $this->actingAs($employee->user)
        ->post(route('self-service.attendance.clock-in'), punchPayload('check_in_selfie'))
        ->assertRedirect()
        ->assertSessionHas('error', 'You are already clocked in for today.');

    expect(AttendanceRecord::query()->count())->toBe(1);
});

it('derives late status and clocks out after clocking in', function (): void {
    Carbon::setTestNow('2026-09-05 08:16:00');
    Storage::fake('public');

    $employee = attendanceEmployeeWithSite();

    $this->actingAs($employee->user)->post(route('self-service.attendance.clock-in'), punchPayload('check_in_selfie'));

    Carbon::setTestNow('2026-09-05 17:01:00');

    $this->actingAs($employee->user)
        ->post(route('self-service.attendance.clock-out'), punchPayload('check_out_selfie'))
        ->assertRedirect()
        ->assertSessionHas('success', 'You are clocked out. Nice work today.');

    $record = AttendanceRecord::query()->firstOrFail();

    expect($record->status)->toBe('late')
        ->and($record->clock_out_at)->not->toBeNull()
        ->and($record->worked_minutes)->toBe(525);
});

it('requires clock in before clock out', function (): void {
    Carbon::setTestNow('2026-09-05 17:00:00');
    Storage::fake('public');

    $employee = attendanceEmployeeWithSite();

    $this->actingAs($employee->user)
        ->post(route('self-service.attendance.clock-out'), punchPayload('check_out_selfie'))
        ->assertRedirect()
        ->assertSessionHas('error', 'Please clock in before you clock out.');

    expect(AttendanceRecord::query()->count())->toBe(0);
});

it('flags out of zone punches for review without rejecting them', function (): void {
    Carbon::setTestNow('2026-09-05 08:00:00');
    Storage::fake('public');

    $employee = attendanceEmployeeWithSite();

    $this->actingAs($employee->user)
        ->post(route('self-service.attendance.clock-in'), [
            ...punchPayload('check_in_selfie'),
            'latitude' => 6.700000,
            'longitude' => -1.600000,
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $record = AttendanceRecord::query()->firstOrFail();

    expect($record->zone_status)->toBe('out_of_zone')
        ->and($record->approval_status)->toBe('pending')
        ->and($record->project_site_id)->not->toBeNull();
});

it('submits and approves attendance correction requests', function (): void {
    Carbon::setTestNow('2026-09-05 10:00:00');

    $manager = attendanceEmployee('manager');
    $employee = attendanceEmployee(managerId: $manager->id);

    $this->actingAs($employee->user)
        ->post(route('self-service.attendance-corrections.store'), [
            'type' => 'missed_check_in',
            'work_date' => '2026-09-05',
            'requested_clock_in_at' => '2026-09-05 08:05:00',
            'reason' => 'Phone battery died before I could submit.',
        ])
        ->assertRedirect()
        ->assertSessionHas('success', 'Attendance correction request submitted.');

    $correction = AttendanceCorrection::query()->firstOrFail();

    $this->actingAs($manager->user)
        ->patch(route('staff.attendance-corrections.approve', $correction), [
            'review_remarks' => 'Confirmed with site lead.',
        ])
        ->assertRedirect()
        ->assertSessionHas('success', 'Attendance correction approved.');

    expect($correction->refresh()->status)->toBe('approved')
        ->and(AttendanceRecord::query()->where('employee_id', $employee->id)->exists())->toBeTrue();
});

it('defaults the manager attendance view to today', function (): void {
    Carbon::setTestNow('2026-09-05 10:00:00');

    $manager = attendanceEmployee('manager');

    $response = $this->actingAs($manager->user)->get(route('manager.attendance.index'));
    $page = $response->getOriginalContent()->getData()['page'];

    $response->assertOk();
    expect($page['props']['workDate'])->toBe('2026-09-05')
        ->and($page['props']['summary']['expected'])->toBe(0);
});

it('reshapes team attendance rows and summary totals on the server', function (): void {
    Carbon::setTestNow('2026-09-05 10:00:00');

    $manager = attendanceEmployee('manager');
    $presentEmployee = attendanceEmployee(managerId: $manager->id);
    $lateEmployee = attendanceEmployee(managerId: $manager->id);
    attendanceEmployee(managerId: $manager->id);

    AttendanceRecord::factory()->create([
        'employee_id' => $presentEmployee->id,
        'work_date' => '2026-09-04',
        'clock_in_at' => Carbon::parse('2026-09-04 08:00:00'),
        'clock_out_at' => Carbon::parse('2026-09-04 16:30:00'),
        'status' => 'present',
    ]);
    AttendanceRecord::factory()->create([
        'employee_id' => $lateEmployee->id,
        'work_date' => '2026-09-04',
        'clock_in_at' => Carbon::parse('2026-09-04 08:45:00'),
        'clock_out_at' => null,
        'status' => 'late',
    ]);

    $response = $this->actingAs($manager->user)->get(route('manager.attendance.index', [
        'date' => '2026-09-04',
    ]));
    $page = $response->getOriginalContent()->getData()['page'];

    $response->assertOk();
    expect($page['props']['rows'])->toHaveCount(3)
        ->and($page['props']['rows'][0])->toHaveKeys([
            'employee_id',
            'employee_number',
            'employee_name',
            'department',
            'position',
            'work_date',
            'clock_in_at',
            'clock_out_at',
            'status',
            'hours_worked',
        ])
        ->and($page['props']['summary'])->toMatchArray([
            'expected' => 3,
            'present' => 1,
            'late' => 1,
            'absent' => 1,
            'clocked_out' => 1,
            'total_hours' => 8.5,
        ]);
});

function attendanceEmployee(string $role = 'employee', ?int $managerId = null): Employee
{
    $user = User::factory()->role($role)->create();
    $department = Department::factory()->create();
    $position = Position::factory()->create([
        'department_id' => $department->id,
    ]);

    return Employee::factory()->create([
        'user_id' => $user->id,
        'department_id' => $department->id,
        'position_id' => $position->id,
        'manager_id' => $managerId,
    ]);
}

function attendanceEmployeeWithSite(): Employee
{
    $shift = Shift::query()->create([
        'name' => 'Field Shift',
        'starts_at' => '08:00:00',
        'ends_at' => '17:00:00',
        'grace_minutes' => 15,
        'unpaid_break_minutes' => 60,
    ]);
    $employee = attendanceEmployee();
    $employee->update(['shift_id' => $shift->id]);
    $site = ProjectSite::query()->create([
        'name' => 'Test Site',
        'code' => 'TST',
        'latitude' => 5.560014,
        'longitude' => -0.205744,
        'geofence_radius_meters' => 150,
        'status' => 'active',
    ]);
    $employee->projectSites()->attach($site);

    return $employee->refresh();
}

function punchPayload(string $selfieField): array
{
    return [
        'latitude' => 5.560020,
        'longitude' => -0.205750,
        $selfieField => UploadedFile::fake()->image('selfie.jpg'),
    ];
}
