<p>Hello {{ $leaveRequest->employee?->full_name ?? 'there' }},</p>

<p>Your {{ $leaveRequest->leaveType?->name ?? 'leave' }} request has been received and is pending review.</p>

<table cellpadding="6" cellspacing="0" role="presentation">
    <tr>
        <td><strong>Start date</strong></td>
        <td>{{ $leaveRequest->start_date?->toFormattedDateString() }}</td>
    </tr>
    <tr>
        <td><strong>End date</strong></td>
        <td>{{ $leaveRequest->end_date?->toFormattedDateString() }}</td>
    </tr>
    <tr>
        <td><strong>Days</strong></td>
        <td>{{ (float) $leaveRequest->requested_days }}</td>
    </tr>
</table>

<p>Thank you.</p>
