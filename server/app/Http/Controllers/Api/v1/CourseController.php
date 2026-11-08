<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CourseController extends Controller
{
    public function index(Request $request)
    {
        $ids = DB::table('patient_links')->where('user_id', $request->user()->id)->pluck('patient_record_id');
        abort_unless($request->user()->hasRole('PATIENT'), 403);
        return DB::table('medication_courses as c')->join('prescription_items as i', 'i.id', '=', 'c.prescription_item_id')
            ->join('prescriptions as p', 'p.id', '=', 'i.prescription_id')->whereIn('c.patient_record_id', $ids)
            ->select('c.*', 'i.generic_name', 'i.dose', 'i.route', 'i.dosage_form', 'i.schedule_type', 'i.schedule_details', 'i.duration_days', 'i.instructions', 'p.doctor_snapshot')->get();
    }

    public function show(Request $request, string $id)
    {
        $course = DB::table('medication_courses as c')->join('prescription_items as i', 'i.id', '=', 'c.prescription_item_id')
            ->join('prescriptions as p', 'p.id', '=', 'i.prescription_id')->where('c.id', $id)
            ->select('c.*', 'i.generic_name', 'i.dose', 'i.route', 'i.dosage_form', 'i.schedule_type', 'i.schedule_details', 'i.duration_days', 'i.instructions', 'p.doctor_id', 'p.status as prescription_status')->first();
        abort_unless($course, 404);
        $user = $request->user();
        abort_unless(SharingController::owns($user->id, $course->patient_record_id)
            || SharingController::granted($user->id, $course->patient_record_id, 'COURSE', $id, 'VIEW')
            || ($course->doctor_id === $user->id && CareTeamController::doctorCanAccess($user->id, $course->patient_record_id)), 404);
        $dispensed = (int) DB::table('dispensings')->where('prescription_item_id', $course->prescription_item_id)->sum('quantity');
        $taken = (int) DB::table('dose_logs')->join('dose_events', 'dose_events.id', '=', 'dose_logs.dose_event_id')
            ->where('dose_events.medication_course_id', $id)->whereIn('dose_logs.status', ['TAKEN', 'TAKEN_LATE'])->count();
        return response()->json(['course' => $course,
            'events' => DB::table('dose_events')->where('medication_course_id', $id)->orderBy('scheduled_at')->get(),
            'logs' => DB::table('dose_logs')->join('dose_events', 'dose_events.id', '=', 'dose_logs.dose_event_id')
                ->where('dose_events.medication_course_id', $id)->select('dose_logs.*')->orderBy('dose_logs.created_at')->get(),
            'supply' => ['dispensed_quantity' => $dispensed, 'estimated_remaining_doses' => max(0, $dispensed - $taken), 'unit' => $course->dosage_form,
                'label' => 'Estimated supply = dispensed quantity minus doses reported taken. Assumes one unit per dose; check your label.'],
            'summary' => self::summary($id),
            'progress_label' => 'Patient-reported; consumption is not independently verified.',
        ]);
    }

    /** Explainable, self-reported course summary. Unlogged past doses are 'unconfirmed', never 'missed'. */
    public static function summary(string $courseId): array
    {
        $course = DB::table('medication_courses')->find($courseId);
        $item = DB::table('prescription_items')->find($course->prescription_item_id);
        $events = DB::table('dose_events')->where('medication_course_id', $courseId)->get();
        $active = $events->where('status', '!=', 'CANCELLED');
        $past = $active->filter(fn ($e) => CarbonImmutable::parse($e->scheduled_at, 'UTC')->lessThanOrEqualTo(now()));
        $count = fn (string $status) => $active->where('status', $status)->count();
        $start = $course->actual_start_at ? CarbonImmutable::parse($course->actual_start_at, 'UTC') : null;
        $dispensed = (int) DB::table('dispensings')->where('prescription_item_id', $course->prescription_item_id)->sum('quantity');
        $taken = $count('TAKEN') + $count('TAKEN_LATE');
        $remaining = $active->filter(fn ($e) => $e->status === 'SCHEDULED' && CarbonImmutable::parse($e->scheduled_at, 'UTC')->greaterThan(now()))->count();
        $estimated = max(0, $dispensed - $taken);
        $closed = ! in_array($course->status, ['ACTIVE', 'AWAITING_START'], true) || in_array($course->completion_status, ['PATIENT_REPORTED_COMPLETE', 'PATIENT_REPORTED_EARLY_STOP'], true);
        return [
            'prescribed_days' => $item->duration_days, 'days_elapsed' => $start ? min((int) $item->duration_days, (int) floor($start->diffInHours(now()) / 24)) : 0,
            'scheduled_total' => $active->count(), 'due_so_far' => $past->count(),
            'reported_taken' => $count('TAKEN'), 'reported_taken_late' => $count('TAKEN_LATE'), 'reported_skipped' => $count('SKIPPED'),
            'reported_not_sure' => $count('NOT_SURE'), 'unconfirmed' => $past->where('status', 'SCHEDULED')->count(), 'remaining_scheduled' => $remaining,
            'cancelled_by_change' => $events->where('status', 'CANCELLED')->count(),
            'prescribed_quantity' => $item->quantity, 'dispensed_quantity' => $dispensed, 'estimated_supply_units' => $estimated,
            'supply_shortfall' => ! $closed && $course->status === 'ACTIVE' && $estimated < $remaining,
            'denominator_note' => 'Percentages use doses due so far as the denominator. Unconfirmed doses have no patient report; they are not counted as missed.',
            'reported_adherence_pct' => $past->count() ? round(100 * $taken / $past->count()) : null,
        ];
    }

    public function start(Request $request, string $id)
    {
        $data = $request->validate(['actual_start_at' => 'required|date', 'timezone' => 'required|timezone']);
        return DB::transaction(function () use ($request, $id, $data) {
            $course = DB::table('medication_courses')->where('id', $id)->lockForUpdate()->first();
            abort_unless($course && SharingController::owns($request->user()->id, $course->patient_record_id), 404);
            abort_unless($course->status === 'AWAITING_START', 422);
            $item = DB::table('prescription_items')->find($course->prescription_item_id);
            $prescription = DB::table('prescriptions')->find($item->prescription_id);
            abort_unless($prescription->status === 'SIGNED' && ! $prescription->superseded_at && ! $prescription->cancelled_at, 422);
            if (! $item->duration_days) throw ValidationException::withMessages(['duration_days' => 'A fixed duration is required for automatic scheduling. Ask the prescriber for a review plan.']);
            $details = json_decode($item->schedule_details, true);
            $start = CarbonImmutable::parse($data['actual_start_at'])->utc();
            if ($start->isFuture() || $start->lessThan(now()->subDays(30))) throw ValidationException::withMessages(['actual_start_at' => 'Confirm a recent first-dose time.']);
            $end = $start->addDays($item->duration_days);
            $scheduled = [];
            if ($item->schedule_type === 'EVERY_N_HOURS') {
                $hours = $details['hours'] ?? null;
                if (! is_int($hours) || $hours < 1 || $hours > 24) throw ValidationException::withMessages(['schedule' => 'The schedule needs prescriber clarification.']);
                for ($at = $start; $at->lessThan($end); $at = $at->addHours($hours)) $scheduled[] = $at;
            } elseif ($item->schedule_type === 'EXPLICIT_TIMES') {
                $times = $details['times'] ?? [];
                if (! $times) throw ValidationException::withMessages(['schedule' => 'The schedule needs prescriber clarification.']);
                $localStart = $start->setTimezone($data['timezone']);
                for ($day = 0; $day <= $item->duration_days; $day++) {
                    $date = $localStart->startOfDay()->addDays($day)->format('Y-m-d');
                    foreach ($times as $time) {
                        $at = CarbonImmutable::parse($date.' '.$time, $data['timezone'])->utc();
                        if ($at->greaterThanOrEqualTo($start) && $at->lessThan($end)) $scheduled[] = $at;
                    }
                }
            } else throw ValidationException::withMessages(['schedule' => 'The schedule needs prescriber clarification.']);
            if (count($scheduled) > 1095) throw ValidationException::withMessages(['schedule' => 'Schedule is too long.']);
            DB::table('medication_courses')->where('id', $id)->update(['actual_start_at' => $start, 'planned_end_at' => $end, 'timezone' => $data['timezone'], 'status' => 'ACTIVE', 'updated_at' => now()]);
            foreach ($scheduled as $at) DB::table('dose_events')->insertOrIgnore(['id' => (string) Str::ulid(), 'medication_course_id' => $id, 'scheduled_at' => $at, 'status' => 'SCHEDULED', 'created_at' => now(), 'updated_at' => now()]);
            AuditEvent::create(['actor_user_id' => $request->user()->id, 'action' => 'COURSE_START_CONFIRMED', 'entity_type' => 'medication_course', 'entity_id' => $id]);
            return response()->json(['status' => 'ACTIVE', 'scheduled_count' => count($scheduled)]);
        });
    }

    public function log(Request $request, string $eventId)
    {
        $data = $request->validate(['status' => 'required|in:TAKEN,TAKEN_LATE,SKIPPED,NOT_SURE,PROBLEM', 'actual_at' => 'nullable|date', 'reason' => 'nullable|string|max:500']);
        return DB::transaction(function () use ($request, $eventId, $data) {
            $event = DB::table('dose_events')->where('id', $eventId)->lockForUpdate()->first();
            abort_unless($event, 404);
            $course = DB::table('medication_courses')->find($event->medication_course_id);
            abort_unless(SharingController::owns($request->user()->id, $course->patient_record_id), 404);
            abort_unless($course->status === 'ACTIVE' && $event->status !== 'CANCELLED', 422);
            if (in_array($data['status'], ['TAKEN', 'TAKEN_LATE']) && empty($data['actual_at'])) throw ValidationException::withMessages(['actual_at' => 'Enter the actual dose time.']);
            $previous = DB::table('dose_logs')->where('dose_event_id', $eventId)->latest()->first();
            if ($previous && $previous->status === $data['status'] && ($previous->actual_at ?? null) === (isset($data['actual_at']) ? CarbonImmutable::parse($data['actual_at'])->utc()->toDateTimeString() : null)) {
                return response()->json(['id' => $previous->id, 'self_reported' => true, 'duplicate' => true]);
            }
            $id = (string) Str::ulid();
            DB::table('dose_logs')->insert(['id' => $id, 'dose_event_id' => $eventId, 'actor_id' => $request->user()->id,
                'status' => $data['status'], 'actual_at' => isset($data['actual_at']) ? CarbonImmutable::parse($data['actual_at'])->utc()->toDateTimeString() : null, 'reason' => $data['reason'] ?? null,
                'corrects_id' => $previous?->id, 'created_at' => now(), 'updated_at' => now()]);
            DB::table('dose_events')->where('id', $eventId)->update(['status' => $data['status'], 'updated_at' => now()]);
            if ($data['status'] === 'PROBLEM') DB::table('medication_support_alerts')->insert([
                'id' => (string) Str::ulid(), 'medication_course_id' => $course->id, 'dose_event_id' => $eventId,
                'patient_record_id' => $course->patient_record_id, 'created_by' => $request->user()->id,
                'reason' => 'UNSPECIFIED', 'patient_note' => $data['reason'] ?? null, 'status' => 'OPEN',
                'created_at' => now(), 'updated_at' => now(),
            ]);
            AuditEvent::create(['actor_user_id' => $request->user()->id, 'action' => $previous ? 'DOSE_LOG_CORRECTED' : 'DOSE_LOGGED', 'entity_type' => 'dose_event', 'entity_id' => $eventId]);
            return response()->json(['id' => $id, 'self_reported' => true], 201);
        });
    }

    public function reportStatus(Request $request, string $id)
    {
        $data = $request->validate(['completion_status' => 'required|in:PATIENT_REPORTED_COMPLETE,PATIENT_REPORTED_EARLY_STOP,INTERRUPTED,UNKNOWN']);
        $course = DB::table('medication_courses')->find($id);
        abort_unless($course && SharingController::owns($request->user()->id, $course->patient_record_id), 404);
        abort_unless(! in_array($course->status, ['STOPPED_BY_CLINICIAN', 'CHANGED_BY_CLINICIAN']), 422);
        DB::table('medication_courses')->where('id', $id)->update(['completion_status' => $data['completion_status'],
            'completion_reported_at' => now(), 'updated_at' => now()]);
        AuditEvent::create(['actor_user_id' => $request->user()->id, 'action' => 'COURSE_STATUS_REPORTED', 'entity_type' => 'medication_course', 'entity_id' => $id,
            'metadata' => ['completion_status' => $data['completion_status']]]);
        return response()->json(['completion_status' => $data['completion_status'], 'self_reported' => true]);
    }

    public function support(Request $request, string $id)
    {
        $data = $request->validate(['reason' => 'required|in:FORGOT,COULD_NOT_OBTAIN,COST,DIFFICULTY_TAKING,SIDE_EFFECT,SEVERE_ALLERGY,DOCTOR_CHANGED,OTHER',
            'note' => 'nullable|string|max:2000']);
        $course = DB::table('medication_courses')->find($id);
        abort_unless($course && SharingController::owns($request->user()->id, $course->patient_record_id), 404);
        $alertId = (string) Str::ulid();
        DB::table('medication_support_alerts')->insert(['id' => $alertId, 'medication_course_id' => $id,
            'patient_record_id' => $course->patient_record_id, 'created_by' => $request->user()->id,
            'reason' => $data['reason'], 'patient_note' => $data['note'] ?? null, 'status' => 'OPEN',
            'created_at' => now(), 'updated_at' => now()]);
        AuditEvent::create(['actor_user_id' => $request->user()->id, 'action' => 'MEDICATION_SUPPORT_REQUESTED',
            'entity_type' => 'medication_support_alert', 'entity_id' => $alertId]);
        $doctorId = DB::table('prescription_items as i')->join('prescriptions as p', 'p.id', '=', 'i.prescription_id')->where('i.id', $course->prescription_item_id)->value('p.doctor_id');
        if ($doctorId) app(\App\Services\CareNotificationService::class)->create($doctorId, 'MEDICATION_SUPPORT_REQUESTED', 'SUPPORT_ALERT', $data['reason'] === 'SEVERE_ALLERGY' ? 'HIGH' : 'NORMAL', 'MEDICATION_SUPPORT_ALERT', $alertId, '/doctor-login#dashboard-problems', ['message' => 'A patient requested medication support ('.$data['reason'].').']);
        return response()->json(['id' => $alertId, 'title' => 'Medication Support Alert',
            'urgent_message' => $data['reason'] === 'SEVERE_ALLERGY'
                ? 'For severe allergy symptoms or breathing difficulty, seek emergency care now. In Bangladesh, call 999.' : null,
            'advice' => 'For missed doses or medicine problems, consult the supplied leaflet and your pharmacist or prescriber. Do not double or extend doses without their instructions.'], 201);
    }

    public function alerts(Request $request, string $id)
    {
        $course = DB::table('medication_courses')->find($id);
        abort_unless($course, 404);
        $user = $request->user();
        abort_unless(SharingController::owns($user->id, $course->patient_record_id)
            || SharingController::granted($user->id, $course->patient_record_id, 'COURSE', $id, 'VIEW'), 404);
        return DB::table('medication_support_alerts')->where('medication_course_id', $id)
            ->select('id', 'reason', 'patient_note', 'status', 'resolution_note', 'created_at', 'resolved_at')->orderByDesc('created_at')->get();
    }

    public function resolveAlert(Request $request, string $alertId)
    {
        $data = $request->validate(['resolution_note' => 'required|string|max:3000']);
        $alert = DB::table('medication_support_alerts')->find($alertId);
        abort_unless($alert && $alert->status === 'OPEN', 404);
        $course = DB::table('medication_courses')->find($alert->medication_course_id);
        $item = DB::table('prescription_items')->find($course->prescription_item_id);
        $rx = DB::table('prescriptions')->find($item->prescription_id);
        $user = $request->user();
        abort_unless($rx->doctor_id === $user->id && $user->hasRole('DOCTOR')
            && SharingController::granted($user->id, $course->patient_record_id, 'COURSE', $course->id, 'VIEW'), 403);
        DB::table('medication_support_alerts')->where('id', $alertId)->update(['status' => 'RESOLVED',
            'resolution_note' => $data['resolution_note'], 'resolved_by' => $user->id, 'resolved_at' => now(), 'updated_at' => now()]);
        AuditEvent::create(['actor_user_id' => $user->id, 'action' => 'MEDICATION_SUPPORT_RESOLVED', 'entity_type' => 'medication_support_alert', 'entity_id' => $alertId]);
        return response()->json(['status' => 'RESOLVED']);
    }
}
