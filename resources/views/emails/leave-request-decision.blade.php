<p>Hello {{ $leaveRequest->employee?->full_name ?? 'there' }},</p>

<p>Your {{ $leaveRequest->leaveType?->name ?? 'leave' }} request has been {{ $leaveRequest->status }}.</p>

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
    @if ($leaveRequest->decision_comment)
        <tr>
            <td><strong>Comment</strong></td>
            <td>{{ $leaveRequest->decision_comment }}</td>
        </tr>
    @endif
</table>

<p>Thank you.</p>
