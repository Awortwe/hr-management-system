<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Employee;
use App\Models\LeaveRequest;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        if (! $request->user()->hasRole('admin', 'hr')) {
            return Inertia::render('SelfService/Home');
        }
        $today = today();
        $monthStart = $today->copy()->startOfMonth();

        $totalEmployees = Employee::query()->count();
        $activeEmployees = Employee::query()->where('status', 'active')->count();
        $newHiresThisMonth = Employee::query()->whereBetween('hire_date', [$monthStart, $today])->count();
        $pendingLeaveRequests = LeaveRequest::query()->where('status', 'pending')->count();
        $onLeaveToday = LeaveRequest::query()
            ->where('status', 'approved')
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->count();

        $statusTotals = Employee::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $departments = Department::query()
            ->withCount('employees')
            ->orderByDesc('employees_count')
            ->orderBy('name')
            ->get()
            ->map(fn (Department $department): array => [
                'id' => $department->id,
                'name' => $department->name,
                'code' => $department->code,
                'employees_count' => $department->employees_count,
            ]);

        $maxDepartmentHeadcount = max(1, (int) $departments->max('employees_count'));

        return Inertia::render('Dashboard', [
            'kpis' => [
                ['label' => 'Headcount', 'value' => $totalEmployees, 'detail' => "{$activeEmployees} active employees"],
                ['label' => 'Active', 'value' => $activeEmployees, 'detail' => 'Currently employed'],
                ['label' => 'New Hires', 'value' => $newHiresThisMonth, 'detail' => 'Joined this month'],
                ['label' => 'Pending Leave', 'value' => $pendingLeaveRequests, 'detail' => 'Awaiting approval'],
                ['label' => 'On Leave Today', 'value' => $onLeaveToday, 'detail' => $today->toFormattedDateString()],
            ],
            'statusTotals' => [
                'active' => (int) ($statusTotals['active'] ?? 0),
                'probation' => (int) ($statusTotals['probation'] ?? 0),
                'suspended' => (int) ($statusTotals['suspended'] ?? 0),
                'resigned' => (int) ($statusTotals['resigned'] ?? 0),
                'terminated' => (int) ($statusTotals['terminated'] ?? 0),
            ],
            'departments' => $departments->map(fn (array $department): array => [
                ...$department,
                'percentage' => round(($department['employees_count'] / $maxDepartmentHeadcount) * 100),
            ]),
            'pendingRequests' => LeaveRequest::query()
                ->with([
                    'employee:id,first_name,middle_name,last_name,department_id',
                    'employee.department:id,name',
                    'leaveType:id,name,color',
                ])
                ->where('status', 'pending')
                ->oldest('start_date')
                ->limit(5)
                ->get()
                ->map(fn (LeaveRequest $request): array => [
                    'id' => $request->id,
                    'employee_name' => $request->employee?->full_name,
                    'department_name' => $request->employee?->department?->name,
                    'leave_type' => $request->leaveType?->name,
                    'color' => $request->leaveType?->color,
                    'start_date' => $request->start_date?->toDateString(),
                    'end_date' => $request->end_date?->toDateString(),
                    'requested_days' => $request->requested_days,
                ]),
            'recentHires' => Employee::query()
                ->with(['department:id,name', 'position:id,title'])
                ->latest('hire_date')
                ->limit(5)
                ->get()
                ->map(fn (Employee $employee): array => [
                    'id' => $employee->id,
                    'full_name' => $employee->full_name,
                    'employee_number' => $employee->employee_number,
                    'hire_date' => $employee->hire_date?->toDateString(),
                    'department' => $employee->department?->name,
                    'position' => $employee->position?->title,
                ]),
        ]);
    }
}
