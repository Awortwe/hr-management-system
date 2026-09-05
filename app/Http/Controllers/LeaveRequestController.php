<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\User;
use App\Support\EmployeeSearch;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class LeaveRequestController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->only(['status', 'employee']);
        $search = EmployeeSearch::term($request);

        $leaveRequests = LeaveRequest::query()
            ->when($search !== '', fn ($query) => $query->whereHas('employee', fn ($employee) => EmployeeSearch::apply($employee, $search)))
            ->whereIn('employee_id', $this->visibleEmployees($request)->select('id'))
            ->with([
                'employee:id,employee_number,first_name,middle_name,last_name,manager_id,department_id,position_id',
                'employee.department:id,name',
                'employee.position:id,title',
                'leaveType:id,name,color,is_paid,annual_allowance_days',
                'approver:id,first_name,middle_name,last_name',
            ])
            ->when($filters['status'] ?? null, fn ($query, string $status): mixed => $query->where('status', $status))
            ->when($filters['employee'] ?? null, fn ($query, string $employeeId): mixed => $query->where('employee_id', $employeeId))
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn (LeaveRequest $leaveRequest): array => $this->requestRow($leaveRequest, $request->user()));

        return Inertia::render('Staff/LeaveRequests/Index', [
            'leaveRequests' => $leaveRequests,
            'employees' => $this->visibleEmployees($request)
                ->select(['id', 'employee_number', 'first_name', 'middle_name', 'last_name'])
                ->orderBy('first_name')
                ->get()
                ->map(fn (Employee $employee): array => [
                    'id' => $employee->id,
                    'employee_number' => $employee->employee_number,
                    'full_name' => $employee->full_name,
                ]),
            'leaveTypes' => LeaveType::query()
                ->select(['id', 'name', 'annual_allowance_days', 'color', 'is_paid', 'is_active'])
                ->where('is_active', true)
                ->orderBy('name')
                ->get(),
            'filters' => [
                'search' => $search,
                'status' => $filters['status'] ?? '',
                'employee' => $filters['employee'] ?? '',
            ],
            'statuses' => ['pending', 'approved', 'rejected'],
            'balances' => LeaveBalance::query()
                ->when($search !== '', fn ($query) => $query->whereHas('employee', fn ($employee) => EmployeeSearch::apply($employee, $search)))
                ->when($filters['employee'] ?? null, fn ($query, string $id) => $query->where('employee_id', $id))
                ->whereIn('employee_id', $this->visibleEmployees($request)->select('id'))
                ->where('year', now()->year)
                ->with(['employee', 'leaveType'])
                ->get()->map(fn (LeaveBalance $balance): array => [
                    'id' => $balance->id,
                    'employee_name' => $balance->employee?->full_name,
                    'type' => $balance->leaveType?->name,
                    'year' => $balance->year,
                    'remaining_days' => $balance->remaining_days,
                ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $attributes = $request->validate([
            'employee_id' => ['required', 'integer', Rule::exists('employees', 'id')],
            'leave_type_id' => ['required', 'integer', Rule::exists('leave_types', 'id')->where('is_active', true)],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'reason' => ['required', 'string', 'max:2000'],
        ]);

        abort_unless($this->visibleEmployees($request)->whereKey($attributes['employee_id'])->exists(), 403);

        $attributes['requested_days'] = $this->calculateRequestedDays($attributes['start_date'], $attributes['end_date']);
        $attributes['status'] = 'pending';

        LeaveRequest::create($attributes);

        return back()->with('success', 'Leave request submitted.');
    }

    public function approve(Request $request, LeaveRequest $leaveRequest): RedirectResponse
    {
        $this->authorizeDecision($request->user(), $leaveRequest);

        $attributes = $request->validate([
            'decision_comment' => ['nullable', 'string', 'max:2000'],
        ]);

        DB::transaction(function () use ($attributes, $leaveRequest, $request): void {
            $lockedRequest = LeaveRequest::query()
                ->whereKey($leaveRequest->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedRequest->status === 'approved') {
                return;
            }

            if ($lockedRequest->status !== 'pending') {
                abort(422, 'Only pending leave requests can be approved.');
            }

            $requestedDays = $this->calculateRequestedDays($lockedRequest->start_date, $lockedRequest->end_date);
            $approver = $request->user()->employee;

            $lockedRequest->update([
                'status' => 'approved',
                'requested_days' => $requestedDays,
                'approver_id' => $approver?->id,
                'decision_comment' => $attributes['decision_comment'] ?? null,
                'decided_at' => now(),
            ]);

            LeaveBalance::query()
                ->firstOrCreate(
                    [
                        'employee_id' => $lockedRequest->employee_id,
                        'leave_type_id' => $lockedRequest->leave_type_id,
                        'year' => $lockedRequest->start_date->year,
                    ],
                    [
                        'entitled_days' => $lockedRequest->leaveType->annual_allowance_days,
                        'used_days' => 0,
                        'adjusted_days' => 0,
                    ],
                )
                ->increment('used_days', $requestedDays);
        });

        return back()->with('success', 'Leave request approved and balance updated.');
    }

    public function reject(Request $request, LeaveRequest $leaveRequest): RedirectResponse
    {
        $this->authorizeDecision($request->user(), $leaveRequest);

        $attributes = $request->validate([
            'decision_comment' => ['required', 'string', 'max:2000'],
        ]);

        DB::transaction(function () use ($attributes, $leaveRequest, $request): void {
            $lockedRequest = LeaveRequest::query()
                ->whereKey($leaveRequest->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedRequest->status === 'rejected') {
                return;
            }

            if ($lockedRequest->status !== 'pending') {
                abort(422, 'Only pending leave requests can be rejected.');
            }

            $approver = $request->user()->employee;

            $lockedRequest->update([
                'status' => 'rejected',
                'requested_days' => $this->calculateRequestedDays($lockedRequest->start_date, $lockedRequest->end_date),
                'approver_id' => $approver?->id,
                'decision_comment' => $attributes['decision_comment'],
                'decided_at' => now(),
            ]);
        });

        return back()->with('success', 'Leave request rejected.');
    }

    private function visibleEmployees(Request $request): Builder
    {
        $query = Employee::query();
        if ($request->user()->hasRole('admin', 'hr')) {
            return $query;
        }

        $employeeId = $request->user()->employee?->id;

        return $query->where(function ($query) use ($request, $employeeId): void {
            $query->where('id', $employeeId ?? 0);
            if ($employeeId && $request->user()->hasRole('manager')) {
                $query->orWhere('manager_id', $employeeId);
            }
        });
    }

    private function authorizeDecision(User $user, LeaveRequest $leaveRequest): void
    {
        if ($user->hasRole('admin', 'hr')) {
            return;
        }

        if ($user->hasRole('manager') && $user->employee && $leaveRequest->employee()->where('manager_id', $user->employee->id)->exists()) {
            return;
        }

        abort(403);
    }

    private function canDecide(?User $user, LeaveRequest $leaveRequest): bool
    {
        if (! $user) {
            return false;
        }

        if ($leaveRequest->status !== 'pending') {
            return false;
        }

        if ($user->hasRole('admin', 'hr')) {
            return true;
        }

        return $user->hasRole('manager')
            && $user->employee
            && $leaveRequest->employee?->manager_id === $user->employee->id;
    }

    private function calculateRequestedDays(Carbon|string $startDate, Carbon|string $endDate): int
    {
        $start = $startDate instanceof Carbon ? $startDate->copy()->startOfDay() : Carbon::parse($startDate)->startOfDay();
        $end = $endDate instanceof Carbon ? $endDate->copy()->startOfDay() : Carbon::parse($endDate)->startOfDay();

        return (int) $start->diffInDays($end) + 1;
    }

    private function requestRow(LeaveRequest $leaveRequest, ?User $user): array
    {
        return [
            'id' => $leaveRequest->id,
            'employee_id' => $leaveRequest->employee_id,
            'leave_type_id' => $leaveRequest->leave_type_id,
            'approver_id' => $leaveRequest->approver_id,
            'start_date' => $leaveRequest->start_date?->toDateString(),
            'end_date' => $leaveRequest->end_date?->toDateString(),
            'requested_days' => $leaveRequest->requested_days,
            'reason' => $leaveRequest->reason,
            'status' => $leaveRequest->status,
            'decision_comment' => $leaveRequest->decision_comment,
            'decided_at' => $leaveRequest->decided_at?->toISOString(),
            'can_approve' => $this->canDecide($user, $leaveRequest),
            'employee' => $leaveRequest->employee ? [
                'id' => $leaveRequest->employee->id,
                'employee_number' => $leaveRequest->employee->employee_number,
                'full_name' => $leaveRequest->employee->full_name,
                'department' => $leaveRequest->employee->department,
                'position' => $leaveRequest->employee->position,
            ] : null,
            'leave_type' => $leaveRequest->leaveType,
            'approver' => $leaveRequest->approver ? [
                'id' => $leaveRequest->approver->id,
                'full_name' => $leaveRequest->approver->full_name,
            ] : null,
        ];
    }
}
