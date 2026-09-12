<?php

namespace App\Http\Controllers;

use App\Models\AttendanceAuditLog;
use App\Models\Employee;
use App\Models\ProjectSite;
use App\Support\EmployeeSearch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProjectSiteController extends Controller
{
    public function index(Request $request): Response
    {
        $search = EmployeeSearch::term($request);

        return Inertia::render('Staff/ProjectSites/Index', [
            'filters' => ['search' => $search],
            'sites' => ProjectSite::query()
                ->withCount('employees')
                ->where(fn ($query) => EmployeeSearch::apply($query, $search, ['name', 'code', 'address']))
                ->latest()
                ->paginate(10)
                ->withQueryString(),
            'employees' => Employee::query()
                ->select(['id', 'employee_number', 'first_name', 'middle_name', 'last_name', 'department_id'])
                ->with('department:id,name')
                ->where('status', 'active')
                ->orderBy('first_name')
                ->get()
                ->map(fn (Employee $employee): array => [
                    'id' => $employee->id,
                    'employee_number' => $employee->employee_number,
                    'full_name' => $employee->full_name,
                    'department' => $employee->department?->name,
                ]),
        ]);
    }

    public function show(ProjectSite $projectSite): Response
    {
        $projectSite->load([
            'employees' => fn ($query) => $query
                ->select(['employees.id', 'employee_number', 'first_name', 'middle_name', 'last_name', 'department_id', 'position_id', 'status'])
                ->with(['department:id,name', 'position:id,title'])
                ->orderBy('first_name'),
        ]);

        return Inertia::render('Staff/ProjectSites/Show', [
            'site' => [
                ...$projectSite->toArray(),
                'employees' => $projectSite->employees->map(fn (Employee $employee): array => [
                    'id' => $employee->id,
                    'employee_number' => $employee->employee_number,
                    'full_name' => $employee->full_name,
                    'department' => $employee->department?->name,
                    'position' => $employee->position?->title,
                    'status' => $employee->status,
                ]),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $attributes = $this->validated($request);
        unset($attributes['employee_ids']);

        $site = ProjectSite::create($attributes);
        $this->syncEmployees($request, $site);
        $this->audit($request, 'project_site.created', $site);

        return back()->with('success', 'Project site created.');
    }

    public function update(Request $request, ProjectSite $projectSite): RedirectResponse
    {
        $attributes = $this->validated($request, $projectSite);
        unset($attributes['employee_ids']);

        $projectSite->update($attributes);
        $this->syncEmployees($request, $projectSite);
        $this->audit($request, 'project_site.updated', $projectSite);

        return back()->with('success', 'Project site updated.');
    }

    public function destroy(Request $request, ProjectSite $projectSite): RedirectResponse
    {
        $projectSite->update(['status' => 'inactive']);
        $this->audit($request, 'project_site.deactivated', $projectSite);

        return back()->with('success', 'Project site deactivated.');
    }

    private function validated(Request $request, ?ProjectSite $site = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:50', Rule::unique('project_sites', 'code')->ignore($site)],
            'address' => ['nullable', 'string', 'max:1000'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'geofence_radius_meters' => ['required', 'integer', 'min:10', 'max:10000'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'employee_ids' => ['array'],
            'employee_ids.*' => ['integer', Rule::exists('employees', 'id')],
        ]);
    }

    private function syncEmployees(Request $request, ProjectSite $site): void
    {
        $site->employees()->sync($request->input('employee_ids', []));
    }

    private function audit(Request $request, string $event, ProjectSite $site): void
    {
        AttendanceAuditLog::create([
            'actor_id' => $request->user()?->id,
            'event' => $event,
            'metadata' => ['project_site_id' => $site->id, 'code' => $site->code],
        ]);
    }
}
