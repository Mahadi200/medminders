<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\ClinicianCredential;
use Illuminate\Http\Request;
use App\Models\AuditEvent;
use Illuminate\Support\Facades\Storage;

class DoctorController extends Controller
{
    public function index()
    {
        return ClinicianCredential::with('user:id,name')->where('is_published', true)->where('verification_status', 'VERIFIED')
            ->get(['id', 'user_id', 'specialty', 'qualifications', 'experience_years', 'biography', 'chamber', 'hospital_clinic', 'fee_bdt', 'schedule', 'appointment_contact', 'photo_path'])
            ->each(fn ($profile) => $profile->setAttribute('has_photo', (bool) $profile->photo_path)->setAttribute('verification_label', 'BMDC registration reviewed by MedMinders')
                ->setAttribute('affiliations', AffiliationController::publicFor($profile->user_id))->makeHidden('photo_path'));
    }

    public function show(string $id)
    {
        $profile = ClinicianCredential::with('user:id,name')->where('is_published', true)->where('verification_status', 'VERIFIED')
            ->select(['id', 'user_id', 'specialty', 'qualifications', 'experience_years', 'biography', 'chamber', 'hospital_clinic', 'fee_bdt', 'schedule', 'appointment_contact', 'photo_path'])->findOrFail($id);
        return $profile->setAttribute('has_photo', (bool) $profile->photo_path)->setAttribute('verification_label', 'BMDC registration reviewed by MedMinders')
            ->setAttribute('affiliations', AffiliationController::publicFor($profile->user_id))->makeHidden('photo_path');
    }

    public function photo(string $id)
    {
        $profile = ClinicianCredential::where('is_published', true)->where('verification_status', 'VERIFIED')->findOrFail($id);
        abort_unless($profile->photo_path && Storage::disk('local')->exists($profile->photo_path), 404);
        $stream = Storage::disk('local')->readStream($profile->photo_path);
        $mime = Storage::disk('local')->mimeType($profile->photo_path);
        return response()->stream(fn () => fpassthru($stream), 200, ['Content-Type' => $mime, 'Cache-Control' => 'public, max-age=300']);
    }

    public function updatePhoto(Request $request)
    {
        abort_unless($request->user()->hasRole('DOCTOR'), 403);
        $request->validate(['photo' => 'required|image|mimes:jpeg,png,webp|max:2048']);
        $profile = $request->user()->clinicianCredential;
        $old = $profile->photo_path;
        $profile->update(['photo_path' => $request->file('photo')->store('doctor-photos', 'local')]);
        if ($old) Storage::disk('local')->delete($old);
        return response()->json(['has_photo' => true]);
    }

    public function me(Request $request)
    {
        abort_unless($request->user()->hasRole('DOCTOR'), 403);
        return $request->user()->clinicianCredential;
    }

    public function update(Request $request)
    {
        abort_unless($request->user()->hasRole('DOCTOR'), 403);
        $data = $request->validate([
            'specialty' => 'sometimes|nullable|string|max:191', 'qualifications' => 'sometimes|nullable|string|max:3000',
            'experience_years' => 'sometimes|nullable|integer|min:0|max:80', 'biography' => 'sometimes|nullable|string|max:5000',
            'chamber' => 'sometimes|nullable|string|max:191', 'hospital_clinic' => 'sometimes|required|string|max:191',
            'fee_bdt' => 'sometimes|nullable|numeric|min:0|max:999999', 'schedule' => 'sometimes|nullable|array',
            'appointment_contact' => 'sometimes|nullable|string|max:191', 'is_published' => 'sometimes|boolean',
        ]);
        $credential = $request->user()->clinicianCredential()->firstOrFail();
        if (array_key_exists('is_published', $data) && $data['is_published'] && $credential->verification_status !== 'VERIFIED') {
            return response()->json(['message' => 'BMDC verification is required before publication.'], 422);
        }
        $credential->update($data);
        return $credential->refresh();
    }

    public function review(Request $request, string $id)
    {
        abort_unless($request->user()->hasRole('SUPERADMIN'), 403);
        $data = $request->validate(['decision' => 'required|in:VERIFIED,REJECTED,SUSPENDED', 'review_note' => 'required|string|max:2000']);
        $credential = ClinicianCredential::findOrFail($id);
        $credential->update(['verification_status' => $data['decision'], 'verified_by' => $request->user()->id,
            'verified_at' => $data['decision'] === 'VERIFIED' ? now() : null,
            'is_published' => $data['decision'] === 'VERIFIED' ? $credential->is_published : false]);
        AuditEvent::create(['actor_user_id' => $request->user()->id, 'target_user_id' => $credential->user_id,
            'action' => 'DOCTOR_CREDENTIAL_REVIEWED', 'entity_type' => 'clinician_credential', 'entity_id' => $id,
            'metadata' => ['decision' => $data['decision'], 'review_note' => $data['review_note']]]);
        return response()->json(['verification_status' => $credential->verification_status]);
    }
}
