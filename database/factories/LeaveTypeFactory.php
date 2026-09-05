<?php

namespace Database\Factories;

use App\Models\LeaveType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LeaveType>
 */
class LeaveTypeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->randomElement(['Annual Leave', 'Sick Leave', 'Unpaid Leave', 'Maternity Leave', 'Paternity Leave']),
            'annual_allowance_days' => fake()->randomElement([5, 10, 15, 20, 25]),
            'is_paid' => true,
            'color' => fake()->hexColor(),
            'is_active' => true,
        ];
    }
}
