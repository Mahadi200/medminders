<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;

/** `php artisan db:seed --class=SampleDataSeeder` — same as `php artisan demo:seed-fictional` (idempotent, additive, is_sample rows). */
class SampleDataSeeder extends Seeder
{
    public function run(): void
    {
        Artisan::call('demo:seed-fictional', [], $this->command?->getOutput());
    }
}
