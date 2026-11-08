<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\Prescription;
use App\Models\User;
use App\Services\Auth\PatientSmsGateway;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ConnectedCareTest extends TestCase
{
    use DatabaseTransactions;

    public function test_patient_email_password_entry_is_closed(): void
    {
        $this->postJson('/api/v1/auth/register', ['email' => 'patient@example.test', 'password' => 'long-test-password'])->assertStatus(410);
        $patient = User::create(['name' => 'Existing Patient', 'email' => 'legacy-'.Str::ulid().'@example.test', 'password' => 'long-test-password']);
        Role::create(['user_id' => $patient->id, 'role' => 'PATIENT']);
        $this->postJson('/api/v1/auth/login', ['email' => $patient->email, 'password' => 'long-test-password'])->assertForbidden();
    }

    public function test_patient_password_registration_creates_only_new_private_profile_and_login(): void
    {
        $email = 'password-patient-'.Str::ulid().'@example.test';
        $response = $this->postJson('/api/v1/auth/patients/register-password', [
            'name' => 'Password Patient', 'phone' => '01712345678', 'email' => $email,
            'date_of_birth' => '1990-01-01', 'password' => 'long-test-password', 'password_confirmation' => 'long-test-password',
        ])->assertOk();
        $userId = $response->json('user.id');
        $recordId = DB::table('patient_links')->where('user_id', $userId)->value('patient_record_id');
        $this->assertNotEmpty($response->json('token'));
        $this->assertDatabaseHas('users', ['id' => $userId, 'phone_number' => null, 'pending_phone_number' => '+8801712345678']);
        $this->assertDatabaseHas('user_roles', ['user_id' => $userId, 'role' => 'PATIENT', 'is_verified' => 0]);
        Sanctum::actingAs(User::findOrFail($userId));
        $this->getJson('/api/v1/patients/records')->assertOk()->assertJsonPath('0.id', $recordId);
        $this->postJson('/api/v1/auth/patients/login-password', ['identifier' => $email, 'password' => 'wrong'])->assertUnauthorized();
        $this->postJson('/api/v1/auth/patients/login-password', ['identifier' => $email, 'password' => 'long-test-password'])->assertOk();
        $this->postJson('/api/v1/auth/patients/login-password', ['identifier' => '01712345678', 'password' => 'long-test-password'])->assertOk();
    }

    public function test_interaction_checker_fails_closed_without_licensed_provider(): void
    {
        $patient = User::create(['name' => 'Interaction Patient', 'email' => 'interaction-'.Str::ulid().'@example.test', 'password' => 'long-test-password']);
        Role::create(['user_id' => $patient->id, 'role' => 'PATIENT']);
        Sanctum::actingAs($patient);
        $this->postJson('/api/v1/interactions/check', ['ingredients' => ['amoxicillin', 'warfarin']])
            ->assertStatus(503)->assertJsonPath('status', 'PROVIDER_UNAVAILABLE');
    }

    public function test_messaging_requires_authorized_patient_doctor_relationship(): void
    {
        $patient = User::create(['name' => 'Message Patient', 'phone_number' => '+8801712345688']);
        Role::create(['user_id' => $patient->id, 'role' => 'PATIENT']);
        $doctor = User::create(['name' => 'Message Doctor', 'email' => 'message-doctor-'.Str::ulid().'@example.test', 'password' => 'long-test-password']);
        Role::create(['user_id' => $doctor->id, 'role' => 'DOCTOR']);
        $doctor->clinicianCredential()->create(['bmdc_number' => 'A-'.random_int(100000, 999999), 'hospital_clinic' => 'Message Clinic', 'verification_status' => 'VERIFIED']);
        $doctor->mfa_secret_encrypted = Crypt::encryptString('TESTSECRET'); $doctor->save();
        $recordId = (string) Str::ulid();
        DB::table('patient_records')->insert(['id' => $recordId, 'name' => $patient->name, 'phone_number' => $patient->phone_number, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('patient_links')->insert(['id' => (string) Str::ulid(), 'patient_record_id' => $recordId, 'user_id' => $patient->id, 'relationship' => 'SELF', 'verified_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        Prescription::create(['patient_record_id' => $recordId, 'doctor_id' => $doctor->id, 'status' => 'SIGNED', 'template' => 'OUTPATIENT', 'issued_at' => now()]);
        Sanctum::actingAs($patient);
        $conversation = $this->postJson('/api/v1/conversations', ['patient_record_id' => $recordId, 'doctor_id' => $doctor->id])->assertCreated()->json('id');
        $this->postJson('/api/v1/conversations/'.$conversation.'/messages', ['body' => 'Please explain the plan.', 'client_key' => 'message-test-1'])->assertCreated();
        Sanctum::actingAs($doctor);
        $this->getJson('/api/v1/conversations/'.$conversation.'/messages')->assertOk()->assertJsonPath('data.0.body', 'Please explain the plan.');
        $outsider = User::create(['name' => 'Outside Doctor', 'email' => 'outside-'.Str::ulid().'@example.test', 'password' => 'long-test-password']);
        Role::create(['user_id' => $outsider->id, 'role' => 'DOCTOR']);
        Sanctum::actingAs($outsider);
        $this->getJson('/api/v1/conversations/'.$conversation.'/messages')->assertForbidden();
    }

    public function test_doctor_registration_starts_unverified_and_cannot_issue(): void
    {
        $response = $this->postJson('/api/v1/auth/doctors/register', [
            'name' => 'Dr. Fictional', 'email' => 'fictional-doctor-'.Str::ulid().'@example.test',
            'bmdc_number' => 'A-123456', 'hospital_clinic' => 'Example Clinic',
            'password' => 'long-test-password', 'password_confirmation' => 'long-test-password',
        ])->assertCreated()->assertJsonPath('user.clinician_credential.verification_status', 'PENDING');
        $doctor = User::findOrFail($response->json('user.id'));
        $this->assertTrue(Hash::check('long-test-password', $doctor->password));
        $doctor->mfa_secret_encrypted = Crypt::encryptString('TESTSECRET');
        $doctor->save();
        Sanctum::actingAs($doctor);
        $this->postJson('/api/v1/clinical-prescriptions', [])->assertForbidden();
        $this->patchJson('/api/v1/doctor/profile', ['is_published' => true])->assertUnprocessable();
        $admin = User::create(['name' => 'Platform Reviewer', 'email' => 'reviewer-'.Str::ulid().'@example.test', 'password' => 'long-test-password']);
        Role::create(['user_id' => $admin->id, 'role' => 'SUPERADMIN']);
        $admin->mfa_secret_encrypted = Crypt::encryptString('TESTSECRET'); $admin->save();
        Sanctum::actingAs($admin);
        $this->postJson('/api/v1/doctors/'.$doctor->clinicianCredential->id.'/review', ['decision' => 'VERIFIED', 'review_note' => 'Fictional manual review'])->assertOk();
        Sanctum::actingAs($doctor);
        $this->patchJson('/api/v1/doctor/profile', ['is_published' => true, 'specialty' => 'Fictional specialty'])->assertOk();
        // Other (demo) profiles may exist in the local database; locate this doctor's entry by user id.
        $entry = collect($this->getJson('/api/v1/doctors')->assertOk()->json())->firstWhere('user_id', $doctor->id);
        $this->assertSame('Dr. Fictional', $entry['user']['name']);
        $this->assertArrayNotHasKey('email', $entry['user']);
    }

    public function test_phone_claim_requires_invitation_and_code_and_is_single_use(): void
    {
        $doctor = User::create(['name' => 'Dr. Example', 'email' => 'claim-doctor-'.Str::ulid().'@example.test', 'password' => 'long-test-password']);
        Role::create(['user_id' => $doctor->id, 'role' => 'DOCTOR']);
        $doctor->mfa_secret_encrypted = Crypt::encryptString('TESTSECRET');
        $doctor->save();
        Sanctum::actingAs($doctor);
        $created = $this->postJson('/api/v1/patients/records', ['name' => 'Fictional Patient', 'phone' => '01712345678', 'allergy_status' => 'UNKNOWN'])->assertCreated();
        $id = $created->json('id');
        $invitation = $created->json('claim_code');
        $code = null;
        $sms = \Mockery::mock(PatientSmsGateway::class);
        $sms->shouldReceive('deliverCode')->once()->andReturnUsing(function ($phone, $sentCode) use (&$code) { $code = $sentCode; return null; });
        $this->app->instance(PatientSmsGateway::class, $sms);
        $this->postJson('/api/v1/patients/challenge', ['phone' => '01712345678', 'patient_record_id' => $id, 'claim_code' => 'wrong'])
            ->assertOk();
        $challenge = $this->postJson('/api/v1/patients/challenge', ['phone' => '+8801712345678', 'patient_record_id' => $id, 'claim_code' => $invitation])
            ->assertOk()->json('challenge_id');
        $this->postJson('/api/v1/patients/verify', ['challenge_id' => $challenge, 'code' => '000000'])->assertUnprocessable();
        $verified = $this->postJson('/api/v1/patients/verify', ['challenge_id' => $challenge, 'code' => $code])->assertOk();
        $this->assertNotEmpty($verified->json('token'));
        $this->assertDatabaseHas('patient_links', ['patient_record_id' => $id, 'user_id' => $verified->json('user.id')]);
        $this->assertNull(DB::table('patient_records')->where('id', $id)->value('claim_secret_hash'));
        $this->postJson('/api/v1/patients/verify', ['challenge_id' => $challenge, 'code' => $code])->assertUnprocessable();
    }

    public function test_scoped_sharing_revocation_stops_pharmacy_access(): void
    {
        $patient = User::create(['name' => 'Fictional Patient', 'phone_number' => '+8801812345678']);
        Role::create(['user_id' => $patient->id, 'role' => 'PATIENT']);
        $pharmacist = User::create(['name' => 'Pharmacy Staff', 'email' => 'pharmacy-'.Str::ulid().'@example.test', 'password' => 'long-test-password']);
        $pharmacist->mfa_secret_encrypted = Crypt::encryptString('TESTSECRET');
        $pharmacist->save();
        $recordId = (string) Str::ulid();
        DB::table('patient_records')->insert(['id' => $recordId, 'name' => 'Fictional Patient', 'phone_number' => $patient->phone_number, 'allergy_status' => 'UNKNOWN', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('patient_links')->insert(['id' => (string) Str::ulid(), 'patient_record_id' => $recordId, 'user_id' => $patient->id, 'relationship' => 'SELF', 'verified_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        $rx = Prescription::create(['patient_record_id' => $recordId, 'status' => 'SIGNED', 'template' => 'OUTPATIENT', 'issued_at' => now()]);
        $item = $rx->items()->create(['generic_name' => 'Fictional medicine', 'strength' => 'test', 'dosage_form' => 'tablet', 'dose' => 'one tablet',
            'route' => 'oral', 'schedule_type' => 'EXPLICIT_TIMES', 'schedule_details' => ['times' => ['08:00']], 'duration_days' => 2, 'quantity' => 4, 'is_antibiotic' => false]);
        $organizationId = (string) Str::ulid();
        DB::table('organizations')->insert(['id' => $organizationId, 'name' => 'Fictional Pharmacy', 'type' => 'PHARMACY', 'status' => 'APPROVED', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('pharmacy_establishment_licenses')->insert(['id' => (string) Str::ulid(), 'organization_id' => $organizationId, 'license_number' => 'DL-2', 'document_path' => 'fake-license.pdf', 'verification_status' => 'VERIFIED', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('responsible_pharmacist_registrations')->insert(['id' => (string) Str::ulid(), 'organization_id' => $organizationId, 'full_name' => 'Registered Pharmacist', 'registration_number' => 'PCB-2', 'document_path' => 'fake-pharmacist.pdf', 'verification_status' => 'VERIFIED', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('organization_memberships')->insert(['id' => (string) Str::ulid(), 'organization_id' => $organizationId,
            'user_id' => $pharmacist->id, 'role' => 'DISPENSER', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        Sanctum::actingAs($pharmacist);
        $this->getJson('/api/v1/clinical-prescriptions/'.$rx->id)->assertNotFound();
        Role::create(['user_id' => $pharmacist->id, 'role' => 'PHARMACIST']);
        $shareId = $this->postJson('/api/v1/sharing/requests', ['patient_record_id' => $recordId, 'organization_id' => $organizationId,
            'resource_type' => 'PRESCRIPTION', 'resource_id' => $rx->id, 'action' => 'DISPENSE',
            'purpose' => 'Patient requested medicine supply', 'duration_minutes' => 60])->assertCreated()->json('id');
        Sanctum::actingAs($patient);
        $this->postJson('/api/v1/sharing/requests/'.$shareId.'/decision', ['decision' => 'APPROVE'])->assertOk();
        $grantId = DB::table('sharing_grants')->where('sharing_request_id', $shareId)->value('id');
        Sanctum::actingAs($pharmacist);
        $this->getJson('/api/v1/clinical-prescriptions/'.$rx->id)->assertOk();
        $supply = ['organization_id' => $organizationId, 'quantity' => 2, 'product' => 'Fictional medicine', 'idempotency_key' => (string) Str::uuid()];
        $this->postJson('/api/v1/prescription-items/'.$item->id.'/dispensings', $supply)->assertCreated()->assertJsonPath('remaining_quantity', 2);
        $this->postJson('/api/v1/prescription-items/'.$item->id.'/dispensings', $supply)->assertOk()->assertJsonPath('already_recorded', true);
        $this->postJson('/api/v1/prescription-items/'.$item->id.'/dispensings', [...$supply, 'quantity' => 3, 'idempotency_key' => (string) Str::uuid()])->assertUnprocessable();
        Sanctum::actingAs($patient);
        $this->postJson('/api/v1/sharing/grants/'.$grantId.'/revoke')->assertOk();
        Sanctum::actingAs($pharmacist);
        $this->getJson('/api/v1/clinical-prescriptions/'.$rx->id)->assertNotFound();
    }

    public function test_course_requires_confirmed_start_and_preserves_corrected_logs(): void
    {
        $patient = User::create(['name' => 'Fictional Patient', 'phone_number' => '+8801912345678']);
        Role::create(['user_id' => $patient->id, 'role' => 'PATIENT']);
        $doctor = User::create(['name' => 'Dr. Course', 'email' => 'course-doctor-'.Str::ulid().'@example.test', 'password' => 'long-test-password']);
        Role::create(['user_id' => $doctor->id, 'role' => 'DOCTOR']);
        $doctor->clinicianCredential()->create(['bmdc_number' => 'TEST-'.Str::ulid(), 'hospital_clinic' => 'Example Clinic', 'verification_status' => 'VERIFIED']);
        $doctor->mfa_secret_encrypted = Crypt::encryptString('TESTSECRET'); $doctor->save();
        $recordId = (string) Str::ulid();
        DB::table('patient_records')->insert(['id' => $recordId, 'name' => $patient->name, 'phone_number' => $patient->phone_number, 'allergy_status' => 'NONE_KNOWN', 'created_by' => $doctor->id, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('patient_links')->insert(['id' => (string) Str::ulid(), 'patient_record_id' => $recordId, 'user_id' => $patient->id, 'relationship' => 'SELF', 'verified_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        $rx = Prescription::create(['patient_record_id' => $recordId, 'doctor_id' => $doctor->id, 'status' => 'SIGNED', 'template' => 'OUTPATIENT', 'issued_at' => now()]);
        $item = $rx->items()->create(['generic_name' => 'Fictional antibiotic', 'strength' => 'test', 'dosage_form' => 'tablet', 'dose' => 'one tablet', 'route' => 'oral',
            'schedule_type' => 'EVERY_N_HOURS', 'schedule_details' => ['hours' => 8], 'duration_days' => 1, 'quantity' => 3, 'is_antibiotic' => true, 'indication' => 'Fictional indication']);
        $courseId = (string) Str::ulid();
        DB::table('medication_courses')->insert(['id' => $courseId, 'prescription_item_id' => $item->id, 'patient_record_id' => $recordId, 'timezone' => 'Asia/Dhaka', 'status' => 'AWAITING_START', 'created_at' => now(), 'updated_at' => now()]);
        Sanctum::actingAs($patient);
        $this->assertSame(0, DB::table('dose_events')->where('medication_course_id', $courseId)->count());
        $start = now()->subHour()->toIso8601String();
        $this->postJson('/api/v1/courses/'.$courseId.'/start', ['actual_start_at' => $start, 'timezone' => 'Asia/Dhaka'])
            ->assertOk()->assertJsonPath('scheduled_count', 3);
        $this->postJson('/api/v1/courses/'.$courseId.'/start', ['actual_start_at' => $start, 'timezone' => 'Asia/Dhaka'])->assertUnprocessable();
        $eventId = DB::table('dose_events')->where('medication_course_id', $courseId)->orderBy('scheduled_at')->value('id');
        $this->postJson('/api/v1/dose-events/'.$eventId.'/logs', ['status' => 'NOT_SURE'])->assertCreated();
        $this->postJson('/api/v1/dose-events/'.$eventId.'/logs', ['status' => 'TAKEN_LATE', 'actual_at' => now()->toIso8601String()])->assertCreated();
        $this->assertSame(2, DB::table('dose_logs')->where('dose_event_id', $eventId)->count());
        $this->postJson('/api/v1/courses/'.$courseId.'/support', ['reason' => 'SEVERE_ALLERGY'])
            ->assertCreated()->assertJsonPath('title', 'Medication Support Alert')->assertJsonStructure(['urgent_message']);
        $this->postJson('/api/v1/courses/'.$courseId.'/completion', ['completion_status' => 'PATIENT_REPORTED_COMPLETE'])
            ->assertOk()->assertJsonPath('self_reported', true);
        DB::table('notification_preferences')->insert(['user_id' => $patient->id, 'in_app_dose_reminders' => true,
            'in_app_followups' => true, 'timezone' => 'Asia/Dhaka', 'created_at' => now(), 'updated_at' => now()]);
        $unconfirmedId = DB::table('dose_events')->where('medication_course_id', $courseId)->where('id', '!=', $eventId)->orderBy('scheduled_at')->value('id');
        DB::table('dose_events')->where('id', $unconfirmedId)->update(['scheduled_at' => now()->subHours(3)]);
        $this->artisan('care:prepare-dose-notifications')->assertExitCode(0);
        $this->artisan('care:prepare-dose-notifications')->assertExitCode(0);
        // A dose with no confirmation 60+ minutes after its time is recorded as MISSED once (idempotent), with one notification.
        $this->assertSame('MISSED', DB::table('dose_events')->where('id', $unconfirmedId)->value('status'));
        $this->assertSame(1, DB::table('care_notifications')->where('user_id', $patient->id)->where('dose_event_id', $unconfirmedId)->where('event_type', 'DOSE_MISSED')->count());
        Sanctum::actingAs($doctor);
        $this->postJson('/api/v1/clinical-prescriptions/'.$rx->id.'/cancel', ['reason' => 'Fictional clinician stop'])->assertOk();
        $this->assertSame('STOPPED_BY_CLINICIAN', DB::table('medication_courses')->where('id', $courseId)->value('status'));
        Sanctum::actingAs($patient);
        $this->postJson('/api/v1/courses/'.$courseId.'/completion', ['completion_status' => 'PATIENT_REPORTED_EARLY_STOP'])->assertUnprocessable();
        $thirdId = DB::table('dose_events')->where('medication_course_id', $courseId)->whereNotIn('id', [$eventId, $unconfirmedId])->value('id');
        DB::table('dose_events')->where('id', $thirdId)->update(['scheduled_at' => now()->subHours(4)]);
        $this->artisan('care:prepare-dose-notifications')->assertExitCode(0);
        $this->assertSame(0, DB::table('care_notifications')->where('dose_event_id', $thirdId)->count());
    }

    public function test_report_release_is_visible_to_patient_but_not_unshared_pharmacy(): void
    {
        $patient = User::create(['name' => 'Fictional Patient', 'phone_number' => '+8801612345678']);
        Role::create(['user_id' => $patient->id, 'role' => 'PATIENT']);
        $doctor = User::create(['name' => 'Dr. Fictional', 'email' => 'report-doctor-'.Str::ulid().'@example.test', 'password' => 'long-test-password']);
        Role::create(['user_id' => $doctor->id, 'role' => 'DOCTOR']);
        $staff = User::create(['name' => 'Lab Staff', 'email' => 'report-staff-'.Str::ulid().'@example.test', 'password' => 'long-test-password']);
        $staff->mfa_secret_encrypted = Crypt::encryptString('TESTSECRET'); $staff->save();
        $pharmacy = User::create(['name' => 'Pharmacy Staff', 'email' => 'report-pharmacy-'.Str::ulid().'@example.test', 'password' => 'long-test-password']);
        $pharmacy->mfa_secret_encrypted = Crypt::encryptString('TESTSECRET'); $pharmacy->save();
        Role::create(['user_id' => $pharmacy->id, 'role' => 'PHARMACIST']);
        $recordId = (string) Str::ulid();
        DB::table('patient_records')->insert(['id' => $recordId, 'name' => $patient->name, 'phone_number' => $patient->phone_number,
            'allergy_status' => 'UNKNOWN', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('patient_links')->insert(['id' => (string) Str::ulid(), 'patient_record_id' => $recordId, 'user_id' => $patient->id,
            'relationship' => 'SELF', 'verified_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        $rx = Prescription::create(['patient_record_id' => $recordId, 'doctor_id' => $doctor->id, 'status' => 'SIGNED', 'template' => 'ADVICE_ONLY', 'issued_at' => now()]);
        $orderId = (string) Str::ulid();
        DB::table('test_orders')->insert(['id' => $orderId, 'prescription_id' => $rx->id, 'patient_record_id' => $recordId,
            'test_name' => 'Fictional test', 'status' => 'ORDERED', 'created_at' => now(), 'updated_at' => now()]);
        $orgId = (string) Str::ulid();
        DB::table('organizations')->insert(['id' => $orgId, 'name' => 'Fictional Laboratory', 'type' => 'DIAGNOSTIC', 'created_at' => now(), 'updated_at' => now()]);
        foreach (['HOSPITAL_ADMIN', 'HOSPITAL_RECEPTION', 'BILLING', 'LAB_STAFF', 'REPORT_REVIEWER'] as $role) DB::table('organization_memberships')->insert([
            'id' => (string) Str::ulid(), 'organization_id' => $orgId, 'user_id' => $staff->id, 'role' => $role,
            'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
        Sanctum::actingAs($staff);
        $shareId = $this->postJson('/api/v1/sharing/requests', ['patient_record_id' => $recordId, 'organization_id' => $orgId,
            'resource_type' => 'PRESCRIPTION', 'resource_id' => $rx->id, 'action' => 'VIEW', 'purpose' => 'Perform ordered test',
            'duration_minutes' => 60])->assertCreated()->json('id');
        Sanctum::actingAs($patient);
        $this->postJson('/api/v1/sharing/requests/'.$shareId.'/decision', ['decision' => 'APPROVE'])->assertOk();
        Sanctum::actingAs($staff);
        $this->postJson('/api/v1/test-orders/'.$orderId.'/accept', ['organization_id' => $orgId])->assertOk();
        $invoiceId = $this->postJson('/api/v1/test-orders/'.$orderId.'/bill', ['price_bdt' => 500, 'discount_bdt' => 50])
            ->assertCreated()->assertJsonPath('due_paisa', 45000)->json('id');
        $this->postJson('/api/v1/test-orders/'.$orderId.'/bill', ['price_bdt' => 500])->assertStatus(409);
        $this->postJson('/api/v1/invoices/'.$invoiceId.'/payments', ['amount_bdt' => 100])->assertCreated()->assertJsonPath('due_paisa', 35000);
        $this->postJson('/api/v1/invoices/'.$invoiceId.'/corrections', ['amount_bdt' => 25, 'reason' => 'Fictional correction'])->assertOk()->assertJsonPath('due_paisa', 37500);
        $reportId = $this->postJson('/api/v1/test-orders/'.$orderId.'/reports', ['observations' => 'Fictional observation'])->assertCreated()->json('id');
        $this->postJson('/api/v1/reports/'.$reportId.'/release')->assertOk();
        $amendedId = $this->postJson('/api/v1/reports/'.$reportId.'/amend', ['reason' => 'Fictional correction', 'observations' => 'Corrected fictional observation'])
            ->assertCreated()->assertJsonPath('supersedes_id', $reportId)->json('id');
        $this->postJson('/api/v1/reports/'.$amendedId.'/release')->assertOk();
        Sanctum::actingAs($patient);
        $this->getJson('/api/v1/reports/'.$reportId)->assertOk();
        $this->getJson('/api/v1/reports/'.$amendedId)->assertOk();
        $this->getJson('/api/v1/my-invoices')->assertOk()->assertJsonPath('0.paid_paisa', 7500);
        Sanctum::actingAs($pharmacy);
        $this->getJson('/api/v1/reports/'.$reportId)->assertNotFound();
    }

    public function test_amendment_keeps_original_and_marks_it_superseded(): void
    {
        $doctor = User::create(['name' => 'Dr. Revision', 'email' => 'revision-doctor-'.Str::ulid().'@example.test', 'password' => 'long-test-password']);
        Role::create(['user_id' => $doctor->id, 'role' => 'DOCTOR']);
        $doctor->clinicianCredential()->create(['bmdc_number' => 'TEST-'.Str::ulid(), 'hospital_clinic' => 'Example Clinic', 'verification_status' => 'VERIFIED']);
        $doctor->mfa_secret_encrypted = Crypt::encryptString('TESTSECRET'); $doctor->save();
        $recordId = (string) Str::ulid();
        DB::table('patient_records')->insert(['id' => $recordId, 'name' => 'Fictional Patient', 'phone_number' => '+8801512345678',
            'allergy_status' => 'NONE_KNOWN', 'created_by' => $doctor->id, 'created_at' => now(), 'updated_at' => now()]);
        $original = Prescription::create(['patient_record_id' => $recordId, 'doctor_id' => $doctor->id, 'status' => 'SIGNED',
            'template' => 'OUTPATIENT', 'issued_at' => now()]);
        Sanctum::actingAs($doctor);
        $newId = $this->postJson('/api/v1/clinical-prescriptions/'.$original->id.'/amend', [
            'amendment_reason' => 'Fictional plan revision', 'template' => 'ADVICE_ONLY', 'diagnosis' => 'Fictional review',
            'items' => [], 'tests' => ['Fictional test'],
        ])->assertCreated()->json('id');
        $this->assertNotNull($original->fresh()->superseded_at);
        $this->assertSame($original->id, Prescription::findOrFail($newId)->supersedes_id);
        $this->assertDatabaseHas('test_orders', ['prescription_id' => $newId, 'test_name' => 'Fictional test']);
    }

    public function test_doctor_can_book_and_assistant_can_check_in_but_not_complete(): void
    {
        $doctor = User::create(['name' => 'Dr. Queue', 'email' => 'queue-doctor-'.Str::ulid().'@example.test', 'password' => 'long-test-password']);
        Role::create(['user_id' => $doctor->id, 'role' => 'DOCTOR']);
        $doctor->mfa_secret_encrypted = Crypt::encryptString('TESTSECRET'); $doctor->save();
        $assistant = User::create(['name' => 'Assistant', 'email' => 'assistant-'.Str::ulid().'@example.test', 'password' => 'long-test-password']);
        $assistant->mfa_secret_encrypted = Crypt::encryptString('TESTSECRET'); $assistant->save();
        $patient = User::create(['name' => 'Queued Patient', 'phone_number' => '+8801711111111']);
        Role::create(['user_id' => $patient->id, 'role' => 'PATIENT']);
        $orgId = (string) Str::ulid();
        DB::table('organizations')->insert(['id' => $orgId, 'name' => 'Queue Clinic', 'type' => 'CLINIC', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('organization_memberships')->insert(['id' => (string) Str::ulid(), 'organization_id' => $orgId, 'user_id' => $assistant->id, 'role' => 'DOCTOR_ASSISTANT', 'assigned_doctor_id' => $doctor->id, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $recordId = (string) Str::ulid();
        DB::table('patient_records')->insert(['id' => $recordId, 'name' => $patient->name, 'phone_number' => $patient->phone_number, 'allergy_status' => 'UNKNOWN', 'created_by' => $doctor->id, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('patient_links')->insert(['id' => (string) Str::ulid(), 'patient_record_id' => $recordId, 'user_id' => $patient->id, 'relationship' => 'SELF', 'verified_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        Sanctum::actingAs($doctor);
        $appointmentId = $this->postJson('/api/v1/appointments', ['patient_record_id' => $recordId, 'doctor_id' => $doctor->id, 'organization_id' => $orgId, 'scheduled_at' => now()->addDay()->toIso8601String()])->assertCreated()->json('id');
        Sanctum::actingAs($assistant);
        $this->patchJson('/api/v1/appointments/'.$appointmentId, ['status' => 'CHECKED_IN'])->assertOk();
        $this->patchJson('/api/v1/appointments/'.$appointmentId, ['status' => 'COMPLETED'])->assertForbidden();
    }

    public function test_pharmacy_partial_dispensing_cannot_exceed_authorized_quantity(): void
    {
        $patient = User::create(['name' => 'Dispense Patient', 'phone_number' => '+8801722222222']);
        Role::create(['user_id' => $patient->id, 'role' => 'PATIENT']);
        $doctor = User::create(['name' => 'Dr. Dispense', 'email' => 'dispense-doctor-'.Str::ulid().'@example.test', 'password' => 'long-test-password']);
        Role::create(['user_id' => $doctor->id, 'role' => 'DOCTOR']);
        $doctor->clinicianCredential()->create(['bmdc_number' => 'TEST-'.Str::ulid(), 'hospital_clinic' => 'Example', 'verification_status' => 'VERIFIED']);
        $pharmacy = User::create(['name' => 'Dispensing Pharmacist', 'email' => 'dispense-pharmacy-'.Str::ulid().'@example.test', 'password' => 'long-test-password']);
        Role::create(['user_id' => $pharmacy->id, 'role' => 'PHARMACIST']);
        $pharmacy->mfa_secret_encrypted = Crypt::encryptString('TESTSECRET'); $pharmacy->save();
        $orgId = (string) Str::ulid();
        DB::table('organizations')->insert(['id' => $orgId, 'name' => 'Community Pharmacy', 'type' => 'PHARMACY', 'status' => 'APPROVED', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('pharmacy_establishment_licenses')->insert(['id' => (string) Str::ulid(), 'organization_id' => $orgId, 'license_number' => 'DL-1', 'document_path' => 'fake-license.pdf', 'verification_status' => 'VERIFIED', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('responsible_pharmacist_registrations')->insert(['id' => (string) Str::ulid(), 'organization_id' => $orgId, 'full_name' => 'Registered Pharmacist', 'registration_number' => 'PCB-1', 'document_path' => 'fake-pharmacist.pdf', 'verification_status' => 'VERIFIED', 'created_at' => now(), 'updated_at' => now()]);
        foreach (['PHARMACY_ADMIN', 'DISPENSER'] as $role) DB::table('organization_memberships')->insert(['id' => (string) Str::ulid(), 'organization_id' => $orgId, 'user_id' => $pharmacy->id, 'role' => $role, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $recordId = (string) Str::ulid();
        DB::table('patient_records')->insert(['id' => $recordId, 'name' => $patient->name, 'phone_number' => $patient->phone_number, 'allergy_status' => 'NONE_KNOWN', 'created_by' => $doctor->id, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('patient_links')->insert(['id' => (string) Str::ulid(), 'patient_record_id' => $recordId, 'user_id' => $patient->id, 'relationship' => 'SELF', 'verified_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        $rx = Prescription::create(['patient_record_id' => $recordId, 'doctor_id' => $doctor->id, 'status' => 'SIGNED', 'template' => 'OUTPATIENT', 'issued_at' => now()]);
        $item = $rx->items()->create(['generic_name' => 'Amoxicillin', 'strength' => '500 mg', 'dosage_form' => 'tablet', 'dose' => '1', 'route' => 'oral', 'schedule_type' => 'EVERY_N_HOURS', 'schedule_details' => ['hours' => 8], 'duration_days' => 3, 'quantity' => 3, 'is_antibiotic' => false]);
        $requestId = $this->actingAs($pharmacy)->postJson('/api/v1/sharing/requests', ['patient_record_id' => $recordId, 'organization_id' => $orgId, 'resource_type' => 'PRESCRIPTION', 'resource_id' => $rx->id, 'action' => 'DISPENSE', 'purpose' => 'Fill prescription', 'duration_minutes' => 60])->assertCreated()->json('id');
        Sanctum::actingAs($patient);
        $this->postJson('/api/v1/sharing/requests/'.$requestId.'/decision', ['decision' => 'APPROVE'])->assertOk();
        Sanctum::actingAs($pharmacy);
        $this->postJson('/api/v1/prescription-items/'.$item->id.'/dispensings', ['organization_id' => $orgId, 'quantity' => 2, 'product' => 'Amoxicillin', 'idempotency_key' => 'partial-dispense-key-1'])->assertCreated()->assertJsonPath('remaining_quantity', 1);
        $this->postJson('/api/v1/prescription-items/'.$item->id.'/dispensings', ['organization_id' => $orgId, 'quantity' => 2, 'product' => 'Amoxicillin', 'idempotency_key' => 'partial-dispense-key-2'])->assertUnprocessable();
    }

    public function test_doctor_registration_rejects_name_like_bmdc_and_pharmacy_keeps_two_private_credentials(): void
    {
        $this->postJson('/api/v1/auth/doctors/register', ['name' => 'Dr. Name', 'bmdc_number' => 'Dr. Name', 'hospital_clinic' => 'Clinic', 'email' => 'invalid-bmdc-'.Str::ulid().'@example.test', 'password' => 'long-test-password', 'password_confirmation' => 'long-test-password'])->assertUnprocessable();
        Storage::fake('local');
        $response = $this->post('/api/v1/auth/pharmacies/register', [
            'pharmacy_legal_name' => 'Fictional Pharmacy Ltd', 'pharmacy_trading_name' => 'Fictional Pharmacy', 'address' => 'Fictional address', 'contact_phone' => '+8801712345678', 'contact_email' => 'contact-'.Str::ulid().'@example.test', 'responsible_owner_name' => 'Fictional Owner',
            'license_number' => 'DGDA-FICTIONAL-1', 'license_issuing_authority' => 'DGDA', 'license_document' => UploadedFile::fake()->create('dgda-license.pdf', 20, 'application/pdf'),
            'pharmacist_full_name' => 'Fictional Pharmacist', 'pharmacist_registration_number' => 'PCB-FICTIONAL-1', 'pharmacist_registration_category' => 'A', 'pharmacist_issuing_authority' => 'Pharmacy Council of Bangladesh', 'pharmacist_document' => UploadedFile::fake()->create('pcb-registration.pdf', 20, 'application/pdf'),
            'email' => 'owner-'.Str::ulid().'@example.test', 'password' => 'long-test-password', 'password_confirmation' => 'long-test-password',
        ])->assertCreated()->assertJsonPath('status', 'SUBMITTED');
        $organizationId = $response->json('organization_id');
        $this->assertDatabaseHas('organizations', ['id' => $organizationId, 'type' => 'PHARMACY', 'status' => 'SUBMITTED']);
        $this->assertDatabaseHas('pharmacy_establishment_licenses', ['organization_id' => $organizationId, 'license_number' => 'DGDA-FICTIONAL-1']);
        $this->assertDatabaseHas('responsible_pharmacist_registrations', ['organization_id' => $organizationId, 'registration_number' => 'PCB-FICTIONAL-1']);
    }
}
