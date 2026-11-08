<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('medication_problem_reports', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('medication_course_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('patient_record_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('reported_by')->constrained('users')->restrictOnDelete();
            $table->text('symptoms');
            $table->timestamp('reported_onset_at')->nullable();
            $table->boolean('medicine_taken')->nullable();
            $table->timestamp('last_dose_at')->nullable();
            $table->string('contact_action', 32)->default('CARE_TEAM_REVIEW');
            $table->string('status', 24)->default('OPEN');
            $table->string('attachment_path')->nullable();
            $table->timestamps();
            $table->index(['patient_record_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medication_problem_reports');
    }
};
