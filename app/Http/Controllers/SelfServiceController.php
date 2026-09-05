<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Support\EmployeeSearch;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SelfServiceController extends Controller
{
    public function profile(Request $request): Response
    {
        $employee = $request->user()->employee;
        $employee?->load(['department:id,name', 'position:id,title', 'manager:id,first_name,middle_name,last_name', 'leaveBalances.leaveType']);

        return Inertia::render('SelfService/Profile', [
            'employee' => $employee ? [
                ...$this->directoryRow($employee),
                'hire_date' => $employee->hire_date?->toDateString(),
                'employment_type' => $employee->employment_type,
                'manager_name' => $employee->manager?->full_name,
                'balances' => $employee->leaveBalances->map(fn ($balance): array => [
                    'id' => $balance->id,
                    'type' => $balance->leaveType?->name,
                    'year' => $balance->year,
                    'entitled_days' => $balance->entitled_days,
                    'used_days' => $balance->used_days,
                    'remaining_days' => $balance->remaining_days,
                ]),
            ] : null,
        ]);
    }

    public function team(Request $request): Response
    {
        $search = EmployeeSearch::term($request);
        $members = $request->user()->employee?->subordinates()
            ->with(['department:id,name', 'position:id,title'])
            ->where(fn ($query) => EmployeeSearch::apply($query, $search))
            ->orderBy('first_name')->orderBy('id')->paginate(12)->withQueryString()->through(fn (Employee $employee): array => $this->directoryRow($employee));

        return Inertia::render('Manager/Team', ['members' => $members, 'filters' => ['search' => $search]]);
    }

    private function directoryRow(Employee $employee): array
    {
        return [
            'id' => $employee->id,
            'full_name' => $employee->full_name,
            'avatar_url' => $employee->avatar_url,
            'employee_number' => $employee->employee_number,
            'work_email' => $employee->work_email,
            'status' => $employee->status,
            'department' => $employee->department?->name,
            'position' => $employee->position?->title,
        ];
    }
}
