<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class Prescription extends Model
{
    use HasUlids;
    protected $fillable = ['patient_id', 'patient_record_id', 'doctor_id', 'diagnosis', 'instructions', 'status', 'template', 'clinical_details', 'patient_snapshot', 'doctor_snapshot', 'supersedes_id', 'amendment_reason', 'issued_at', 'superseded_at', 'cancelled_at'];
    protected $casts = ['instructions' => 'array', 'clinical_details' => 'array', 'patient_snapshot' => 'array', 'doctor_snapshot' => 'array', 'issued_at' => 'datetime', 'superseded_at' => 'datetime', 'cancelled_at' => 'datetime'];
    public function patient() { return $this->belongsTo(User::class, 'patient_id'); }
    public function doctor() { return $this->belongsTo(User::class, 'doctor_id'); }
    public function uploads() { return $this->hasMany(PrescriptionUpload::class); }
    public function items() { return $this->hasMany(PrescriptionItem::class); }
}
