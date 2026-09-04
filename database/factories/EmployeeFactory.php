<?php

namespace Database\Factories;

use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Employee>
 */
class EmployeeFactory extends Factory
{
    private static int $employeeNumber = 1000;

    public function definition(): array
    {
        $firstName = fake()->firstName();
        $lastName = fake()->lastName();

        return [
            'employee_number' => 'PHQ-'.self::$employeeNumber++,
            'first_name' => $firstName,
            'middle_name' => fake()->optional(0.25)->firstName(),
            'last_name' => $lastName,
            'date_of_birth' => fake()->dateTimeBetween('-55 years', '-22 years'),
            'gender' => fake()->randomElement(['female', 'male']),
            'profile_photo_path' => null,
            'work_email' => fake()->unique()->safeEmail(),
            'personal_email' => fake()->optional()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'residential_address' => fake()->streetAddress(),
            'city_region' => fake()->randomElement(['Accra', 'Kumasi', 'Takoradi', 'Tamale', 'Cape Coast']),
            'hire_date' => fake()->dateTimeBetween('-7 years', '-2 weeks'),
            'employment_type' => fake()->randomElement(['full_time', 'part_time', 'contract']),
            'status' => fake()->randomElement(['active', 'active', 'active', 'probation']),
            'work_location' => fake()->randomElement(['Head Office', 'Remote', 'Hybrid']),
            'emergency_contact_name' => fake()->name(),
            'emergency_contact_relationship' => fake()->randomElement(['Spouse', 'Parent', 'Sibling', 'Friend']),
            'emergency_contact_phone' => fake()->phoneNumber(),
            'basic_salary' => fake()->numberBetween(2500, 18000),
            'currency' => 'GHS',
            'bank_name' => fake()->randomElement(['GCB Bank', 'Ecobank', 'Absa Bank Ghana', 'Stanbic Bank', 'Fidelity Bank']),
            'bank_account_name' => "{$firstName} {$lastName}",
            'bank_account_number' => fake()->numerify('##########'),
            'tax_reference' => fake()->optional()->bothify('TIN-#######'),
            'ssnit_reference' => fake()->optional()->bothify('SSNIT-#######'),
        ];
    }
}
