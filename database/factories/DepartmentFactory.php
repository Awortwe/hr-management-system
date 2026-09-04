<?php

namespace Database\Factories;

use App\Models\Department;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Department>
 */
class DepartmentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->randomElement([
                'People Operations',
                'Finance',
                'Engineering',
                'Sales',
                'Customer Success',
                'Operations',
                'Legal',
            ]),
            'code' => strtoupper(fake()->unique()->bothify('DPT-###')),
            'description' => fake()->sentence(),
            'is_active' => true,
        ];
    }
}
