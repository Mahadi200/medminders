<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('medicine_generics', function (Blueprint $table) {
            $table->string('aware_version', 64)->nullable()->after('aware_group');
            $table->string('aware_source_url', 500)->nullable()->after('aware_version');
            $table->date('aware_reviewed_on')->nullable()->after('aware_source_url');
            $table->string('aware_review_status', 24)->default('UNKNOWN')->after('aware_reviewed_on');
        });
    }

    public function down(): void
    {
        Schema::table('medicine_generics', function (Blueprint $table) {
            $table->dropColumn(['aware_version', 'aware_source_url', 'aware_reviewed_on', 'aware_review_status']);
        });
    }
};
