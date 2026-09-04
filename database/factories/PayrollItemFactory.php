<?php

namespace Database\Factories;

use App\Models\PayrollItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PayrollItem>
 */
class PayrollItemFactory extends Factory
{
    public function definition(): array
    {
        $basicSalary = fake()->randomFloat(2, 2500, 18000);
        $allowances = round($basicSalary * fake()->randomFloat(2, 0.05, 0.18), 2);
        $grossPay = $basicSalary + $allowances;
        $deductions = round($grossPay * fake()->randomFloat(2, 0.08, 0.16), 2);

        return [
            'employee_number' => fake()->unique()->bothify('PHQ-####'),
            'employee_name' => fake()->name(),
            'department_name' => fake()->randomElement(['People Operations', 'Finance', 'Engineering', 'Sales', 'Customer Success']),
            'position_title' => fake()->jobTitle(),
            'basic_salary' => $basicSalary,
            'allowances_total' => $allowances,
            'gross_pay' => $grossPay,
            'deductions_total' => $deductions,
            'net_pay' => $grossPay - $deductions,
            'snapshot' => [],
        ];
    }
}
