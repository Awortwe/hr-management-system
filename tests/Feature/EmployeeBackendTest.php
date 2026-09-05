<?php

use App\Models\Department;
use App\Models\Employee;
use App\Models\Position;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

it('blocks employees from the employee administration index', function (): void {
    $employeeUser = User::factory()->create([
        'role' => 'employee',
    ]);

    $this->actingAs($employeeUser)
        ->get(route('staff.employees.index'))
        ->assertForbidden();
});

it('allows HR to edit an employee without failing unique rules on unchanged fields', function (): void {
    $hr = User::factory()->create([
        'role' => 'hr',
    ]);
    $department = Department::factory()->create();
    $position = Position::factory()->create([
        'department_id' => $department->id,
    ]);
    $employee = Employee::factory()->create([
        'department_id' => $department->id,
        'position_id' => $position->id,
        'employee_number' => 'PHQ-9001',
        'work_email' => 'employee@example.test',
    ]);

    $this->actingAs($hr)
        ->put(route('staff.employees.update', $employee), [
            ...employeePayload($department, $position),
            'employee_number' => $employee->employee_number,
            'work_email' => $employee->work_email,
            'first_name' => 'Updated',
        ])
        ->assertRedirect();

    expect($employee->fresh()->first_name)->toBe('Updated');
});

it('replaces and deletes profile photos without leaving the old file linked', function (): void {
    Storage::fake('public');

    $hr = User::factory()->create([
        'role' => 'hr',
    ]);
    $department = Department::factory()->create();
    $position = Position::factory()->create([
        'department_id' => $department->id,
    ]);

    $createResponse = $this->actingAs($hr)
        ->post(route('staff.employees.store'), [
            ...employeePayload($department, $position),
            'employee_number' => 'PHQ-9002',
            'profile_photo' => UploadedFile::fake()->image('first.jpg'),
        ]);

    $employee = Employee::query()->where('employee_number', 'PHQ-9002')->firstOrFail();
    $firstPhoto = $employee->profile_photo_path;

    $createResponse->assertRedirect(route('staff.employees.show', $employee));
    Storage::disk('public')->assertExists($firstPhoto);

    $this->actingAs($hr)
        ->post(route('staff.employees.update', $employee), [
            ...employeePayload($department, $position),
            '_method' => 'patch',
            'employee_number' => 'PHQ-9002',
            'profile_photo' => UploadedFile::fake()->image('replacement.png'),
        ])
        ->assertRedirect();

    $employee->refresh();
    Storage::disk('public')->assertMissing($firstPhoto);
    Storage::disk('public')->assertExists($employee->profile_photo_path);

    $secondPhoto = $employee->profile_photo_path;

    $this->actingAs($hr)
        ->post(route('staff.employees.update', $employee), [
            ...employeePayload($department, $position),
            '_method' => 'patch',
            'employee_number' => 'PHQ-9002',
            'delete_profile_photo' => true,
        ])
        ->assertRedirect();

    Storage::disk('public')->assertMissing($secondPhoto);
    expect($employee->fresh()->profile_photo_path)->toBeNull();
});

it('sends a browser-ready avatar URL to employee pages', function (): void {
    Storage::fake('public');

    $hr = User::factory()->create([
        'role' => 'hr',
    ]);
    $department = Department::factory()->create();
    $position = Position::factory()->create([
        'department_id' => $department->id,
    ]);
    $employee = Employee::factory()->create([
        'department_id' => $department->id,
        'position_id' => $position->id,
        'profile_photo_path' => 'employee-photos/avatar.jpg',
    ]);

    Storage::disk('public')->put('employee-photos/avatar.jpg', 'avatar');

    $response = $this->actingAs($hr)->get(route('staff.employees.show', $employee));

    $page = $response->getOriginalContent()->getData()['page'];

    $response->assertOk();
    expect($page['props']['employee']['avatar_url'])->toEndWith('/storage/employee-photos/avatar.jpg');
});

function employeePayload(Department $department, Position $position): array
{
    return [
        'department_id' => $department->id,
        'position_id' => $position->id,
        'manager_id' => null,
        'employee_number' => 'PHQ-9000',
        'first_name' => 'Test',
        'middle_name' => null,
        'last_name' => 'Employee',
        'date_of_birth' => '1990-01-01',
        'gender' => 'female',
        'work_email' => 'test.employee@example.test',
        'personal_email' => 'personal@example.test',
        'phone' => '0200000000',
        'residential_address' => '1 PeopleHQ Street',
        'city_region' => 'Accra',
        'hire_date' => '2024-01-15',
        'employment_type' => 'full_time',
        'status' => 'active',
        'work_location' => 'Head Office',
        'emergency_contact_name' => 'Emergency Contact',
        'emergency_contact_relationship' => 'Sibling',
        'emergency_contact_phone' => '0200000001',
        'basic_salary' => 5000,
        'currency' => 'GHS',
        'bank_name' => 'GCB Bank',
        'bank_account_name' => 'Test Employee',
        'bank_account_number' => '1234567890',
        'tax_reference' => 'TIN-123',
        'ssnit_reference' => 'SSNIT-123',
    ];
}
