<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shared_documents', function (Blueprint $table): void {
            $table->foreignId('work_task_id')->nullable()->after('chat_thread_id')->constrained()->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('shared_documents', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('work_task_id');
        });
    }
};
