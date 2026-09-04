<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'stack' => [
            'Laravel 13',
            'React 19',
            'Inertia.js',
            'Tailwind CSS 4',
            'MySQL',
            'Pest',
        ],
    ]);
});

Route::middleware('role:admin,hr')->prefix('staff')->name('staff.')->group(function (): void {
    Route::get('/employees', fn () => 'Employees area')->name('employees.index');
    Route::get('/leave', fn () => 'Leave administration area')->name('leave.index');
});

Route::middleware('role:admin')->prefix('admin')->name('admin.')->group(function (): void {
    Route::get('/users', fn () => 'User administration area')->name('users.index');
});

Route::middleware('role:manager')->prefix('manager')->name('manager.')->group(function (): void {
    Route::get('/team', fn () => 'Manager team area')->name('team.index');
});

Route::middleware('role:employee,manager,hr,admin')->prefix('self-service')->name('self-service.')->group(function (): void {
    Route::get('/profile', fn () => 'Employee self-service area')->name('profile.show');
});
