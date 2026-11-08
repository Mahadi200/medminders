<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\User;
use App\Services\CareNotificationService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AppointmentController extends Controller
{
    public const TZ = 'Asia/Dhaka';
    private const INACTIVE = ['CANCELLED', 'REJECTED'];

    public function __construct(private readonly CareNotificationService $notifications) {}

    public function index(Request $request)
    {
        $user = $request->user();
        $patientIds = DB::table('patient_links')->where('user_id', $user->id)->pluck('patient_record_id');
        $assistantDoctors = DB::table('organization_memberships')->where('user_id', $user->id)->where('role', 'DOCTOR_ASSISTANT')
            ->where('is_active', true)->pluck('assigned_doctor_id');
        $hospitalOrganizations = DB::table('organization_memberships')->where('user_id', $user->id)->whereIn('role', ['HOSPITAL_ADMIN', 'HOSPITAL_RECEPTION'])->where('is_active', true)->pluck('organization_id');
        $isDoctor = $user->hasRole('DOCTOR');
        return DB::table('appointments as a')->join('users as d', 'd.id', '=', 'a.doctor_id')
            ->join('patient_records as p', 'p.id', '=', 'a.patient_record_id')
            ->leftJoin('organizations as o', 'o.id', '=', 'a.organization_id')
            ->where(function ($q) use ($user, $patientIds, $assistantDoctors, $hospitalOrganizations, $isDoctor) {
                $q->whereIn('a.patient_record_id', $patientIds)
                    // A doctor only receives requests the hospital has confirmed (or that the doctor booked directly).
                    ->orWhere(fn ($d) => $d->where('a.doctor_id', $user->id)->when($isDoctor, fn ($x) => $x->whereNotIn('a.status', ['PENDING_HOSPITAL', 'PROPOSED_CHANGE', 'REJECTED'])))
                    ->orWhere(fn ($assistant) => $assistant->whereIn('a.doctor_id', $assistantDoctors)->whereIn('a.organization_id',
                        DB::table('organization_memberships')->where('user_id', $user->id)->where('role', 'DOCTOR_ASSISTANT')->where('is_active', true)->pluck('organization_id')))
                    ->orWhereIn('a.organization_id', $hospitalOrganizations);
            })->select('a.*', 'd.name as doctor_name', 'p.name as patient_name', 'o.name as organization_name')
            ->orderBy('a.scheduled_at')->limit(200)->get();
    }

    /** Available slots for one confirmed affiliation on one local date (Asia/Dhaka). Public, contains no patient data. */
    public function slots(Request $request, string $affiliationId)
    {
        $data = $request->validate(['date' => 'required|date_format:Y-m-d']);
        $aff = DB::table('doctor_affiliations')->where('id', $affiliationId)->where('status', 'CONFIRMED')->first();
        abort_unless($aff, 404);
        return response()->json(['timezone' => self::TZ, 'slots' => $this->slotList($aff, $data['date'])]);
    }

    private function slotList(object $aff, string $date): array
    {
        $day = CarbonImmutable::parse($date, self::TZ);
        $days = json_decode($aff->visiting_days, true) ?: [];
        if (! in_array(strtoupper($day->format('D')), $days, true)) return [];
        $slots = [];
        $end = CarbonImmutable::parse($date.' '.$aff->end_time, self::TZ);
        for ($at = CarbonImmutable::parse($date.' '.$aff->start_time, self::TZ); $at->addMinutes($aff->slot_minutes)->lessThanOrEqualTo($end); $at = $at->addMinutes($aff->slot_minutes)) {
            if ($at->isPast()) continue;
            $slots[] = ['starts_at' => $at->utc()->toIso8601String(), 'label' => $at->format('h:i A'), 'available' => ! $this->doctorBusy($aff->doctor_id, $at, $aff->slot_minutes)];
        }
        return $slots;
    }

    private function doctorBusy(string $doctorId, CarbonImmutable $at, int $minutes, ?string $ignoreId = null): bool
    {
        return DB::table('appointments')->where('doctor_id', $doctorId)->whereNotIn('status', self::INACTIVE)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->where('scheduled_at', '>', $at->utc()->subMinutes($minutes)->toDateTimeString())
            ->where('scheduled_at', '<', $at->utc()->addMinutes($minutes)->toDateTimeString())->exists();
    }

    private function onSchedule(object $aff, CarbonImmutable $at): bool
    {
        $local = $at->setTimezone(self::TZ);
        return collect($this->slotList($aff, $local->format('Y-m-d')))->contains(fn ($s) => CarbonImmutable::parse($s['starts_at'])->equalTo($at));
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if ($user->hasRole('PATIENT') && $request->filled('affiliation_id')) return $this->patientRequest($request);
        $data = $request->validate([
            'patient_record_id' => 'required|ulid|exists:patient_records,id', 'doctor_id' => 'required|ulid|exists:users,id',
            'organization_id' => 'required|ulid|exists:organizations,id', 'scheduled_at' => 'required|date|after:now', 'visit_reason' => 'nullable|string|max:500',
        ]);
        abort_unless(User::find($data['doctor_id'])?->hasRole('DOCTOR'), 422);
        $doctorBooking = $user->id === $data['doctor_id'] && $user->hasRole('DOCTOR');
        $assistantBooking = DB::table('organization_memberships')->where('user_id', $user->id)->where('organization_id', $data['organization_id'] ?? '')
            ->where('role', 'DOCTOR_ASSISTANT')->where('assigned_doctor_id', $data['doctor_id'])->where('is_active', true)->exists();
        abort_unless($doctorBooking || $assistantBooking, 403, 'Patients book through a doctor’s confirmed hospital schedule.');
        $patient = DB::table('patient_records')->find($data['patient_record_id']);
        $related = $patient->created_by === $user->id || $patient->created_by === $data['doctor_id']
            || SharingController::granted($data['doctor_id'], $patient->id, 'ENCOUNTER', $patient->id, 'REVIEW');
        abort_unless($related, 403);
        $at = CarbonImmutable::parse($data['scheduled_at'])->utc();
        abort_if($this->doctorBusy($data['doctor_id'], $at, 15), 422, 'This appointment request already exists or overlaps another booking.');
        $id = (string) Str::ulid();
        DB::table('appointments')->insert(['id' => $id, 'patient_record_id' => $data['patient_record_id'],
            'doctor_id' => $data['doctor_id'], 'organization_id' => $data['organization_id'],
            'created_by' => $user->id, 'scheduled_at' => $at->toDateTimeString(), 'status' => 'BOOKED', 'visit_reason' => $data['visit_reason'] ?? null,
            'created_at' => now(), 'updated_at' => now()]);
        AuditEvent::create(['actor_user_id' => $user->id, 'action' => 'APPOINTMENT_BOOKED', 'entity_type' => 'appointment', 'entity_id' => $id]);
        return response()->json(['id' => $id, 'status' => 'BOOKED'], 201);
    }

    private function patientRequest(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'patient_record_id' => 'required|ulid|exists:patient_records,id', 'affiliation_id' => 'required|ulid',
            'scheduled_at' => 'required|date|after:now', 'visit_reason' => 'nullable|string|max:500', 'consultation_consent' => 'boolean',
        ]);
        abort_unless(SharingController::owns($user->id, $data['patient_record_id']), 403);
        $aff = DB::table('doctor_affiliations')->where('id', $data['affiliation_id'])->where('status', 'CONFIRMED')->first();
        abort_unless($aff, 422, 'This doctor does not have a confirmed schedule at that hospital.');
        abort_unless(DB::table('clinician_credentials')->where('user_id', $aff->doctor_id)->where('verification_status', 'VERIFIED')->where('is_published', true)->exists(), 422);
        $at = CarbonImmutable::parse($data['scheduled_at'])->utc();
        abort_unless($this->onSchedule($aff, $at), 422, 'Choose one of the listed visiting slots.');
        return DB::transaction(function () use ($user, $data, $aff, $at) {
            DB::table('doctor_affiliations')->where('id', $aff->id)->lockForUpdate()->first();
            $duplicate = DB::table('appointments')->where('patient_record_id', $data['patient_record_id'])->where('doctor_id', $aff->doctor_id)
                ->whereNotIn('status', array_merge(self::INACTIVE, ['COMPLETED']))->where('scheduled_at', '>', now())->exists();
            abort_if($duplicate, 422, 'You already have an open request with this doctor.');
            abort_if($this->doctorBusy($aff->doctor_id, $at, $aff->slot_minutes), 422, 'This slot was just taken. Choose another time.');
            $patientClash = DB::table('appointments')->where('patient_record_id', $data['patient_record_id'])->whereNotIn('status', self::INACTIVE)
                ->whereBetween('scheduled_at', [$at->subMinutes(30)->toDateTimeString(), $at->addMinutes(30)->toDateTimeString()])->exists();
            abort_if($patientClash, 422, 'You already have another appointment within 30 minutes of this time.');
            $id = (string) Str::ulid();
            DB::table('appointments')->insert(['id' => $id, 'patient_record_id' => $data['patient_record_id'], 'doctor_id' => $aff->doctor_id,
                'organization_id' => $aff->organization_id, 'affiliation_id' => $aff->id, 'created_by' => $user->id,
                'scheduled_at' => $at->toDateTimeString(), 'status' => 'PENDING_HOSPITAL', 'visit_reason' => $data['visit_reason'] ?? null,
                'consultation_consent' => (bool) ($data['consultation_consent'] ?? false), 'created_at' => now(), 'updated_at' => now()]);
            AuditEvent::create(['actor_user_id' => $user->id, 'action' => 'APPOINTMENT_REQUESTED', 'entity_type' => 'appointment', 'entity_id' => $id]);
            foreach ($this->hospitalDesk($aff->organization_id) as $staffId) {
                $this->notifications->create($staffId, 'APPOINTMENT_REQUESTED', 'ACTION_REQUIRED', 'NORMAL', 'APPOINTMENT', $id, '/hospital-login#dashboard-appointments',
                    ['message' => 'New appointment request for '.$at->setTimezone(self::TZ)->format('d M Y, h:i A').'.']);
            }
            return response()->json(['id' => $id, 'status' => 'PENDING_HOSPITAL'], 201);
        });
    }

    private function hospitalDesk(string $organizationId)
    {
        return DB::table('organization_memberships')->where('organization_id', $organizationId)->where('is_active', true)
            ->whereIn('role', ['HOSPITAL_ADMIN', 'HOSPITAL_RECEPTION'])->distinct()->pluck('user_id');
    }

    private function patientUsers(string $recordId)
    {
        return DB::table('patient_links')->where('patient_record_id', $recordId)->pluck('user_id');
    }

    public function update(Request $request, string $id)
    {
        $data = $request->validate(['status' => 'required|in:CONFIRMED,REJECTED,PROPOSED_CHANGE,CHECKED_IN,IN_PROGRESS,COMPLETED,CANCELLED',
            'reason' => 'nullable|string|max:500', 'proposed_scheduled_at' => 'required_if:status,PROPOSED_CHANGE|nullable|date|after:now']);
        $appointment = DB::table('appointments')->find($id);
        abort_unless($appointment, 404);
        $user = $request->user();
        $doctor = $appointment->doctor_id === $user->id && $user->hasRole('DOCTOR');
        $assistant = DB::table('organization_memberships')->where('user_id', $user->id)->where('organization_id', $appointment->organization_id)
            ->where('role', 'DOCTOR_ASSISTANT')->where('assigned_doctor_id', $appointment->doctor_id)->where('is_active', true)->exists();
        $hospital = $appointment->organization_id && DB::table('organization_memberships')->where('user_id', $user->id)->where('organization_id', $appointment->organization_id)->where('is_active', true)->whereIn('role', ['HOSPITAL_ADMIN', 'HOSPITAL_RECEPTION'])->exists();
        $patient = SharingController::owns($user->id, $appointment->patient_record_id);
        $allowed = ($doctor && in_array($data['status'], ['CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']) && $appointment->status !== 'PENDING_HOSPITAL')
            || ($assistant && in_array($data['status'], ['CHECKED_IN', 'CANCELLED']))
            || ($hospital && in_array($data['status'], ['CONFIRMED', 'REJECTED', 'PROPOSED_CHANGE', 'CANCELLED', 'CHECKED_IN']))
            || ($patient && $data['status'] === 'CANCELLED');
        abort_unless($allowed, 403);
        abort_if(in_array($appointment->status, ['COMPLETED', 'CANCELLED', 'REJECTED']), 422, 'This appointment is already closed.');
        $update = ['status' => $data['status'], 'status_reason' => $data['reason'] ?? null, 'updated_at' => now()];
        if ($data['status'] === 'CONFIRMED') {
            abort_unless(in_array($appointment->status, ['PENDING_HOSPITAL', 'BOOKED']), 422, 'Only pending requests can be confirmed.');
            $minutes = $appointment->affiliation_id ? (int) DB::table('doctor_affiliations')->where('id', $appointment->affiliation_id)->value('slot_minutes') : 15;
            abort_if($this->doctorBusyConfirmed($appointment->doctor_id, CarbonImmutable::parse($appointment->scheduled_at, 'UTC'), $minutes, $id), 422, 'The requested slot is no longer available.');
        }
        if ($data['status'] === 'PROPOSED_CHANGE') {
            abort_unless($appointment->status === 'PENDING_HOSPITAL', 422);
            $proposed = CarbonImmutable::parse($data['proposed_scheduled_at'])->utc();
            $minutes = $appointment->affiliation_id ? (int) DB::table('doctor_affiliations')->where('id', $appointment->affiliation_id)->value('slot_minutes') : 15;
            abort_if($this->doctorBusy($appointment->doctor_id, $proposed, $minutes, $id), 422, 'The proposed slot overlaps another booking.');
            $update['proposed_scheduled_at'] = $proposed->toDateTimeString();
        }
        DB::transaction(function () use ($id, $update, $appointment, $data, $user) {
            DB::table('appointments')->where('id', $id)->update($update);
            AuditEvent::create(['actor_user_id' => $user->id, 'action' => 'APPOINTMENT_STATUS_CHANGED', 'entity_type' => 'appointment', 'entity_id' => $id,
                'metadata' => ['from' => $appointment->status, 'status' => $data['status']]]);
            if ($data['status'] === 'CONFIRMED') $this->afterConfirm($appointment, $user->id);
            $when = CarbonImmutable::parse($appointment->scheduled_at, 'UTC')->setTimezone(self::TZ)->format('d M Y, h:i A');
            $messages = ['CONFIRMED' => "Your appointment on $when was confirmed by the hospital.", 'REJECTED' => "Your appointment request for $when was declined.",
                'PROPOSED_CHANGE' => 'The hospital proposed a different time. Accept or decline it in your dashboard.', 'CANCELLED' => "The appointment on $when was cancelled."];
            if (isset($messages[$data['status']]) && ! SharingController::owns($user->id, $appointment->patient_record_id)) {
                foreach ($this->patientUsers($appointment->patient_record_id) as $patientUser) {
                    $this->notifications->create($patientUser, 'APPOINTMENT_'.$data['status'], $data['status'] === 'PROPOSED_CHANGE' ? 'ACTION_REQUIRED' : 'INFORMATION', 'NORMAL', 'APPOINTMENT', $id,
                        '/patient-login#dashboard-appointments', ['message' => $messages[$data['status']]], 'APPOINTMENT_'.$data['status'].':'.$id.':'.now()->timestamp);
                }
            }
        });
        return response()->json(['status' => $data['status']]);
    }

    private function doctorBusyConfirmed(string $doctorId, CarbonImmutable $at, int $minutes, string $ignoreId): bool
    {
        return DB::table('appointments')->where('doctor_id', $doctorId)->where('id', '!=', $ignoreId)->whereIn('status', ['CONFIRMED', 'BOOKED', 'CHECKED_IN', 'IN_PROGRESS'])
            ->where('scheduled_at', '>', $at->subMinutes($minutes)->toDateTimeString())->where('scheduled_at', '<', $at->addMinutes($minutes)->toDateTimeString())->exists();
    }

    /** Confirmation reaches the doctor; if the patient consented at booking, a scoped, expiring consultation grant is recorded. */
    private function afterConfirm(object $appointment, string $actorId): void
    {
        $when = CarbonImmutable::parse($appointment->scheduled_at, 'UTC');
        $this->notifications->create($appointment->doctor_id, 'APPOINTMENT_CONFIRMED', 'INFORMATION', 'NORMAL', 'APPOINTMENT', $appointment->id, '/doctor-login#dashboard-appointments',
            ['message' => 'Confirmed appointment on '.$when->setTimezone(self::TZ)->format('d M Y, h:i A').'.'], 'APPOINTMENT_CONFIRMED_DOCTOR:'.$appointment->id);
        if (! $appointment->consultation_consent) return;
        $exists = SharingController::granted($appointment->doctor_id, $appointment->patient_record_id, 'ENCOUNTER', $appointment->patient_record_id, 'REVIEW');
        if ($exists) return;
        $requestId = (string) Str::ulid();
        $expires = $when->addDays(7)->max(now()->addDays(1));
        DB::table('sharing_requests')->insert(['id' => $requestId, 'patient_record_id' => $appointment->patient_record_id, 'requester_id' => $appointment->created_by,
            'organization_id' => $appointment->organization_id, 'resource_type' => 'ENCOUNTER', 'resource_id' => $appointment->patient_record_id, 'action' => 'REVIEW',
            'purpose' => 'Consultation consent given at booking', 'duration_minutes' => (int) now()->diffInMinutes($expires), 'status' => 'APPROVED',
            'expires_at' => $expires, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('sharing_grants')->insert(['id' => (string) Str::ulid(), 'sharing_request_id' => $requestId, 'patient_record_id' => $appointment->patient_record_id,
            'recipient_id' => $appointment->doctor_id, 'organization_id' => $appointment->organization_id, 'resource_type' => 'ENCOUNTER',
            'resource_id' => $appointment->patient_record_id, 'action' => 'REVIEW', 'expires_at' => $expires, 'created_at' => now(), 'updated_at' => now()]);
        AuditEvent::create(['actor_user_id' => $actorId, 'action' => 'CONSULTATION_GRANT_FROM_BOOKING_CONSENT', 'entity_type' => 'appointment', 'entity_id' => $appointment->id]);
    }

    /** Patient accepts or declines a hospital-proposed time. Nothing changes without acceptance. */
    public function respond(Request $request, string $id)
    {
        $data = $request->validate(['accept' => 'required|boolean']);
        $appointment = DB::table('appointments')->find($id);
        abort_unless($appointment && SharingController::owns($request->user()->id, $appointment->patient_record_id), 404);
        abort_unless($appointment->status === 'PROPOSED_CHANGE' && $appointment->proposed_scheduled_at, 422);
        if ($data['accept']) {
            $minutes = $appointment->affiliation_id ? (int) DB::table('doctor_affiliations')->where('id', $appointment->affiliation_id)->value('slot_minutes') : 15;
            abort_if($this->doctorBusy($appointment->doctor_id, CarbonImmutable::parse($appointment->proposed_scheduled_at, 'UTC'), $minutes, $id), 422, 'The proposed slot is no longer available.');
            DB::table('appointments')->where('id', $id)->update(['scheduled_at' => $appointment->proposed_scheduled_at, 'proposed_scheduled_at' => null, 'status' => 'CONFIRMED', 'updated_at' => now()]);
            $this->afterConfirm(DB::table('appointments')->find($id), $request->user()->id);
        } else {
            DB::table('appointments')->where('id', $id)->update(['status' => 'CANCELLED', 'status_reason' => 'Patient declined the proposed time.', 'updated_at' => now()]);
        }
        foreach ($this->hospitalDesk($appointment->organization_id) as $staffId) {
            $this->notifications->create($staffId, $data['accept'] ? 'APPOINTMENT_CHANGE_ACCEPTED' : 'APPOINTMENT_CHANGE_DECLINED', 'INFORMATION', 'NORMAL', 'APPOINTMENT', $id, null,
                ['message' => 'The patient '.($data['accept'] ? 'accepted' : 'declined').' the proposed time.'], 'APPT_RESPONSE:'.$id.':'.now()->timestamp);
        }
        AuditEvent::create(['actor_user_id' => $request->user()->id, 'action' => $data['accept'] ? 'APPOINTMENT_CHANGE_ACCEPTED' : 'APPOINTMENT_CHANGE_DECLINED', 'entity_type' => 'appointment', 'entity_id' => $id]);
        return response()->json(['status' => $data['accept'] ? 'CONFIRMED' : 'CANCELLED']);
    }
}
