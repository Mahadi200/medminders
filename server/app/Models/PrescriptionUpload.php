<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class PrescriptionUpload extends Model
{
    use HasUlids;
    protected $fillable = ['user_id', 'prescription_id', 'file_type', 'file_path'];
    public function user() { return $this->belongsTo(User::class); }
    public function prescription() { return $this->belongsTo(Prescription::class); }
}
