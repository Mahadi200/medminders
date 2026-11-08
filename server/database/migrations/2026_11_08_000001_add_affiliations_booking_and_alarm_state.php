<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Additive only: doctor–organization affiliations, booking details, alarm acknowledgement/snooze state,
// and medication-problem review fields. No existing column or row is changed.
return new class extends Migration {
    public function up(): void
    {
        Schema::create('doctor_affiliations', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('doctor_id')->constrained('users')->restrictOnDelete();
            $table->foreignUlid('organization_id')->constrained()->restrictOnDelete();
            $table->string('branch_label', 191)->nullable();
            $table->json('visiting_days');               // e.g. ["SUN","TUE"]
            $table->string('start_time', 5);              // local HH:MM
            $table->string('end_time', 5);
            $table->unsignedSmallInteger('slot_minutes')->default(15);
            $table->decimal('fee_bdt', 10, 2)->nullable();
            $table->string('status', 24)->default('PENDING'); // PENDING, CONFIRMED, REJECTED, ENDED
            $table->foreignUlid('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->string('decision_note', 500)->nullable();
            $table->timestamps();
            $table->unique(['doctor_id', 'organization_id'], 'doctor_org_affiliation_unique');
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->foreignUlid('affiliation_id')->nullable()->after('organization_id')->constrained('doctor_affiliations')->nullOnDelete();
            $table->string('visit_reason', 500)->nullable()->after('status');
            $table->timestamp('proposed_scheduled_at')->nullable()->after('visit_reason');
            $table->string('status_reason', 500)->nullable()->after('proposed_scheduled_at');
            $table->boolean('consultation_consent')->default(false)->after('status_reason');
        });

        Schema::create('dose_alarm_states', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('dose_event_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamp('snoozed_until')->nullable();
            $table->unsignedTinyInteger('snooze_count')->default(0);
            $table->timestamps();
            $table->unique(['dose_event_id', 'user_id']);
        });

        Schema::table('medication_problem_reports', function (Blueprint $table) {
            $table->foreignUlid('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_note')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('medication_problem_reports', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reviewed_by');
            $table->dropColumn(['reviewed_at', 'review_note']);
        });
        Schema::dropIfExists('dose_alarm_states');
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('affiliation_id');
            $table->dropColumn(['visit_reason', 'proposed_scheduled_at', 'status_reason', 'consultation_consent']);
        });
        Schema::dropIfExists('doctor_affiliations');
    }
};
