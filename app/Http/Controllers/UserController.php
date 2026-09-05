<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\EmployeeSearch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $search = EmployeeSearch::term($request);

        return Inertia::render('Admin/Users', [
            'users' => User::query()->select('id', 'name', 'email', 'role')
                ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search): void {
                    EmployeeSearch::apply($query, $search, ['name', 'email']);
                    $query->orWhereHas('employee', fn ($employee) => EmployeeSearch::apply($employee, $search));
                }))
                ->orderBy('name')->orderBy('id')->paginate(20)->withQueryString(),
            'filters' => ['search' => $search],
            'roles' => ['admin', 'hr', 'manager', 'employee'],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        User::create($this->validated($request));

        return back()->with('success', 'Account created.');
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $attributes = $this->validated($request, $user);
        if ($user->is($request->user()) && $attributes['role'] !== 'admin') {
            return back()->withErrors(['role' => 'You cannot remove your own administrator access.']);
        }
        if (empty($attributes['password'])) {
            unset($attributes['password']);
        }
        $user->update($attributes);

        return back()->with('success', 'Account updated.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($user->is($request->user())) {
            return back()->with('error', 'You cannot delete your own account.');
        }
        $user->delete();

        return back()->with('success', 'Account deleted.');
    }

    private function validated(Request $request, ?User $user = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($user)],
            'role' => ['required', Rule::in(['admin', 'hr', 'manager', 'employee'])],
            'password' => [$user ? 'nullable' : 'required', 'string', 'min:12', 'confirmed'],
        ]);
    }
}
