<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CompanySettingController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\LeaveRequestController;
use App\Http\Controllers\LeaveTypeController;
use App\Http\Controllers\PayrollController;
use App\Http\Controllers\PositionController;
use App\Http\Controllers\SelfServiceAttendanceController;
use App\Http\Controllers\SelfServiceController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function (): void {
    Route::get('/login', [AuthController::class, 'create'])->name('login');
    Route::post('/login', [AuthController::class, 'store'])->middleware('throttle:6,1');
});

Route::middleware('auth')->group(function (): void {
    Route::post('/logout', [AuthController::class, 'destroy'])->name('logout');
    Route::get('/', DashboardController::class)->name('dashboard');

    Route::middleware('role:employee,manager,hr,admin')->group(function (): void {
        Route::get('/staff/leave-requests', [LeaveRequestController::class, 'index'])->name('staff.leave-requests.index');
        Route::post('/staff/leave-requests', [LeaveRequestController::class, 'store'])->name('staff.leave-requests.store');
    });

    Route::middleware('role:admin,hr,manager')->prefix('staff')->name('staff.')->group(function (): void {
        Route::patch('/leave-requests/{leave_request}/approve', [LeaveRequestController::class, 'approve'])->name('leave-requests.approve');
        Route::patch('/leave-requests/{leave_request}/reject', [LeaveRequestController::class, 'reject'])->name('leave-requests.reject');
    });

    Route::middleware('role:admin,hr')->prefix('staff')->name('staff.')->group(function (): void {
        Route::get('/attendance', [SelfServiceAttendanceController::class, 'manager'])->name('attendance.index');
        Route::get('/payroll', [PayrollController::class, 'index'])->name('payroll.index');
        Route::get('/payroll/export', [PayrollController::class, 'export'])->name('payroll.export');
        Route::post('/payroll/run', [PayrollController::class, 'run'])->name('payroll.run');
        Route::get('/payroll-items/{payroll_item}/payslip', [PayrollController::class, 'payslip'])->name('payroll-items.payslip');
        Route::get('/employees/export', [EmployeeController::class, 'export'])->name('employees.export');
        Route::resource('leave-types', LeaveTypeController::class)->except(['create', 'show', 'edit']);
        Route::resource('employees', EmployeeController::class)->except(['create', 'edit']);
    });

    Route::middleware('role:admin,hr')->prefix('organization')->name('organization.')->group(function (): void {
        Route::resource('departments', DepartmentController::class)->except(['create', 'show', 'edit']);
        Route::resource('positions', PositionController::class)->except(['create', 'show', 'edit']);
    });

    Route::middleware('role:admin')->prefix('admin')->name('admin.')->group(function (): void {
        Route::get('/company', [CompanySettingController::class, 'edit'])->name('company.edit');
        Route::put('/company', [CompanySettingController::class, 'update'])->name('company.update');
        Route::resource('users', UserController::class)->only(['index', 'store', 'update', 'destroy']);
    });

    Route::middleware('role:manager')->prefix('manager')->name('manager.')->group(function (): void {
        Route::get('/team', [SelfServiceController::class, 'team'])->name('team.index');
        Route::get('/attendance', [SelfServiceAttendanceController::class, 'manager'])->name('attendance.index');
    });

    Route::middleware('role:employee,manager,hr,admin')->prefix('self-service')->name('self-service.')->group(function (): void {
        Route::get('/profile', [SelfServiceController::class, 'profile'])->name('profile.show');
        Route::get('/attendance', [SelfServiceAttendanceController::class, 'index'])->name('attendance.index');
        Route::post('/attendance/clock-in', [SelfServiceAttendanceController::class, 'clockIn'])->name('attendance.clock-in');
        Route::post('/attendance/clock-out', [SelfServiceAttendanceController::class, 'clockOut'])->name('attendance.clock-out');
    });
});
