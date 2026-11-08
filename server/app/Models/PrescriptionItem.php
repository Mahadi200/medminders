<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class PrescriptionItem extends Model
{
    use HasUlids;
    protected $fillable = ['prescription_id', 'generic_name', 'brand_name', 'strength', 'dosage_form', 'dose', 'route', 'schedule_type', 'schedule_details', 'duration_days', 'review_date', 'quantity', 'instructions', 'is_antibiotic', 'indication', 'aware_group', 'aware_source'];
    protected $casts = ['schedule_details' => 'array', 'is_antibiotic' => 'boolean'];
    public function prescription() { return $this->belongsTo(Prescription::class); }
}
