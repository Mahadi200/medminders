<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Services\CareNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Doctor-side care-team views. Access = record created by this doctor, or an active patient-approved ENCOUNTER/REVIEW grant. */
class CareTeamController extends Controller
{
    public static function doctorCanAccess(string $doctorId, string $recordId): bool
    {
        return DB::table('patient_records')->where('id', $recordId)->where('created_by', $doctorId)->exists()
            || SharingController::granted($doctorId, $recordId, 'ENCOUNTER', $recordId, 'REVIEW');
    }

    private function doctor(Request $request)
    {
        $user = $request->user();
        abort_unless($user->hasRole('DOCTOR'), 403);
        return $user;
    }

    public function patients(Request $request)
    {
        $doctor = $this->doctor($request);
        $granted = DB::table('sharing_grants')->where('recipient_id', $doctor->id)->where('resource_type', 'ENCOUNTER')->where('action', 'REVIEW')
            ->whereNull('revoked_at')->where('expires_at', '>', now())->select('patient_record_id', DB::raw('MAX(expires_at) as access_until'))->groupBy('patient_record_id')->get()->keyBy('patient_record_id');
        $created = DB::table('patient_records')->where('created_by', $doctor->id)->pluck('id');
        $ids = $created->merge($granted->keys())->unique();
        return DB::table('patient_records')->whereIn('id', $ids)->orderBy('name')
            ->get(['id', 'name', 'date_of_birth', 'estimated_age', 'allergy_status', 'allergies', 'created_by'])
            ->map(function ($p) use ($granted, $doctor) {
                $p->access = $p->created_by === $doctor->id ? 'Record created by you' : 'Patient consent until '.$granted[$p->id]->access_until;
                $p->courses = DB::table('medication_courses as c')->join('prescription_items as i', 'i.id', '=', 'c.prescription_item_id')
                    ->join('prescriptions as rx', 'rx.id', '=', 'i.prescription_id')->where('rx.doctor_id', $doctor->id)->where('c.patient_record_id', $p->id)
                    ->select('c.id', 'c.status', 'c.actual_start_at', 'c.completion_status', 'i.generic_name', 'i.dose', 'i.duration_days')->get()
                    ->map(function ($c) { $c->summary = CourseController::summary($c->id); return $c; });
                unset($p->created_by);
                return $p;
            });
    }

    /** Medication-problem reports and support alerts for courses this doctor prescribed. */
    public function problems(Request $request)
    {
        $doctor = $this->doctor($request);
        $reports = DB::table('medication_problem_reports as r')->join('medication_courses as c', 'c.id', '=', 'r.medication_course_id')
            ->join('prescription_items as i', 'i.id', '=', 'c.prescription_item_id')->join('prescriptions as p', 'p.id', '=', 'i.prescription_id')
            ->join('patient_records as pr', 'pr.id', '=', 'r.patient_record_id')->where('p.doctor_id', $doctor->id)
            ->select('r.*', 'i.generic_name', 'pr.name as patient_name')->orderByRaw("CASE WHEN r.status = 'OPEN' THEN 0 ELSE 1 END")->orderByDesc('r.created_at')->limit(100)->get()
            ->map(function ($r) { $r->kind = 'PROBLEM_REPORT'; unset($r->attachment_path); return $r; });
        $alerts = DB::table('medication_support_alerts as a')->join('medication_courses as c', 'c.id', '=', 'a.medication_course_id')
            ->join('prescription_items as i', 'i.id', '=', 'c.prescription_item_id')->join('prescriptions as p', 'p.id', '=', 'i.prescription_id')
            ->join('patient_records as pr', 'pr.id', '=', 'a.patient_record_id')->where('p.doctor_id', $doctor->id)
            ->select('a.*', 'i.generic_name', 'pr.name as patient_name')->orderByDesc('a.created_at')->limit(100)->get()
            ->map(function ($a) { $a->kind = 'SUPPORT_ALERT'; return $a; });
        return response()->json(['problem_reports' => $reports, 'support_alerts' => $alerts,
            'expectation' => 'Reports are reviewed during normal working hours. MedMinders is not an emergency monitoring service.']);
    }

    public function reviewProblem(Request $request, string $id, CareNotificationService $notifications)
    {
        $doctor = $this->doctor($request);
        $data = $request->validate(['status' => 'required|in:REVIEWED,RESOLVED', 'note' => 'required|string|max:3000']);
        $report = DB::table('medication_problem_reports as r')->join('medication_courses as c', 'c.id', '=', 'r.medication_course_id')
            ->join('prescription_items as i', 'i.id', '=', 'c.prescription_item_id')->join('prescriptions as p', 'p.id', '=', 'i.prescription_id')
            ->where('r.id', $id)->where('p.doctor_id', $doctor->id)->select('r.*')->first();
        abort_unless($report, 404);
        DB::table('medication_problem_reports')->where('id', $id)->update(['status' => $data['status'], 'reviewed_by' => $doctor->id, 'reviewed_at' => now(), 'review_note' => $data['note'], 'updated_at' => now()]);
        AuditEvent::create(['actor_user_id' => $doctor->id, 'action' => 'MEDICATION_PROBLEM_'.$data['status'], 'entity_type' => 'medication_problem_report', 'entity_id' => $id]);
        foreach (DB::table('patient_links')->where('patient_record_id', $report->patient_record_id)->pluck('user_id') as $patientUser) {
            $notifications->create($patientUser, 'MEDICATION_PROBLEM_REVIEWED', 'INFORMATION', 'NORMAL', 'MEDICATION_PROBLEM', $id, '/patient-login#dashboard-problems',
                ['message' => 'Your care team reviewed your medication problem report: '.$data['note']], 'PROBLEM_REVIEW:'.$id.':'.$data['status']);
        }
        return response()->json(['status' => $data['status']]);
    }

    public function resolveAlert(Request $request, string $id, CareNotificationService $notifications)
    {
        $doctor = $this->doctor($request);
        $data = $request->validate(['note' => 'required|string|max:3000']);
        $alert = DB::table('medication_support_alerts as a')->join('medication_courses as c', 'c.id', '=', 'a.medication_course_id')
            ->join('prescription_items as i', 'i.id', '=', 'c.prescription_item_id')->join('prescriptions as p', 'p.id', '=', 'i.prescription_id')
            ->where('a.id', $id)->where('p.doctor_id', $doctor->id)->where('a.status', 'OPEN')->select('a.*')->first();
        abort_unless($alert, 404);
        DB::table('medication_support_alerts')->where('id', $id)->update(['status' => 'RESOLVED', 'resolution_note' => $data['note'], 'resolved_by' => $doctor->id, 'resolved_at' => now(), 'updated_at' => now()]);
        AuditEvent::create(['actor_user_id' => $doctor->id, 'action' => 'MEDICATION_SUPPORT_RESOLVED', 'entity_type' => 'medication_support_alert', 'entity_id' => $id]);
        foreach (DB::table('patient_links')->where('patient_record_id', $alert->patient_record_id)->pluck('user_id') as $patientUser) {
            $notifications->create($patientUser, 'MEDICATION_SUPPORT_RESOLVED', 'INFORMATION', 'NORMAL', 'MEDICATION_SUPPORT_ALERT', $id, '/patient-login#dashboard-problems',
                ['message' => 'Your care team responded: '.$data['note']]);
        }
        return response()->json(['status' => 'RESOLVED']);
    }
}
