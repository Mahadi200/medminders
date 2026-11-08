<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('patient_record_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('doctor_id')->constrained('users')->restrictOnDelete();
            $table->foreignUlid('organization_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignUlid('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('scheduled_at');
            $table->string('status', 24)->default('BOOKED');
            $table->unsignedInteger('queue_number')->nullable();
            $table->timestamps();
            $table->index(['doctor_id', 'scheduled_at']);
            $table->index(['patient_record_id', 'scheduled_at']);
        });
        Schema::table('prescriptions', function (Blueprint $table) {
            $table->timestamp('superseded_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
        });
        Schema::table('medication_courses', function (Blueprint $table) {
            $table->timestamp('stopped_at')->nullable();
            $table->text('stop_reason')->nullable();
        });
    }
    public function down(): void
    {
        Schema::table('medication_courses', fn (Blueprint $table) => $table->dropColumn(['stopped_at', 'stop_reason']));
        Schema::table('prescriptions', fn (Blueprint $table) => $table->dropColumn(['superseded_at', 'cancelled_at']));
        Schema::dropIfExists('appointments');
    }
};
