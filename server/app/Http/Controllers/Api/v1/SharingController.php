<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Services\CareNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SharingController extends Controller
{
    public static function owns(string $userId, string $recordId): bool
    {
        return DB::table('patient_links')->where('user_id', $userId)->where('patient_record_id', $recordId)->exists();
    }

    public static function granted(string $userId, string $recordId, string $type, string $resourceId, string $action): bool
    {
        return DB::table('sharing_grants')->where('recipient_id', $userId)->where('patient_record_id', $recordId)
            ->where('resource_type', $type)->where('resource_id', $resourceId)->where('action', $action)
            ->whereNull('revoked_at')->where('expires_at', '>', now())->exists();
    }

    public function index(Request $request)
    {
        $user = $request->user();
        abort_unless($user->hasRole('PATIENT'), 403);
        $recordIds = DB::table('patient_links')->where('user_id', $user->id)->pluck('patient_record_id');
        $resourceIds = DB::table('sharing_requests')->whereIn('patient_record_id', $recordIds)->pluck('resource_id');
        return response()->json([
            'requests' => DB::table('sharing_requests as s')->join('users as u', 'u.id', '=', 's.requester_id')
                ->leftJoin('organizations as o', 'o.id', '=', 's.organization_id')->whereIn('s.patient_record_id', $recordIds)
                ->select('s.*', 'u.name as requester_name', 'o.name as organization_name')->orderByDesc('s.created_at')->limit(100)->get(),
            'grants' => DB::table('sharing_grants as g')->join('users as u', 'u.id', '=', 'g.recipient_id')->leftJoin('organizations as o', 'o.id', '=', 'g.organization_id')
                ->whereIn('g.patient_record_id', $recordIds)->select('g.*', 'u.name as recipient_name', 'o.name as organization_name', 'o.type as organization_type')
                ->orderByDesc('g.created_at')->limit(200)->get(),
            'access_history' => DB::table('audit_events')->whereIn('entity_id', $resourceIds)
                ->whereIn('action', ['CLINICAL_PRESCRIPTION_VIEWED', 'LAB_REPORT_VIEWED'])->orderByDesc('created_at')->limit(100)
                ->get(['actor_user_id', 'action', 'entity_type', 'entity_id', 'created_at']),
            'revocation_note' => 'Revocation ends future shared access. Provider-authored records and audit history remain.',
        ]);
    }

    public function request(Request $request)
    {
        $user = $request->user();
        $staffRoles = DB::table('organization_memberships')->where('user_id', $user->id)->where('is_active', true)->pluck('role');
        abort_unless($user->hasRole('DOCTOR') || $user->hasRole('PHARMACIST')
            || $staffRoles->intersect(['PHARMACY_ADMIN', 'DISPENSER', 'HOSPITAL_ADMIN', 'HOSPITAL_RECEPTION', 'LAB_STAFF', 'REPORT_REVIEWER'])->isNotEmpty(), 403);
        $data = $request->validate([
            'patient_record_id' => 'required|ulid|exists:patient_records,id', 'organization_id' => 'nullable|ulid|exists:organizations,id',
            'resource_type' => 'required|in:PRESCRIPTION,REPORT,COURSE,ENCOUNTER', 'resource_id' => 'required|ulid',
            'action' => 'required|in:VIEW,DISPENSE,REVIEW', 'purpose' => 'required|string|max:191',
            'duration_minutes' => 'required|integer|min:5|max:10080',
        ]);
        if ($staffRoles->isNotEmpty() && ! $user->hasRole('DOCTOR')) abort_unless($data['organization_id'] ?? null, 422);
        if ($data['organization_id'] ?? null) abort_unless(DB::table('organization_memberships')->where('user_id', $user->id)->where('organization_id', $data['organization_id'])->where('is_active', true)->exists(), 403);
        if ($staffRoles->intersect(['PHARMACY_ADMIN', 'DISPENSER'])->isNotEmpty()) {
            abort_unless(in_array($data['resource_type'], ['PRESCRIPTION', 'COURSE', 'REPORT']) && in_array($data['action'], ['VIEW', 'DISPENSE']), 403);
        }
        $table = match ($data['resource_type']) { 'PRESCRIPTION' => 'prescriptions', 'COURSE' => 'medication_courses', 'REPORT' => 'lab_reports', 'ENCOUNTER' => 'patient_records', default => null };
        if (! $table) return response()->json(['message' => 'This resource type is not yet available.'], 422);
        $valid = match ($data['resource_type']) {
            'COURSE' => DB::table('medication_courses')->where('id', $data['resource_id'])->where('patient_record_id', $data['patient_record_id'])->exists(),
            'REPORT' => DB::table('lab_reports')->where('id', $data['resource_id'])->where('patient_record_id', $data['patient_record_id'])->where('status', 'RELEASED')->exists(),
            'ENCOUNTER' => $data['resource_id'] === $data['patient_record_id'],
            default => DB::table('prescriptions')->where('id', $data['resource_id'])->where('patient_record_id', $data['patient_record_id'])->where('status', 'SIGNED')->exists(),
        };
        abort_unless($valid, 404);
        $id = (string) Str::ulid();
        DB::table('sharing_requests')->insert($data + ['id' => $id, 'requester_id' => $user->id, 'status' => 'PENDING', 'expires_at' => now()->addHours(24), 'created_at' => now(), 'updated_at' => now()]);
        foreach (DB::table('patient_links')->where('patient_record_id', $data['patient_record_id'])->pluck('user_id') as $patientUser) {
            app(CareNotificationService::class)->create($patientUser, 'SHARING_REQUESTED', 'ACTION_REQUIRED', 'NORMAL', 'SHARING_REQUEST', $id, '/patient-login#dashboard-sharing', ['message' => $user->name.' requested '.$data['action'].' access to a '.strtolower($data['resource_type']).'.']);
        }
        return response()->json(['id' => $id, 'status' => 'PENDING'], 201);
    }

    public function decide(Request $request, string $id)
    {
        $data = $request->validate(['decision' => 'required|in:APPROVE,DENY']);
        return DB::transaction(function () use ($request, $id, $data) {
            $share = DB::table('sharing_requests')->where('id', $id)->lockForUpdate()->first();
            abort_unless($share && self::owns($request->user()->id, $share->patient_record_id), 404);
            abort_unless($share->status === 'PENDING' && now()->lessThan($share->expires_at), 422);
            DB::table('sharing_requests')->where('id', $id)->update(['status' => $data['decision'] === 'APPROVE' ? 'APPROVED' : 'DENIED', 'updated_at' => now()]);
            if ($data['decision'] === 'APPROVE') DB::table('sharing_grants')->insert([
                'id' => (string) Str::ulid(), 'sharing_request_id' => $id, 'patient_record_id' => $share->patient_record_id,
                'recipient_id' => $share->requester_id, 'organization_id' => $share->organization_id,
                'resource_type' => $share->resource_type, 'resource_id' => $share->resource_id, 'action' => $share->action,
                'expires_at' => now()->addMinutes($share->duration_minutes), 'created_at' => now(), 'updated_at' => now(),
            ]);
            AuditEvent::create(['actor_user_id' => $request->user()->id, 'action' => 'SHARING_'.$data['decision'], 'entity_type' => 'sharing_request', 'entity_id' => $id]);
            app(CareNotificationService::class)->create($share->requester_id, 'SHARING_'.$data['decision'].'D', 'INFORMATION', 'NORMAL', 'SHARING_REQUEST', $id, null, ['message' => 'The patient '.($data['decision'] === 'APPROVE' ? 'approved' : 'declined').' your '.$share->action.' access request.']);
            return response()->json(['status' => $data['decision']]);
        });
    }

    public function revoke(Request $request, string $id)
    {
        $grant = DB::table('sharing_grants')->where('id', $id)->first();
        abort_unless($grant && self::owns($request->user()->id, $grant->patient_record_id), 404);
        DB::table('sharing_grants')->where('patient_record_id', $grant->patient_record_id)->where('resource_type', $grant->resource_type)
            ->where('resource_id', $grant->resource_id)->where('action', $grant->action)
            ->where(fn ($q) => $grant->organization_id ? $q->where('organization_id', $grant->organization_id) : $q->where('id', $grant->id))
            ->whereNull('revoked_at')->update(['revoked_at' => now(), 'updated_at' => now()]);
        AuditEvent::create(['actor_user_id' => $request->user()->id, 'action' => 'SHARING_REVOKED', 'entity_type' => 'sharing_grant', 'entity_id' => $id]);
        return response()->json(['ok' => true]);
    }

    /**
     * Patient-initiated, scoped share with an approved organization (pharmacy dispensing, hospital test orders).
     * One request/grant pair is recorded per active, appropriately-roled member so every access stays individually attributable.
     */
    public function share(Request $request, CareNotificationService $notifications)
    {
        $user = $request->user();
        abort_unless($user->hasRole('PATIENT'), 403);
        $data = $request->validate([
            'organization_id' => 'required|ulid|exists:organizations,id',
            'resource_type' => 'required|in:PRESCRIPTION,REPORT',
            'resource_id' => 'required|ulid', 'action' => 'required|in:VIEW,DISPENSE',
            'duration_minutes' => 'required|integer|min:30|max:43200',
        ]);
        $org = DB::table('organizations')->find($data['organization_id']);
        abort_unless($org->status === 'APPROVED', 422, 'This organization has not completed review.');
        $table = $data['resource_type'] === 'PRESCRIPTION' ? 'prescriptions' : 'lab_reports';
        $resource = DB::table($table)->find($data['resource_id']);
        abort_unless($resource && self::owns($user->id, $resource->patient_record_id), 404);
        if ($data['resource_type'] === 'PRESCRIPTION') abort_unless($resource->status === 'SIGNED' && ! $resource->superseded_at && ! $resource->cancelled_at, 422, 'Only a current issued prescription can be shared.');
        else abort_unless($resource->status === 'RELEASED', 422);
        if ($data['action'] === 'DISPENSE') abort_unless($org->type === 'PHARMACY' && $data['resource_type'] === 'PRESCRIPTION', 422, 'Dispensing access can only be shared with a pharmacy.');
        $roles = $org->type === 'PHARMACY' ? ['PHARMACY_ADMIN', 'DISPENSER']
            : ['HOSPITAL_ADMIN', 'HOSPITAL_RECEPTION', 'LAB_STAFF', 'REPORT_REVIEWER', 'BILLING'];
        $members = DB::table('organization_memberships')->where('organization_id', $org->id)->where('is_active', true)->whereIn('role', $roles)->distinct()->pluck('user_id');
        abort_if($members->isEmpty(), 422, 'This organization has no active staff to receive the share.');
        $expires = now()->addMinutes($data['duration_minutes']);
        DB::transaction(function () use ($members, $data, $resource, $user, $org, $expires, $notifications) {
            foreach ($members as $memberId) {
                $exists = DB::table('sharing_grants')->where('recipient_id', $memberId)->where('organization_id', $org->id)->where('resource_type', $data['resource_type'])
                    ->where('resource_id', $resource->id)->where('action', $data['action'])->whereNull('revoked_at')->where('expires_at', '>', now())->exists();
                if ($exists) continue;
                $requestId = (string) Str::ulid();
                DB::table('sharing_requests')->insert(['id' => $requestId, 'patient_record_id' => $resource->patient_record_id, 'requester_id' => $user->id,
                    'organization_id' => $org->id, 'resource_type' => $data['resource_type'], 'resource_id' => $resource->id, 'action' => $data['action'],
                    'purpose' => 'Patient-initiated share', 'duration_minutes' => $data['duration_minutes'], 'status' => 'APPROVED',
                    'expires_at' => $expires, 'created_at' => now(), 'updated_at' => now()]);
                DB::table('sharing_grants')->insert(['id' => (string) Str::ulid(), 'sharing_request_id' => $requestId, 'patient_record_id' => $resource->patient_record_id,
                    'recipient_id' => $memberId, 'organization_id' => $org->id, 'resource_type' => $data['resource_type'], 'resource_id' => $resource->id,
                    'action' => $data['action'], 'expires_at' => $expires, 'created_at' => now(), 'updated_at' => now()]);
                $notifications->create($memberId, 'PATIENT_SHARED_RECORD', 'ACTION_REQUIRED', 'NORMAL', $data['resource_type'], $resource->id, null,
                    ['message' => 'A patient shared a '.strtolower($data['resource_type']).' for '.$data['action'].'.'], 'SHARED:'.$data['action'].':'.$resource->id.':'.$expires->timestamp);
            }
            AuditEvent::create(['actor_user_id' => $user->id, 'action' => 'PATIENT_SHARED_WITH_ORGANIZATION', 'entity_type' => strtolower($data['resource_type']), 'entity_id' => $resource->id,
                'metadata' => ['organization_id' => $org->id, 'action' => $data['action'], 'expires_at' => $expires->toIso8601String()]]);
        });
        return response()->json(['status' => 'SHARED', 'organization' => $org->name, 'expires_at' => $expires->toIso8601String()], 201);
    }

    /** Prescriptions shared with the current staff member through an active grant. */
    public function sharedWithMe(Request $request)
    {
        $user = $request->user();
        $grants = DB::table('sharing_grants as g')->leftJoin('organizations as o', 'o.id', '=', 'g.organization_id')
            ->where('g.recipient_id', $user->id)->whereNull('g.revoked_at')->where('g.expires_at', '>', now())
            ->where('g.resource_type', 'PRESCRIPTION')->select('g.*', 'o.name as organization_name')->get();
        $result = [];
        foreach ($grants->groupBy('resource_id') as $rxId => $rows) {
            $rx = DB::table('prescriptions')->find($rxId);
            if (! $rx) continue;
            $items = DB::table('prescription_items')->where('prescription_id', $rxId)->get()->map(function ($item) {
                $item->dispensed_quantity = (int) DB::table('dispensings')->where('prescription_item_id', $item->id)->sum('quantity');
                $item->dispensings = DB::table('dispensings')->where('prescription_item_id', $item->id)->orderBy('supplied_at')->get(['id', 'quantity', 'product', 'supplied_at', 'organization_id']);
                $item->schedule_details = json_decode($item->schedule_details, true);
                return $item;
            });
            $patient = DB::table('patient_records')->find($rx->patient_record_id);
            $result[] = ['prescription' => ['id' => $rx->id, 'status' => $rx->status, 'diagnosis' => $rx->diagnosis, 'issued_at' => $rx->issued_at,
                    'superseded_at' => $rx->superseded_at, 'cancelled_at' => $rx->cancelled_at, 'doctor_snapshot' => json_decode($rx->doctor_snapshot, true)],
                'patient' => ['id' => $patient->id, 'name' => $patient->name, 'allergy_status' => $patient->allergy_status],
                'items' => $items, 'tests' => DB::table('test_orders')->where('prescription_id', $rxId)->get(),
                'actions' => $rows->pluck('action')->unique()->values(), 'organization_id' => $rows->first()->organization_id,
                'organization_name' => $rows->first()->organization_name, 'expires_at' => $rows->max('expires_at')];
        }
        return response()->json($result);
    }

    /** Approved organizations a patient can choose when sharing (name/type only). */
    public function organizations(Request $request)
    {
        $type = $request->query('type');
        return DB::table('organizations')->where('status', 'APPROVED')
            ->when($type, fn ($q) => $q->whereIn('type', $type === 'HOSPITAL' ? ['HOSPITAL', 'DIAGNOSTIC'] : [$type]))
            ->orderBy('name')->get(['id', 'name', 'type', 'address']);
    }
}
