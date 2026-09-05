<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    @include('partials.favicon')
    <title>Payslip - {{ $item->employee_name }} - {{ $payroll->month }}/{{ $payroll->year }} - {{ $company->name }}</title>
    <style>
        :root {
            color: #18181b;
            font-family: Arial, Helvetica, sans-serif;
        }

        * {
            box-sizing: border-box;
        }

        body {
            background: #f4f4f5;
            margin: 0;
            padding: 32px;
        }

        .payslip {
            background: #ffffff;
            border: 1px solid #d4d4d8;
            border-radius: 8px;
            margin: 0 auto;
            max-width: 860px;
            padding: 40px;
        }

        .header {
            gap: 20px;
            align-items: flex-start;
            border-bottom: 2px solid #18181b;
            display: flex;
            justify-content: space-between;
            padding-bottom: 20px;
        }

        .header > div { min-width: 0; }

        h1,
        h2,
        p {
            margin: 0;
        }

        h1 {
            font-size: 28px;
            letter-spacing: 0;
        }

        h2 {
            font-size: 14px;
            margin-bottom: 12px;
            text-transform: uppercase;
        }

        .muted {
            color: #71717a;
            font-size: 13px;
            margin-top: 6px;
        }

        .period {
            text-align: right;
        }

        .grid {
            display: grid;
            gap: 20px;
            grid-template-columns: 1fr 1fr;
            margin-top: 28px;
        }

        .panel {
            border: 1px solid #e4e4e7;
            border-radius: 8px;
            padding: 18px;
        }

        .row {
            display: flex;
            font-size: 14px;
            justify-content: space-between;
            padding: 8px 0;
        }

        .row + .row {
            border-top: 1px solid #f4f4f5;
        }

        .total {
            background: #18181b;
            border-radius: 8px;
            color: #ffffff;
            display: flex;
            justify-content: space-between;
            margin-top: 28px;
            padding: 18px;
        }

        .total strong {
            font-size: 24px;
        }

        .print-actions {
            margin: 24px auto 0;
            max-width: 860px;
            text-align: right;
        }

        button {
            background: #18181b;
            border: 0;
            border-radius: 6px;
            color: #ffffff;
            cursor: pointer;
            font-size: 14px;
            font-weight: 700;
            padding: 10px 16px;
        }

        @media print {
            @page {
                margin: 18mm;
                size: A4;
            }

            body {
                background: #ffffff;
                padding: 0;
            }

            .payslip {
                border: 0;
                border-radius: 0;
                max-width: none;
                padding: 0;
            }

            .print-actions {
                display: none;
            }
        }
    </style>
</head>
<body>
    <main class="payslip">
        <section class="header">
            <div>
                <h1 style="overflow-wrap: anywhere">{{ $company->name }}</h1>
                <p class="muted">Employee Payslip</p>
                @if($company->address)<p class="muted" style="white-space: pre-line; overflow-wrap: anywhere">{{ $company->address }}</p>@endif
                @foreach(['email', 'phone', 'website', 'registration_number'] as $field)
                    @if($company->$field)<p class="muted" style="overflow-wrap: anywhere">{{ $company->$field }}</p>@endif
                @endforeach
            </div>
            <div class="period">
                <h2>{{ DateTime::createFromFormat('!m', $payroll->month)->format('F') }} {{ $payroll->year }}</h2>
                <p class="muted">Payslip #{{ str_pad((string) $item->id, 6, '0', STR_PAD_LEFT) }}</p>
            </div>
        </section>

        <section class="grid">
            <div class="panel">
                <h2>Employee</h2>
                <div class="row"><span>Name</span><strong>{{ $item->employee_name }}</strong></div>
                <div class="row"><span>Employee No.</span><strong>{{ $item->employee_number }}</strong></div>
                <div class="row"><span>Department</span><strong>{{ $item->department_name ?? 'Not recorded' }}</strong></div>
                <div class="row"><span>Position</span><strong>{{ $item->position_title ?? 'Not recorded' }}</strong></div>
            </div>

            <div class="panel">
                <h2>Payroll</h2>
                <div class="row"><span>Status</span><strong>{{ ucfirst($payroll->status) }}</strong></div>
                <div class="row"><span>Finalized</span><strong>{{ $payroll->finalized_at?->format('M j, Y') ?? 'Not finalized' }}</strong></div>
                <div class="row"><span>Currency</span><strong>{{ $currency }}</strong></div>
            </div>
        </section>

        <section class="grid">
            <div class="panel">
                <h2>Earnings</h2>
                <div class="row"><span>Basic Salary</span><strong>{{ $currency }} {{ number_format((float) $item->basic_salary, 2) }}</strong></div>
                <div class="row"><span>Allowances</span><strong>{{ $currency }} {{ number_format((float) $item->allowances_total, 2) }}</strong></div>
                <div class="row"><span>Gross Pay</span><strong>{{ $currency }} {{ number_format((float) $item->gross_pay, 2) }}</strong></div>
            </div>

            <div class="panel">
                <h2>Deductions</h2>
                <div class="row"><span>Total Deductions</span><strong>{{ $currency }} {{ number_format((float) $item->deductions_total, 2) }}</strong></div>
            </div>
        </section>

        <section class="total">
            <span>Net Pay</span>
            <strong>{{ $currency }} {{ number_format((float) $item->net_pay, 2) }}</strong>
        </section>
    </main>

    <div class="print-actions">
        <button type="button" onclick="window.print()">Print or Save PDF</button>
    </div>
</body>
</html>
