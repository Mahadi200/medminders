<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    use HasUlids;
    protected $table = 'user_roles';
    protected $fillable = ['user_id', 'role', 'is_verified'];
    protected $casts = ['is_verified' => 'boolean'];
    public function user() { return $this->belongsTo(User::class); }
}
