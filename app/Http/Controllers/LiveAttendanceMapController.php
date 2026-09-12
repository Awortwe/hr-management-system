<?php

namespace App\Http\Controllers;

use App\Models\AttendanceRecord;
use App\Models\Department;
use App\Models\Employee;
use App\Models\ProjectSite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LiveAttendanceMapController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Staff/AttendanceMap/Index', [
            'filters' => $request->only(['department', 'project_site']),
            'departments' => Department::query()->select(['id', 'name'])->orderBy('name')->get(),
            'projectSites' => ProjectSite::query()->select(['id', 'name', 'code'])->where('status', 'active')->orderBy('name')->get(),
            'initialMarkers' => $this->markers($request),
        ]);
    }

    public function data(Request $request): JsonResponse
    {
        return response()->json([
            'markers' => $this->markers($request),
        ]);
    }

    private function markers(Request $request): array
    {
        $user = $request->user();
        $manager = $user?->employee;

        return AttendanceRecord::query()
            ->with(['employee.department:id,name', 'employee.position:id,title', 'projectSite:id,name,code,latitude,longitude'])
            ->whereDate('work_date', today())
            ->whereNotNull('clock_in_at')
            ->whereNotNull('check_in_latitude')
            ->whereNotNull('check_in_longitude')
            ->when($request->input('department'), fn ($query, string $department): mixed => $query->whereHas('employee', fn ($employeeQuery): mixed => $employeeQuery->where('department_id', $department)))
            ->when($request->input('project_site'), fn ($query, string $site): mixed => $query->where('project_site_id', $site))
            ->when($user->hasRole('manager') && ! $user->hasRole('admin', 'hr'), fn ($query): mixed => $query->whereHas('employee', fn ($employeeQuery): mixed => $employeeQuery->where('manager_id', $manager?->id ?? 0)))
            ->latest('clock_in_at')
            ->get()
            ->map(fn (AttendanceRecord $record): array => [
                'id' => $record->id,
                'employee_name' => $record->employee?->full_name,
                'employee_number' => $record->employee?->employee_number,
                'department' => $record->employee?->department?->name,
                'position' => $record->employee?->position?->title,
                'project_site' => $record->projectSite?->name,
                'latitude' => (float) $record->check_in_latitude,
                'longitude' => (float) $record->check_in_longitude,
                'clock_in_at' => $record->clock_in_at?->toISOString(),
                'distance_from_site' => $record->distance_from_site,
                'zone_status' => $record->zone_status,
            ])
            ->values()
            ->all();
    }
}
