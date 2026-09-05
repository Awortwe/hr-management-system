<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Employee;
use App\Models\Position;
use App\Models\User;
use App\Support\CsvExporter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class EmployeeController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->only(['search', 'department', 'status']);

        $employees = Employee::query()
            ->with([
                'department:id,name,code',
                'position:id,title,department_id',
                'manager:id,first_name,middle_name,last_name',
                'user:id,name,email,role',
            ])
            ->withCount(['attendanceRecords', 'leaveRequests', 'payrollItems'])
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('employee_number', 'like', "%{$search}%")
                        ->orWhere('first_name', 'like', "%{$search}%")
                        ->orWhere('middle_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('work_email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->when($filters['department'] ?? null, fn ($query, string $departmentId): mixed => $query->where('department_id', $departmentId))
            ->when($filters['status'] ?? null, fn ($query, string $status): mixed => $query->where('status', $status))
            ->latest()
            ->paginate(12)
            ->withQueryString()
            ->through(fn (Employee $employee): array => $this->employeeRow($employee));

        return Inertia::render('Staff/Employees/Index', [
            'employees' => $employees,
            'departments' => Department::query()
                ->select(['id', 'name'])
                ->where('is_active', true)
                ->orderBy('name')
                ->get(),
            'positions' => Position::query()
                ->select(['id', 'department_id', 'title'])
                ->where('is_active', true)
                ->orderBy('title')
                ->get(),
            'managers' => Employee::query()
                ->select(['id', 'first_name', 'middle_name', 'last_name'])
                ->whereHas('user', fn ($query) => $query->whereIn('role', ['admin', 'hr', 'manager']))
                ->orderBy('first_name')
                ->get()
                ->map(fn (Employee $employee): array => [
                    'id' => $employee->id,
                    'full_name' => $employee->full_name,
                ]),
            'users' => User::query()
                ->select(['id', 'name', 'email', 'role'])
                ->whereDoesntHave('employee')
                ->orderBy('name')
                ->get(),
            'filters' => [
                'search' => $filters['search'] ?? '',
                'department' => $filters['department'] ?? '',
                'status' => $filters['status'] ?? '',
            ],
            'statuses' => ['probation', 'active', 'suspended', 'resigned', 'terminated'],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $attributes = $this->validated($request);
        $newPhotoPath = null;

        if ($request->hasFile('profile_photo')) {
            $newPhotoPath = $request->file('profile_photo')->store('employee-photos', 'public');
            $attributes['profile_photo_path'] = $newPhotoPath;
        }

        unset($attributes['profile_photo'], $attributes['delete_profile_photo']);

        try {
            $employee = Employee::create($attributes);
        } catch (Throwable $exception) {
            if ($newPhotoPath) {
                Storage::disk('public')->delete($newPhotoPath);
            }

            throw $exception;
        }

        return to_route('staff.employees.show', $employee)->with('success', 'Employee created.');
    }

    public function show(Employee $employee): Response
    {
        $employee->load([
            'user:id,name,email,role',
            'department:id,name,code,manager_id',
            'department.manager:id,first_name,middle_name,last_name',
            'position:id,title,department_id',
            'position.department:id,name',
            'manager:id,first_name,middle_name,last_name,position_id',
            'manager.position:id,title',
            'subordinates' => fn ($query) => $query->select(['id', 'manager_id', 'first_name', 'middle_name', 'last_name', 'position_id'])->limit(12),
            'subordinates.position:id,title',
            'leaveBalances.leaveType:id,name,color,is_paid',
            'leaveRequests' => fn ($query) => $query->with([
                'leaveType:id,name,color',
                'approver:id,first_name,middle_name,last_name',
            ])->latest()->limit(10),
            'attendanceRecords' => fn ($query) => $query->latest('work_date')->limit(10),
            'payrollItems' => fn ($query) => $query->with('payroll:id,month,year,status')->latest()->limit(6),
        ]);

        return Inertia::render('Staff/Employees/Show', [
            'employee' => $this->employeeProfile($employee),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $filters = $request->only(['search', 'department', 'status']);
        $query = Employee::query()
            ->with(['department:id,name', 'position:id,title', 'manager:id,first_name,middle_name,last_name'])
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('employee_number', 'like', "%{$search}%")
                        ->orWhere('first_name', 'like', "%{$search}%")
                        ->orWhere('middle_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('work_email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->when($filters['department'] ?? null, fn ($query, string $departmentId): mixed => $query->where('department_id', $departmentId))
            ->when($filters['status'] ?? null, fn ($query, string $status): mixed => $query->where('status', $status))
            ->orderBy('employee_number');

        return CsvExporter::streamCsv(
            'peoplehq-employees.csv',
            ['Employee Number', 'Name', 'Department', 'Position', 'Manager', 'Work Email', 'Phone', 'Status', 'Hire Date'],
            $query,
            fn (Employee $employee): array => [
                $employee->employee_number,
                $employee->full_name,
                $employee->department?->name,
                $employee->position?->title,
                $employee->manager?->full_name,
                $employee->work_email,
                $employee->phone,
                $employee->status,
                $employee->hire_date?->toDateString(),
            ],
        );
    }

    public function update(Request $request, Employee $employee): RedirectResponse
    {
        $attributes = $this->validated($request, $employee);
        $oldPhotoPath = $employee->profile_photo_path;
        $newPhotoPath = null;
        $shouldDeleteOldPhoto = $request->boolean('delete_profile_photo') || $request->hasFile('profile_photo');

        if ($request->boolean('delete_profile_photo')) {
            $attributes['profile_photo_path'] = null;
        }

        if ($request->hasFile('profile_photo')) {
            $newPhotoPath = $request->file('profile_photo')->store('employee-photos', 'public');
            $attributes['profile_photo_path'] = $newPhotoPath;
        }

        unset($attributes['profile_photo'], $attributes['delete_profile_photo']);

        try {
            $employee->update($attributes);
        } catch (Throwable $exception) {
            if ($newPhotoPath) {
                Storage::disk('public')->delete($newPhotoPath);
            }

            throw $exception;
        }

        if ($shouldDeleteOldPhoto && $oldPhotoPath) {
            Storage::disk('public')->delete($oldPhotoPath);
        }

        return back()->with('success', 'Employee updated.');
    }

    public function destroy(Employee $employee): RedirectResponse
    {
        $this->deleteProfilePhoto($employee);
        $employee->delete();

        return to_route('staff.employees.index')->with('success', 'Employee archived.');
    }

    private function validated(Request $request, ?Employee $employee = null): array
    {
        return $request->validate([
            'user_id' => ['nullable', 'integer', Rule::exists('users', 'id'), Rule::unique('employees', 'user_id')->ignore($employee)],
            'department_id' => ['required', 'integer', Rule::exists('departments', 'id')],
            'position_id' => ['required', 'integer', Rule::exists('positions', 'id')->where('department_id', $request->input('department_id'))],
            'manager_id' => ['nullable', 'integer', Rule::exists('employees', 'id')->where(fn ($query) => $query->where('id', '<>', $employee?->id ?? 0))],
            'employee_number' => ['required', 'string', 'max:50', Rule::unique('employees', 'employee_number')->ignore($employee)],
            'first_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'gender' => ['nullable', 'string', 'max:50'],
            'profile_photo' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'delete_profile_photo' => ['sometimes', 'boolean'],
            'work_email' => ['nullable', 'email', 'max:255'],
            'personal_email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'residential_address' => ['nullable', 'string', 'max:1000'],
            'city_region' => ['nullable', 'string', 'max:255'],
            'hire_date' => ['required', 'date'],
            'employment_type' => ['required', 'string', Rule::in(['full_time', 'part_time', 'contract'])],
            'status' => ['required', 'string', Rule::in(['probation', 'active', 'suspended', 'resigned', 'terminated'])],
            'work_location' => ['nullable', 'string', 'max:255'],
            'emergency_contact_name' => ['nullable', 'string', 'max:255'],
            'emergency_contact_relationship' => ['nullable', 'string', 'max:255'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:50'],
            'basic_salary' => ['required', 'numeric', 'min:0', 'max:9999999999.99'],
            'currency' => ['required', 'string', 'size:3'],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'bank_account_name' => ['nullable', 'string', 'max:255'],
            'bank_account_number' => ['nullable', 'string', 'max:255'],
            'tax_reference' => ['nullable', 'string', 'max:255'],
            'ssnit_reference' => ['nullable', 'string', 'max:255'],
        ]);
    }

    private function deleteProfilePhoto(Employee $employee): void
    {
        if ($employee->profile_photo_path) {
            Storage::disk('public')->delete($employee->profile_photo_path);
        }
    }

    private function employeeRow(Employee $employee): array
    {
        return [
            'id' => $employee->id,
            'user_id' => $employee->user_id,
            'department_id' => $employee->department_id,
            'position_id' => $employee->position_id,
            'manager_id' => $employee->manager_id,
            'employee_number' => $employee->employee_number,
            'first_name' => $employee->first_name,
            'middle_name' => $employee->middle_name,
            'last_name' => $employee->last_name,
            'date_of_birth' => $employee->date_of_birth?->toDateString(),
            'gender' => $employee->gender,
            'profile_photo_path' => $employee->profile_photo_path,
            'full_name' => $employee->full_name,
            'avatar_url' => $employee->avatar_url,
            'work_email' => $employee->work_email,
            'personal_email' => $employee->personal_email,
            'phone' => $employee->phone,
            'residential_address' => $employee->residential_address,
            'city_region' => $employee->city_region,
            'hire_date' => $employee->hire_date?->toDateString(),
            'employment_type' => $employee->employment_type,
            'status' => $employee->status,
            'work_location' => $employee->work_location,
            'emergency_contact_name' => $employee->emergency_contact_name,
            'emergency_contact_relationship' => $employee->emergency_contact_relationship,
            'emergency_contact_phone' => $employee->emergency_contact_phone,
            'basic_salary' => $employee->basic_salary,
            'currency' => $employee->currency,
            'bank_name' => $employee->bank_name,
            'bank_account_name' => $employee->bank_account_name,
            'bank_account_number' => $employee->bank_account_number,
            'tax_reference' => $employee->tax_reference,
            'ssnit_reference' => $employee->ssnit_reference,
            'department' => $employee->department ? [
                'id' => $employee->department->id,
                'name' => $employee->department->name,
                'code' => $employee->department->code,
            ] : null,
            'position' => $employee->position ? [
                'id' => $employee->position->id,
                'title' => $employee->position->title,
            ] : null,
            'manager' => $employee->manager ? [
                'id' => $employee->manager->id,
                'full_name' => $employee->manager->full_name,
            ] : null,
            'user' => $employee->user ? [
                'id' => $employee->user->id,
                'name' => $employee->user->name,
                'email' => $employee->user->email,
                'role' => $employee->user->role,
            ] : null,
            'leave_requests_count' => $employee->leave_requests_count,
            'attendance_records_count' => $employee->attendance_records_count,
            'payroll_items_count' => $employee->payroll_items_count,
        ];
    }

    private function employeeProfile(Employee $employee): array
    {
        return [
            ...$employee->only([
                'id',
                'user_id',
                'department_id',
                'position_id',
                'manager_id',
                'employee_number',
                'first_name',
                'middle_name',
                'last_name',
                'date_of_birth',
                'gender',
                'profile_photo_path',
                'work_email',
                'personal_email',
                'phone',
                'residential_address',
                'city_region',
                'hire_date',
                'employment_type',
                'status',
                'work_location',
                'emergency_contact_name',
                'emergency_contact_relationship',
                'emergency_contact_phone',
                'basic_salary',
                'currency',
                'bank_name',
                'bank_account_name',
                'bank_account_number',
                'tax_reference',
                'ssnit_reference',
            ]),
            'full_name' => $employee->full_name,
            'avatar_url' => $employee->avatar_url,
            'profile_photo_url' => $employee->avatar_url,
            'user' => $employee->user,
            'department' => $employee->department,
            'position' => $employee->position,
            'manager' => $employee->manager,
            'subordinates' => $employee->subordinates,
            'leave_balances' => $employee->leaveBalances->map(fn ($balance): array => [
                ...$balance->toArray(),
                'remaining_days' => $balance->remaining_days,
            ]),
            'leave_requests' => $employee->leaveRequests,
            'attendance_records' => $employee->attendanceRecords,
            'payroll_items' => $employee->payrollItems,
        ];
    }
}
