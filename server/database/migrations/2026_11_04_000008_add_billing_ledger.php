<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('invoice_transactions', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('service_invoice_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('actor_id')->constrained('users')->restrictOnDelete();
            $table->string('type', 20);
            $table->integer('amount_paisa');
            $table->string('receipt_number')->nullable()->unique();
            $table->text('reason')->nullable();
            $table->timestamps();
            $table->index(['service_invoice_id', 'created_at']);
        });
    }
    public function down(): void { Schema::dropIfExists('invoice_transactions'); }
};
