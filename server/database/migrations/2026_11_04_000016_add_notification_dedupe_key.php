<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('care_notifications', function (Blueprint $table) {
            $table->unique(['user_id', 'event_key'], 'care_notifications_user_event_key');
        });
    }

    public function down(): void
    {
        Schema::table('care_notifications', function (Blueprint $table) {
            $table->dropUnique('care_notifications_user_event_key');
        });
    }
};
