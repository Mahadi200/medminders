<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\Prescription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ClinicalPrescriptionController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $ownRecords = DB::table('patient_links')->where('user_id', $user->id)->pluck('patient_record_id');
        return Prescription::with('items')->where(function ($q) use ($user, $ownRecords) {
            $q->whereIn('patient_record_id', $ownRecords)->orWhere('patient_id', $user->id)->orWhere('doctor_id', $user->id);
        })->latest()->paginate(20);
    }

    public function show(Request $request, Prescription $prescription)
    {
        $user = $request->user();
        $allowed = $prescription->doctor_id === $user->id
            || $prescription->patient_id === $user->id
            || SharingController::owns($user->id, $prescription->patient_record_id)
            || SharingController::granted($user->id, $prescription->patient_record_id, 'PRESCRIPTION', $prescription->id, 'VIEW')
            || SharingController::granted($user->id, $prescription->patient_record_id, 'PRESCRIPTION', $prescription->id, 'DISPENSE');
        abort_unless($allowed, 404);
        AuditEvent::create(['actor_user_id' => $user->id, 'action' => 'CLINICAL_PRESCRIPTION_VIEWED', 'entity_type' => 'prescription', 'entity_id' => $prescription->id]);
        return $prescription->load('items');
    }

    public function store(Request $request)
    {
        $doctor = $request->user();
        abort_unless($doctor->hasRole('DOCTOR') && $doctor->clinicianCredential?->verification_status === 'VERIFIED', 403);
        $data = $request->validate([
            'patient_record_id' => 'required|ulid|exists:patient_records,id',
            'template' => 'required|in:OUTPATIENT,FOLLOW_UP,CHRONIC_REVIEW,ADVICE_ONLY',
            'diagnosis' => 'nullable|string|max:5000', 'clinical_details' => 'nullable|array',
            'clinical_details.complaints' => 'nullable|string|max:5000', 'clinical_details.history' => 'nullable|string|max:5000',
            'clinical_details.examination' => 'nullable|string|max:5000', 'clinical_details.advice' => 'nullable|string|max:5000',
            'clinical_details.follow_up' => 'nullable|string|max:5000',
            'items' => 'present|array|max:30', 'tests' => 'present|array|max:30', 'tests.*' => 'required|string|max:191',
            'items.*.generic_name' => 'required|string|max:191', 'items.*.brand_name' => 'nullable|string|max:191',
            'items.*.strength' => 'required|string|max:100', 'items.*.dosage_form' => 'required|string|max:100',
            'items.*.dose' => 'required|string|max:100', 'items.*.route' => 'required|string|max:100',
            'items.*.schedule_type' => 'required|in:EXPLICIT_TIMES,EVERY_N_HOURS,UNSCHEDULED',
            'items.*.schedule_details' => 'required|array', 'items.*.duration_days' => 'nullable|integer|min:1|max:365',
            'items.*.review_date' => 'nullable|date', 'items.*.quantity' => 'nullable|integer|min:1',
            'items.*.instructions' => 'nullable|string|max:3000', 'items.*.is_antibiotic' => 'required|boolean',
            'items.*.indication' => 'nullable|string|max:1000', 'appointment_id' => 'nullable|ulid',
        ]);
        $patient = DB::table('patient_records')->find($data['patient_record_id']);
        if (! count($data['items']) && ! count($data['tests'])) throw ValidationException::withMessages(['items' => 'Add a medicine or investigation.']);
        $authorized = $patient->created_by === $doctor->id
            || DB::table('sharing_grants')->where('recipient_id', $doctor->id)->where('patient_record_id', $patient->id)
                ->where('resource_type', 'ENCOUNTER')->where('action', 'REVIEW')->whereNull('revoked_at')->where('expires_at', '>', now())->exists();
        abort_unless($authorized, 403);
        foreach ($data['items'] as $index => $item) {
            if ($item['is_antibiotic'] && (empty($item['indication']) || empty($item['duration_days']) && empty($item['review_date']) || $patient->allergy_status === 'UNKNOWN')) {
                throw ValidationException::withMessages(["items.$index" => 'Antibiotic indication, duration or review date, and allergy review are required.']);
            }
            if ($item['schedule_type'] === 'EXPLICIT_TIMES') {
                $times = $item['schedule_details']['times'] ?? [];
                if (! is_array($times) || ! count($times) || count($times) > 12 || collect($times)->contains(fn ($time) => ! preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', (string) $time)) || count(array_unique($times)) !== count($times)) {
                    throw ValidationException::withMessages(["items.$index.schedule_details" => 'Supply distinct 24-hour times.']);
                }
            }
            if ($item['schedule_type'] === 'EVERY_N_HOURS' && (! is_int($item['schedule_details']['hours'] ?? null) || $item['schedule_details']['hours'] < 1 || $item['schedule_details']['hours'] > 24)) {
                throw ValidationException::withMessages(["items.$index.schedule_details" => 'Supply an explicit interval from 1 to 24 hours.']);
            }
            if ($item['is_antibiotic'] && $item['schedule_type'] === 'UNSCHEDULED') {
                throw ValidationException::withMessages(["items.$index.schedule_type" => 'Clarify the antibiotic schedule before issuance.']);
            }
        }
        return DB::transaction(function () use ($doctor, $patient, $data) {
            $prescription = Prescription::create([
                'patient_record_id' => $patient->id, 'doctor_id' => $doctor->id, 'template' => $data['template'],
                'diagnosis' => $data['diagnosis'] ?? null, 'clinical_details' => $data['clinical_details'] ?? [],
                'patient_snapshot' => ['id' => $patient->id, 'name' => $patient->name, 'date_of_birth' => $patient->date_of_birth, 'estimated_age' => $patient->estimated_age],
                'doctor_snapshot' => ['id' => $doctor->id, 'name' => $doctor->name, 'bmdc_number' => $doctor->clinicianCredential->bmdc_number, 'verification_status' => 'VERIFIED'],
                'status' => 'SIGNED', 'issued_at' => now(),
            ]);
            foreach ($data['items'] as $item) {
                $line = $prescription->items()->create($item + ['aware_group' => 'UNKNOWN']);
                if ($line->is_antibiotic) DB::table('medication_courses')->insert([
                    'id' => (string) Str::ulid(), 'prescription_item_id' => $line->id, 'patient_record_id' => $patient->id,
                    'timezone' => 'Asia/Dhaka', 'status' => 'AWAITING_START', 'created_at' => now(), 'updated_at' => now(),
                ]);
            }
            foreach ($data['tests'] as $test) DB::table('test_orders')->insert([
                'id' => (string) Str::ulid(), 'prescription_id' => $prescription->id, 'patient_record_id' => $patient->id,
                'test_name' => $test, 'status' => 'ORDERED', 'created_at' => now(), 'updated_at' => now(),
            ]);
            AuditEvent::create(['actor_user_id' => $doctor->id, 'action' => 'PRESCRIPTION_ISSUED', 'entity_type' => 'prescription', 'entity_id' => $prescription->id]);
            if (! empty($data['appointment_id'])) {
                $appt = DB::table('appointments')->where('id', $data['appointment_id'])->where('doctor_id', $doctor->id)->where('patient_record_id', $patient->id)
                    ->whereIn('status', ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'])->first();
                if ($appt) {
                    DB::table('appointments')->where('id', $appt->id)->update(['status' => 'COMPLETED', 'completed_at' => now(), 'updated_at' => now()]);
                    AppointmentController::history($appt->id, $appt->status, 'COMPLETED', $doctor->id, 'Prescription issued');
                    AppointmentController::extendConsultationGrant($appt->id);
                }
            }
            foreach (DB::table('patient_links')->where('patient_record_id', $patient->id)->pluck('user_id') as $patientUser) {
                app(\App\Services\CareNotificationService::class)->create($patientUser, 'PRESCRIPTION_ISSUED', 'INFORMATION', 'NORMAL', 'PRESCRIPTION', $prescription->id, '/patient-login#dashboard-prescriptions', ['message' => 'Dr. '.$doctor->name.' issued a new prescription. Confirm your first antibiotic dose when you actually take it.']);
            }
            return response()->json($prescription->load('items'), 201);
        });
    }

    public function amend(Request $request, Prescription $prescription)
    {
        $reason = $request->validate(['amendment_reason' => 'required|string|max:2000'])['amendment_reason'];
        $doctor = $request->user();
        abort_unless($prescription->doctor_id === $doctor->id && $doctor->clinicianCredential?->verification_status === 'VERIFIED', 403);
        abort_unless($prescription->status === 'SIGNED' && ! $prescription->superseded_at && ! $prescription->cancelled_at, 422);
        $request->merge(['patient_record_id' => $prescription->patient_record_id]);
        return DB::transaction(function () use ($request, $prescription, $reason, $doctor) {
            $response = $this->store($request);
            $newId = $response->getData(true)['id'];
            Prescription::whereKey($newId)->update(['supersedes_id' => $prescription->id, 'amendment_reason' => $reason]);
            $prescription->update(['superseded_at' => now()]);
            $courseIds = DB::table('medication_courses')->join('prescription_items', 'prescription_items.id', '=', 'medication_courses.prescription_item_id')
                ->where('prescription_items.prescription_id', $prescription->id)->pluck('medication_courses.id');
            DB::table('medication_courses')->whereIn('id', $courseIds)->update(['status' => 'CHANGED_BY_CLINICIAN', 'stopped_at' => now(), 'stop_reason' => $reason, 'updated_at' => now()]);
            DB::table('dose_events')->whereIn('medication_course_id', $courseIds)->where('scheduled_at', '>', now())->update(['status' => 'CANCELLED', 'updated_at' => now()]);
            AuditEvent::create(['actor_user_id' => $doctor->id, 'action' => 'PRESCRIPTION_AMENDED', 'entity_type' => 'prescription', 'entity_id' => $prescription->id, 'metadata' => ['new_id' => $newId, 'reason' => $reason]]);
            return response()->json(Prescription::with('items')->find($newId), 201);
        });
    }

    public function cancel(Request $request, Prescription $prescription)
    {
        $reason = $request->validate(['reason' => 'required|string|max:2000'])['reason'];
        $doctor = $request->user();
        abort_unless($prescription->doctor_id === $doctor->id && $doctor->clinicianCredential?->verification_status === 'VERIFIED', 403);
        abort_unless($prescription->status === 'SIGNED' && ! $prescription->superseded_at && ! $prescription->cancelled_at, 422);
        DB::transaction(function () use ($prescription, $doctor, $reason) {
            $prescription->update(['status' => 'CANCELLED', 'cancelled_at' => now(), 'amendment_reason' => $reason]);
            $courseIds = DB::table('medication_courses')->join('prescription_items', 'prescription_items.id', '=', 'medication_courses.prescription_item_id')
                ->where('prescription_items.prescription_id', $prescription->id)->pluck('medication_courses.id');
            DB::table('medication_courses')->whereIn('id', $courseIds)->update(['status' => 'STOPPED_BY_CLINICIAN', 'stopped_at' => now(), 'stop_reason' => $reason, 'updated_at' => now()]);
            DB::table('dose_events')->whereIn('medication_course_id', $courseIds)->where('scheduled_at', '>', now())->update(['status' => 'CANCELLED', 'updated_at' => now()]);
            AuditEvent::create(['actor_user_id' => $doctor->id, 'action' => 'PRESCRIPTION_CANCELLED', 'entity_type' => 'prescription', 'entity_id' => $prescription->id, 'metadata' => ['reason' => $reason]]);
        });
        return response()->json(['status' => 'CANCELLED']);
    }
}
