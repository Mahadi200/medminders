<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class AuditEvent extends Model
{
    use HasUlids;
    public $timestamps = false;
    protected $fillable = ['actor_user_id', 'target_user_id', 'action', 'entity_type', 'entity_id', 'ip_address', 'user_agent', 'metadata', 'created_at'];
    protected $casts = ['metadata' => 'array', 'created_at' => 'datetime'];

    protected static function booted(): void
    {
        static::updating(fn () => throw new \LogicException('Audit events are immutable.'));
        static::deleting(fn () => throw new \LogicException('Audit events are immutable.'));
    }
}
