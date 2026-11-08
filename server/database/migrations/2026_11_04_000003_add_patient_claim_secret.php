<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('patient_records', fn (Blueprint $table) => $table->string('claim_secret_hash')->nullable());
    }
    public function down(): void
    {
        Schema::table('patient_records', fn (Blueprint $table) => $table->dropColumn('claim_secret_hash'));
    }
};
