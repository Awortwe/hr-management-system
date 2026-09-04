<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('blocks a plain employee from organization administration routes', function (): void {
    $this->withoutVite();

    $employee = User::factory()->create([
        'role' => 'employee',
    ]);

    $this->actingAs($employee)
        ->get('/organization/departments')
        ->assertForbidden();
});

it('allows HR users into organization administration routes', function (): void {
    $this->withoutVite();

    $hr = User::factory()->create([
        'role' => 'hr',
    ]);

    $this->actingAs($hr)
        ->get('/organization/departments')
        ->assertOk();
});
