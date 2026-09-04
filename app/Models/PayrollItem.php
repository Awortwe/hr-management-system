<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'payroll_id',
    'employee_id',
    'employee_number',
    'employee_name',
    'department_name',
    'position_title',
    'basic_salary',
    'allowances_total',
    'gross_pay',
    'deductions_total',
    'net_pay',
    'snapshot',
])]
class PayrollItem extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'basic_salary' => 'decimal:2',
            'allowances_total' => 'decimal:2',
            'gross_pay' => 'decimal:2',
            'deductions_total' => 'decimal:2',
            'net_pay' => 'decimal:2',
            'snapshot' => 'array',
        ];
    }

    public function payroll(): BelongsTo
    {
        return $this->belongsTo(Payroll::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
