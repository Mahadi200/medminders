<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('medication_courses', function (Blueprint $table) {
            $table->string('completion_status', 32)->default('UNKNOWN');
            $table->timestamp('completion_reported_at')->nullable();
        });
        Schema::create('medication_support_alerts', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('medication_course_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('dose_event_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignUlid('patient_record_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignUlid('resolved_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('reason', 32);
            $table->text('patient_note')->nullable();
            $table->text('resolution_note')->nullable();
            $table->string('status', 16)->default('OPEN');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            $table->index(['patient_record_id', 'status']);
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('medication_support_alerts');
        Schema::table('medication_courses', fn (Blueprint $table) => $table->dropColumn(['completion_status', 'completion_reported_at']));
    }
};
