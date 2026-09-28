<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

#[Fillable([
    'uploaded_by',
    'chat_thread_id',
    'disk',
    'path',
    'original_name',
    'mime_type',
    'size',
])]
class SharedDocument extends Model
{
    use HasFactory;

    protected function url(): Attribute
    {
        return Attribute::get(fn (): string => Storage::disk($this->disk)->url($this->path));
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function thread(): BelongsTo
    {
        return $this->belongsTo(ChatThread::class, 'chat_thread_id');
    }
}
