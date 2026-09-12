<?php

namespace App\Http\Controllers;

use App\Models\CompanySetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class CompanySettingController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('Admin/CompanySettings', [
            'settings' => CompanySetting::current(),
            'ready' => Schema::hasTable('company_settings'),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        if (! Schema::hasTable('company_settings')) {
            return back()->with('error', 'Please run the company settings migration before saving.');
        }

        $attributes = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'tagline' => ['nullable', 'string', 'max:160'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'website' => ['nullable', 'url:http,https', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'registration_number' => ['nullable', 'string', 'max:100'],
            'allow_offline_punch' => ['sometimes', 'boolean'],
            'require_device_binding' => ['sometimes', 'boolean'],
            'default_geofence_radius_meters' => ['nullable', 'integer', 'min:10', 'max:10000'],
            'late_threshold_minutes' => ['nullable', 'integer', 'min:0', 'max:240'],
            'weekend_days' => ['nullable', 'array'],
            'weekend_days.*' => ['string', 'max:20'],
            'attendance_approval_rule' => ['nullable', 'string', 'max:100'],
        ]);

        CompanySetting::query()->updateOrCreate(['id' => 1], $attributes);

        return to_route('admin.company.edit')->with('success', 'Company details updated.');
    }
}
