<?php

use App\Models\Department;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use App\Models\Position;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;

// This fixture always creates a new temporary database, never the configured MySQL database.
require __DIR__.'/../vendor/autoload.php';

$database = tempnam(sys_get_temp_dir(), 'peoplehq-browser-');
$settings = [
    'APP_ENV' => 'local',
    'APP_CONFIG_CACHE' => $database.'.config.php',
    'DB_CONNECTION' => 'sqlite',
    'DB_DATABASE' => $database,
    'DB_URL' => '',
    'CACHE_STORE' => 'array',
    'SESSION_DRIVER' => 'file',
    'SESSION_COOKIE' => 'peoplehq_browser_test',
];
foreach ($settings as $key => $value) {
    putenv("{$key}={$value}");
    $_ENV[$key] = $_SERVER[$key] = $value;
}
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
Artisan::call('migrate', ['--force' => true]);
$department = Department::factory()->create(['name' => 'Engineering', 'code' => 'ENG']);
$position = Position::factory()->create(['department_id' => $department->id, 'title' => 'Engineer']);
$manager = null;
foreach (['manager', 'admin', 'hr', 'employee'] as $role) {
    $user = User::factory()->create(['name' => ucfirst($role).' Person', 'email' => $role.'@browser.test', 'role' => $role, 'password' => 'browser-test-password']);
    $employee = Employee::factory()->create([
        'user_id' => $user->id, 'department_id' => $department->id, 'position_id' => $position->id,
        'manager_id' => $role === 'employee' ? $manager->id : null,
        'first_name' => ucfirst($role), 'middle_name' => null, 'last_name' => 'Person', 'status' => 'active',
        'profile_photo_path' => 'employee-photos/missing-test-image.jpg',
    ]);
    if ($role === 'manager') {
        $manager = $employee;
    }
}
$type = LeaveType::factory()->create(['name' => 'Annual Leave', 'annual_allowance_days' => 20, 'is_active' => true]);
LeaveBalance::create(['employee_id' => $employee->id, 'leave_type_id' => $type->id, 'year' => now()->year, 'entitled_days' => 20, 'used_days' => 0, 'adjusted_days' => 0]);
echo json_encode(['env' => $settings, 'employee_id' => $employee->id, 'leave_type_id' => $type->id], JSON_THROW_ON_ERROR);
