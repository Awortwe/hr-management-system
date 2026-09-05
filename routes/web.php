<?php

use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\LeaveRequestController;
use App\Http\Controllers\LeaveTypeController;
use App\Http\Controllers\PayrollController;
use App\Http\Controllers\PositionController;
use App\Http\Controllers\SelfServiceAttendanceController;
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

Route::middleware('role:admin,hr,manager')->prefix('staff')->name('staff.')->group(function (): void {
    Route::patch('/leave-requests/{leave_request}/approve', [LeaveRequestController::class, 'approve'])->name('leave-requests.approve');
    Route::patch('/leave-requests/{leave_request}/reject', [LeaveRequestController::class, 'reject'])->name('leave-requests.reject');
    Route::resource('leave-requests', LeaveRequestController::class)->only(['index', 'store']);
});

Route::middleware('role:admin,hr')->prefix('staff')->name('staff.')->group(function (): void {
    Route::get('/payroll', [PayrollController::class, 'index'])->name('payroll.index');
    Route::post('/payroll/run', [PayrollController::class, 'run'])->name('payroll.run');
    Route::get('/payroll-items/{payroll_item}/payslip', [PayrollController::class, 'payslip'])->name('payroll-items.payslip');
    Route::resource('leave-types', LeaveTypeController::class)->except(['create', 'show', 'edit']);
    Route::resource('employees', EmployeeController::class)->except(['create', 'edit']);
});

Route::middleware('role:admin,hr')->prefix('organization')->name('organization.')->group(function (): void {
    Route::resource('departments', DepartmentController::class)->except(['create', 'show', 'edit']);
    Route::resource('positions', PositionController::class)->except(['create', 'show', 'edit']);
});

Route::middleware('role:admin')->prefix('admin')->name('admin.')->group(function (): void {
    Route::get('/users', fn () => 'User administration area')->name('users.index');
});

Route::middleware('role:manager')->prefix('manager')->name('manager.')->group(function (): void {
    Route::get('/team', fn () => 'Manager team area')->name('team.index');
    Route::get('/attendance', [SelfServiceAttendanceController::class, 'manager'])->name('attendance.index');
});

Route::middleware('role:employee,manager,hr,admin')->prefix('self-service')->name('self-service.')->group(function (): void {
    Route::get('/profile', fn () => 'Employee self-service area')->name('profile.show');
    Route::get('/attendance', [SelfServiceAttendanceController::class, 'index'])->name('attendance.index');
    Route::post('/attendance/clock-in', [SelfServiceAttendanceController::class, 'clockIn'])->name('attendance.clock-in');
    Route::post('/attendance/clock-out', [SelfServiceAttendanceController::class, 'clockOut'])->name('attendance.clock-out');
});
