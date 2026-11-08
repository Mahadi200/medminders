<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Additive only. Core patient journey: catalogue metadata, OTP-verified booking, hospital assignment history,
// web-push subscriptions with delivery tracking, assistant condition table, and is_sample markers for purge.
return new class extends Migration {
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $t) {
            $t->string('area', 100)->nullable();
            $t->decimal('latitude', 9, 6)->nullable();
            $t->decimal('longitude', 9, 6)->nullable();
            $t->string('opening_hours', 191)->nullable();
            $t->boolean('is_sample')->default(false)->index();
        });
        Schema::table('users', fn (Blueprint $t) => $t->boolean('is_sample')->default(false)->index());
        Schema::table('patient_records', function (Blueprint $t) {
            $t->string('sex', 16)->nullable();
            $t->boolean('is_sample')->default(false)->index();
        });
        Schema::table('clinician_credentials', function (Blueprint $t) {
            $t->string('languages', 100)->nullable();
            $t->boolean('is_sample')->default(false)->index();
        });
        Schema::table('appointments', function (Blueprint $t) {
            $t->unsignedInteger('serial_number')->nullable();
            $t->foreignUlid('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('completed_at')->nullable();
            $t->boolean('is_sample')->default(false)->index();
        });
        Schema::create('appointment_status_history', function (Blueprint $t) {
            $t->ulid('id')->primary();
            $t->foreignUlid('appointment_id')->constrained()->cascadeOnDelete();
            $t->string('from_status', 24)->nullable();
            $t->string('to_status', 24);
            $t->foreignUlid('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $t->string('note', 500)->nullable();
            $t->timestamp('created_at')->useCurrent();
        });
        Schema::table('phone_challenges', fn (Blueprint $t) => $t->timestamp('verified_at')->nullable());
        Schema::create('push_subscriptions', function (Blueprint $t) {
            $t->ulid('id')->primary();
            $t->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            $t->string('endpoint', 600);
            $t->string('endpoint_hash', 64)->unique();
            $t->string('p256dh', 200);
            $t->string('auth', 100);
            $t->string('action_key_hash', 64)->index();   // lets the service worker log Taken/Snooze for this user only
            $t->timestamp('last_success_at')->nullable();
            $t->timestamps();
        });
        Schema::create('reminder_deliveries', function (Blueprint $t) {
            $t->ulid('id')->primary();
            $t->foreignUlid('dose_event_id')->constrained()->cascadeOnDelete();
            $t->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            $t->string('kind', 16);      // DUE, FOLLOW_UP
            $t->string('channel', 16);   // PUSH, SMS, IN_APP
            $t->string('status', 16)->default('QUEUED'); // QUEUED, SENT, FAILED, SKIPPED
            $t->unsignedTinyInteger('attempts')->default(0);
            $t->string('error', 300)->nullable();
            $t->timestamp('sent_at')->nullable();
            $t->timestamps();
            $t->unique(['dose_event_id', 'user_id', 'kind', 'channel'], 'reminder_once');
        });
        Schema::create('condition_specialties', function (Blueprint $t) {
            $t->id();
            $t->string('key', 40)->unique();
            $t->string('name_en', 100);
            $t->string('name_bn', 100);
            $t->json('synonyms');           // lowercase English/Bangla/transliterated terms
            $t->json('specialties');        // ordered: first = primary
            $t->string('note_en', 300)->nullable();
            $t->string('note_bn', 300)->nullable();
            $t->boolean('red_flag')->default(false);
            $t->timestamps();
        });
        if (! Schema::hasTable('jobs')) {
            Schema::create('jobs', function (Blueprint $t) {
                $t->bigIncrements('id');
                $t->string('queue')->index();
                $t->longText('payload');
                $t->unsignedTinyInteger('attempts');
                $t->unsignedInteger('reserved_at')->nullable();
                $t->unsignedInteger('available_at');
                $t->unsignedInteger('created_at');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('condition_specialties');
        Schema::dropIfExists('reminder_deliveries');
        Schema::dropIfExists('push_subscriptions');
        Schema::table('phone_challenges', fn (Blueprint $t) => $t->dropColumn('verified_at'));
        Schema::dropIfExists('appointment_status_history');
        Schema::table('appointments', function (Blueprint $t) { $t->dropConstrainedForeignId('assigned_by'); $t->dropColumn(['serial_number', 'completed_at', 'is_sample']); });
        Schema::table('clinician_credentials', fn (Blueprint $t) => $t->dropColumn(['languages', 'is_sample']));
        Schema::table('patient_records', fn (Blueprint $t) => $t->dropColumn(['sex', 'is_sample']));
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('is_sample'));
        Schema::table('organizations', fn (Blueprint $t) => $t->dropColumn(['area', 'latitude', 'longitude', 'opening_hours', 'is_sample']));
    }
};
