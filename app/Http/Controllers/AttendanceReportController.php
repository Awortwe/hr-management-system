<?php

namespace App\Http\Controllers;

use App\Models\AttendanceRecord;
use App\Models\CompanySetting;
use App\Models\Department;
use App\Models\Employee;
use App\Models\ProjectSite;
use App\Support\CsvExporter;
use App\Support\EmployeeSearch;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AttendanceReportController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $this->filters($request);
        $query = $this->query($request, $filters);
        $records = (clone $query)
            ->latest('work_date')
            ->latest('clock_in_at')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (AttendanceRecord $record): array => $this->row($record));

        $summaryRows = (clone $query)->get();

        return Inertia::render('Staff/AttendanceReports/Index', [
            'filters' => $filters,
            'records' => $records,
            'summary' => [
                'total' => $summaryRows->count(),
                'late' => $summaryRows->where('status', 'late')->count(),
                'out_of_zone' => $summaryRows->where('zone_status', 'out_of_zone')->count(),
                'pending' => $summaryRows->where('approval_status', 'pending')->count(),
                'overtime_hours' => round($summaryRows->sum('overtime_hours'), 2),
            ],
            'departments' => Department::query()->select(['id', 'name'])->orderBy('name')->get(),
            'projectSites' => ProjectSite::query()->select(['id', 'name', 'code'])->orderBy('name')->get(),
            'employees' => Employee::query()->select(['id', 'employee_number', 'first_name', 'middle_name', 'last_name'])->orderBy('first_name')->get()->map(fn (Employee $employee): array => [
                'id' => $employee->id,
                'label' => "{$employee->full_name} ({$employee->employee_number})",
            ]),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $filters = $this->filters($request);
        $query = $this->query($request, $filters)->orderBy('work_date');

        return CsvExporter::streamCsv(
            CompanySetting::exportPrefix().'-attendance-report.csv',
            ['Date', 'Employee Number', 'Employee', 'Department', 'Project Site', 'Clock In', 'Clock Out', 'Status', 'Zone', 'Distance', 'Approval', 'Worked Minutes', 'Overtime Hours', 'Overtime Approved'],
            $query,
            fn (AttendanceRecord $record): array => [
                $record->work_date?->toDateString(),
                $record->employee?->employee_number,
                $record->employee?->full_name,
                $record->employee?->department?->name,
                $record->projectSite?->name,
                $record->clock_in_at?->toDateTimeString(),
                $record->clock_out_at?->toDateTimeString(),
                $record->status,
                $record->zone_status,
                $record->distance_from_site,
                $record->approval_status,
                $record->worked_minutes,
                $record->overtime_hours,
                $record->overtime_approved_at?->toDateTimeString(),
            ],
        );
    }

    private function filters(Request $request): array
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'department' => ['nullable', 'integer'],
            'project_site' => ['nullable', 'integer'],
            'employee' => ['nullable', 'integer'],
            'zone_status' => ['nullable', 'string'],
        ]);

        return [
            'search' => EmployeeSearch::term($request),
            'from' => $validated['from'] ?? now()->startOfMonth()->toDateString(),
            'to' => $validated['to'] ?? now()->toDateString(),
            'department' => $validated['department'] ?? '',
            'project_site' => $validated['project_site'] ?? '',
            'employee' => $validated['employee'] ?? '',
            'zone_status' => $validated['zone_status'] ?? '',
        ];
    }

    private function query(Request $request, array $filters)
    {
        $user = $request->user();
        $manager = $user?->employee;

        return AttendanceRecord::query()
            ->with(['employee.department:id,name', 'employee.position:id,title', 'projectSite:id,name,code'])
            ->whereBetween('work_date', [$filters['from'], $filters['to']])
            ->whereHas('employee', fn ($query): mixed => EmployeeSearch::apply($query, $filters['search'], ['employee_number', 'first_name', 'middle_name', 'last_name']))
            ->when($filters['department'], fn ($query, $department): mixed => $query->whereHas('employee', fn ($employeeQuery): mixed => $employeeQuery->where('department_id', $department)))
            ->when($filters['project_site'], fn ($query, $site): mixed => $query->where('project_site_id', $site))
            ->when($filters['employee'], fn ($query, $employee): mixed => $query->where('employee_id', $employee))
            ->when($filters['zone_status'], fn ($query, $zone): mixed => $query->where('zone_status', $zone))
            ->when($user->hasRole('manager') && ! $user->hasRole('admin', 'hr'), fn ($query): mixed => $query->whereHas('employee', fn ($employeeQuery): mixed => $employeeQuery->where('manager_id', $manager?->id ?? 0)));
    }

    private function row(AttendanceRecord $record): array
    {
        return [
            'id' => $record->id,
            'work_date' => $record->work_date?->toDateString(),
            'employee_number' => $record->employee?->employee_number,
            'employee_name' => $record->employee?->full_name,
            'department' => $record->employee?->department?->name,
            'position' => $record->employee?->position?->title,
            'project_site' => $record->projectSite?->name,
            'clock_in_at' => $record->clock_in_at?->toISOString(),
            'clock_out_at' => $record->clock_out_at?->toISOString(),
            'status' => $record->status,
            'zone_status' => $record->zone_status,
            'approval_status' => $record->approval_status,
            'distance_from_site' => $record->distance_from_site,
            'worked_minutes' => $record->worked_minutes,
            'overtime_hours' => (float) $record->overtime_hours,
            'overtime_approved_at' => $record->overtime_approved_at?->toISOString(),
        ];
    }
}
