<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class Generic extends Model
{
    use HasUlids;
    protected $table = 'medicine_generics';
    protected $fillable = ['name', 'therapeutic_class', 'aware_group', 'aware_version', 'aware_source_url', 'aware_reviewed_on', 'aware_review_status', 'indications', 'safety_warnings', 'reference_dosing_guidance'];
    protected $casts = ['aware_reviewed_on' => 'date'];
    public function brands() { return $this->hasMany(Brand::class, 'generic_id'); }
}
