<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('notification_preferences', function (Blueprint $table) {
            $table->foreignUlid('user_id')->primary()->constrained('users')->cascadeOnDelete();
            $table->boolean('in_app_dose_reminders')->default(false);
            $table->boolean('in_app_followups')->default(false);
            $table->string('timezone', 64)->default('Asia/Dhaka');
            $table->time('quiet_from')->nullable();
            $table->time('quiet_until')->nullable();
            $table->timestamps();
        });
        Schema::create('care_notifications', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('dose_event_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 24);
            $table->string('status', 24)->default('AVAILABLE');
            $table->timestamp('available_at');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'dose_event_id', 'kind'], 'notification_once_per_event');
            $table->index(['user_id', 'read_at', 'available_at']);
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('care_notifications');
        Schema::dropIfExists('notification_preferences');
    }
};
