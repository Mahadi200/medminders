<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Additive: what a patient-level grant covers (PROFILE, PRESCRIPTIONS, REPORTS, HISTORY) and who created it.
return new class extends Migration {
    public function up(): void
    {
        Schema::table('sharing_grants', function (Blueprint $t) {
            $t->json('scopes')->nullable();
            $t->string('created_via', 24)->nullable(); // PATIENT, PATIENT_APPROVAL, ASSIGNMENT
            $t->foreignUlid('appointment_id')->nullable()->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('sharing_grants', function (Blueprint $t) { $t->dropConstrainedForeignId('appointment_id'); $t->dropColumn(['scopes', 'created_via']); });
    }
};
