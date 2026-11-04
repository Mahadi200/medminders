<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class Brand extends Model
{
    use HasUlids;
    protected $table = 'medicine_brands';
    protected $fillable = ['generic_id', 'brand_name', 'strength', 'dosage_form', 'manufacturer'];
    public function generic() { return $this->belongsTo(Generic::class, 'generic_id'); }
}
