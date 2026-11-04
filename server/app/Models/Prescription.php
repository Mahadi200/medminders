<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class Prescription extends Model
{
    use HasUlids;
    protected $fillable = ['patient_id', 'doctor_id', 'diagnosis', 'instructions', 'status'];
    protected $casts = ['instructions' => 'array'];
    public function patient() { return $this->belongsTo(User::class, 'patient_id'); }
    public function doctor() { return $this->belongsTo(User::class, 'doctor_id'); }
    public function uploads() { return $this->hasMany(PrescriptionUpload::class); }
}
