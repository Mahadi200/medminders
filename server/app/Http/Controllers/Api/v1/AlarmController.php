<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Services\CareNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * In-app due-dose alarms for the signed-in patient. Works without the scheduler or any external provider.
 * Acknowledging or snoozing an alarm never changes a prescribed dose time or records a dose.
 */
class AlarmController extends Controller
{
    public const WINDOW_HOURS = 6;      // alarms stay visible for this long after the scheduled time
    public const MAX_SNOOZES = 3;       // limited follow-up

    public function due(Request $request, CareNotificationService $notifications)
    {
        $user = $request->user();
        abort_unless($user->hasRole('PATIENT'), 403);
        $recordIds = DB::table('patient_links')->where('user_id', $user->id)->pluck('patient_record_id');
        $events = DB::table('dose_events as e')->join('medication_courses as c', 'c.id', '=', 'e.medication_course_id')
            ->join('prescription_items as i', 'i.id', '=', 'c.prescription_item_id')->join('prescriptions as p', 'p.id', '=', 'i.prescription_id')
            ->leftJoin('dose_alarm_states as s', fn ($j) => $j->on('s.dose_event_id', '=', 'e.id')->where('s.user_id', '=', $user->id))
            ->whereIn('c.patient_record_id', $recordIds)->where('c.status', 'ACTIVE')->where('p.status', 'SIGNED')
            ->whereNull('p.superseded_at')->whereNull('p.cancelled_at')->where('e.status', 'SCHEDULED')
            ->where('e.scheduled_at', '<=', now()->addMinute())->where('e.scheduled_at', '>=', now()->subHours(self::WINDOW_HOURS))
            ->select('e.id as dose_event_id', 'e.scheduled_at', 'c.id as course_id', 'i.generic_name', 'i.strength', 'i.dose', 'i.route', 'i.instructions',
                's.acknowledged_at', 's.snoozed_until', 's.snooze_count')
            ->orderBy('e.scheduled_at')->get();
        $next = DB::table('dose_events as e')->join('medication_courses as c', 'c.id', '=', 'e.medication_course_id')
            ->join('prescription_items as i', 'i.id', '=', 'c.prescription_item_id')
            ->whereIn('c.patient_record_id', $recordIds)->where('c.status', 'ACTIVE')->where('e.status', 'SCHEDULED')->where('e.scheduled_at', '>', now()->addMinute())
            ->orderBy('e.scheduled_at')->select('e.id as dose_event_id', 'e.scheduled_at', 'i.generic_name', 'i.dose')->first();
        $ringing = [];
        foreach ($events as $event) {
            // Idempotent persistent record that this reminder was made available (dedupe key per dose event).
            $notifications->create($user->id, 'DOSE_REMINDER', 'REMINDER', 'NORMAL', 'DOSE_EVENT', $event->dose_event_id, '/patient-login#dashboard-courses',
                ['message' => 'A planned medication dose is due. Check your prescription instructions.'], 'DOSE_REMINDER:'.$event->dose_event_id, $event->scheduled_at, $event->dose_event_id);
            $event->ringing = ! $event->acknowledged_at && (! $event->snoozed_until || now()->greaterThanOrEqualTo($event->snoozed_until));
            $event->snoozes_left = self::MAX_SNOOZES - (int) $event->snooze_count;
            $ringing[] = $event;
        }
        return response()->json(['server_time' => now()->toIso8601String(), 'due' => $ringing, 'next' => $next,
            'note' => 'In-app alarm while MedMinders is open. Unanswered alarms are unconfirmed, not proof of a missed dose.']);
    }

    public function acknowledge(Request $request, string $eventId)
    {
        $this->authorizeEvent($request, $eventId);
        $this->state($request->user()->id, $eventId, ['acknowledged_at' => now()]);
        DB::table('care_notifications')->where('user_id', $request->user()->id)->where('dose_event_id', $eventId)->whereNull('acknowledged_at')
            ->update(['acknowledged_at' => now(), 'read_at' => DB::raw('COALESCE(read_at, NOW())'), 'updated_at' => now()]);
        AuditEvent::create(['actor_user_id' => $request->user()->id, 'action' => 'DOSE_ALARM_ACKNOWLEDGED', 'entity_type' => 'dose_event', 'entity_id' => $eventId]);
        return response()->json(['ok' => true, 'note' => 'Alarm acknowledged. The dose is still unconfirmed until you log it.']);
    }

    public function snooze(Request $request, string $eventId)
    {
        $data = $request->validate(['minutes' => 'required|integer|in:5,10,15,30']);
        $this->authorizeEvent($request, $eventId);
        $current = DB::table('dose_alarm_states')->where('dose_event_id', $eventId)->where('user_id', $request->user()->id)->first();
        abort_if(($current->snooze_count ?? 0) >= self::MAX_SNOOZES, 422, 'Snooze limit reached for this dose. Log what happened or acknowledge the alarm.');
        $this->state($request->user()->id, $eventId, ['snoozed_until' => now()->addMinutes($data['minutes']), 'snooze_count' => ($current->snooze_count ?? 0) + 1]);
        AuditEvent::create(['actor_user_id' => $request->user()->id, 'action' => 'DOSE_ALARM_SNOOZED', 'entity_type' => 'dose_event', 'entity_id' => $eventId, 'metadata' => ['minutes' => $data['minutes']]]);
        return response()->json(['ok' => true, 'snoozed_until' => now()->addMinutes($data['minutes'])->toIso8601String(), 'note' => 'Prescribed dose time unchanged.']);
    }

    private function authorizeEvent(Request $request, string $eventId): void
    {
        $event = DB::table('dose_events')->find($eventId);
        abort_unless($event, 404);
        $course = DB::table('medication_courses')->find($event->medication_course_id);
        abort_unless(SharingController::owns($request->user()->id, $course->patient_record_id), 404);
    }

    private function state(string $userId, string $eventId, array $values): void
    {
        $existing = DB::table('dose_alarm_states')->where('dose_event_id', $eventId)->where('user_id', $userId)->first();
        if ($existing) DB::table('dose_alarm_states')->where('id', $existing->id)->update($values + ['updated_at' => now()]);
        else DB::table('dose_alarm_states')->insert($values + ['id' => (string) Str::ulid(), 'dose_event_id' => $eventId, 'user_id' => $userId, 'created_at' => now(), 'updated_at' => now()]);
    }
}
