<?php

namespace App\Mail;

use App\Models\PayrollItem;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SalaryPaymentProcessed extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public PayrollItem $item) {}

    public function envelope(): Envelope
    {
        $month = $this->item->payroll?->period_label ?? "{$this->item->payroll?->month}/{$this->item->payroll?->year}";

        return new Envelope(
            subject: "Salary payment processed for {$month}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.salary-payment-processed',
        );
    }
}
