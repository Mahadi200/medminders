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
        $cataloguePath = public_path('antibiotics.json');
        if (! is_file($cataloguePath)) {
            return;
        }

        $records = json_decode(file_get_contents($cataloguePath), true) ?: [];
        foreach ($records as $record) {
            $generic = \App\Models\Generic::updateOrCreate(
                ['name' => $record['generic_name']],
                [
                    'therapeutic_class' => $record['group'] ?? null,
                    'safety_warnings' => $record['side_effects'] ?? null,
                    'aware_group' => 'UNKNOWN',
                ],
            );
            foreach ($record['brand_names'] ?? [] as $brandName) {
                \App\Models\Brand::firstOrCreate(['generic_id' => $generic->id, 'brand_name' => $brandName]);
            }
        }
    }
}
