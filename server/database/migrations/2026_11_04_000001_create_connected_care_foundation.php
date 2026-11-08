<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('name')->nullable();
            $table->string('email')->nullable()->change();
            $table->string('password')->nullable()->change();
        });
        Schema::table('clinician_credentials', function (Blueprint $table) {
            $table->string('hospital_clinic')->nullable();
            $table->text('qualifications')->nullable();
            $table->unsignedSmallInteger('experience_years')->nullable();
            $table->text('biography')->nullable();
            $table->string('chamber')->nullable();
            $table->decimal('fee_bdt', 10, 2)->nullable();
            $table->json('schedule')->nullable();
            $table->string('appointment_contact')->nullable();
            $table->string('photo_path')->nullable();
            $table->boolean('is_published')->default(false)->index();
        });
        Schema::create('organizations', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('name');
            $table->enum('type', ['CLINIC', 'PHARMACY', 'HOSPITAL', 'DIAGNOSTIC']);
            $table->timestamps();
        });
        Schema::create('organization_memberships', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('organization_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('user_id')->constrained()->restrictOnDelete();
            $table->string('role', 40);
            $table->foreignUlid('assigned_doctor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['organization_id', 'user_id', 'role'], 'org_user_role_unique');
        });
        Schema::create('patient_records', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('name');
            $table->string('phone_number', 32);
            $table->string('email')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->unsignedSmallInteger('estimated_age')->nullable();
            $table->string('allergy_status', 24)->default('UNKNOWN');
            $table->text('allergies')->nullable();
            $table->text('history')->nullable();
            $table->text('address')->nullable();
            $table->foreignUlid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index('phone_number');
        });
        Schema::create('patient_links', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('patient_record_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            $table->string('relationship', 24)->default('SELF');
            $table->timestamp('verified_at');
            $table->timestamps();
            $table->unique(['patient_record_id', 'user_id']);
        });
        Schema::create('phone_challenges', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('phone_number', 32);
            $table->string('purpose', 24);
            $table->string('pending_name')->nullable();
            $table->foreignUlid('patient_record_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('code_hash');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable();
            $table->timestamps();
            $table->index(['phone_number', 'purpose', 'created_at']);
        });
        Schema::create('sharing_requests', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('patient_record_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('requester_id')->constrained('users')->restrictOnDelete();
            $table->foreignUlid('organization_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('resource_type', 32);
            $table->ulid('resource_id');
            $table->string('action', 24);
            $table->string('purpose');
            $table->unsignedSmallInteger('duration_minutes');
            $table->string('status', 16)->default('PENDING');
            $table->timestamp('expires_at');
            $table->timestamps();
            $table->index(['patient_record_id', 'status']);
        });
        Schema::create('sharing_grants', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('sharing_request_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignUlid('patient_record_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('recipient_id')->constrained('users')->restrictOnDelete();
            $table->foreignUlid('organization_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('resource_type', 32);
            $table->ulid('resource_id');
            $table->string('action', 24);
            $table->timestamp('expires_at');
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();
            $table->index(['recipient_id', 'resource_type', 'resource_id']);
        });
        Schema::table('prescriptions', function (Blueprint $table) {
            $table->foreignUlid('patient_id')->nullable()->change();
            $table->foreignUlid('patient_record_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('template', 32)->default('OUTPATIENT');
            $table->json('clinical_details')->nullable();
            $table->json('patient_snapshot')->nullable();
            $table->json('doctor_snapshot')->nullable();
            $table->foreignUlid('supersedes_id')->nullable()->constrained('prescriptions')->nullOnDelete();
            $table->text('amendment_reason')->nullable();
            $table->timestamp('issued_at')->nullable();
        });
        Schema::create('prescription_items', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('prescription_id')->constrained()->restrictOnDelete();
            $table->string('generic_name');
            $table->string('brand_name')->nullable();
            $table->string('strength');
            $table->string('dosage_form');
            $table->string('dose');
            $table->string('route');
            $table->string('schedule_type', 24);
            $table->json('schedule_details');
            $table->unsignedSmallInteger('duration_days')->nullable();
            $table->date('review_date')->nullable();
            $table->unsignedInteger('quantity')->nullable();
            $table->text('instructions')->nullable();
            $table->boolean('is_antibiotic')->default(false);
            $table->string('indication')->nullable();
            $table->string('aware_group', 24)->default('UNKNOWN');
            $table->string('aware_source')->nullable();
            $table->timestamps();
        });
        Schema::create('medication_courses', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('prescription_item_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignUlid('patient_record_id')->constrained()->restrictOnDelete();
            $table->timestamp('intended_start_at')->nullable();
            $table->timestamp('actual_start_at')->nullable();
            $table->timestamp('planned_end_at')->nullable();
            $table->string('timezone', 64)->default('Asia/Dhaka');
            $table->string('status', 24)->default('AWAITING_START');
            $table->timestamps();
        });
        Schema::create('dose_events', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('medication_course_id')->constrained()->cascadeOnDelete();
            $table->timestamp('scheduled_at');
            $table->string('status', 24)->default('SCHEDULED');
            $table->timestamps();
            $table->unique(['medication_course_id', 'scheduled_at']);
        });
        Schema::create('dose_logs', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('dose_event_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('actor_id')->constrained('users')->restrictOnDelete();
            $table->string('status', 24);
            $table->timestamp('actual_at')->nullable();
            $table->string('reason')->nullable();
            $table->foreignUlid('corrects_id')->nullable()->constrained('dose_logs')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dose_logs');
        Schema::dropIfExists('dose_events');
        Schema::dropIfExists('medication_courses');
        Schema::dropIfExists('prescription_items');
        Schema::table('prescriptions', fn (Blueprint $table) => $table->dropColumn(['patient_record_id', 'template', 'clinical_details', 'patient_snapshot', 'doctor_snapshot', 'supersedes_id', 'amendment_reason', 'issued_at']));
        Schema::dropIfExists('sharing_grants');
        Schema::dropIfExists('sharing_requests');
        Schema::dropIfExists('phone_challenges');
        Schema::dropIfExists('patient_links');
        Schema::dropIfExists('patient_records');
        Schema::dropIfExists('organization_memberships');
        Schema::dropIfExists('organizations');
        Schema::table('clinician_credentials', fn (Blueprint $table) => $table->dropColumn(['hospital_clinic', 'qualifications', 'experience_years', 'biography', 'chamber', 'fee_bdt', 'schedule', 'appointment_contact', 'photo_path', 'is_published']));
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('name'));
    }
};
