<?php

namespace Database\Factories;

use App\Models\Position;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Position>
 */
class PositionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title' => fake()->jobTitle(),
            'code' => strtoupper(fake()->unique()->bothify('POS-###')),
            'description' => fake()->sentence(),
            'is_active' => true,
        ];
    }
}
