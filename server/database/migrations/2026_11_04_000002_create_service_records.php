<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('dispensings', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('prescription_item_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('organization_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('staff_id')->constrained('users')->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->string('product');
            $table->string('batch')->nullable();
            $table->date('expires_on')->nullable();
            $table->text('counselling')->nullable();
            $table->text('supply_problem')->nullable();
            $table->timestamp('supplied_at');
            $table->string('idempotency_key', 100)->unique();
            $table->timestamps();
            $table->index(['prescription_item_id', 'supplied_at']);
        });
        Schema::create('test_orders', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('prescription_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('patient_record_id')->constrained()->restrictOnDelete();
            $table->string('test_name');
            $table->string('status', 24)->default('ORDERED');
            $table->foreignUlid('performing_organization_id')->nullable()->constrained('organizations')->restrictOnDelete();
            $table->timestamps();
        });
        Schema::create('service_invoices', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('patient_record_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('organization_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('test_order_id')->unique()->constrained()->restrictOnDelete();
            $table->unsignedInteger('price_paisa');
            $table->unsignedInteger('discount_paisa')->default(0);
            $table->unsignedInteger('paid_paisa')->default(0);
            $table->foreignUlid('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });
        Schema::create('lab_reports', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('test_order_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('patient_record_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('organization_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('author_id')->constrained('users')->restrictOnDelete();
            $table->foreignUlid('reviewer_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignUlid('supersedes_id')->nullable()->constrained('lab_reports')->restrictOnDelete();
            $table->string('status', 24)->default('DRAFT');
            $table->text('observations')->nullable();
            $table->string('file_path')->nullable();
            $table->text('amendment_reason')->nullable();
            $table->timestamp('released_at')->nullable();
            $table->timestamps();
            $table->index(['test_order_id', 'status']);
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('lab_reports');
        Schema::dropIfExists('service_invoices');
        Schema::dropIfExists('test_orders');
        Schema::dropIfExists('dispensings');
    }
};
