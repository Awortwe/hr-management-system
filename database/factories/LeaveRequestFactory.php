<?php

namespace Database\Factories;

use App\Models\LeaveRequest;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LeaveRequest>
 */
class LeaveRequestFactory extends Factory
{
    public function definition(): array
    {
        $start = fake()->dateTimeBetween('-2 months', '+1 month');

        return [
            'start_date' => $start,
            'end_date' => (clone $start)->modify('+'.fake()->numberBetween(1, 5).' days'),
            'requested_days' => fake()->numberBetween(1, 5),
            'reason' => fake()->sentence(),
            'status' => fake()->randomElement(['pending', 'approved', 'rejected']),
            'decision_comment' => fake()->optional()->sentence(),
            'decided_at' => fake()->optional()->dateTimeBetween('-1 month', 'now'),
        ];
    }
}
