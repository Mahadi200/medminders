<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Services\CareNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MedicationProblemController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = DB::table('medication_problem_reports as r')->join('medication_courses as c', 'c.id', '=', 'r.medication_course_id');
        if ($user->hasRole('PATIENT')) {
            $ids = DB::table('patient_links')->where('user_id', $user->id)->pluck('patient_record_id');
            $query->whereIn('r.patient_record_id', $ids);
        } elseif ($user->hasRole('DOCTOR')) {
            $query->join('prescription_items as i', 'i.id', '=', 'c.prescription_item_id')->join('prescriptions as p', 'p.id', '=', 'i.prescription_id')->where('p.doctor_id', $user->id);
        } else {
            abort(403);
        }
        return $query->select('r.id', 'r.medication_course_id', 'r.patient_record_id', 'r.symptoms', 'r.reported_onset_at', 'r.medicine_taken', 'r.last_dose_at', 'r.contact_action', 'r.status', 'r.review_note', 'r.reviewed_at', 'r.created_at')->orderByDesc('r.created_at')->limit(100)->get();
    }

    public function store(Request $request, CareNotificationService $notifications)
    {
        $data = $request->validate(['medication_course_id' => 'required|ulid', 'symptoms' => 'required|string|max:5000', 'reported_onset_at' => 'nullable|date', 'medicine_taken' => 'nullable|boolean', 'last_dose_at' => 'nullable|date', 'contact_action' => 'required|in:CARE_TEAM_REVIEW,URGENT_CARE,SELF_MONITOR']);
        $course = DB::table('medication_courses')->find($data['medication_course_id']);
        abort_unless($course && SharingController::owns($request->user()->id, $course->patient_record_id), 404);
        $id = (string) Str::ulid();
        DB::table('medication_problem_reports')->insert(['id' => $id, 'medication_course_id' => $course->id, 'patient_record_id' => $course->patient_record_id, 'reported_by' => $request->user()->id, 'symptoms' => $data['symptoms'], 'reported_onset_at' => $data['reported_onset_at'] ?? null, 'medicine_taken' => $data['medicine_taken'] ?? null, 'last_dose_at' => $data['last_dose_at'] ?? null, 'contact_action' => $data['contact_action'], 'created_at' => now(), 'updated_at' => now()]);
        $doctorId = DB::table('prescription_items as i')->join('prescriptions as p', 'p.id', '=', 'i.prescription_id')->where('i.id', $course->prescription_item_id)->value('p.doctor_id');
        if ($doctorId) $notifications->create($doctorId, 'MEDICATION_PROBLEM_REPORTED', 'SUPPORT_ALERT', $data['contact_action'] === 'URGENT_CARE' ? 'HIGH' : 'NORMAL', 'MEDICATION_PROBLEM', $id, '/medication-problems/'.$id, [], 'MEDICATION_PROBLEM:'.$id);
        return response()->json(['id' => $id, 'status' => 'OPEN', 'message' => 'Medication Support Alert sent to the authorized care team. This report is not an automated diagnosis.'], 201);
    }
}
