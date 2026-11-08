<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('personal_access_tokens', fn (Blueprint $table) => $table->string('tokenable_id', 26)->change());
    }
    public function down(): void
    {
        // Existing ULID tokens cannot be represented by the former integer column.
    }
};
