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
        ]);

        $settings = new CompanySetting($attributes);
        $settings->id = 1;
        CompanySetting::upsert([$settings->getAttributes()], ['id'], array_keys($attributes));

        return to_route('admin.company.edit')->with('success', 'Company details updated.');
    }
}
