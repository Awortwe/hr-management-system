<p>Hello {{ $record->employee?->full_name ?? 'there' }},</p>

<p>Your attendance {{ $event }} has been recorded for {{ $record->work_date?->toFormattedDateString() }}.</p>

<table cellpadding="6" cellspacing="0" role="presentation">
    <tr>
        <td><strong>Status</strong></td>
        <td>{{ ucfirst($record->status ?? 'recorded') }}</td>
    </tr>
    <tr>
        <td><strong>Clock in</strong></td>
        <td>{{ $record->clock_in_at?->format('H:i') ?? '-' }}</td>
    </tr>
    <tr>
        <td><strong>Clock out</strong></td>
        <td>{{ $record->clock_out_at?->format('H:i') ?? '-' }}</td>
    </tr>
</table>

<p>Thank you.</p>
