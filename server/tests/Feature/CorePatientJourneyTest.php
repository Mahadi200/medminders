<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\v1\AssistantController;
use App\Jobs\SendDoseReminder;
use App\Models\Role;
use App\Models\User;
use App\Services\Auth\TestingPatientSmsGateway;
use App\Services\WebPushService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CorePatientJourneyTest extends TestCase
{
    use DatabaseTransactions;

    private function org(string $type, array $extra = []): string
    {
        $id = (string) Str::ulid();
        DB::table('organizations')->insert($extra + ['id' => $id, 'name' => "J $type $id", 'type' => $type, 'status' => 'APPROVED', 'created_at' => now(), 'updated_at' => now()]);
        return $id;
    }

    private function staff(string $org, array $roles): User
    {
        $u = User::create(['name' => 'Staff', 'email' => 's-'.Str::ulid().'@example.test', 'password' => 'long-test-password']);
        foreach ($roles as $r) DB::table('organization_memberships')->insert(['id' => (string) Str::ulid(), 'organization_id' => $org, 'user_id' => $u->id, 'role' => $r, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $u->mfa_secret_encrypted = Crypt::encryptString('X'); $u->save();
        return $u;
    }

    private function doctor(string $hospital, string $specialty): array
    {
        $d = User::create(['name' => "Dr $specialty", 'email' => 'd-'.Str::ulid().'@example.test', 'password' => 'long-test-password']);
        Role::create(['user_id' => $d->id, 'role' => 'DOCTOR']);
        $d->clinicianCredential()->create(['bmdc_number' => 'A-'.random_int(100000, 999999), 'hospital_clinic' => 'X', 'specialty' => $specialty, 'verification_status' => 'VERIFIED', 'is_published' => true]);
        $d->mfa_secret_encrypted = Crypt::encryptString('X'); $d->save();
        $aff = (string) Str::ulid();
        DB::table('doctor_affiliations')->insert(['id' => $aff, 'doctor_id' => $d->id, 'organization_id' => $hospital, 'visiting_days' => json_encode(['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI']),
            'start_time' => '00:00', 'end_time' => '23:45', 'slot_minutes' => 15, 'fee_bdt' => 700, 'status' => 'CONFIRMED', 'created_at' => now(), 'updated_at' => now()]);
        return [$d, $aff];
    }

    private function otp(string $phone): string
    {
        TestingPatientSmsGateway::$deliveries = [];
        $r = $this->postJson('/api/v1/public/otp', ['phone' => $phone]);
        $challenge = $r->assertOk()->json('challenge_id');
        $code = end(TestingPatientSmsGateway::$deliveries)['code'];
        $this->postJson('/api/v1/public/otp/verify', ['challenge_id' => $challenge, 'code' => '000000'])->assertStatus(422);
        return $this->postJson('/api/v1/public/otp/verify', ['challenge_id' => $challenge, 'code' => $code])->assertOk()->json('verification_id');
    }

    public function test_core_journey_from_catalogue_to_revocation(): void
    {
        Queue::fake();
        $hospital = $this->org('HOSPITAL', ['area' => 'Sonadanga', 'latitude' => 22.8166, 'longitude' => 89.5403]);
        $pharmacyOrg = $this->org('PHARMACY');
        $desk = $this->staff($hospital, ['HOSPITAL_ADMIN', 'HOSPITAL_RECEPTION', 'LAB_STAFF', 'REPORT_REVIEWER', 'BILLING']);
        $pharmacist = $this->staff($pharmacyOrg, ['PHARMACY_ADMIN', 'DISPENSER']);
        foreach (['pharmacy_establishment_licenses' => ['license_number' => 'L'], 'responsible_pharmacist_registrations' => ['full_name' => 'P', 'registration_number' => 'R']] as $t => $extra)
            DB::table($t)->insert($extra + ['id' => (string) Str::ulid(), 'organization_id' => $pharmacyOrg, 'document_path' => 'x', 'verification_status' => 'VERIFIED', 'created_at' => now(), 'updated_at' => now()]);
        [$requested, $aff] = $this->doctor($hospital, 'Medicine');
        [$assigned] = $this->doctor($hospital, 'Medicine');

        // 1. Catalogue lists the affiliated doctor with next availability.
        $cat = $this->getJson('/api/v1/public/doctors?specialty=Medicine')->assertOk()->json('doctors');
        $entry = collect($cat)->firstWhere('user_id', $requested->id);
        $this->assertNotNull($entry['next_available']);
        $slot = $this->getJson('/api/v1/affiliations/'.$aff.'/slots?date='.now('Asia/Dhaka')->addDay()->format('Y-m-d'))->json('slots.6.starts_at');

        // 2. Booking needs a verified phone; it creates the patient profile.
        $phone = '0171'.random_int(1000000, 9999999);
        $verification = $this->otp($phone);
        $booking = $this->postJson('/api/v1/public/bookings', ['verification_id' => $verification, 'name' => 'Journey Patient', 'date_of_birth' => '1990-05-01', 'sex' => 'FEMALE',
            'affiliation_id' => $aff, 'scheduled_at' => $slot, 'visit_reason' => 'Fever'])->assertCreated();
        $this->assertSame('PENDING_HOSPITAL', $booking->json('booking.status'));
        $this->postJson('/api/v1/public/bookings', ['verification_id' => $verification, 'name' => 'Journey Patient', 'date_of_birth' => '1990-05-01', 'affiliation_id' => $aff, 'scheduled_at' => $slot])->assertStatus(422); // single use
        $patient = User::where('phone_number', '+88'.$phone)->firstOrFail();
        $recordId = DB::table('patient_links')->where('user_id', $patient->id)->value('patient_record_id');
        // Same phone + different identity is refused.
        $this->postJson('/api/v1/public/bookings', ['verification_id' => $this->otpAfterWait($phone), 'name' => 'Someone Else', 'date_of_birth' => '1990-05-01', 'affiliation_id' => $aff, 'scheduled_at' => $slot])->assertStatus(409);

        // 3. Hospital assigns a different affiliated doctor; consultation grant is created automatically.
        $apptId = $booking->json('booking.id');
        Sanctum::actingAs($desk);
        $this->patchJson('/api/v1/appointments/'.$apptId, ['status' => 'CANCELLED'])->assertStatus(422); // reason required
        $this->patchJson('/api/v1/appointments/'.$apptId, ['status' => 'CONFIRMED', 'assigned_doctor_id' => $assigned->id])->assertOk();
        $this->assertDatabaseHas('appointments', ['id' => $apptId, 'doctor_id' => $assigned->id, 'serial_number' => 1, 'assigned_by' => $desk->id]);
        $this->assertDatabaseHas('sharing_grants', ['appointment_id' => $apptId, 'recipient_id' => $assigned->id, 'created_via' => 'ASSIGNMENT']);
        $this->assertSame(2, DB::table('appointment_status_history')->where('appointment_id', $apptId)->count());

        // 4. Assigned doctor sees the patient in the queue and prescribes; appointment completes.
        Sanctum::actingAs($assigned);
        $date = CarbonImmutable::parse($slot)->setTimezone('Asia/Dhaka')->format('Y-m-d');
        $queue = $this->getJson('/api/v1/doctor/queue?date='.$date)->assertOk()->json();
        $this->assertSame('Journey Patient', $queue[0]['name']);
        $this->assertStringContainsString('•', $queue[0]['phone']);
        $this->getJson('/api/v1/doctor/patients/'.$recordId)->assertOk()->assertJsonPath('profile.sex', 'FEMALE');
        Sanctum::actingAs($requested);
        $this->getJson('/api/v1/doctor/patients/'.$recordId)->assertNotFound();
        Sanctum::actingAs($patient);
        $this->patchJson('/api/v1/patients/records/'.$recordId, ['allergy_status' => 'NONE_KNOWN'])->assertOk();
        Sanctum::actingAs($assigned);
        $rx = $this->postJson('/api/v1/clinical-prescriptions', ['patient_record_id' => $recordId, 'template' => 'OUTPATIENT', 'appointment_id' => $apptId, 'diagnosis' => 'Test',
            'items' => [['generic_name' => 'Amoxicillin', 'strength' => '500 mg', 'dosage_form' => 'Capsule', 'dose' => '1 capsule', 'route' => 'Oral', 'schedule_type' => 'EXPLICIT_TIMES',
                'schedule_details' => ['times' => ['08:00', '20:00'], 'pattern' => '1+0+1', 'meal' => 'AFTER'], 'duration_days' => 5, 'quantity' => 10, 'is_antibiotic' => true, 'indication' => 'Test']],
            'tests' => ['CBC']])->assertCreated();
        $this->assertDatabaseHas('appointments', ['id' => $apptId, 'status' => 'COMPLETED']);

        // 5. Patient starts the course; reminders are queued via push; follow-up then missed.
        Sanctum::actingAs($patient);
        $courseId = DB::table('medication_courses')->where('patient_record_id', $recordId)->value('id');
        $this->postJson('/api/v1/courses/'.$courseId.'/start', ['actual_start_at' => now()->subHours(13)->toIso8601String(), 'timezone' => 'Asia/Dhaka'])->assertOk();
        DB::table('push_subscriptions')->insert(['id' => (string) Str::ulid(), 'user_id' => $patient->id, 'endpoint' => 'https://push.example/x', 'endpoint_hash' => hash('sha256', 'https://push.example/x'),
            'p256dh' => 'k', 'auth' => 'a', 'action_key_hash' => hash('sha256', 'device-key'), 'created_at' => now(), 'updated_at' => now()]);
        $events = DB::table('dose_events')->where('medication_course_id', $courseId)->orderBy('scheduled_at')->get();
        DB::table('dose_events')->where('id', $events[0]->id)->update(['scheduled_at' => now()->subMinutes(70)]);
        DB::table('dose_events')->where('id', $events[1]->id)->update(['scheduled_at' => now()->subMinutes(35)]);
        $this->artisan('care:prepare-dose-notifications')->assertSuccessful();
        $this->assertDatabaseHas('dose_events', ['id' => $events[0]->id, 'status' => 'MISSED']);
        $this->assertDatabaseHas('reminder_deliveries', ['dose_event_id' => $events[1]->id, 'kind' => 'DUE', 'channel' => 'PUSH']);
        $this->assertDatabaseHas('reminder_deliveries', ['dose_event_id' => $events[1]->id, 'kind' => 'FOLLOW_UP', 'channel' => 'PUSH']);
        Queue::assertPushed(SendDoseReminder::class, 2);
        $this->artisan('care:prepare-dose-notifications'); // idempotent
        $this->assertSame(2, DB::table('reminder_deliveries')->where('dose_event_id', $events[1]->id)->count());
        // Notification button marks the dose taken (device key, no session).
        $this->postJson('/api/v1/push/action', ['key' => 'wrong', 'dose_event_id' => $events[1]->id, 'action' => 'TAKEN'])->assertForbidden();
        $this->postJson('/api/v1/push/action', ['key' => 'device-key', 'dose_event_id' => $events[1]->id, 'action' => 'TAKEN'])->assertOk();
        $this->assertDatabaseHas('dose_events', ['id' => $events[1]->id, 'status' => 'TAKEN']);
        $summary = $this->getJson('/api/v1/courses/'.$courseId)->json('summary');
        $this->assertSame(1, $summary['missed_no_confirmation']);

        // 6. Pharmacy finds patient by phone: masked and unauthorized until the patient approves.
        Sanctum::actingAs($pharmacist);
        $found = $this->getJson('/api/v1/organization/patients/search?phone='.$phone)->assertOk()->json('0');
        $this->assertFalse($found['authorized']);
        $this->assertArrayNotHasKey('prescriptions', $found);
        $item = DB::table('prescription_items')->where('prescription_id', $rx->json('id'))->value('id');
        $this->postJson('/api/v1/prescription-items/'.$item.'/dispensings', ['organization_id' => $pharmacyOrg, 'quantity' => 4, 'product' => 'Amoxicillin', 'idempotency_key' => (string) Str::uuid()])->assertForbidden();
        $requestId = $this->postJson('/api/v1/organization/patients/'.$recordId.'/request-access', ['purpose' => 'Dispense antibiotic'])->assertCreated()->json('id');
        Sanctum::actingAs($patient);
        $this->postJson('/api/v1/sharing/requests/'.$requestId.'/decision', ['decision' => 'APPROVE'])->assertOk();
        Sanctum::actingAs($pharmacist);
        $this->assertTrue($this->getJson('/api/v1/organization/patients/search?phone='.$phone)->json('0.authorized'));
        $this->postJson('/api/v1/prescription-items/'.$item.'/dispensings', ['organization_id' => $pharmacyOrg, 'quantity' => 4, 'product' => 'Amoxicillin', 'idempotency_key' => (string) Str::uuid()])->assertCreated();

        // 7. Hospital authorized by the patient bills and releases a report.
        Sanctum::actingAs($patient);
        $this->postJson('/api/v1/access/authorize', ['target' => 'HOSPITAL', 'target_id' => $hospital, 'scopes' => ['REPORTS', 'PRESCRIPTIONS'], 'days' => 7])->assertCreated();
        Sanctum::actingAs($desk);
        $order = DB::table('test_orders')->where('prescription_id', $rx->json('id'))->value('id');
        $this->postJson('/api/v1/test-orders/'.$order.'/accept', ['organization_id' => $hospital])->assertOk();
        $this->postJson('/api/v1/test-orders/'.$order.'/bill', ['price_bdt' => 300])->assertCreated();
        $report = $this->postJson('/api/v1/test-orders/'.$order.'/reports', ['observations' => 'Fictional'])->assertCreated()->json('id');
        $this->postJson('/api/v1/reports/'.$report.'/release')->assertOk();
        $this->assertDatabaseHas('care_notifications', ['user_id' => $patient->id, 'event_type' => 'REPORT_RELEASED']);

        // 8. Patient revokes the pharmacy; it loses access.
        Sanctum::actingAs($patient);
        $overview = $this->getJson('/api/v1/access/overview')->assertOk()->json('grants');
        $pharmacyGrant = collect($overview)->firstWhere('organization_id', $pharmacyOrg);
        $this->postJson('/api/v1/sharing/grants/'.$pharmacyGrant['id'].'/revoke')->assertOk();
        Sanctum::actingAs($pharmacist);
        $this->assertFalse($this->getJson('/api/v1/organization/patients/search?phone='.$phone)->json('0.authorized'));
        $this->postJson('/api/v1/prescription-items/'.$item.'/dispensings', ['organization_id' => $pharmacyOrg, 'quantity' => 1, 'product' => 'Amoxicillin', 'idempotency_key' => (string) Str::uuid()])->assertForbidden();
    }

    private function otpAfterWait(string $phone): string
    {
        DB::table('phone_challenges')->where('phone_number', '+88'.$phone)->update(['created_at' => now()->subMinutes(2)]);
        return $this->otp($phone);
    }

    public function test_assistant_maps_conditions_red_flags_and_distance(): void
    {
        $this->assertSame('dengue', AssistantController::match('I think I have dengue')['condition']->key);
        $this->assertSame('diabetes', AssistantController::match('আমার ডায়াবেটিস')['condition']->key);
        $this->assertSame('eye', AssistantController::match('chokh lal, red eye')['condition']->key);
        $chest = AssistantController::match('sudden chest pain');
        $this->assertNotEmpty($chest['red_flags']);
        $this->assertSame('heart', $chest['condition']->key);
        $this->assertEmpty(AssistantController::match('mild cough')['red_flags']);
        $this->assertSame(0.0, AssistantController::haversineKm(22.8, 89.5, 22.8, 89.5));
        $this->assertEqualsWithDelta(3.4, AssistantController::haversineKm(22.8166, 89.5403, 22.8456, 89.5328), 0.3);

        $near = $this->org('HOSPITAL', ['area' => 'Boyra', 'latitude' => 22.8235, 'longitude' => 89.5389]);
        $far = $this->org('HOSPITAL', ['area' => 'Daulatpur', 'latitude' => 22.8778, 'longitude' => 89.5167]);
        $this->doctor($far, 'Dermatology'); $this->doctor($near, 'Dermatology');
        $r = $this->postJson('/api/v1/assistant/ask', ['message' => 'fungal skin itch', 'lat' => 22.824, 'lng' => 89.539])->assertOk();
        $this->assertSame('Dermatology', $r->json('specialty'));
        $this->assertSame($near, $r->json('nearest_hospital.id'));
        $this->assertStringContainsString('does not give medical advice', $r->json('disclaimer.en'));
        $urgent = $this->postJson('/api/v1/assistant/ask', ['message' => 'my baby has breathing difficulty'])->assertOk();
        $this->assertNotNull($urgent->json('urgent.en'));
        // Availability sorting: earliest next slot first.
        $docs = collect($r->json('doctors'))->pluck('next_available.starts_at')->filter()->values()->all();
        $sorted = $docs; sort($sorted);
        $this->assertSame($sorted, $docs);
    }

    public function test_push_reminder_job_sends_and_tracks_delivery(): void
    {
        $pair = WebPushService::generateKeyPair();
        config(['services.webpush.private_key' => base64_encode($pair['private_pem']), 'services.webpush.public_key' => WebPushService::b64u($pair['public'])]);
        $ua = WebPushService::generateKeyPair();
        Http::fake(['push.example/*' => Http::response('', 201)]);
        $hospital = $this->org('HOSPITAL');
        [$doc] = $this->doctor($hospital, 'Medicine');
        $patient = User::create(['name' => 'P', 'phone_number' => '+8801719999'.random_int(100, 999)]);
        Role::create(['user_id' => $patient->id, 'role' => 'PATIENT']);
        $rid = (string) Str::ulid();
        DB::table('patient_records')->insert(['id' => $rid, 'name' => 'P', 'phone_number' => $patient->phone_number, 'allergy_status' => 'NONE_KNOWN', 'created_by' => $doc->id, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('patient_links')->insert(['id' => (string) Str::ulid(), 'patient_record_id' => $rid, 'user_id' => $patient->id, 'relationship' => 'SELF', 'verified_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        Sanctum::actingAs($doc);
        $this->postJson('/api/v1/clinical-prescriptions', ['patient_record_id' => $rid, 'template' => 'OUTPATIENT', 'items' => [['generic_name' => 'Amoxicillin', 'strength' => '500 mg', 'dosage_form' => 'Capsule', 'dose' => '1', 'route' => 'Oral',
            'schedule_type' => 'EVERY_N_HOURS', 'schedule_details' => ['hours' => 8], 'duration_days' => 3, 'quantity' => 9, 'is_antibiotic' => true, 'indication' => 'T']], 'tests' => []])->assertCreated();
        Sanctum::actingAs($patient);
        $course = DB::table('medication_courses')->where('patient_record_id', $rid)->value('id');
        $this->postJson('/api/v1/courses/'.$course.'/start', ['actual_start_at' => now()->subMinutes(2)->toIso8601String(), 'timezone' => 'Asia/Dhaka'])->assertOk();
        DB::table('push_subscriptions')->insert(['id' => (string) Str::ulid(), 'user_id' => $patient->id, 'endpoint' => 'https://push.example/sub', 'endpoint_hash' => hash('sha256', 'https://push.example/sub'),
            'p256dh' => WebPushService::b64u($ua['public']), 'auth' => WebPushService::b64u(random_bytes(16)), 'action_key_hash' => hash('sha256', 'k'), 'created_at' => now(), 'updated_at' => now()]);
        $this->artisan('care:prepare-dose-notifications')->assertSuccessful(); // sync queue in tests runs the job
        $this->assertDatabaseHas('reminder_deliveries', ['user_id' => $patient->id, 'kind' => 'DUE', 'channel' => 'PUSH', 'status' => 'SENT']);
        Http::assertSent(fn ($r) => $r->hasHeader('Content-Encoding', 'aes128gcm') && str_starts_with($r->header('Authorization')[0], 'vapid t='));
        // Quiet hours never silence antibiotic reminders.
        DB::table('notification_preferences')->updateOrInsert(['user_id' => $patient->id], ['in_app_dose_reminders' => false, 'in_app_followups' => false, 'timezone' => 'Asia/Dhaka', 'quiet_from' => '00:00:00', 'quiet_until' => '23:59:00', 'created_at' => now(), 'updated_at' => now()]);
        $this->assertDatabaseHas('care_notifications', ['user_id' => $patient->id, 'event_type' => 'DOSE_REMINDER']);
    }
}
