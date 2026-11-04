<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('user_roles', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('role', ['PATIENT', 'CAREGIVER', 'DOCTOR', 'PHARMACIST', 'HOSPITAL_ADMIN', 'SUPERADMIN']);
            $table->boolean('is_verified')->default(false);
            $table->timestamps();
            $table->unique(['user_id', 'role']);
        });

        Schema::create('clinician_credentials', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('bmdc_number', 191)->unique();
            $table->string('specialty')->nullable();
            $table->enum('verification_status', ['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'])->default('PENDING');
            $table->foreignUlid('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
        });

        Schema::create('pharmacist_credentials', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('license_number', 191)->unique();
            $table->string('pharmacy_reg', 191)->nullable();
            $table->enum('verification_status', ['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'])->default('PENDING');
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
        });

        Schema::create('medicine_generics', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('name', 191)->unique();
            $table->string('therapeutic_class')->nullable();
            $table->enum('aware_group', ['ACCESS', 'WATCH', 'RESERVE', 'NOT_RECOMMENDED', 'UNKNOWN'])->default('UNKNOWN');
            $table->text('indications')->nullable();
            $table->text('safety_warnings')->nullable();
            $table->text('reference_dosing_guidance')->nullable();
            $table->timestamps();
        });

        Schema::create('medicine_brands', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('generic_id')->constrained('medicine_generics')->cascadeOnDelete();
            $table->string('brand_name', 191);
            $table->string('strength')->nullable();
            $table->string('dosage_form')->nullable();
            $table->string('manufacturer')->nullable();
            $table->timestamps();
            $table->index(['generic_id', 'brand_name']);
        });

        Schema::create('catalogue_staging_batches', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('filename', 191);
            $table->json('validation_errors')->nullable();
            $table->json('conflicts_detected')->nullable();
            $table->enum('status', ['PENDING', 'APPROVED', 'REJECTED'])->default('PENDING');
            $table->foreignUlid('curator_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('prescriptions', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('patient_id')->constrained('users')->restrictOnDelete();
            $table->foreignUlid('doctor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('diagnosis')->nullable();
            $table->json('instructions')->nullable();
            $table->enum('status', ['DRAFT_UNREVIEWED', 'CLINICIAN_REVIEWED', 'SIGNED', 'DISPENSED', 'CANCELLED'])->default('DRAFT_UNREVIEWED');
            $table->timestamps();
            $table->index(['patient_id', 'status']);
        });

        Schema::create('prescription_uploads', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUlid('prescription_id')->nullable()->constrained('prescriptions')->nullOnDelete();
            $table->enum('file_type', ['image', 'pdf']);
            $table->string('file_path', 191);
            $table->timestamps();
        });

        Schema::create('audit_events', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUlid('target_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 191);
            $table->string('entity_type', 191);
            $table->string('entity_id', 191);
            $table->ipAddress('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['action', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_events');
        Schema::dropIfExists('prescription_uploads');
        Schema::dropIfExists('prescriptions');
        Schema::dropIfExists('catalogue_staging_batches');
        Schema::dropIfExists('medicine_brands');
        Schema::dropIfExists('medicine_generics');
        Schema::dropIfExists('pharmacist_credentials');
        Schema::dropIfExists('clinician_credentials');
        Schema::dropIfExists('user_roles');
    }
};
