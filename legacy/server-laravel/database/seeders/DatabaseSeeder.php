<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $cataloguePath = base_path('../client/web/src/data/antibiotics.json');
        if (! is_file($cataloguePath)) {
            return;
        }

        $records = json_decode(file_get_contents($cataloguePath), true) ?: [];
        foreach ($records as $record) {
            \App\Models\Antibiotic::updateOrCreate(
                ['generic_name' => $record['generic_name']],
                [
                    'group' => $record['group'] ?? null,
                    'brand_names' => $record['brand_names'] ?? [],
                    'side_effects' => $record['side_effects'] ?? null,
                    'aware_category' => 'UNCLASSIFIED',
                ],
            );
        }
    }
}
