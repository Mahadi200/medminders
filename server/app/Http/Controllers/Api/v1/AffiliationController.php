<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Services\CareNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/** Doctor ↔ hospital/branch affiliations. Linked by organization ID; a hospital must confirm before patients can book. */
class AffiliationController extends Controller
{
    private const DAYS = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'];

    public function __construct(private readonly CareNotificationService $notifications) {}

    public function mine(Request $request)
    {
        abort_unless($request->user()->hasRole('DOCTOR'), 403);
        return DB::table('doctor_affiliations as a')->join('organizations as o', 'o.id', '=', 'a.organization_id')
            ->where('a.doctor_id', $request->user()->id)->select('a.*', 'o.name as organization_name', 'o.address as organization_address')->orderBy('o.name')->get()
            ->map(fn ($a) => $this->decode($a));
    }

    public function upsert(Request $request)
    {
        $user = $request->user();
        abort_unless($user->hasRole('DOCTOR'), 403);
        $data = $request->validate([
            'organization_id' => 'required|ulid|exists:organizations,id', 'branch_label' => 'nullable|string|max:191',
            'visiting_days' => 'required|array|min:1|max:7', 'visiting_days.*' => 'in:'.implode(',', self::DAYS),
            'start_time' => ['required', 'regex:/^([01]\d|2[0-3]):[0-5]\d$/'], 'end_time' => ['required', 'regex:/^([01]\d|2[0-3]):[0-5]\d$/'],
            'slot_minutes' => 'required|integer|in:10,15,20,30,45,60', 'fee_bdt' => 'nullable|numeric|min:0|max:100000',
        ]);
        abort_unless($data['start_time'] < $data['end_time'], 422, 'End time must be after start time.');
        abort_unless(DB::table('organizations')->where('id', $data['organization_id'])->whereIn('type', ['HOSPITAL', 'DIAGNOSTIC'])->where('status', 'APPROVED')->exists(), 422, 'Choose an approved hospital or diagnostic centre.');
        $existing = DB::table('doctor_affiliations')->where('doctor_id', $user->id)->where('organization_id', $data['organization_id'])->first();
        $row = ['branch_label' => $data['branch_label'] ?? null, 'visiting_days' => json_encode(array_values(array_unique($data['visiting_days']))),
            'start_time' => $data['start_time'], 'end_time' => $data['end_time'], 'slot_minutes' => $data['slot_minutes'], 'fee_bdt' => $data['fee_bdt'] ?? null,
            // Any schedule change requires the hospital to confirm again.
            'status' => 'PENDING', 'decided_by' => null, 'decided_at' => null, 'decision_note' => null, 'updated_at' => now()];
        $id = $existing?->id ?? (string) Str::ulid();
        if ($existing) DB::table('doctor_affiliations')->where('id', $id)->update($row);
        else DB::table('doctor_affiliations')->insert($row + ['id' => $id, 'doctor_id' => $user->id, 'organization_id' => $data['organization_id'], 'created_at' => now()]);
        AuditEvent::create(['actor_user_id' => $user->id, 'action' => 'AFFILIATION_SUBMITTED', 'entity_type' => 'doctor_affiliation', 'entity_id' => $id]);
        foreach (DB::table('organization_memberships')->where('organization_id', $data['organization_id'])->where('is_active', true)->where('role', 'HOSPITAL_ADMIN')->pluck('user_id') as $admin) {
            $this->notifications->create($admin, 'AFFILIATION_REQUESTED', 'ACTION_REQUIRED', 'NORMAL', 'DOCTOR_AFFILIATION', $id, '/hospital-login#dashboard-status',
                ['message' => $user->name.' submitted a visiting schedule for confirmation.'], 'AFFILIATION:'.$id.':'.now()->timestamp);
        }
        return response()->json(['id' => $id, 'status' => 'PENDING'], $existing ? 200 : 201);
    }

    public function forOrganization(Request $request)
    {
        $orgIds = DB::table('organization_memberships')->where('user_id', $request->user()->id)->where('is_active', true)->where('role', 'HOSPITAL_ADMIN')->pluck('organization_id');
        abort_if($orgIds->isEmpty(), 403);
        return DB::table('doctor_affiliations as a')->join('users as u', 'u.id', '=', 'a.doctor_id')
            ->leftJoin('clinician_credentials as c', 'c.user_id', '=', 'a.doctor_id')->whereIn('a.organization_id', $orgIds)
            ->select('a.*', 'u.name as doctor_name', 'c.bmdc_number', 'c.verification_status', 'c.specialty')->orderBy('a.status')->get()
            ->map(fn ($a) => $this->decode($a));
    }

    public function decide(Request $request, string $id)
    {
        $data = $request->validate(['decision' => 'required|in:CONFIRMED,REJECTED,ENDED', 'note' => 'nullable|string|max:500']);
        $aff = DB::table('doctor_affiliations')->find($id);
        abort_unless($aff, 404);
        abort_unless(DB::table('organization_memberships')->where('user_id', $request->user()->id)->where('organization_id', $aff->organization_id)
            ->where('is_active', true)->where('role', 'HOSPITAL_ADMIN')->exists(), 403);
        DB::table('doctor_affiliations')->where('id', $id)->update(['status' => $data['decision'], 'decided_by' => $request->user()->id,
            'decided_at' => now(), 'decision_note' => $data['note'] ?? null, 'updated_at' => now()]);
        AuditEvent::create(['actor_user_id' => $request->user()->id, 'action' => 'AFFILIATION_'.$data['decision'], 'entity_type' => 'doctor_affiliation', 'entity_id' => $id]);
        $this->notifications->create($aff->doctor_id, 'AFFILIATION_'.$data['decision'], 'INFORMATION', 'NORMAL', 'DOCTOR_AFFILIATION', $id, '/doctor-login#dashboard-profile',
            ['message' => 'Your visiting schedule was '.strtolower($data['decision']).' by the hospital.'], 'AFFILIATION_DECISION:'.$id.':'.now()->timestamp);
        return response()->json(['status' => $data['decision']]);
    }

    public static function publicFor(string $doctorId)
    {
        return DB::table('doctor_affiliations as a')->join('organizations as o', 'o.id', '=', 'a.organization_id')
            ->where('a.doctor_id', $doctorId)->where('a.status', 'CONFIRMED')->where('o.status', 'APPROVED')
            ->select('a.id', 'a.organization_id', 'a.branch_label', 'a.visiting_days', 'a.start_time', 'a.end_time', 'a.slot_minutes', 'a.fee_bdt', 'o.name as organization_name', 'o.address as organization_address')
            ->get()->map(function ($a) { $a->visiting_days = json_decode($a->visiting_days, true); return $a; });
    }

    private function decode(object $a): object
    {
        $a->visiting_days = json_decode($a->visiting_days, true);
        return $a;
    }
}
