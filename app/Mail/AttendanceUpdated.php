<?php

namespace App\Mail;

use App\Models\AttendanceRecord;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AttendanceUpdated extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public AttendanceRecord $record,
        public string $event,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Attendance {$this->event} recorded",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.attendance-updated',
        );
    }
}
