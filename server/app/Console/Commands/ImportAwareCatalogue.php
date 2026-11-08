<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ImportAwareCatalogue extends Command
{
    protected $signature = 'catalogue:import-aware
        {file : CSV with generic_name,aware_group columns}
        {--version= : WHO classification version, for example 2025}
        {--source-url= : Exact WHO source URL}
        {--review-date= : ISO review date (YYYY-MM-DD)}';

    protected $description = 'Import a curator-reviewed WHO AWaRe mapping without guessing unmatched records';

    public function handle(): int
    {
        $path = $this->argument('file');
        if (! is_readable($path)) {
            $this->error("Mapping file is not readable: {$path}");
            return self::FAILURE;
        }
        $version = (string) $this->option('version');
        $source = (string) $this->option('source-url');
        $reviewed = (string) $this->option('review-date');
        if (! $version || ! filter_var($source, FILTER_VALIDATE_URL) || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $reviewed)) {
            $this->error('Provide --version, --source-url and --review-date.');
            return self::FAILURE;
        }

        $handle = fopen($path, 'rb');
        $header = fgetcsv($handle);
        $header = array_map(fn ($value) => strtolower(trim((string) $value)), $header ?: []);
        $nameIndex = array_search('generic_name', $header, true);
        $groupIndex = array_search('aware_group', $header, true);
        if ($nameIndex === false || $groupIndex === false) {
            $this->error('CSV must contain generic_name and aware_group columns.');
            fclose($handle);
            return self::FAILURE;
        }
        $allowed = ['ACCESS', 'WATCH', 'RESERVE', 'NOT_RECOMMENDED', 'UNKNOWN'];
        $unmapped = [];
        $updated = 0;
        while (($row = fgetcsv($handle)) !== false) {
            $name = trim((string) ($row[$nameIndex] ?? ''));
            $group = strtoupper(trim((string) ($row[$groupIndex] ?? 'UNKNOWN')));
            if ($name === '' || ! in_array($group, $allowed, true)) {
                $unmapped[] = ['generic_name' => $name, 'aware_group' => $group, 'reason' => 'invalid_row'];
                continue;
            }
            $generic = DB::table('medicine_generics')->whereRaw('LOWER(name) = ?', [Str::lower($name)])->first();
            if (! $generic) {
                $unmapped[] = ['generic_name' => $name, 'aware_group' => $group, 'reason' => 'no_local_match'];
                continue;
            }
            DB::table('medicine_generics')->where('id', $generic->id)->update([
                'aware_group' => $group,
                'aware_version' => $version,
                'aware_source_url' => $source,
                'aware_reviewed_on' => $reviewed,
                'aware_review_status' => 'REVIEWED',
                'updated_at' => now(),
            ]);
            $updated++;
        }
        fclose($handle);
        $report = storage_path('app/aware-unmapped-'.$reviewed.'-'.Str::slug($version).'.json');
        file_put_contents($report, json_encode([
            'version' => $version, 'source_url' => $source, 'reviewed_on' => $reviewed,
            'updated_records' => $updated, 'unmapped' => $unmapped,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        $this->info("Updated {$updated} records. Unmapped report: {$report}");
        return self::SUCCESS;
    }
}
