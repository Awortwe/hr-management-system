<?php

namespace App\Http\Controllers;

use App\Models\LeaveType;
use App\Support\EmployeeSearch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class LeaveTypeController extends Controller
{
    public function index(Request $request): Response
    {
        $search = EmployeeSearch::term($request);

        return Inertia::render('Staff/LeaveTypes/Index', [
            'filters' => ['search' => $search],
            'leaveTypes' => LeaveType::query()
                ->where(fn ($query) => EmployeeSearch::apply($query, $search, ['name']))
                ->withCount(['balances', 'requests'])
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        LeaveType::create($this->validated($request));

        return back()->with('success', 'Leave type created.');
    }

    public function update(Request $request, LeaveType $leaveType): RedirectResponse
    {
        $leaveType->update($this->validated($request, $leaveType));

        return back()->with('success', 'Leave type updated.');
    }

    public function destroy(LeaveType $leaveType): RedirectResponse
    {
        if ($leaveType->balances()->exists() || $leaveType->requests()->exists()) {
            return back()->with('error', 'Leave types with balances or requests cannot be deleted.');
        }

        $leaveType->delete();

        return back()->with('success', 'Leave type deleted.');
    }

    private function validated(Request $request, ?LeaveType $leaveType = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('leave_types', 'name')->ignore($leaveType)],
            'annual_allowance_days' => ['required', 'integer', 'min:0', 'max:366'],
            'is_paid' => ['required', 'boolean'],
            'color' => ['required', 'string', 'max:20'],
            'is_active' => ['required', 'boolean'],
        ]);
    }
}
