<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\Role;
use App\Models\User;
use App\Services\Auth\PatientSmsGateway;
use App\Services\CareNotificationService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CareJourneyController extends Controller
{
    public const SCOPES = ['PROFILE', 'PRESCRIPTIONS', 'REPORTS', 'HISTORY'];

    public function __construct(private readonly CareNotificationService $notifications, private readonly AppointmentController $appointments) {}

    public static function maskPhone(?string $phone): ?string
    {
        return $phone ? substr($phone, 0, 7).str_repeat('•', max(0, strlen($phone) - 10)).substr($phone, -3) : null;
    }

    public static function age(?string $dob): ?int
    {
        return $dob ? CarbonImmutable::parse($dob)->age : null;
    }

    /* ---------------- Public catalogue ---------------- */
    public function catalogue(Request $request)
    {
        $f = $request->validate(['q' => 'nullable|string|max:100', 'specialty' => 'nullable|string|max:100', 'organization_id' => 'nullable|ulid',
            'area' => 'nullable|string|max:100', 'day' => 'nullable|in:SAT,SUN,MON,TUE,WED,THU,FRI', 'available_today' => 'nullable|boolean']);
        $today = strtoupper(now(AppointmentController::TZ)->format('D'));
        $rows = DB::table('clinician_credentials as c')->join('users as u', 'u.id', '=', 'c.user_id')
            ->where('c.verification_status', 'VERIFIED')->where('c.is_published', true)
            ->when($f['q'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w->where('u.name', 'like', "%$v%")->orWhere('c.specialty', 'like', "%$v%")->orWhere('c.qualifications', 'like', "%$v%")))
            ->when($f['specialty'] ?? null, fn ($q, $v) => $q->where('c.specialty', 'like', "$v%"))
            ->select('c.id', 'c.user_id', 'u.name', 'c.specialty', 'c.qualifications', 'c.experience_years', 'c.languages', 'c.biography', 'c.fee_bdt', 'c.is_sample', 'c.bmdc_number')
            ->selectRaw('CASE WHEN c.photo_path IS NULL THEN 0 ELSE 1 END as has_photo')->orderBy('u.name')->limit(200)->get();
        $result = [];
        foreach ($rows as $doc) {
            $affs = AffiliationController::publicFor($doc->user_id)
                ->filter(fn ($a) => empty($f['organization_id']) || $a->organization_id === $f['organization_id'])
                ->filter(fn ($a) => empty($f['day']) || in_array($f['day'], $a->visiting_days, true))
                ->filter(fn ($a) => empty($f['available_today']) || in_array($today, $a->visiting_days, true));
            if (! empty($f['area'])) $affs = $affs->filter(fn ($a) => strcasecmp((string) DB::table('organizations')->where('id', $a->organization_id)->value('area'), $f['area']) === 0);
            if ($affs->isEmpty()) continue; // only doctors with an active, matching affiliation are listed
            $affs = $affs->map(function ($a) {
                $org = DB::table('organizations')->find($a->organization_id, ['area', 'latitude', 'longitude', 'is_sample', 'contact_phone', 'opening_hours']);
                $a->area = $org->area; $a->latitude = $org->latitude; $a->longitude = $org->longitude; $a->organization_is_sample = (bool) $org->is_sample;
                $a->next_available = $this->appointments->nextAvailable(DB::table('doctor_affiliations')->find($a->id));
                return $a;
            })->values();
            $doc->affiliations = $affs;
            $doc->next_available = $affs->pluck('next_available')->filter()->sortBy('starts_at')->first();
            $doc->is_sample = (bool) $doc->is_sample;
            $doc->bmdc_verified = true;
            $result[] = $doc;
        }
        usort($result, fn ($a, $b) => strcmp($a->next_available['starts_at'] ?? 'z', $b->next_available['starts_at'] ?? 'z'));
        return response()->json(['doctors' => $result,
            'specialties' => DB::table('clinician_credentials')->where('verification_status', 'VERIFIED')->where('is_published', true)->whereNotNull('specialty')->distinct()->orderBy('specialty')->pluck('specialty'),
            'hospitals' => DB::table('organizations')->where('status', 'APPROVED')->whereIn('type', ['HOSPITAL', 'DIAGNOSTIC'])->orderBy('name')->get(['id', 'name', 'area', 'is_sample', 'latitude', 'longitude', 'address', 'opening_hours']),
        ]);
    }

    /* ---------------- OTP-verified booking ---------------- */
    public function sendOtp(Request $request, PatientSmsGateway $sms)
    {
        $data = $request->validate(['phone' => 'required|string|max:32']);
        $phone = PatientAccessController::phone($data['phone']);
        $recent = DB::table('phone_challenges')->where('phone_number', $phone)->where('purpose', 'BOOKING')->where('created_at', '>', now()->subMinute())->exists();
        abort_if($recent, 429, 'Please wait a minute before requesting another code.');
        $code = (string) random_int(100000, 999999);
        $id = (string) Str::ulid();
        DB::table('phone_challenges')->insert(['id' => $id, 'phone_number' => $phone, 'purpose' => 'BOOKING', 'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(5), 'created_at' => now(), 'updated_at' => now()]);
        try { $dev = $sms->deliverCode($phone, $code); }
        catch (\Throwable $e) { DB::table('phone_challenges')->where('id', $id)->delete(); abort(503, 'SMS verification is temporarily unavailable.'); }
        return response()->json(['challenge_id' => $id, 'phone' => $phone, 'expires_in' => 300] + ($dev ? ['dev_code' => $dev, 'dev_notice' => 'DEVELOPMENT ONLY — no SMS was sent.'] : []));
    }

    public function verifyOtp(Request $request)
    {
        $data = $request->validate(['challenge_id' => 'required|ulid', 'code' => 'required|digits:6']);
        return DB::transaction(function () use ($data) {
            $c = DB::table('phone_challenges')->where('id', $data['challenge_id'])->where('purpose', 'BOOKING')->lockForUpdate()->first();
            if (! $c || $c->verified_at || now()->greaterThan($c->expires_at) || $c->attempts >= 5) return response()->json(['message' => 'Invalid or expired code.'], 422);
            DB::table('phone_challenges')->where('id', $c->id)->increment('attempts');
            if (! Hash::check($data['code'], $c->code_hash)) return response()->json(['message' => 'Invalid or expired code.'], 422);
            DB::table('phone_challenges')->where('id', $c->id)->update(['verified_at' => now(), 'expires_at' => now()->addMinutes(15), 'updated_at' => now()]);
            return response()->json(['verified' => true, 'verification_id' => $c->id]);
        });
    }

    private static function normName(string $n): string { return preg_replace('/\s+/', ' ', mb_strtolower(trim(preg_replace('/^(mr|mrs|ms|md|dr)\.?\s+/i', '', $n)))); }

    public function book(Request $request)
    {
        $data = $request->validate(['verification_id' => 'required|ulid', 'name' => 'required|string|max:191', 'date_of_birth' => 'required|date|before:today',
            'sex' => 'nullable|in:FEMALE,MALE,OTHER', 'affiliation_id' => 'required|ulid', 'scheduled_at' => 'required|date|after:now', 'visit_reason' => 'nullable|string|max:500']);
        $c = DB::table('phone_challenges')->where('id', $data['verification_id'])->where('purpose', 'BOOKING')->first();
        abort_unless($c && $c->verified_at && ! $c->consumed_at && now()->lessThan($c->expires_at), 422, 'Verify your phone number again.');
        $phone = $c->phone_number;
        $user = User::where(fn ($q) => $q->where('phone_number', $phone)->orWhere('pending_phone_number', $phone))->whereHas('roles', fn ($q) => $q->where('role', 'PATIENT'))->first();
        $recordId = null;
        if ($user) {
            // Existing profile: name + date of birth confirm identity (never a password replacement).
            $record = DB::table('patient_records as r')->join('patient_links as l', 'l.patient_record_id', '=', 'r.id')->where('l.user_id', $user->id)->where('l.relationship', 'SELF')->select('r.*')->first();
            $matches = $record && self::normName($record->name) === self::normName($data['name']) && (! $record->date_of_birth || substr($record->date_of_birth, 0, 10) === $data['date_of_birth']);
            abort_unless($matches, 409, 'This phone number already has a MedMinders profile with different details. Sign in with your phone number to book.');
            $recordId = $record->id;
            DB::table('patient_records')->where('id', $recordId)->update(array_filter(['date_of_birth' => $record->date_of_birth ? null : $data['date_of_birth'], 'sex' => $record->sex ? null : ($data['sex'] ?? null)]) + ['updated_at' => now()]);
            if (! $user->phone_number) { $user->forceFill(['phone_number' => $phone, 'pending_phone_number' => null, 'phone_verified_at' => now()])->save(); }
        } else {
            abort_if(User::where('phone_number', $phone)->exists(), 409, 'This phone number belongs to a staff account. Use a personal number.');
            [$user, $recordId] = DB::transaction(function () use ($data, $phone) {
                $u = new User(); $u->forceFill(['name' => $data['name'], 'phone_number' => $phone, 'phone_verified_at' => now(), 'is_active' => true])->save();
                Role::create(['user_id' => $u->id, 'role' => 'PATIENT', 'is_verified' => true]);
                $rid = (string) Str::ulid();
                DB::table('patient_records')->insert(['id' => $rid, 'name' => $data['name'], 'phone_number' => $phone, 'date_of_birth' => $data['date_of_birth'], 'sex' => $data['sex'] ?? null,
                    'created_by' => $u->id, 'created_at' => now(), 'updated_at' => now()]);
                DB::table('patient_links')->insert(['id' => (string) Str::ulid(), 'patient_record_id' => $rid, 'user_id' => $u->id, 'relationship' => 'SELF', 'verified_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
                AuditEvent::create(['actor_user_id' => $u->id, 'action' => 'PATIENT_CREATED_FROM_OTP_BOOKING', 'entity_type' => 'patient_record', 'entity_id' => $rid]);
                return [$u, $rid];
            });
        }
        $response = $this->appointments->createRequest($user, ['patient_record_id' => $recordId, 'affiliation_id' => $data['affiliation_id'], 'scheduled_at' => $data['scheduled_at'], 'visit_reason' => $data['visit_reason'] ?? null]);
        DB::table('phone_challenges')->where('id', $c->id)->update(['consumed_at' => now(), 'updated_at' => now()]);
        $appointmentId = $response->getData()->id;
        $a = DB::table('appointments as a')->join('users as d', 'd.id', '=', 'a.doctor_id')->join('organizations as o', 'o.id', '=', 'a.organization_id')
            ->where('a.id', $appointmentId)->select('a.id', 'a.scheduled_at', 'a.status', 'd.name as doctor_name', 'o.name as organization_name')->first();
        return response()->json(['booking' => $a, 'token' => $user->createToken('medminders-web')->plainTextToken,
            'user' => ['id' => $user->id, 'name' => $user->name, 'roles' => ['PATIENT']]], 201);
    }

    /* ---------------- Organization: find patient by phone ---------------- */
    private function staffOrg(Request $request): object
    {
        $m = DB::table('organization_memberships as m')->join('organizations as o', 'o.id', '=', 'm.organization_id')->where('m.user_id', $request->user()->id)
            ->where('m.is_active', true)->where('o.status', 'APPROVED')->whereIn('o.type', ['HOSPITAL', 'DIAGNOSTIC', 'PHARMACY'])->select('o.id', 'o.type', 'o.name')->first();
        abort_unless($m, 403);
        return $m;
    }

    public static function orgAuthorized(string $userId, string $recordId, string $orgId): bool
    {
        return DB::table('sharing_grants')->where('recipient_id', $userId)->where('organization_id', $orgId)->where('patient_record_id', $recordId)
            ->where('resource_type', 'PATIENT_RECORD')->whereNull('revoked_at')->where('expires_at', '>', now())->exists();
    }

    public function findByPhone(Request $request)
    {
        $org = $this->staffOrg($request);
        $data = $request->validate(['phone' => 'required|string|max:32']);
        $phone = PatientAccessController::phone($data['phone']);
        AuditEvent::create(['actor_user_id' => $request->user()->id, 'action' => 'PATIENT_PHONE_SEARCH', 'entity_type' => 'organization', 'entity_id' => $org->id]);
        $records = DB::table('patient_records as r')->join('patient_links as l', 'l.patient_record_id', '=', 'r.id')->join('users as u', 'u.id', '=', 'l.user_id')
            ->where('u.phone_number', $phone)->select('r.id', 'r.name', 'u.phone_number')->distinct()->limit(5)->get();
        return $records->map(function ($r) use ($request, $org) {
            $authorized = self::orgAuthorized($request->user()->id, $r->id, $org->id);
            $out = ['patient_record_id' => $r->id, 'name' => $r->name, 'phone' => self::maskPhone($r->phone_number), 'authorized' => $authorized,
                'pending_request' => DB::table('sharing_requests')->where('patient_record_id', $r->id)->where('organization_id', $org->id)->where('resource_type', 'PATIENT_RECORD')->where('status', 'PENDING')->exists()];
            if ($authorized) {
                $out['prescriptions'] = DB::table('prescriptions')->where('patient_record_id', $r->id)->where('status', 'SIGNED')->whereNull('superseded_at')->whereNull('cancelled_at')
                    ->orderByDesc('issued_at')->limit(10)->get(['id', 'diagnosis', 'issued_at', 'doctor_snapshot'])->map(function ($p) {
                        $p->doctor_snapshot = json_decode($p->doctor_snapshot, true);
                        $p->items = DB::table('prescription_items')->where('prescription_id', $p->id)->get(['id', 'generic_name', 'brand_name', 'strength', 'dosage_form', 'dose', 'duration_days', 'quantity', 'is_antibiotic'])
                            ->map(function ($i) { $i->dispensed_quantity = (int) DB::table('dispensings')->where('prescription_item_id', $i->id)->sum('quantity'); return $i; });
                        $p->tests = DB::table('test_orders')->where('prescription_id', $p->id)->get(['id', 'test_name', 'status', 'performing_organization_id']);
                        return $p;
                    });
            }
            return $out;
        });
    }

    public function requestAccess(Request $request, string $recordId)
    {
        $org = $this->staffOrg($request);
        $data = $request->validate(['purpose' => 'required|string|max:191']);
        abort_unless(DB::table('patient_records')->where('id', $recordId)->exists(), 404);
        abort_if(DB::table('sharing_requests')->where('patient_record_id', $recordId)->where('organization_id', $org->id)->where('resource_type', 'PATIENT_RECORD')->where('status', 'PENDING')->exists(), 422, 'A request is already waiting for the patient.');
        $id = (string) Str::ulid();
        $action = $org->type === 'PHARMACY' ? 'DISPENSE' : 'VIEW';
        DB::table('sharing_requests')->insert(['id' => $id, 'patient_record_id' => $recordId, 'requester_id' => $request->user()->id, 'organization_id' => $org->id,
            'resource_type' => 'PATIENT_RECORD', 'resource_id' => $recordId, 'action' => $action, 'purpose' => $data['purpose'], 'duration_minutes' => 7 * 1440,
            'status' => 'PENDING', 'expires_at' => now()->addDays(2), 'created_at' => now(), 'updated_at' => now()]);
        foreach (DB::table('patient_links')->where('patient_record_id', $recordId)->pluck('user_id') as $patientUser) {
            $this->notifications->create($patientUser, 'ACCESS_REQUESTED', 'ACTION_REQUIRED', 'NORMAL', 'SHARING_REQUEST', $id, '/patient-login#dashboard-sharing', ['message' => $org->name.' asks to access your records: '.$data['purpose']]);
        }
        AuditEvent::create(['actor_user_id' => $request->user()->id, 'action' => 'ORG_ACCESS_REQUESTED', 'entity_type' => 'patient_record', 'entity_id' => $recordId]);
        return response()->json(['id' => $id, 'status' => 'PENDING'], 201);
    }

    /** Grants PATIENT_RECORD access to every active member of an organization (one attributable grant per member). */
    public static function grantOrganization(string $recordId, object $org, string $requesterId, array $scopes, CarbonImmutable $expires, string $via, ?string $requestId = null): void
    {
        $roles = $org->type === 'PHARMACY' ? ['PHARMACY_ADMIN', 'DISPENSER'] : ['HOSPITAL_ADMIN', 'HOSPITAL_RECEPTION', 'LAB_STAFF', 'REPORT_REVIEWER', 'BILLING'];
        $action = $org->type === 'PHARMACY' ? 'DISPENSE' : 'VIEW';
        foreach (DB::table('organization_memberships')->where('organization_id', $org->id)->where('is_active', true)->whereIn('role', $roles)->distinct()->pluck('user_id') as $memberId) {
            $rid = (string) Str::ulid();
            DB::table('sharing_requests')->insert(['id' => $rid, 'patient_record_id' => $recordId, 'requester_id' => $requesterId, 'organization_id' => $org->id, 'resource_type' => 'PATIENT_RECORD',
                'resource_id' => $recordId, 'action' => $action, 'purpose' => $requestId ? 'Approved organization request' : 'Authorized by patient', 'duration_minutes' => (int) now()->diffInMinutes($expires),
                'status' => 'APPROVED', 'expires_at' => $expires, 'created_at' => now(), 'updated_at' => now()]);
            DB::table('sharing_grants')->insert(['id' => (string) Str::ulid(), 'sharing_request_id' => $rid, 'patient_record_id' => $recordId, 'recipient_id' => $memberId, 'organization_id' => $org->id,
                'resource_type' => 'PATIENT_RECORD', 'resource_id' => $recordId, 'action' => $action, 'expires_at' => $expires, 'scopes' => json_encode($scopes), 'created_via' => $via,
                'created_at' => now(), 'updated_at' => now()]);
        }
    }

    /* ---------------- Patient: authorize doctor / hospital / pharmacy ---------------- */
    public function authorizeAccess(Request $request)
    {
        $user = $request->user();
        abort_unless($user->hasRole('PATIENT'), 403);
        $data = $request->validate(['target' => 'required|in:DOCTOR,HOSPITAL,PHARMACY', 'target_id' => 'required|ulid', 'scopes' => 'required|array|min:1',
            'scopes.*' => 'in:'.implode(',', self::SCOPES), 'days' => 'required|integer|min:1|max:90']);
        $recordId = DB::table('patient_links')->where('user_id', $user->id)->where('relationship', 'SELF')->value('patient_record_id');
        abort_unless($recordId, 404);
        $expires = CarbonImmutable::now()->addDays($data['days']);
        if ($data['target'] === 'DOCTOR') {
            $doc = DB::table('clinician_credentials')->where('user_id', $data['target_id'])->where('verification_status', 'VERIFIED')->first();
            abort_unless($doc, 422, 'Choose a verified doctor.');
            $rid = (string) Str::ulid();
            DB::table('sharing_requests')->insert(['id' => $rid, 'patient_record_id' => $recordId, 'requester_id' => $user->id, 'resource_type' => 'ENCOUNTER', 'resource_id' => $recordId,
                'action' => 'REVIEW', 'purpose' => 'Authorized by patient', 'duration_minutes' => $data['days'] * 1440, 'status' => 'APPROVED', 'expires_at' => $expires, 'created_at' => now(), 'updated_at' => now()]);
            DB::table('sharing_grants')->insert(['id' => (string) Str::ulid(), 'sharing_request_id' => $rid, 'patient_record_id' => $recordId, 'recipient_id' => $data['target_id'],
                'resource_type' => 'ENCOUNTER', 'resource_id' => $recordId, 'action' => 'REVIEW', 'expires_at' => $expires, 'scopes' => json_encode($data['scopes']), 'created_via' => 'PATIENT', 'created_at' => now(), 'updated_at' => now()]);
            $this->notifications->create($data['target_id'], 'PATIENT_AUTHORIZED_ACCESS', 'INFORMATION', 'NORMAL', 'PATIENT_RECORD', $recordId, '/doctor-login#dashboard-patients', ['message' => 'A patient gave you access to their records.']);
        } else {
            $org = DB::table('organizations')->where('id', $data['target_id'])->where('status', 'APPROVED')->whereIn('type', $data['target'] === 'PHARMACY' ? ['PHARMACY'] : ['HOSPITAL', 'DIAGNOSTIC'])->first(['id', 'type', 'name']);
            abort_unless($org, 422, 'Choose an approved organization.');
            DB::transaction(fn () => self::grantOrganization($recordId, $org, $user->id, $data['scopes'], $expires, 'PATIENT'));
        }
        AuditEvent::create(['actor_user_id' => $user->id, 'action' => 'PATIENT_AUTHORIZED_'.$data['target'], 'entity_type' => 'patient_record', 'entity_id' => $recordId, 'metadata' => ['target_id' => $data['target_id'], 'scopes' => $data['scopes']]]);
        return response()->json(['status' => 'AUTHORIZED', 'expires_at' => $expires->toIso8601String()], 201);
    }

    public function accessOverview(Request $request)
    {
        $user = $request->user();
        abort_unless($user->hasRole('PATIENT'), 403);
        $ids = DB::table('patient_links')->where('user_id', $user->id)->pluck('patient_record_id');
        $grants = DB::table('sharing_grants as g')->join('users as u', 'u.id', '=', 'g.recipient_id')->leftJoin('organizations as o', 'o.id', '=', 'g.organization_id')
            ->whereIn('g.patient_record_id', $ids)->whereNull('g.revoked_at')->where('g.expires_at', '>', now())
            ->select('g.id', 'g.resource_type', 'g.action', 'g.expires_at', 'g.scopes', 'g.created_via', 'g.appointment_id', 'g.organization_id', 'u.name as recipient_name', 'o.name as organization_name', 'o.type as organization_type')
            ->orderByDesc('g.created_at')->get();
        $grouped = $grants->groupBy(fn ($g) => ($g->organization_id ?: $g->recipient_name).'|'.$g->resource_type.'|'.$g->action)->map(fn ($rows) => tap($rows->first(), function ($g) { $g->scopes = json_decode($g->scopes ?? 'null', true); }))->values();
        $staffIds = DB::table('sharing_grants')->whereIn('patient_record_id', $ids)->pluck('recipient_id')->unique();
        $log = DB::table('audit_events as a')->join('users as u', 'u.id', '=', 'a.actor_user_id')->whereIn('a.actor_user_id', $staffIds)
            ->whereIn('a.action', ['CLINICAL_PRESCRIPTION_VIEWED', 'LAB_REPORT_VIEWED', 'MEDICINE_DISPENSED', 'TEST_ORDER_ACCEPTED', 'LAB_REPORT_RELEASED', 'PATIENT_RECORD_VIEWED_BY_DOCTOR'])
            ->orderByDesc('a.created_at')->limit(50)->get(['u.name as actor', 'a.action', 'a.entity_type', 'a.created_at']);
        return response()->json(['grants' => $grouped, 'access_log' => $log]);
    }

    /* ---------------- Doctor queue & patient view ---------------- */
    public static function needsAttention(string $recordId, ?string $doctorId = null): array
    {
        $reasons = [];
        $courses = DB::table('medication_courses as c')->join('prescription_items as i', 'i.id', '=', 'c.prescription_item_id')->join('prescriptions as p', 'p.id', '=', 'i.prescription_id')
            ->where('c.patient_record_id', $recordId)->where('c.status', 'ACTIVE')->when($doctorId, fn ($q) => $q->where('p.doctor_id', $doctorId))->pluck('c.id');
        foreach ($courses as $cid) {
            $last = DB::table('dose_events')->where('medication_course_id', $cid)->where('scheduled_at', '<=', now())->where('status', '!=', 'CANCELLED')->orderByDesc('scheduled_at')->limit(2)->pluck('status');
            if ($last->count() === 2 && $last->every(fn ($s) => in_array($s, ['MISSED', 'SKIPPED'], true))) { $reasons[] = '2 consecutive missed doses'; break; }
        }
        if (DB::table('medication_problem_reports')->where('patient_record_id', $recordId)->where('status', 'OPEN')->exists()) $reasons[] = 'Open side-effect report';
        return $reasons;
    }

    public function doctorQueue(Request $request)
    {
        $doctor = $request->user();
        abort_unless($doctor->hasRole('DOCTOR'), 403);
        $date = $request->validate(['date' => 'nullable|date_format:Y-m-d'])['date'] ?? now(AppointmentController::TZ)->format('Y-m-d');
        $day = CarbonImmutable::parse($date, AppointmentController::TZ);
        return DB::table('appointments as a')->join('patient_records as p', 'p.id', '=', 'a.patient_record_id')->leftJoin('organizations as o', 'o.id', '=', 'a.organization_id')
            ->where('a.doctor_id', $doctor->id)->whereIn('a.status', ['CONFIRMED', 'BOOKED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW'])
            ->whereBetween('a.scheduled_at', [$day->startOfDay()->utc()->toDateTimeString(), $day->endOfDay()->utc()->toDateTimeString()])
            ->orderByRaw('COALESCE(a.serial_number, 999)')->orderBy('a.scheduled_at')
            ->get(['a.id', 'a.status', 'a.serial_number', 'a.scheduled_at', 'a.visit_reason', 'a.patient_record_id', 'p.name', 'p.date_of_birth', 'p.estimated_age', 'p.sex', 'p.phone_number', 'o.name as organization_name'])
            ->map(function ($a) use ($doctor) {
                $a->age = self::age($a->date_of_birth) ?? $a->estimated_age; $a->phone = self::maskPhone($a->phone_number); unset($a->phone_number, $a->date_of_birth, $a->estimated_age);
                $a->needs_attention = CareTeamController::doctorCanAccess($doctor->id, $a->patient_record_id) ? self::needsAttention($a->patient_record_id, $doctor->id) : [];
                return $a;
            });
    }

    public function doctorPatient(Request $request, string $recordId)
    {
        $doctor = $request->user();
        abort_unless($doctor->hasRole('DOCTOR') && CareTeamController::doctorCanAccess($doctor->id, $recordId), 404);
        $scopes = collect(DB::table('sharing_grants')->where('recipient_id', $doctor->id)->where('patient_record_id', $recordId)->whereIn('resource_type', ['ENCOUNTER'])
            ->whereNull('revoked_at')->where('expires_at', '>', now())->pluck('scopes'))->flatMap(fn ($s) => json_decode($s ?? '[]', true) ?: self::SCOPES)->unique()->values()->all();
        if (DB::table('patient_records')->where('id', $recordId)->where('created_by', $doctor->id)->exists()) $scopes = self::SCOPES;
        $p = DB::table('patient_records')->find($recordId, ['id', 'name', 'date_of_birth', 'estimated_age', 'sex', 'allergy_status', 'allergies', 'phone_number']);
        AuditEvent::create(['actor_user_id' => $doctor->id, 'action' => 'PATIENT_RECORD_VIEWED_BY_DOCTOR', 'entity_type' => 'patient_record', 'entity_id' => $recordId]);
        $out = ['profile' => ['id' => $p->id, 'name' => $p->name, 'age' => self::age($p->date_of_birth) ?? $p->estimated_age, 'sex' => $p->sex, 'allergy_status' => $p->allergy_status,
            'allergies' => $p->allergies, 'phone' => self::maskPhone($p->phone_number)], 'scopes' => $scopes, 'needs_attention' => self::needsAttention($recordId, $doctor->id)];
        if (in_array('PRESCRIPTIONS', $scopes, true) || in_array('HISTORY', $scopes, true)) {
            $out['prescriptions'] = DB::table('prescriptions')->where('patient_record_id', $recordId)->orderByDesc('issued_at')->limit(20)->get(['id', 'status', 'diagnosis', 'issued_at', 'superseded_at', 'cancelled_at', 'doctor_snapshot'])
                ->map(function ($r) { $r->doctor_snapshot = json_decode($r->doctor_snapshot, true); $r->items = DB::table('prescription_items')->where('prescription_id', $r->id)->get(['generic_name', 'strength', 'dose', 'duration_days', 'is_antibiotic']); return $r; });
            $out['courses'] = DB::table('medication_courses as c')->join('prescription_items as i', 'i.id', '=', 'c.prescription_item_id')->where('c.patient_record_id', $recordId)
                ->get(['c.id', 'c.status', 'c.actual_start_at', 'c.completion_status', 'i.generic_name', 'i.dose'])->map(function ($c) { $c->summary = CourseController::summary($c->id); return $c; });
            $out['problems'] = DB::table('medication_problem_reports')->where('patient_record_id', $recordId)->orderByDesc('created_at')->limit(20)->get(['id', 'symptoms', 'status', 'contact_action', 'created_at', 'review_note']);
        }
        if (in_array('REPORTS', $scopes, true)) {
            $out['reports'] = DB::table('lab_reports as r')->join('test_orders as t', 't.id', '=', 'r.test_order_id')->where('r.patient_record_id', $recordId)->where('r.status', 'RELEASED')
                ->get(['r.id', 't.test_name', 'r.observations', 'r.released_at']);
        }
        return response()->json($out);
    }
}
