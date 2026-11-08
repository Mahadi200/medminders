<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class ClinicianCredential extends Model
{
    use HasUlids;
    protected $fillable = ['user_id', 'bmdc_number', 'hospital_clinic', 'specialty', 'qualifications', 'experience_years', 'biography', 'chamber', 'fee_bdt', 'schedule', 'appointment_contact', 'photo_path', 'is_published', 'verification_status', 'verified_by', 'verified_at'];
    protected $casts = ['verified_at' => 'datetime', 'schedule' => 'array', 'is_published' => 'boolean'];
    public function user() { return $this->belongsTo(User::class); }
}
