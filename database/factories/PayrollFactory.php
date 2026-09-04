<?php

namespace Database\Factories;

use App\Models\Payroll;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Payroll>
 */
class PayrollFactory extends Factory
{
    public function definition(): array
    {
        return [
            'month' => now()->subMonth()->month,
            'year' => now()->subMonth()->year,
            'status' => 'finalized',
            'gross_total' => 0,
            'deduction_total' => 0,
            'net_total' => 0,
            'finalized_at' => now()->subDays(3),
        ];
    }
}
