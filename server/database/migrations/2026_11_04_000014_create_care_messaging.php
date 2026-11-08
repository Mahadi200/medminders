<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('care_conversations', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('patient_record_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('patient_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignUlid('doctor_user_id')->constrained('users')->restrictOnDelete();
            $table->string('status', 24)->default('OPEN');
            $table->foreignUlid('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->unique(['patient_record_id', 'patient_user_id', 'doctor_user_id'], 'care_conversation_participants');
        });
        Schema::create('care_messages', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('conversation_id')->constrained('care_conversations')->cascadeOnDelete();
            $table->foreignUlid('sender_id')->constrained('users')->restrictOnDelete();
            $table->text('body');
            $table->string('attachment_path')->nullable();
            $table->string('client_key', 191)->nullable();
            $table->timestamp('sent_at');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->unique(['conversation_id', 'client_key'], 'message_idempotency');
            $table->index(['conversation_id', 'sent_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('care_messages');
        Schema::dropIfExists('care_conversations');
    }
};
