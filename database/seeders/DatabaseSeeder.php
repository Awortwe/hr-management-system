<?php

namespace Database\Seeders;

use App\Models\AttendanceRecord;
use App\Models\Department;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\Position;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            $departments = collect([
                ['name' => 'People Operations', 'code' => 'PPL', 'positions' => ['HR Manager', 'HR Officer', 'People Coordinator']],
                ['name' => 'Finance', 'code' => 'FIN', 'positions' => ['Finance Manager', 'Payroll Officer', 'Accounts Analyst']],
                ['name' => 'Engineering', 'code' => 'ENG', 'positions' => ['Engineering Manager', 'Software Engineer', 'QA Analyst']],
                ['name' => 'Sales', 'code' => 'SAL', 'positions' => ['Sales Manager', 'Account Executive', 'Sales Development Rep']],
                ['name' => 'Customer Success', 'code' => 'CS', 'positions' => ['Customer Success Manager', 'Support Specialist', 'Implementation Consultant']],
            ])->mapWithKeys(function (array $department): array {
                $createdDepartment = Department::factory()->create([
                    'name' => $department['name'],
                    'code' => $department['code'],
                    'description' => "{$department['name']} department for PeopleHQ demo data.",
                ]);

                $positions = collect($department['positions'])->values()->mapWithKeys(fn (string $title, int $index): array => [
                    $title => Position::factory()->create([
                        'department_id' => $createdDepartment->id,
                        'title' => $title,
                        'code' => $department['code'].'-'.str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT),
                        'description' => "{$title} role in {$department['name']}.",
                    ]),
                ]);

                return [$department['name'] => [
                    'department' => $createdDepartment,
                    'positions' => $positions,
                ]];
            });

            $leaveTypes = collect([
                ['name' => 'Annual Leave', 'annual_allowance_days' => 20, 'is_paid' => true, 'color' => '#2563eb'],
                ['name' => 'Sick Leave', 'annual_allowance_days' => 10, 'is_paid' => true, 'color' => '#16a34a'],
                ['name' => 'Unpaid Leave', 'annual_allowance_days' => 0, 'is_paid' => false, 'color' => '#71717a'],
            ])->map(fn (array $attributes): LeaveType => LeaveType::factory()->create($attributes));

            $employees = collect();

            $admin = $this->createEmployee(
                name: 'Awortwe Enock',
                role: 'admin',
                departmentBundle: $departments['People Operations'],
                positionTitle: 'HR Manager',
            );
            $employees->push($admin);

            $hrTeam = collect([
                ['name' => 'Ama Serwaa', 'position' => 'HR Officer'],
                ['name' => 'Kojo Mensah', 'position' => 'People Coordinator'],
            ])->map(fn (array $person): Employee => $this->createEmployee(
                name: $person['name'],
                role: 'hr',
                departmentBundle: $departments['People Operations'],
                positionTitle: $person['position'],
                manager: $admin,
            ));
            $employees = $employees->merge($hrTeam);

            $managerPlan = collect([
                ['name' => 'Esi Boateng', 'department' => 'People Operations', 'position' => 'HR Manager'],
                ['name' => 'Kwame Owusu', 'department' => 'Finance', 'position' => 'Finance Manager'],
                ['name' => 'Nana Adjei', 'department' => 'Engineering', 'position' => 'Engineering Manager'],
                ['name' => 'Abena Asante', 'department' => 'Sales', 'position' => 'Sales Manager'],
                ['name' => 'Yaw Frimpong', 'department' => 'Customer Success', 'position' => 'Customer Success Manager'],
            ]);

            $managers = $managerPlan->mapWithKeys(function (array $person) use ($departments, $admin): array {
                $manager = $this->createEmployee(
                    name: $person['name'],
                    role: 'manager',
                    departmentBundle: $departments[$person['department']],
                    positionTitle: $person['position'],
                    manager: $admin,
                );

                $departments[$person['department']]['department']->update([
                    'manager_id' => $manager->id,
                ]);

                return [$person['department'] => $manager];
            });
            $employees = $employees->merge($managers->values());

            $staffPlan = [
                'People Operations' => [
                    ['Akua Nyarko', 'HR Officer'],
                    ['Samuel Tetteh', 'People Coordinator'],
                    ['Mavis Antwi', 'People Coordinator'],
                    ['Daniel Ofori', 'HR Officer'],
                ],
                'Finance' => [
                    ['Josephine Darko', 'Payroll Officer'],
                    ['Michael Addo', 'Accounts Analyst'],
                    ['Linda Arthur', 'Accounts Analyst'],
                    ['Bright Sarpong', 'Payroll Officer'],
                    ['Portia Appiah', 'Accounts Analyst'],
                    ['Emmanuel Quartey', 'Accounts Analyst'],
                ],
                'Engineering' => [
                    ['Kofi Annan', 'Software Engineer'],
                    ['Efua Dadzie', 'Software Engineer'],
                    ['Kelvin Agyapong', 'QA Analyst'],
                    ['Priscilla Badu', 'Software Engineer'],
                    ['Isaac Opoku', 'Software Engineer'],
                    ['Rita Aidoo', 'QA Analyst'],
                    ['Benjamin Kwarteng', 'Software Engineer'],
                    ['Nadia Amoah', 'Software Engineer'],
                ],
                'Sales' => [
                    ['Cynthia Prempeh', 'Account Executive'],
                    ['Dennis Boakye', 'Sales Development Rep'],
                    ['Patience Adu', 'Account Executive'],
                    ['Francis Yeboah', 'Sales Development Rep'],
                    ['Gloria Amponsah', 'Account Executive'],
                ],
                'Customer Success' => [
                    ['Theresa Nkrumah', 'Support Specialist'],
                    ['Patrick Donkor', 'Implementation Consultant'],
                    ['Angela Danso', 'Support Specialist'],
                    ['Stephen Osei', 'Implementation Consultant'],
                    ['Hannah Agyemang', 'Support Specialist'],
                ],
            ];

            foreach ($staffPlan as $departmentName => $people) {
                foreach ($people as [$name, $positionTitle]) {
                    $employees->push($this->createEmployee(
                        name: $name,
                        role: 'employee',
                        departmentBundle: $departments[$departmentName],
                        positionTitle: $positionTitle,
                        manager: $managers[$departmentName],
                    ));
                }
            }

            $employees->each(function (Employee $employee) use ($leaveTypes): void {
                $leaveTypes->each(function (LeaveType $leaveType) use ($employee): void {
                    LeaveBalance::factory()->create([
                        'employee_id' => $employee->id,
                        'leave_type_id' => $leaveType->id,
                        'year' => now()->year,
                        'entitled_days' => $leaveType->annual_allowance_days,
                        'used_days' => $leaveType->name === 'Annual Leave' ? fake()->numberBetween(0, 6) : fake()->numberBetween(0, 2),
                        'adjusted_days' => 0,
                    ]);
                });
            });

            $this->seedLeaveRequests($employees, $leaveTypes);
            $this->seedAttendance($employees);
            $this->seedPayroll($employees, $admin->user);
        });
    }

    /**
     * Passing existing foreign keys into factories avoids the classic factory-explosion bug,
     * where nested factories quietly create extra departments, positions, managers, or users.
     *
     * @param  array{department: Department, positions: \Illuminate\Support\Collection<string, Position>}  $departmentBundle
     */
    private function createEmployee(string $name, string $role, array $departmentBundle, string $positionTitle, ?Employee $manager = null): Employee
    {
        [$firstName, $lastName] = explode(' ', $name, 2);

        $user = User::factory()->role($role)->create([
            'name' => $name,
            'email' => strtolower(str_replace(' ', '.', $name)).'@peoplehq.test',
        ]);

        return Employee::factory()->create([
            'user_id' => $user->id,
            'department_id' => $departmentBundle['department']->id,
            'position_id' => $departmentBundle['positions'][$positionTitle]->id,
            'manager_id' => $manager?->id,
            'first_name' => $firstName,
            'middle_name' => null,
            'last_name' => $lastName,
            'work_email' => $user->email,
            'bank_account_name' => $name,
        ]);
    }

    private function seedLeaveRequests($employees, $leaveTypes): void
    {
        $annualLeave = $leaveTypes->firstWhere('name', 'Annual Leave');

        $employees->take(12)->each(function (Employee $employee, int $index) use ($annualLeave): void {
            $startDate = now()->addDays($index + 3)->startOfDay();

            LeaveRequest::factory()->create([
                'employee_id' => $employee->id,
                'leave_type_id' => $annualLeave->id,
                'approver_id' => $employee->manager_id,
                'start_date' => $startDate,
                'end_date' => (clone $startDate)->addDays(2),
                'requested_days' => 3,
                'status' => $index % 3 === 0 ? 'pending' : 'approved',
                'decision_comment' => $index % 3 === 0 ? null : 'Approved for demo company schedule.',
                'decided_at' => $index % 3 === 0 ? null : now()->subDays(2),
            ]);
        });
    }

    private function seedAttendance($employees): void
    {
        $workDates = collect(range(1, 10))
            ->map(fn (int $daysAgo): Carbon => now()->subWeekdays($daysAgo)->startOfDay())
            ->reverse()
            ->values();

        $employees->each(function (Employee $employee) use ($workDates): void {
            $workDates->each(function (Carbon $workDate, int $index) use ($employee): void {
                $clockIn = (clone $workDate)->setTime($index % 4 === 0 ? 8 : 7, $index % 4 === 0 ? 25 : 55);
                $clockOut = (clone $clockIn)->addHours(8)->addMinutes(15);

                AttendanceRecord::factory()->create([
                    'employee_id' => $employee->id,
                    'work_date' => $workDate,
                    'clock_in_at' => $clockIn,
                    'clock_out_at' => $clockOut,
                    'status' => $clockIn->format('H:i') > '08:15' ? 'late' : 'present',
                    'worked_minutes' => $clockIn->diffInMinutes($clockOut),
                ]);
            });
        });
    }

    private function seedPayroll($employees, User $admin): void
    {
        $payroll = Payroll::factory()->create([
            'month' => now()->subMonth()->month,
            'year' => now()->subMonth()->year,
            'created_by' => $admin->id,
            'finalized_by' => $admin->id,
        ]);

        $totals = [
            'gross_total' => 0,
            'deduction_total' => 0,
            'net_total' => 0,
        ];

        $employees->each(function (Employee $employee) use ($payroll, &$totals): void {
            $basicSalary = (float) $employee->basic_salary;
            $allowances = round($basicSalary * 0.12, 2);
            $grossPay = $basicSalary + $allowances;
            $deductions = round($grossPay * 0.14, 2);
            $netPay = $grossPay - $deductions;

            PayrollItem::factory()->create([
                'payroll_id' => $payroll->id,
                'employee_id' => $employee->id,
                'employee_number' => $employee->employee_number,
                'employee_name' => $employee->full_name,
                'department_name' => $employee->department->name,
                'position_title' => $employee->position->title,
                'basic_salary' => $basicSalary,
                'allowances_total' => $allowances,
                'gross_pay' => $grossPay,
                'deductions_total' => $deductions,
                'net_pay' => $netPay,
                'snapshot' => [
                    'currency' => $employee->currency,
                    'role' => $employee->user->role,
                    'department_id' => $employee->department_id,
                    'position_id' => $employee->position_id,
                ],
            ]);

            $totals['gross_total'] += $grossPay;
            $totals['deduction_total'] += $deductions;
            $totals['net_total'] += $netPay;
        });

        $payroll->update([
            'gross_total' => round($totals['gross_total'], 2),
            'deduction_total' => round($totals['deduction_total'], 2),
            'net_total' => round($totals['net_total'], 2),
        ]);
    }
}
