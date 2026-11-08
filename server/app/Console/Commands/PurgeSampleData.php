<?php

namespace App\Console\Commands;

use App\Support\SampleData;
use Illuminate\Console\Command;

class PurgeSampleData extends Command
{
    protected $signature = 'sample:purge {--force : Skip the confirmation prompt}';
    protected $description = 'Delete every is_sample record (sample doctors, hospitals, patients and their data) before real launch';

    public function handle(): int
    {
        if (! $this->option('force') && ! $this->confirm('Delete ALL sample (is_sample = true) doctors, organizations, patients and their records? This cannot be undone.')) {
            $this->info('Nothing deleted.');
            return self::SUCCESS;
        }
        foreach (SampleData::purge() as $table => $n) $this->line("$table: $n");
        $this->info('Sample data removed. Real records were not touched.');
        return self::SUCCESS;
    }
}
