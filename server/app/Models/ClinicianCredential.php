<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class ClinicianCredential extends Model
{
    use HasUlids;
    protected $fillable = ['user_id', 'bmdc_number', 'specialty', 'verification_status', 'verified_by', 'verified_at'];
    protected $casts = ['verified_at' => 'datetime'];
    public function user() { return $this->belongsTo(User::class); }
}
