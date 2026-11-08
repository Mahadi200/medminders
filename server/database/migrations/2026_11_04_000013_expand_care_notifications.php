<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('care_notifications', function (Blueprint $table) {
            $table->foreignUlid('dose_event_id')->nullable()->change();
            $table->string('event_type', 48)->default('DOSE_REMINDER')->after('kind');
            $table->string('event_key', 191)->nullable()->after('event_type');
            $table->string('category', 24)->default('INFORMATION')->after('event_key');
            $table->string('severity', 16)->default('NORMAL')->after('category');
            $table->string('resource_type', 48)->nullable()->after('severity');
            $table->string('resource_id', 64)->nullable()->after('resource_type');
            $table->string('deep_link', 255)->nullable()->after('resource_id');
            $table->timestamp('due_at')->nullable()->after('available_at');
            $table->timestamp('acknowledged_at')->nullable()->after('read_at');
            $table->string('lifecycle_state', 24)->default('ACTIVE')->after('status');
            $table->json('payload')->nullable()->after('lifecycle_state');
            $table->index(['user_id', 'event_type', 'lifecycle_state']);
            $table->index(['resource_type', 'resource_id']);
        });
    }

    public function down(): void
    {
        Schema::table('care_notifications', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'event_type', 'lifecycle_state']);
            $table->dropIndex(['resource_type', 'resource_id']);
            $table->dropColumn(['event_type', 'event_key', 'category', 'severity', 'resource_type', 'resource_id', 'deep_link', 'due_at', 'acknowledged_at', 'lifecycle_state', 'payload']);
            $table->foreignUlid('dose_event_id')->nullable(false)->change();
        });
    }
};
