<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->string('status', 24)->default('DRAFT')->after('type');
            $table->string('legal_name')->nullable()->after('name');
            $table->string('trading_name')->nullable()->after('legal_name');
            $table->text('address')->nullable()->after('trading_name');
            $table->string('contact_phone', 32)->nullable()->after('address');
            $table->string('contact_email')->nullable()->after('contact_phone');
            $table->string('responsible_owner_name')->nullable()->after('contact_email');
            $table->foreignUlid('reviewed_by')->nullable()->after('responsible_owner_name')->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable()->after('reviewed_by');
            $table->text('review_reason')->nullable()->after('reviewed_at');
            $table->index(['type', 'status']);
        });

        Schema::create('pharmacy_establishment_licenses', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('organization_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('license_number');
            $table->string('issuing_authority')->nullable();
            $table->date('issued_on')->nullable();
            $table->date('expires_on')->nullable();
            $table->string('document_path');
            $table->string('verification_status', 24)->default('PENDING');
            $table->foreignUlid('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_reason')->nullable();
            $table->timestamps();
        });

        Schema::create('responsible_pharmacist_registrations', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('organization_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('full_name');
            $table->string('registration_number');
            $table->string('registration_category', 16)->nullable();
            $table->string('issuing_authority')->nullable();
            $table->date('issued_on')->nullable();
            $table->date('expires_on')->nullable();
            $table->string('document_path');
            $table->string('verification_status', 24)->default('PENDING');
            $table->foreignUlid('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('responsible_pharmacist_registrations');
        Schema::dropIfExists('pharmacy_establishment_licenses');
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropForeign(['reviewed_by']);
            $table->dropIndex(['type', 'status']);
            $table->dropColumn(['status', 'legal_name', 'trading_name', 'address', 'contact_phone', 'contact_email', 'responsible_owner_name', 'reviewed_by', 'reviewed_at', 'review_reason']);
        });
    }
};
