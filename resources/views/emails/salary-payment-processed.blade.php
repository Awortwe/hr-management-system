@php
    $payroll = $item->payroll;
    $currency = ($item->snapshot ?? [])['currency'] ?? 'GHS';
@endphp

<p>Hello {{ $item->employee_name }},</p>

<p>Your salary payment has been processed for {{ $payroll?->period_label ?? $payroll?->month.'/'.$payroll?->year }}.</p>

<table cellpadding="6" cellspacing="0" role="presentation">
    <tr>
        <td><strong>Basic salary</strong></td>
        <td>{{ $currency }} {{ number_format((float) $item->basic_salary, 2) }}</td>
    </tr>
    <tr>
        <td><strong>Allowances</strong></td>
        <td>{{ $currency }} {{ number_format((float) $item->allowances_total, 2) }}</td>
    </tr>
    <tr>
        <td><strong>Deductions</strong></td>
        <td>{{ $currency }} {{ number_format((float) $item->deductions_total, 2) }}</td>
    </tr>
    <tr>
        <td><strong>Net pay</strong></td>
        <td>{{ $currency }} {{ number_format((float) $item->net_pay, 2) }}</td>
    </tr>
</table>

<p>Thank you.</p>
