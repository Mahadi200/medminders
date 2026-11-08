<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Services\WebPushService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PushController extends Controller
{
    public function publicKey()
    {
        return response()->json(['configured' => WebPushService::configured(), 'public_key' => config('services.webpush.public_key')]);
    }

    public function subscribe(Request $request)
    {
        abort_unless($request->user()->hasRole('PATIENT'), 403);
        abort_unless(WebPushService::configured(), 503, 'Push reminders are not configured on this server yet.');
        $data = $request->validate(['endpoint' => 'required|url|max:600|starts_with:https://', 'keys.p256dh' => 'required|string|max:200', 'keys.auth' => 'required|string|max:100']);
        $actionKey = WebPushService::b64u(random_bytes(32));
        $hash = hash('sha256', $data['endpoint']);
        DB::table('push_subscriptions')->where('endpoint_hash', $hash)->delete();
        DB::table('push_subscriptions')->insert(['id' => (string) Str::ulid(), 'user_id' => $request->user()->id, 'endpoint' => $data['endpoint'], 'endpoint_hash' => $hash,
            'p256dh' => $data['keys']['p256dh'], 'auth' => $data['keys']['auth'], 'action_key_hash' => hash('sha256', $actionKey), 'created_at' => now(), 'updated_at' => now()]);
        AuditEvent::create(['actor_user_id' => $request->user()->id, 'action' => 'PUSH_SUBSCRIBED', 'entity_type' => 'push_subscription', 'entity_id' => $hash]);
        // The action key lets this device's service worker record Taken/Snooze for this patient only.
        return response()->json(['subscribed' => true, 'action_key' => $actionKey], 201);
    }

    public function unsubscribe(Request $request)
    {
        $data = $request->validate(['endpoint' => 'required|string|max:600']);
        DB::table('push_subscriptions')->where('user_id', $request->user()->id)->where('endpoint_hash', hash('sha256', $data['endpoint']))->delete();
        return response()->json(['subscribed' => false]);
    }

    public function status(Request $request)
    {
        return response()->json(['configured' => WebPushService::configured(), 'devices' => DB::table('push_subscriptions')->where('user_id', $request->user()->id)->count(),
            'recent' => DB::table('reminder_deliveries')->where('user_id', $request->user()->id)->orderByDesc('created_at')->limit(10)->get(['kind', 'channel', 'status', 'error', 'sent_at', 'created_at'])]);
    }

    public function test(Request $request, WebPushService $push)
    {
        $subs = DB::table('push_subscriptions')->where('user_id', $request->user()->id)->get();
        abort_if($subs->isEmpty(), 422, 'Turn on phone notifications on this device first.');
        $ok = 0;
        foreach ($subs as $sub) {
            $status = $push->send($sub, ['title' => 'MedMinders test reminder', 'body' => 'Notifications work on this device. Nothing was recorded.', 'test' => true, 'url' => '/patient-login#dashboard-alarm'], 60);
            if (in_array($status, [404, 410], true)) DB::table('push_subscriptions')->where('id', $sub->id)->delete();
            if ($status >= 200 && $status < 300) $ok++;
        }
        return response()->json(['sent' => $ok, 'devices' => $subs->count()]);
    }

    /** Called by the service worker from a notification button. Authorised by the device's action key, not a session. */
    public function action(Request $request)
    {
        $data = $request->validate(['key' => 'required|string|max:100', 'dose_event_id' => 'required|ulid', 'action' => 'required|in:TAKEN,SNOOZE']);
        $sub = DB::table('push_subscriptions')->where('action_key_hash', hash('sha256', $data['key']))->first();
        abort_unless($sub, 403);
        $event = DB::table('dose_events')->find($data['dose_event_id']);
        abort_unless($event, 404);
        $course = DB::table('medication_courses')->find($event->medication_course_id);
        abort_unless($course && SharingController::owns($sub->user_id, $course->patient_record_id), 404);
        abort_unless($course->status === 'ACTIVE' && in_array($event->status, ['SCHEDULED', 'MISSED'], true), 422, 'This dose can no longer be updated from a notification.');
        if ($data['action'] === 'SNOOZE') {
            DB::table('dose_alarm_states')->updateOrInsert(['dose_event_id' => $event->id, 'user_id' => $sub->user_id],
                ['id' => DB::table('dose_alarm_states')->where('dose_event_id', $event->id)->where('user_id', $sub->user_id)->value('id') ?? (string) Str::ulid(),
                 'snoozed_until' => now()->addMinutes(10), 'updated_at' => now(), 'created_at' => now()]);
            DB::table('dose_alarm_states')->where('dose_event_id', $event->id)->where('user_id', $sub->user_id)->increment('snooze_count');
            return response()->json(['ok' => true, 'snoozed_until' => now()->addMinutes(10)->toIso8601String()]);
        }
        DB::transaction(function () use ($event, $sub) {
            $previous = DB::table('dose_logs')->where('dose_event_id', $event->id)->latest()->first();
            DB::table('dose_logs')->insert(['id' => (string) Str::ulid(), 'dose_event_id' => $event->id, 'actor_id' => $sub->user_id, 'status' => 'TAKEN',
                'actual_at' => now(), 'reason' => 'Recorded from notification', 'corrects_id' => $previous?->id, 'created_at' => now(), 'updated_at' => now()]);
            DB::table('dose_events')->where('id', $event->id)->update(['status' => 'TAKEN', 'updated_at' => now()]);
            AuditEvent::create(['actor_user_id' => $sub->user_id, 'action' => 'DOSE_LOGGED_FROM_PUSH', 'entity_type' => 'dose_event', 'entity_id' => $event->id]);
        });
        return response()->json(['ok' => true, 'status' => 'TAKEN']);
    }
}
