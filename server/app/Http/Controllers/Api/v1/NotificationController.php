<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    public function preferences(Request $request)
    {
        abort_unless($request->user()->hasRole('PATIENT'), 403);
        return DB::table('notification_preferences')->where('user_id', $request->user()->id)->first()
            ?? ['in_app_dose_reminders' => false, 'in_app_followups' => false, 'timezone' => 'Asia/Dhaka'];
    }

    public function updatePreferences(Request $request)
    {
        abort_unless($request->user()->hasRole('PATIENT'), 403);
        $data = $request->validate([
            'in_app_dose_reminders' => 'required|boolean', 'in_app_followups' => 'required|boolean',
            'timezone' => 'required|timezone', 'quiet_from' => 'nullable|date_format:H:i', 'quiet_until' => 'nullable|date_format:H:i',
        ]);
        DB::table('notification_preferences')->updateOrInsert(['user_id' => $request->user()->id],
            $data + ['created_at' => now(), 'updated_at' => now()]);
        return response()->json(['saved' => true, 'note' => 'Notification settings never change your prescribed schedule.']);
    }

    public function index(Request $request)
    {
        return DB::table('care_notifications')->where('user_id', $request->user()->id)
            ->select('id', 'dose_event_id', 'kind', 'event_type', 'category', 'severity', 'resource_type', 'resource_id', 'deep_link', 'status', 'lifecycle_state', 'available_at', 'due_at', 'read_at', 'acknowledged_at', 'payload')->orderByDesc('available_at')->limit(100)->get();
    }

    public function readAll(Request $request)
    {
        $count = DB::table('care_notifications')->where('user_id', $request->user()->id)->whereNull('read_at')->update(['read_at' => now(), 'status' => 'READ', 'updated_at' => now()]);
        return response()->json(['updated' => $count]);
    }

    public function read(Request $request, string $id)
    {
        $updated = DB::table('care_notifications')->where('id', $id)->where('user_id', $request->user()->id)->whereNull('read_at')
            ->update(['read_at' => now(), 'status' => 'READ', 'updated_at' => now()]);
        abort_unless($updated || DB::table('care_notifications')->where('id', $id)->where('user_id', $request->user()->id)->exists(), 404);
        return response()->json(['ok' => true]);
    }

    public function acknowledge(Request $request, string $id)
    {
        $updated = DB::table('care_notifications')->where('id', $id)->where('user_id', $request->user()->id)->whereNull('acknowledged_at')
            ->update(['acknowledged_at' => now(), 'lifecycle_state' => 'ACKNOWLEDGED', 'updated_at' => now()]);
        abort_unless($updated || DB::table('care_notifications')->where('id', $id)->where('user_id', $request->user()->id)->exists(), 404);
        return response()->json(['ok' => true]);
    }
}
