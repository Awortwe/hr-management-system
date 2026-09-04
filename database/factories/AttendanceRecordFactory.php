<?php

namespace Database\Factories;

use App\Models\AttendanceRecord;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AttendanceRecord>
 */
class AttendanceRecordFactory extends Factory
{
    public function definition(): array
    {
        $workDate = fake()->dateTimeBetween('-20 weekdays', 'now');
        $clockIn = (clone $workDate)->setTime(fake()->numberBetween(7, 9), fake()->numberBetween(0, 59));
        $clockOut = (clone $clockIn)->modify('+'.fake()->numberBetween(7, 9).' hours');

        return [
            'work_date' => $workDate,
            'clock_in_at' => $clockIn,
            'clock_out_at' => $clockOut,
            'status' => $clockIn->format('H:i') > '08:15' ? 'late' : 'present',
            'worked_minutes' => (int) (($clockOut->getTimestamp() - $clockIn->getTimestamp()) / 60),
            'correction_reason' => null,
            'corrected_by' => null,
            'corrected_at' => null,
        ];
    }
}
