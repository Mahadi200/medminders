<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;
use App\Models\AuditEvent;

class PatientRecordController extends Controller
{
    public function store(Request $request)
    {
        $user = $request->user();
        $allowed = $user->hasRole('DOCTOR') || DB::table('organization_memberships')->where('user_id', $user->id)->where('is_active', true)
            ->whereIn('role', ['DOCTOR_ASSISTANT', 'HOSPITAL_RECEPTION'])->exists();
        abort_unless($allowed, 403);
        $data = $request->validate([
            'name' => 'required|string|max:191', 'phone' => 'required|string|max:32', 'email' => 'nullable|email|max:191',
            'date_of_birth' => 'nullable|date|before_or_equal:today', 'estimated_age' => 'nullable|integer|min:0|max:125',
            'allergy_status' => 'required|in:UNKNOWN,NONE_KNOWN,KNOWN', 'allergies' => 'nullable|string|max:3000',
            'history' => 'nullable|string|max:5000', 'address' => 'nullable|string|max:1000',
        ]);
        $id = (string) Str::ulid();
        $claimCode = bin2hex(random_bytes(16));
        DB::table('patient_records')->insert([
            'id' => $id, 'name' => $data['name'], 'phone_number' => PatientAccessController::phone($data['phone']),
            'email' => $data['email'] ?? null, 'date_of_birth' => $data['date_of_birth'] ?? null,
            'estimated_age' => $data['estimated_age'] ?? null, 'allergy_status' => $data['allergy_status'],
            'allergies' => $data['allergies'] ?? null, 'history' => $data['history'] ?? null,
            'address' => $data['address'] ?? null, 'created_by' => $user->id, 'created_at' => now(), 'updated_at' => now(),
            'claim_secret_hash' => Hash::make($claimCode),
        ]);
        return response()->json(['id' => $id, 'claim_code' => $claimCode,
            'claim_instruction' => 'Give this one-time invitation code directly to the patient. They must also verify their phone.'], 201);
    }

    public function show(Request $request, string $id)
    {
        $record = DB::table('patient_records')->find($id);
        abort_unless($record && (SharingController::owns($request->user()->id, $id)
            || ($request->user()->hasRole('DOCTOR') && $record->created_by === $request->user()->id)), 404);
        return collect($record)->except('claim_secret_hash');
    }

    public function update(Request $request, string $id)
    {
        $record = DB::table('patient_records')->find($id);
        abort_unless($record, 404);
        $user = $request->user();
        $authorized = SharingController::owns($user->id, $id)
            || ($user->hasRole('DOCTOR') && $record->created_by === $user->id);
        // A doctor with active patient consent may record the allergy review needed before prescribing (allergy fields only).
        $consentedDoctor = ! $authorized && $user->hasRole('DOCTOR') && CareTeamController::doctorCanAccess($user->id, $id);
        if ($consentedDoctor) $request->replace($request->only(['allergy_status', 'allergies']));
        abort_unless($authorized || $consentedDoctor, 403);
        $data = $request->validate([
            'date_of_birth' => 'sometimes|nullable|date|before_or_equal:today', 'estimated_age' => 'sometimes|nullable|integer|min:0|max:125',
            'allergy_status' => 'sometimes|in:UNKNOWN,NONE_KNOWN,KNOWN', 'allergies' => 'sometimes|nullable|string|max:3000',
            'history' => 'sometimes|nullable|string|max:5000', 'address' => 'sometimes|nullable|string|max:1000',
        ]);
        DB::table('patient_records')->where('id', $id)->update($data + ['updated_at' => now()]);
        AuditEvent::create(['actor_user_id' => $user->id, 'action' => 'PATIENT_RECORD_UPDATED', 'entity_type' => 'patient_record', 'entity_id' => $id]);
        return collect(DB::table('patient_records')->find($id))->except('claim_secret_hash');
    }
}
