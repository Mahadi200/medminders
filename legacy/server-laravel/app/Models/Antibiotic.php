<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Antibiotic extends Model
{
    use HasFactory;

    protected $fillable = [
        'generic_name', 'group', 'aware_category', 'brand_names', 'dose_duration', 'side_effects',
    ];

    protected $casts = [
        'brand_names' => 'array',
    ];
}
