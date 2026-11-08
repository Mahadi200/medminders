<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Older MySQL/MariaDB gives the first NOT NULL TIMESTAMP an implicit ON UPDATE.
        // These values are clinical or authorization timestamps and must never drift.
        foreach ([
            ['appointments', 'scheduled_at'], ['care_notifications', 'available_at'],
            ['dispensings', 'supplied_at'], ['dose_events', 'scheduled_at'],
            ['patient_links', 'verified_at'], ['phone_challenges', 'expires_at'],
            ['sharing_grants', 'expires_at'], ['sharing_requests', 'expires_at'],
        ] as [$table, $column]) {
            DB::statement("ALTER TABLE `{$table}` MODIFY `{$column}` DATETIME NOT NULL");
        }
    }
    public function down(): void
    {
        // Do not restore the database-specific implicit ON UPDATE behavior.
    }
};
