<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_notifications', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type')->index();
            $table->string('title');
            $table->text('body')->nullable();
            $table->string('url')->nullable();
            $table->json('data')->nullable();
            $table->timestamp('read_at')->nullable()->index();
            $table->timestamps();

            $table->index(['user_id', 'read_at', 'created_at']);
        });

        Schema::create('chat_threads', function (Blueprint $table): void {
            $table->id();
            $table->string('subject');
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('chat_thread_user', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('chat_thread_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('last_read_at')->nullable();
            $table->timestamps();

            $table->unique(['chat_thread_id', 'user_id']);
        });

        Schema::create('chat_messages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('chat_thread_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();
        });

        Schema::create('shared_documents', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('uploaded_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('chat_thread_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('disk')->default('public');
            $table->string('path');
            $table->string('original_name');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size')->default(0);
            $table->timestamps();
        });

        Schema::create('work_tasks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('assigned_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('assigned_to')->constrained('users')->cascadeOnDelete();
            $table->foreignId('chat_thread_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('status')->default('open')->index();
            $table->date('due_date')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['assigned_to', 'status', 'due_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_tasks');
        Schema::dropIfExists('shared_documents');
        Schema::dropIfExists('chat_messages');
        Schema::dropIfExists('chat_thread_user');
        Schema::dropIfExists('chat_threads');
        Schema::dropIfExists('app_notifications');
    }
};
