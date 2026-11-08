<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CareNotificationService
{
    public function create(string $userId, string $eventType, string $category, string $severity = 'NORMAL', ?string $resourceType = null, ?string $resourceId = null, ?string $deepLink = null, array $payload = [], ?string $eventKey = null, ?string $dueAt = null, ?string $doseEventId = null): ?string
    {
        $key = $eventKey ?: implode(':', array_filter([$eventType, $resourceType, $resourceId]));
        $existing = DB::table('care_notifications')->where('user_id', $userId)->where('event_key', $key)->first();
        if ($existing) return $existing->id;
        $id = (string) Str::ulid();
        DB::table('care_notifications')->insert([
            'id' => $id, 'user_id' => $userId, 'dose_event_id' => $doseEventId, 'kind' => substr($eventType, 0, 24), // legacy 24-char column; event_type holds the full name
            'event_type' => $eventType, 'event_key' => $key, 'category' => $category, 'severity' => $severity,
            'resource_type' => $resourceType, 'resource_id' => $resourceId, 'deep_link' => $deepLink,
            'status' => 'AVAILABLE', 'lifecycle_state' => 'ACTIVE', 'available_at' => now(),
            'due_at' => $dueAt, 'payload' => $payload ? json_encode($payload) : null,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return $id;
    }
}
