<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_sites', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->text('address')->nullable();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->unsignedInteger('geofence_radius_meters')->default(150);
            $table->string('status')->default('active')->index();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('shifts', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->time('starts_at')->default('08:00:00');
            $table->time('ends_at')->default('17:00:00');
            $table->unsignedSmallInteger('grace_minutes')->default(15);
            $table->unsignedSmallInteger('unpaid_break_minutes')->default(60);
            $table->boolean('is_night_shift')->default(false);
            $table->decimal('overtime_rate', 8, 2)->default(1.50);
            $table->decimal('overtime_cap_hours', 8, 2)->default(4.00);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('employee_project_site', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_site_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['employee_id', 'project_site_id']);
        });

        Schema::table('employees', function (Blueprint $table): void {
            $table->foreignId('shift_id')->nullable()->after('manager_id')->constrained()->nullOnDelete();
        });

        Schema::table('attendance_records', function (Blueprint $table): void {
            $table->foreignId('project_site_id')->nullable()->after('employee_id')->constrained()->nullOnDelete();
            $table->string('check_in_selfie_path')->nullable()->after('clock_out_at');
            $table->string('check_out_selfie_path')->nullable()->after('check_in_selfie_path');
            $table->decimal('check_in_latitude', 10, 7)->nullable()->after('check_out_selfie_path');
            $table->decimal('check_in_longitude', 10, 7)->nullable()->after('check_in_latitude');
            $table->decimal('check_out_latitude', 10, 7)->nullable()->after('check_in_longitude');
            $table->decimal('check_out_longitude', 10, 7)->nullable()->after('check_out_latitude');
            $table->decimal('distance_from_site', 10, 2)->nullable()->after('check_out_longitude');
            $table->string('zone_status')->default('unknown')->index()->after('distance_from_site');
            $table->string('approval_status')->default('pending')->index()->after('zone_status');
            $table->decimal('overtime_hours', 8, 2)->default(0)->after('worked_minutes');
            $table->timestamp('overtime_approved_at')->nullable()->after('overtime_hours');
            $table->foreignId('overtime_approved_by')->nullable()->after('overtime_approved_at')->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable()->after('approval_status');
            $table->foreignId('approved_by')->nullable()->after('approved_at')->constrained('users')->nullOnDelete();
        });

        Schema::create('attendance_corrections', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('attendance_record_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type');
            $table->date('work_date');
            $table->timestamp('requested_clock_in_at')->nullable();
            $table->timestamp('requested_clock_out_at')->nullable();
            $table->decimal('requested_latitude', 10, 7)->nullable();
            $table->decimal('requested_longitude', 10, 7)->nullable();
            $table->text('reason');
            $table->string('status')->default('pending')->index();
            $table->text('review_remarks')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['employee_id', 'status']);
            $table->index(['work_date', 'status']);
        });

        Schema::create('attendance_audit_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('employee_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('attendance_record_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('event');
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['event', 'created_at']);
        });

        Schema::table('company_settings', function (Blueprint $table): void {
            $table->boolean('allow_offline_punch')->default(true);
            $table->boolean('require_device_binding')->default(false);
            $table->unsignedInteger('default_geofence_radius_meters')->default(150);
            $table->unsignedSmallInteger('late_threshold_minutes')->default(15);
            $table->json('weekend_days')->nullable();
            $table->string('attendance_approval_rule')->default('out_of_zone_only');
        });
    }

    public function down(): void
    {
        Schema::table('company_settings', function (Blueprint $table): void {
            $table->dropColumn([
                'allow_offline_punch',
                'require_device_binding',
                'default_geofence_radius_meters',
                'late_threshold_minutes',
                'weekend_days',
                'attendance_approval_rule',
            ]);
        });

        Schema::dropIfExists('attendance_audit_logs');
        Schema::dropIfExists('attendance_corrections');

        Schema::table('attendance_records', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('project_site_id');
            $table->dropConstrainedForeignId('overtime_approved_by');
            $table->dropConstrainedForeignId('approved_by');
            $table->dropColumn([
                'check_in_selfie_path',
                'check_out_selfie_path',
                'check_in_latitude',
                'check_in_longitude',
                'check_out_latitude',
                'check_out_longitude',
                'distance_from_site',
                'zone_status',
                'approval_status',
                'overtime_hours',
                'overtime_approved_at',
                'approved_at',
            ]);
        });

        Schema::table('employees', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('shift_id');
        });

        Schema::dropIfExists('employee_project_site');
        Schema::dropIfExists('shifts');
        Schema::dropIfExists('project_sites');
    }
};
