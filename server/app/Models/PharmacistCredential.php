<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class PharmacistCredential extends Model
{
    use HasUlids;
    protected $fillable = ['user_id', 'license_number', 'pharmacy_reg', 'verification_status', 'verified_at'];
    protected $casts = ['verified_at' => 'datetime'];
    public function user() { return $this->belongsTo(User::class); }
}
