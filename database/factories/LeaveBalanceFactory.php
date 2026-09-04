<?php

namespace Database\Factories;

use App\Models\LeaveBalance;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LeaveBalance>
 */
class LeaveBalanceFactory extends Factory
{
    public function definition(): array
    {
        return [
            'year' => now()->year,
            'entitled_days' => 20,
            'used_days' => fake()->randomFloat(2, 0, 8),
            'adjusted_days' => 0,
            'adjustment_reason' => null,
        ];
    }
}
