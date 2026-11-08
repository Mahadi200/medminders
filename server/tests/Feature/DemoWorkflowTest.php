<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** End-to-end connected-care workflow: booking → confirmation → prescription → sharing → dispensing → alarms → problems → reports. */
class DemoWorkflowTest extends TestCase
{
    use DatabaseTransactions;

    private function org(string $type): string
    {
        $id = (string) Str::ulid();
        DB::table('organizations')->insert(['id' => $id, 'name' => "Test $type ".$id, 'type' => $type, 'status' => 'APPROVED', 'created_at' => now(), 'updated_at' => now()]);
        return $id;
    }

    private function staff(string $org, array $roles, array $userRoles = []): User
    {
        $u = User::create(['name' => 'Staff '.Str::random(4), 'email' => 'staff-'.Str::ulid().'@example.test', 'password' => 'long-test-password']);
        foreach ($userRoles as $r) Role::create(['user_id' => $u->id, 'role' => $r, 'is_verified' => true]);
        foreach ($roles as $r) DB::table('organization_memberships')->insert(['id' => (string) Str::ulid(), 'organization_id' => $org, 'user_id' => $u->id, 'role' => $r, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $u->mfa_secret_encrypted = Crypt::encryptString('TESTSECRET'); $u->save();
        return $u;
    }

    private function patient(): array
    {
        $response = $this->postJson('/api/v1/auth/patients/register-password', ['name' => 'Flow Patient', 'phone' => '0171'.random_int(1000000, 9999999),
            'password' => 'long-test-password', 'password_confirmation' => 'long-test-password'])->assertOk();
        $user = User::findOrFail($response->json('user.id'));
        DB::table('patient_records')->where('created_by', $user->id)->update(['allergy_status' => 'NONE_KNOWN']);
        return [$user, DB::table('patient_links')->where('user_id', $user->id)->value('patient_record_id')];
    }

    public function test_full_connected_workflow(): void
    {
        $hospital = $this->org('HOSPITAL');
        $pharmacyOrg = $this->org('PHARMACY');
        DB::table('pharmacy_establishment_licenses')->insert(['id' => (string) Str::ulid(), 'organization_id' => $pharmacyOrg, 'license_number' => 'T-1', 'document_path' => 'x', 'verification_status' => 'VERIFIED', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('responsible_pharmacist_registrations')->insert(['id' => (string) Str::ulid(), 'organization_id' => $pharmacyOrg, 'full_name' => 'T', 'registration_number' => 'T-2', 'document_path' => 'x', 'verification_status' => 'VERIFIED', 'created_at' => now(), 'updated_at' => now()]);
        $desk = $this->staff($hospital, ['HOSPITAL_ADMIN', 'HOSPITAL_RECEPTION', 'LAB_STAFF', 'REPORT_REVIEWER', 'BILLING']);
        $pharmacist = $this->staff($pharmacyOrg, ['PHARMACY_ADMIN', 'DISPENSER'], ['PHARMACIST']);
        $doctor = User::create(['name' => 'Flow Doctor', 'email' => 'flow-doc-'.Str::ulid().'@example.test', 'password' => 'long-test-password']);
        Role::create(['user_id' => $doctor->id, 'role' => 'DOCTOR']);
        $doctor->clinicianCredential()->create(['bmdc_number' => 'A-'.random_int(100000, 999999), 'hospital_clinic' => 'X', 'verification_status' => 'VERIFIED', 'is_published' => true]);
        $doctor->mfa_secret_encrypted = Crypt::encryptString('TESTSECRET'); $doctor->save();
        [$patientUser, $recordId] = $this->patient();

        // Doctor submits schedule; hospital confirms.
        Sanctum::actingAs($doctor);
        $aff = $this->postJson('/api/v1/doctor/affiliations', ['organization_id' => $hospital, 'visiting_days' => ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'],
            'start_time' => '00:00', 'end_time' => '23:45', 'slot_minutes' => 15, 'fee_bdt' => 500])->assertCreated()->json('id');
        $this->getJson('/api/v1/affiliations/'.$aff.'/slots?date='.now('Asia/Dhaka')->addDay()->format('Y-m-d'))->assertNotFound();
        Sanctum::actingAs($desk);
        $this->postJson('/api/v1/affiliations/'.$aff.'/decision', ['decision' => 'CONFIRMED'])->assertOk();
        $this->getJson('/api/v1/doctors')->assertOk();

        // Patient books a listed slot; duplicates and off-schedule times are rejected.
        $slots = $this->getJson('/api/v1/affiliations/'.$aff.'/slots?date='.now('Asia/Dhaka')->addDay()->format('Y-m-d'))->assertOk()->json('slots');
        Sanctum::actingAs($patientUser);
        $this->postJson('/api/v1/appointments', ['patient_record_id' => $recordId, 'affiliation_id' => $aff, 'scheduled_at' => CarbonImmutable::parse($slots[4]['starts_at'])->addMinutes(7)->toIso8601String()])->assertStatus(422);
        $appt = $this->postJson('/api/v1/appointments', ['patient_record_id' => $recordId, 'affiliation_id' => $aff, 'scheduled_at' => $slots[4]['starts_at'], 'consultation_consent' => true])
            ->assertCreated()->assertJsonPath('status', 'PENDING_HOSPITAL')->json('id');
        $this->postJson('/api/v1/appointments', ['patient_record_id' => $recordId, 'affiliation_id' => $aff, 'scheduled_at' => $slots[8]['starts_at']])->assertStatus(422);
        $this->assertDatabaseHas('appointments', ['id' => $appt, 'organization_id' => $hospital, 'doctor_id' => $doctor->id]);

        // Doctor does not see the pending request; hospital does and confirms.
        Sanctum::actingAs($doctor);
        $this->assertCount(0, collect($this->getJson('/api/v1/appointments')->json())->where('id', $appt));
        Sanctum::actingAs($desk);
        $this->assertCount(1, collect($this->getJson('/api/v1/appointments')->json())->where('id', $appt));
        $this->patchJson('/api/v1/appointments/'.$appt, ['status' => 'CONFIRMED'])->assertOk();
        Sanctum::actingAs($doctor);
        $this->assertSame('CONFIRMED', collect($this->getJson('/api/v1/appointments')->json())->firstWhere('id', $appt)['status']);
        $this->assertSame($recordId, $this->getJson('/api/v1/doctor/patients')->assertOk()->json('0.id'));

        // Doctor issues an antibiotic prescription with an investigation.
        $rx = $this->postJson('/api/v1/clinical-prescriptions', ['patient_record_id' => $recordId, 'template' => 'OUTPATIENT', 'diagnosis' => 'Test infection',
            'items' => [['generic_name' => 'Amoxicillin', 'strength' => '500 mg', 'dosage_form' => 'Capsule', 'dose' => '1 capsule', 'route' => 'Oral',
                'schedule_type' => 'EVERY_N_HOURS', 'schedule_details' => ['hours' => 8], 'duration_days' => 5, 'quantity' => 15, 'is_antibiotic' => true, 'indication' => 'Test']],
            'tests' => ['Complete blood count']])->assertCreated();
        $rxId = $rx->json('id'); $itemId = $rx->json('items.0.id');

        // Patient shares with pharmacy (dispense) and hospital (view test order).
        Sanctum::actingAs($patientUser);
        $this->assertDatabaseHas('care_notifications', ['user_id' => $patientUser->id, 'event_type' => 'PRESCRIPTION_ISSUED']);
        $this->postJson('/api/v1/sharing/share', ['organization_id' => $pharmacyOrg, 'resource_type' => 'PRESCRIPTION', 'resource_id' => $rxId, 'action' => 'DISPENSE', 'duration_minutes' => 1440])->assertCreated();
        $this->postJson('/api/v1/sharing/share', ['organization_id' => $hospital, 'resource_type' => 'PRESCRIPTION', 'resource_id' => $rxId, 'action' => 'DISPENSE', 'duration_minutes' => 1440])->assertStatus(422);
        $this->postJson('/api/v1/sharing/share', ['organization_id' => $hospital, 'resource_type' => 'PRESCRIPTION', 'resource_id' => $rxId, 'action' => 'VIEW', 'duration_minutes' => 1440])->assertCreated();

        // Pharmacy partial dispensing.
        Sanctum::actingAs($pharmacist);
        $this->assertSame($rxId, $this->getJson('/api/v1/shared-with-me')->assertOk()->json('0.prescription.id'));
        $this->postJson('/api/v1/prescription-items/'.$itemId.'/dispensings', ['organization_id' => $pharmacyOrg, 'quantity' => 6, 'product' => 'Amoxicillin', 'idempotency_key' => (string) Str::uuid()])->assertCreated();

        // Patient confirms first dose 9 hours ago so a dose is due now; alarm appears; snooze/ack don't change times.
        Sanctum::actingAs($patientUser);
        $courseId = DB::table('medication_courses')->where('patient_record_id', $recordId)->value('id');
        $this->postJson('/api/v1/courses/'.$courseId.'/start', ['actual_start_at' => now()->subHours(9)->toIso8601String(), 'timezone' => 'Asia/Dhaka'])->assertOk();
        $due = $this->getJson('/api/v1/alarms/due')->assertOk()->json('due');
        $this->assertNotEmpty($due);
        $eventId = $due[count($due) - 1]['dose_event_id'];
        $before = DB::table('dose_events')->where('id', $eventId)->value('scheduled_at');
        $this->postJson('/api/v1/alarms/'.$eventId.'/snooze', ['minutes' => 5])->assertOk();
        $this->assertFalse(collect($this->getJson('/api/v1/alarms/due')->json('due'))->firstWhere('dose_event_id', $eventId)['ringing']);
        $this->assertSame($before, DB::table('dose_events')->where('id', $eventId)->value('scheduled_at'));
        $this->getJson('/api/v1/alarms/due');
        $this->assertSame(1, DB::table('care_notifications')->where('user_id', $patientUser->id)->where('dose_event_id', $eventId)->count());
        $first = DB::table('dose_events')->where('medication_course_id', $courseId)->orderBy('scheduled_at')->value('id');
        $this->postJson('/api/v1/dose-events/'.$first.'/logs', ['status' => 'TAKEN', 'actual_at' => now()->subHours(9)->toIso8601String()])->assertCreated();
        $summary = $this->getJson('/api/v1/courses/'.$courseId)->assertOk()->json('summary');
        $this->assertSame(1, $summary['reported_taken']);
        $this->assertSame(1, $summary['unconfirmed']);
        $this->assertSame(6, $summary['dispensed_quantity']);
        $this->assertSame(5, $summary['estimated_supply_units']);
        $this->assertTrue($summary['supply_shortfall']);

        // Medication problem reaches the prescriber, who reviews it; patient is notified.
        $problem = $this->postJson('/api/v1/medication-problems', ['medication_course_id' => $courseId, 'symptoms' => 'Mild nausea', 'contact_action' => 'CARE_TEAM_REVIEW'])->assertCreated()->json('id');
        Sanctum::actingAs($doctor);
        $this->assertSame($problem, $this->getJson('/api/v1/doctor/problems')->json('problem_reports.0.id'));
        $this->postJson('/api/v1/medication-problems/'.$problem.'/review', ['status' => 'RESOLVED', 'note' => 'Take with food; continue as prescribed.'])->assertOk();
        $this->assertDatabaseHas('care_notifications', ['user_id' => $patientUser->id, 'event_type' => 'MEDICATION_PROBLEM_REVIEWED']);

        // Hospital accepts test, bills, drafts and releases report; patient and ordering doctor see it; pharmacy does not.
        Sanctum::actingAs($desk);
        $orderId = DB::table('test_orders')->where('prescription_id', $rxId)->value('id');
        $this->postJson('/api/v1/test-orders/'.$orderId.'/accept', ['organization_id' => $hospital])->assertOk();
        $this->postJson('/api/v1/test-orders/'.$orderId.'/bill', ['price_bdt' => 400])->assertCreated();
        $report = $this->postJson('/api/v1/test-orders/'.$orderId.'/reports', ['observations' => 'Fictional values within reference range.'])->assertCreated()->json('id');
        $this->postJson('/api/v1/reports/'.$report.'/release')->assertOk();
        Sanctum::actingAs($patientUser);
        $this->getJson('/api/v1/reports/'.$report)->assertOk();
        Sanctum::actingAs($doctor);
        $this->getJson('/api/v1/reports/'.$report)->assertOk();
        Sanctum::actingAs($pharmacist);
        $this->getJson('/api/v1/reports/'.$report)->assertNotFound();

        // Isolation: a second patient sees none of this.
        [$other] = $this->patient();
        Sanctum::actingAs($other);
        $this->getJson('/api/v1/courses/'.$courseId)->assertNotFound();
        $this->assertCount(0, $this->getJson('/api/v1/appointments')->json());
        $this->postJson('/api/v1/alarms/'.$eventId.'/acknowledge')->assertNotFound();
    }

    public function test_hospital_proposed_change_requires_patient_acceptance(): void
    {
        $hospital = $this->org('HOSPITAL');
        $desk = $this->staff($hospital, ['HOSPITAL_ADMIN']);
        $doctor = User::create(['name' => 'Doc', 'email' => 'd-'.Str::ulid().'@example.test', 'password' => 'long-test-password']);
        Role::create(['user_id' => $doctor->id, 'role' => 'DOCTOR']);
        $doctor->clinicianCredential()->create(['bmdc_number' => 'A-'.random_int(100000, 999999), 'hospital_clinic' => 'X', 'verification_status' => 'VERIFIED', 'is_published' => true]);
        $aff = (string) Str::ulid();
        DB::table('doctor_affiliations')->insert(['id' => $aff, 'doctor_id' => $doctor->id, 'organization_id' => $hospital, 'visiting_days' => json_encode(['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI']),
            'start_time' => '00:00', 'end_time' => '23:45', 'slot_minutes' => 15, 'status' => 'CONFIRMED', 'created_at' => now(), 'updated_at' => now()]);
        [$patientUser, $recordId] = $this->patient();
        $slots = $this->getJson('/api/v1/affiliations/'.$aff.'/slots?date='.now('Asia/Dhaka')->addDays(2)->format('Y-m-d'))->json('slots');
        Sanctum::actingAs($patientUser);
        $appt = $this->postJson('/api/v1/appointments', ['patient_record_id' => $recordId, 'affiliation_id' => $aff, 'scheduled_at' => $slots[10]['starts_at']])->assertCreated()->json('id');
        Sanctum::actingAs($desk);
        $this->patchJson('/api/v1/appointments/'.$appt, ['status' => 'PROPOSED_CHANGE', 'proposed_scheduled_at' => $slots[12]['starts_at']])->assertOk();
        $this->assertSame(CarbonImmutable::parse($slots[10]['starts_at'])->toDateTimeString(), DB::table('appointments')->where('id', $appt)->value('scheduled_at'));
        Sanctum::actingAs($patientUser);
        $this->postJson('/api/v1/appointments/'.$appt.'/respond', ['accept' => true])->assertOk()->assertJsonPath('status', 'CONFIRMED');
        $this->assertSame(CarbonImmutable::parse($slots[12]['starts_at'])->toDateTimeString(), DB::table('appointments')->where('id', $appt)->value('scheduled_at'));
    }
}
