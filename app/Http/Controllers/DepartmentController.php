<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Employee;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DepartmentController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->only(['search', 'status']);

        $departments = Department::query()
            ->with(['manager:id,first_name,middle_name,last_name'])
            ->withCount(['employees', 'positions'])
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when(($filters['status'] ?? 'all') !== 'all', fn ($query): mixed => $query->where('is_active', $filters['status'] === 'active'))
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Department $department): array => [
                'id' => $department->id,
                'name' => $department->name,
                'code' => $department->code,
                'description' => $department->description,
                'is_active' => $department->is_active,
                'manager_id' => $department->manager_id,
                'manager' => $department->manager ? [
                    'id' => $department->manager->id,
                    'full_name' => $department->manager->full_name,
                ] : null,
                'employees_count' => $department->employees_count,
                'positions_count' => $department->positions_count,
                'created_at' => $department->created_at?->toISOString(),
            ]);

        return Inertia::render('Organization/Departments/Index', [
            'departments' => $departments,
            'managers' => Employee::query()
                ->select(['id', 'first_name', 'middle_name', 'last_name'])
                ->whereHas('user', fn ($query) => $query->whereIn('role', ['admin', 'hr', 'manager']))
                ->orderBy('first_name')
                ->get()
                ->map(fn (Employee $employee): array => [
                    'id' => $employee->id,
                    'full_name' => $employee->full_name,
                ]),
            'filters' => [
                'search' => $filters['search'] ?? '',
                'status' => $filters['status'] ?? 'all',
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Department::create($this->validated($request));

        return back()->with('success', 'Department created.');
    }

    public function update(Request $request, Department $department): RedirectResponse
    {
        $department->update($this->validated($request, $department));

        return back()->with('success', 'Department updated.');
    }

    public function destroy(Department $department): RedirectResponse
    {
        if ($department->employees()->exists()) {
            return back()->with('error', 'Departments with employees cannot be deleted.');
        }

        $department->delete();

        return back()->with('success', 'Department deleted.');
    }

    private function validated(Request $request, ?Department $department = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('departments', 'name')->ignore($department)],
            'code' => ['required', 'string', 'max:20', Rule::unique('departments', 'code')->ignore($department)],
            'description' => ['nullable', 'string', 'max:1000'],
            'manager_id' => ['nullable', 'integer', Rule::exists('employees', 'id')],
            'is_active' => ['required', 'boolean'],
        ]);
    }
}
