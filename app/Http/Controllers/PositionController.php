<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Position;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PositionController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->only(['search', 'department', 'status']);

        $positions = Position::query()
            ->with('department:id,name')
            ->withCount('employees')
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('title', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($filters['department'] ?? null, fn ($query, string $departmentId): mixed => $query->where('department_id', $departmentId))
            ->when(($filters['status'] ?? 'all') !== 'all', fn ($query): mixed => $query->where('is_active', $filters['status'] === 'active'))
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Position $position): array => [
                'id' => $position->id,
                'department_id' => $position->department_id,
                'department' => $position->department ? [
                    'id' => $position->department->id,
                    'name' => $position->department->name,
                ] : null,
                'title' => $position->title,
                'code' => $position->code,
                'description' => $position->description,
                'is_active' => $position->is_active,
                'employees_count' => $position->employees_count,
                'created_at' => $position->created_at?->toISOString(),
            ]);

        return Inertia::render('Organization/Positions/Index', [
            'positions' => $positions,
            'departments' => Department::query()
                ->select(['id', 'name'])
                ->where('is_active', true)
                ->orderBy('name')
                ->get(),
            'filters' => [
                'search' => $filters['search'] ?? '',
                'department' => $filters['department'] ?? '',
                'status' => $filters['status'] ?? 'all',
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Position::create($this->validated($request));

        return back()->with('success', 'Position created.');
    }

    public function update(Request $request, Position $position): RedirectResponse
    {
        $position->update($this->validated($request, $position));

        return back()->with('success', 'Position updated.');
    }

    public function destroy(Position $position): RedirectResponse
    {
        if ($position->employees()->exists()) {
            return back()->with('error', 'Positions with employees cannot be deleted.');
        }

        $position->delete();

        return back()->with('success', 'Position deleted.');
    }

    private function validated(Request $request, ?Position $position = null): array
    {
        return $request->validate([
            'department_id' => ['nullable', 'integer', Rule::exists('departments', 'id')],
            'title' => ['required', 'string', 'max:255', Rule::unique('positions', 'title')->ignore($position)],
            'code' => ['required', 'string', 'max:20', Rule::unique('positions', 'code')->ignore($position)],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['required', 'boolean'],
        ]);
    }
}
