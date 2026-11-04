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
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('patient')->after('email')->index();
            $table->string('phone')->nullable()->after('role');
        });

        Schema::create('patient_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('full_name');
            $table->date('date_of_birth')->nullable();
            $table->string('gender')->nullable();
            $table->string('blood_group')->nullable();
            $table->json('allergies')->nullable();
            $table->json('chronic_conditions')->nullable();
            $table->timestamps();
        });

        Schema::create('antibiotics', function (Blueprint $table) {
            $table->id();
            $table->string('generic_name')->unique();
            $table->string('group')->nullable();
            $table->string('aware_category')->default('UNCLASSIFIED');
            $table->json('brand_names')->nullable();
            $table->text('dose_duration')->nullable();
            $table->text('side_effects')->nullable();
            $table->timestamps();
        });

        Schema::create('prescriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('doctor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status')->default('DRAFT_UNREVIEWED')->index();
            $table->string('verification_token')->nullable()->unique();
            $table->text('diagnosis')->nullable();
            $table->text('clinical_notes')->nullable();
            $table->timestamp('signed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('prescription_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('prescription_id')->constrained()->cascadeOnDelete();
            $table->foreignId('antibiotic_id')->nullable()->constrained()->nullOnDelete();
            $table->string('medicine_name');
            $table->string('generic_name')->nullable();
            $table->string('strength')->nullable();
            $table->string('frequency')->nullable();
            $table->string('duration')->nullable();
            $table->unsignedInteger('quantity')->default(1);
            $table->boolean('is_antibiotic')->default(false);
            $table->timestamps();
        });

        Schema::create('clinical_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('prescription_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->string('severity');
            $table->string('title');
            $table->text('message_en');
            $table->text('message_bn');
            $table->boolean('acknowledged')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clinical_alerts');
        Schema::dropIfExists('prescription_items');
        Schema::dropIfExists('prescriptions');
        Schema::dropIfExists('antibiotics');
        Schema::dropIfExists('patient_profiles');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'phone']);
        });
    }
};
