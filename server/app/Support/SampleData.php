<?php

namespace App\Support;

use App\Models\Role;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Fictional Khulna sample data (is_sample = true everywhere it applies). Idempotent: keyed by fixed emails/phones/names.
 * Never real people; doctor avatars are generated illustrations.
 */
class SampleData
{
    public const DOMAIN = 'sample.medminders.test';
    private array $accounts = [];

    private const HOSPITALS = [
        ['Sonadanga', 'Sample Rupsha Care Hospital', 'Sonadanga R/A, Khulna', 22.8166, 89.5403, '+8801900000201', '8 AM – 10 PM'],
        ['Boyra', 'Sample Boyra Diagnostic & Clinic', 'Boyra Main Road, Khulna', 22.8235, 89.5389, '+8801900000202', '9 AM – 9 PM'],
        ['KDA Avenue', 'Sample Sundarban City Medical', 'KDA Avenue, Khulna', 22.8141, 89.5634, '+8801900000203', '24 hours'],
        ['Khalishpur', 'Sample Bhairab Health Centre', 'Khalishpur, Khulna', 22.8456, 89.5328, '+8801900000204', '8 AM – 8 PM'],
    ];
    // name, sex, skin, specialty, degrees, years, fee, hospitals(idx), days, start, end
    private const DOCTORS = [
        ['Dr. Sample Farhana Akter', 'F', 2, 'Medicine', 'MBBS, FCPS (Medicine)', 12, 800, [0, 2], ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU'], '17:00', '21:00'],
        ['Dr. Sample Rafiqul Islam', 'M', 3, 'Medicine', 'MBBS, MD (Internal Medicine)', 9, 700, [1], ['SUN', 'TUE', 'THU', 'FRI'], '10:00', '14:00'],
        ['Dr. Sample Nusrat Jahan', 'F', 1, 'Cardiology', 'MBBS, MD (Cardiology)', 15, 1200, [2], ['SAT', 'MON', 'WED'], '16:00', '20:00'],
        ['Dr. Sample Tanvir Ahmed', 'M', 2, 'Respiratory Medicine (Chest)', 'MBBS, FCPS (Pulmonology)', 11, 1000, [0, 3], ['SUN', 'TUE', 'THU'], '15:00', '19:00'],
        ['Dr. Sample Sharmin Sultana', 'F', 3, 'Paediatrics', 'MBBS, DCH, FCPS (Paediatrics)', 10, 900, [1, 3], ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'], '09:00', '13:00'],
        ['Dr. Sample Mahmuda Khatun', 'F', 2, 'Gynaecology & Obstetrics', 'MBBS, FCPS (Gynae & Obs)', 14, 1000, [2], ['SAT', 'MON', 'WED', 'THU'], '17:00', '21:00'],
        ['Dr. Sample Arif Hossain', 'M', 1, 'Dermatology', 'MBBS, DDV', 8, 800, [0], ['SUN', 'TUE', 'FRI'], '18:00', '21:00'],
        ['Dr. Sample Kamrul Hasan', 'M', 3, 'ENT', 'MBBS, DLO, FCPS (ENT)', 13, 900, [1, 2], ['SAT', 'MON', 'WED'], '10:00', '13:00'],
        ['Dr. Sample Shirin Akhter', 'F', 1, 'Gastroenterology & Hepatology', 'MBBS, MD (Gastroenterology)', 16, 1200, [2], ['SUN', 'TUE', 'THU'], '16:00', '20:00'],
        ['Dr. Sample Mizanur Rahman', 'M', 2, 'Endocrinology (Diabetes)', 'MBBS, MD (Endocrinology)', 12, 1000, [0, 3], ['SAT', 'MON', 'WED', 'FRI'], '15:00', '19:00'],
        ['Dr. Sample Habibur Rahman', 'M', 3, 'Orthopaedics', 'MBBS, MS (Orthopaedics)', 18, 1000, [3], ['SUN', 'TUE', 'THU', 'SAT'], '10:00', '14:00'],
        ['Dr. Sample Sabina Yasmin', 'F', 2, 'Ophthalmology', 'MBBS, DO, FCPS (Eye)', 9, 800, [1], ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU'], '09:00', '12:00'],
    ];
    private const PATIENTS = [
        ['Sample Rahim Uddin', '1988-03-14', 'MALE'], ['Sample Karima Begum', '1975-07-02', 'FEMALE'], ['Sample Jamal Hossain', '1992-11-20', 'MALE'],
        ['Sample Ayesha Siddika', '2001-01-09', 'FEMALE'], ['Sample Nasir Ahmed', '1966-05-30', 'MALE'], ['Sample Tahmina Akter', '1995-09-17', 'FEMALE'],
        ['Sample Rakib Hasan', '2010-04-25', 'MALE'], ['Sample Shapla Rani', '1983-12-03', 'FEMALE'], ['Sample Imran Kabir', '1999-06-11', 'MALE'], ['Sample Lipi Das', '1979-02-27', 'FEMALE'],
    ];

    public function run(bool $rotate = false): array
    {
        DB::transaction(function () use ($rotate) {
            $hospitals = [];
            foreach (self::HOSPITALS as $i => [$area, $name, $address, $lat, $lng, $phone, $hours]) {
                $hospitals[$i] = $this->org('HOSPITAL', $name, ['area' => $area, 'address' => $address, 'latitude' => $lat, 'longitude' => $lng, 'contact_phone' => $phone, 'opening_hours' => $hours]);
                $staff = $this->user('hospital'.($i + 1), $name.' Desk', [], $rotate);
                foreach (['HOSPITAL_ADMIN', 'HOSPITAL_RECEPTION', 'LAB_STAFF', 'REPORT_REVIEWER', 'BILLING'] as $r) $this->member($hospitals[$i], $staff->id, $r);
            }
            $pharmacy = $this->org('PHARMACY', 'Sample Khulna Lifeline Pharmacy', ['area' => 'Sonadanga', 'address' => 'Sonadanga Bus Stand Road, Khulna', 'latitude' => 22.8170, 'longitude' => 89.5420, 'contact_phone' => '+8801900000205']);
            foreach (['pharmacy_establishment_licenses' => ['license_number' => 'SAMPLE-DL-0001'], 'responsible_pharmacist_registrations' => ['full_name' => 'Sample Pharmacist', 'registration_number' => 'SAMPLE-PCB-0001', 'registration_category' => 'A']] as $t => $extra) {
                if (! DB::table($t)->where('organization_id', $pharmacy)->exists()) DB::table($t)->insert($extra + ['id' => (string) Str::ulid(), 'organization_id' => $pharmacy, 'document_path' => $this->placeholder(),
                    'issuing_authority' => 'Fictional sample', 'verification_status' => 'VERIFIED', 'reviewed_at' => now(), 'review_reason' => 'Sample data', 'created_at' => now(), 'updated_at' => now()]);
            }
            $pharmacist = $this->user('pharmacy', 'Sample Pharmacist', ['PHARMACIST'], $rotate);
            foreach (['PHARMACY_ADMIN', 'DISPENSER'] as $r) $this->member($pharmacy, $pharmacist->id, $r);
            $this->user('admin', 'Sample Platform Admin', ['SUPERADMIN'], $rotate);

            $doctors = [];
            foreach (self::DOCTORS as $i => [$name, $sex, $skin, $spec, $deg, $years, $fee, $hIdx, $days, $start, $end]) {
                $u = $this->user('doctor'.($i + 1), $name, ['DOCTOR'], $rotate);
                $photo = $this->avatar('sample-doctor-'.($i + 1), $sex, $skin);
                $profile = ['bmdc_number' => 'A-1'.str_pad((string) (10001 + $i), 5, '0', STR_PAD_LEFT), 'specialty' => $spec, 'qualifications' => $deg, 'experience_years' => $years,
                    'fee_bdt' => $fee, 'languages' => 'Bangla, English', 'hospital_clinic' => self::HOSPITALS[$hIdx[0]][1], 'biography' => 'Fictional sample profile for demonstration. Not a real clinician.',
                    'verification_status' => 'VERIFIED', 'verified_at' => now(), 'is_published' => true, 'is_sample' => true, 'photo_path' => $photo, 'updated_at' => now()];
                $cid = DB::table('clinician_credentials')->where('user_id', $u->id)->value('id');
                if ($cid) DB::table('clinician_credentials')->where('id', $cid)->update($profile);
                else DB::table('clinician_credentials')->insert($profile + ['id' => (string) Str::ulid(), 'user_id' => $u->id, 'created_at' => now()]);
                foreach ($hIdx as $h) {
                    if (DB::table('doctor_affiliations')->where('doctor_id', $u->id)->where('organization_id', $hospitals[$h])->exists()) continue;
                    DB::table('doctor_affiliations')->insert(['id' => (string) Str::ulid(), 'doctor_id' => $u->id, 'organization_id' => $hospitals[$h], 'branch_label' => 'Outpatient chamber',
                        'visiting_days' => json_encode($days), 'start_time' => $start, 'end_time' => $end, 'slot_minutes' => 15, 'fee_bdt' => $fee, 'status' => 'CONFIRMED',
                        'decided_at' => now(), 'decision_note' => 'Sample data', 'created_at' => now(), 'updated_at' => now()]);
                }
                $doctors[$i] = ['user' => $u, 'hospital' => $hospitals[$hIdx[0]]];
            }

            foreach (self::PATIENTS as $i => [$name, $dob, $sex]) {
                $phone = '+88019000001'.str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT);
                $u = User::where('phone_number', $phone)->first();
                if (! $u) {
                    $u = new User(); $u->forceFill(['name' => $name, 'phone_number' => $phone, 'phone_verified_at' => now(), 'is_active' => true, 'is_sample' => true])->save();
                    Role::create(['user_id' => $u->id, 'role' => 'PATIENT', 'is_verified' => true]);
                    $rid = (string) Str::ulid();
                    DB::table('patient_records')->insert(['id' => $rid, 'name' => $name, 'phone_number' => $phone, 'date_of_birth' => $dob, 'sex' => $sex, 'allergy_status' => 'NONE_KNOWN',
                        'created_by' => $u->id, 'is_sample' => true, 'created_at' => now(), 'updated_at' => now()]);
                    DB::table('patient_links')->insert(['id' => (string) Str::ulid(), 'patient_record_id' => $rid, 'user_id' => $u->id, 'relationship' => 'SELF', 'verified_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
                    $this->story($i, $rid, $u, $doctors, $pharmacy, $pharmacist);
                }
                $this->accounts[] = ['patient '.($i + 1), $phone, 'phone + OTP (dev channel) — '.$name.', DOB '.$dob];
            }
        });
        return $this->accounts;
    }

    /** Gives each patient a realistic state: requested / assigned / completed with antibiotic course (active, completed, missed). */
    private function story(int $i, string $rid, User $patient, array $doctors, string $pharmacy, User $pharmacist): void
    {
        $doc = $doctors[$i % count($doctors)];
        $aff = DB::table('doctor_affiliations')->where('doctor_id', $doc['user']->id)->first();
        $status = ['PENDING_HOSPITAL', 'CONFIRMED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'PENDING_HOSPITAL', 'CONFIRMED', 'COMPLETED', 'COMPLETED', 'PENDING_HOSPITAL'][$i];
        $when = $status === 'COMPLETED' ? CarbonImmutable::now()->subDays(3)->setTime(11, 0) : CarbonImmutable::now('Asia/Dhaka')->addDays(1 + $i % 4)->setTimeFromTimeString($aff->start_time)->addMinutes(15 * $i)->utc();
        $appt = (string) Str::ulid();
        DB::table('appointments')->insert(['id' => $appt, 'patient_record_id' => $rid, 'doctor_id' => $doc['user']->id, 'organization_id' => $aff->organization_id, 'affiliation_id' => $aff->id,
            'created_by' => $patient->id, 'scheduled_at' => $when, 'status' => $status, 'serial_number' => $status === 'PENDING_HOSPITAL' ? null : 1 + $i % 5, 'visit_reason' => 'Sample: fever and cough',
            'completed_at' => $status === 'COMPLETED' ? $when->addMinutes(20) : null, 'is_sample' => true, 'created_at' => now(), 'updated_at' => now()]);
        if ($status === 'PENDING_HOSPITAL') return;
        $req = (string) Str::ulid();
        DB::table('sharing_requests')->insert(['id' => $req, 'patient_record_id' => $rid, 'requester_id' => $patient->id, 'organization_id' => $aff->organization_id, 'resource_type' => 'ENCOUNTER', 'resource_id' => $rid,
            'action' => 'REVIEW', 'purpose' => 'Consultation access from hospital assignment', 'duration_minutes' => 43200, 'status' => 'APPROVED', 'expires_at' => now()->addDays(30), 'created_at' => now(), 'updated_at' => now()]);
        DB::table('sharing_grants')->insert(['id' => (string) Str::ulid(), 'sharing_request_id' => $req, 'patient_record_id' => $rid, 'recipient_id' => $doc['user']->id, 'organization_id' => $aff->organization_id,
            'resource_type' => 'ENCOUNTER', 'resource_id' => $rid, 'action' => 'REVIEW', 'expires_at' => now()->addDays(30), 'scopes' => json_encode(['PROFILE', 'PRESCRIPTIONS', 'REPORTS', 'HISTORY']),
            'created_via' => 'ASSIGNMENT', 'appointment_id' => $appt, 'created_at' => now(), 'updated_at' => now()]);
        if ($status !== 'COMPLETED') return;
        // Prescription with an antibiotic course: 2 = active today, 3 = completed, 4 = missed doses, others active.
        $rx = (string) Str::ulid();
        DB::table('prescriptions')->insert(['id' => $rx, 'patient_record_id' => $rid, 'doctor_id' => $doc['user']->id, 'template' => 'OUTPATIENT', 'diagnosis' => 'Sample: suspected bacterial infection',
            'clinical_details' => json_encode(['advice' => 'Drink plenty of fluids.', 'follow_up' => 'Review after the course']), 'patient_snapshot' => json_encode(['id' => $rid, 'name' => $patient->name]),
            'doctor_snapshot' => json_encode(['id' => $doc['user']->id, 'name' => $doc['user']->name, 'verification_status' => 'VERIFIED']), 'status' => 'SIGNED', 'issued_at' => $when, 'created_at' => $when, 'updated_at' => $when]);
        $item = (string) Str::ulid();
        DB::table('prescription_items')->insert(['id' => $item, 'prescription_id' => $rx, 'generic_name' => 'Amoxicillin', 'strength' => '500 mg', 'dosage_form' => 'Capsule', 'dose' => '1 capsule', 'route' => 'Oral',
            'schedule_type' => 'EXPLICIT_TIMES', 'schedule_details' => json_encode(['times' => ['08:00', '14:00', '20:00'], 'pattern' => '1+1+1', 'meal' => 'AFTER']), 'duration_days' => 7, 'quantity' => 21,
            'instructions' => 'After meals. Complete the full course.', 'is_antibiotic' => true, 'indication' => 'Sample indication', 'aware_group' => 'UNKNOWN', 'created_at' => $when, 'updated_at' => $when]);
        $completed = $i === 3;
        $start = $completed ? CarbonImmutable::now()->subDays(9) : CarbonImmutable::now()->subDays(3)->setTime(2, 0); // 08:00 Dhaka
        $course = (string) Str::ulid();
        DB::table('medication_courses')->insert(['id' => $course, 'prescription_item_id' => $item, 'patient_record_id' => $rid, 'actual_start_at' => $start, 'planned_end_at' => $start->addDays(7),
            'timezone' => 'Asia/Dhaka', 'status' => 'ACTIVE', 'completion_status' => $completed ? 'PATIENT_REPORTED_COMPLETE' : 'UNKNOWN', 'created_at' => $when, 'updated_at' => now()]);
        for ($d = 0; $d < 7; $d++) foreach ([2, 8, 14] as $h) { // 08:00, 14:00, 20:00 Dhaka in UTC
            $at = $start->startOfDay()->addDays($d)->addHours($h);
            $past = $at->lessThan(now()->subHour());
            $st = ! $past ? 'SCHEDULED' : ($i === 4 && $d >= 1 && $h === 14 ? 'MISSED' : ($i === 4 && $d === 2 ? 'SKIPPED' : 'TAKEN'));
            $ev = (string) Str::ulid();
            DB::table('dose_events')->insert(['id' => $ev, 'medication_course_id' => $course, 'scheduled_at' => $at, 'status' => $st, 'created_at' => now(), 'updated_at' => now()]);
            if (in_array($st, ['TAKEN', 'SKIPPED'], true)) DB::table('dose_logs')->insert(['id' => (string) Str::ulid(), 'dose_event_id' => $ev, 'actor_id' => $patient->id, 'status' => $st,
                'actual_at' => $st === 'TAKEN' ? $at->addMinutes(10) : null, 'created_at' => $at->addMinutes(10), 'updated_at' => $at->addMinutes(10)]);
        }
        if ($i === 2 || $i === 3) { // dispensing record + pharmacy authorization
            DB::table('dispensings')->insert(['id' => (string) Str::ulid(), 'prescription_item_id' => $item, 'organization_id' => $pharmacy, 'staff_id' => $pharmacist->id, 'quantity' => $i === 2 ? 12 : 21,
                'product' => 'Amoxicillin', 'supplied_at' => $when->addHour(), 'idempotency_key' => 'sample-'.$item, 'created_at' => now(), 'updated_at' => now()]);
        }
        if ($i === 2) { // test bill + released report
            $labStaff = DB::table('organization_memberships')->where('organization_id', $aff->organization_id)->where('role', 'LAB_STAFF')->value('user_id');
            $order = (string) Str::ulid();
            DB::table('test_orders')->insert(['id' => $order, 'prescription_id' => $rx, 'patient_record_id' => $rid, 'test_name' => 'Complete blood count (CBC)', 'status' => 'COMPLETED',
                'performing_organization_id' => $aff->organization_id, 'created_at' => $when, 'updated_at' => now()]);
            DB::table('service_invoices')->insert(['id' => (string) Str::ulid(), 'patient_record_id' => $rid, 'organization_id' => $aff->organization_id, 'test_order_id' => $order, 'price_paisa' => 45000,
                'discount_paisa' => 0, 'paid_paisa' => 45000, 'created_by' => $labStaff, 'created_at' => $when, 'updated_at' => now()]);
            DB::table('lab_reports')->insert(['id' => (string) Str::ulid(), 'test_order_id' => $order, 'patient_record_id' => $rid, 'organization_id' => $aff->organization_id, 'author_id' => $labStaff, 'reviewer_id' => $labStaff, 'status' => 'RELEASED',
                'observations' => 'Sample report: values within reference range (fictional).', 'released_at' => $when->addDay(), 'created_at' => $when, 'updated_at' => now()]);
        }
    }

    private function org(string $type, string $name, array $extra): string
    {
        $id = DB::table('organizations')->where('name', $name)->value('id');
        if ($id) return $id;
        $id = (string) Str::ulid();
        DB::table('organizations')->insert($extra + ['id' => $id, 'name' => $name, 'legal_name' => $name, 'type' => $type, 'status' => 'APPROVED', 'is_sample' => true,
            'contact_email' => Str::slug($name).'@'.self::DOMAIN, 'reviewed_at' => now(), 'review_reason' => 'Sample data (fictional organization)', 'created_at' => now(), 'updated_at' => now()]);
        return $id;
    }

    private function member(string $org, string $userId, string $role): void
    {
        if (! DB::table('organization_memberships')->where('organization_id', $org)->where('user_id', $userId)->where('role', $role)->exists())
            DB::table('organization_memberships')->insert(['id' => (string) Str::ulid(), 'organization_id' => $org, 'user_id' => $userId, 'role' => $role, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
    }

    private function user(string $key, string $name, array $roles, bool $rotate): User
    {
        $email = $key.'@'.self::DOMAIN;
        $u = User::where('email', $email)->first();
        if (! $u || $rotate) {
            $pw = Str::password(14, symbols: false);
            $u ??= new User();
            $u->forceFill(['name' => $name, 'email' => $email, 'password' => Hash::make($pw), 'is_active' => true, 'is_sample' => true])->save();
            $this->accounts[] = [$key, $email, $pw];
        } else {
            $this->accounts[] = [$key, $email, '(unchanged — use --rotate-passwords)'];
        }
        foreach ($roles as $r) if (! $u->hasRole($r)) Role::create(['user_id' => $u->id, 'role' => $r, 'is_verified' => true]);
        return $u;
    }

    private function placeholder(): string
    {
        Storage::disk('local')->put('sample/credential-placeholder.txt', 'Fictional sample. No real document.');
        return 'sample/credential-placeholder.txt';
    }

    /** Simple illustrated avatar (no real person): face, hair, coat, stethoscope. Deterministic per key. */
    private function avatar(string $key, string $sex, int $skin): string
    {
        $skins = ['#F2D3B1', '#E0AC69', '#C68642', '#8D5524'];
        $bg = ['#CCFBF1', '#DBEAFE', '#E0E7FF', '#FCE7F3'][crc32($key) % 4];
        $hair = $sex === 'F'
            ? '<path d="M38 78c0-30 18-46 42-46s42 16 42 46v34h-14V84c-8-10-48-10-56 0v28H38z" fill="#2B2118"/>'
            : '<path d="M44 74c0-24 16-38 36-38s36 14 36 38c-10-10-62-10-72 0z" fill="#2B2118"/>';
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" rx="80" fill="'.$bg.'"/>'.
            '<path d="M24 160c4-34 26-50 56-50s52 16 56 50z" fill="#FFFFFF"/><path d="M68 112l12 18 12-18" fill="#0E7C7B"/>'.
            '<path d="M58 118c-6 14-4 26 6 30" stroke="#334155" stroke-width="3" fill="none"/><circle cx="64" cy="148" r="4" fill="#334155"/>'.
            '<rect x="70" y="96" width="20" height="18" fill="'.$skins[$skin].'"/><ellipse cx="80" cy="78" rx="28" ry="32" fill="'.$skins[$skin].'"/>'.$hair.
            '<circle cx="70" cy="80" r="3" fill="#1F2937"/><circle cx="90" cy="80" r="3" fill="#1F2937"/><path d="M72 94c5 4 11 4 16 0" stroke="#7C2D12" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>';
        $path = 'doctor-photos/'.$key.'.svg';
        Storage::disk('local')->put($path, $svg);
        return $path;
    }

    /** Deletes every is_sample row and dependents. */
    public static function purge(): array
    {
        $counts = [];
        DB::transaction(function () use (&$counts) {
            $patients = DB::table('patient_records')->where('is_sample', true)->pluck('id');
            $users = DB::table('users')->where('is_sample', true)->pluck('id');
            $orgs = DB::table('organizations')->where('is_sample', true)->pluck('id');
            $rx = DB::table('prescriptions')->whereIn('patient_record_id', $patients)->pluck('id');
            $items = DB::table('prescription_items')->whereIn('prescription_id', $rx)->pluck('id');
            $courses = DB::table('medication_courses')->whereIn('patient_record_id', $patients)->pluck('id');
            $events = DB::table('dose_events')->whereIn('medication_course_id', $courses)->pluck('id');
            $orders = DB::table('test_orders')->whereIn('patient_record_id', $patients)->pluck('id');
            $invoices = DB::table('service_invoices')->whereIn('patient_record_id', $patients)->pluck('id');
            $del = function (string $table, string $col, $ids) use (&$counts) { if (collect($ids)->isNotEmpty()) $counts[$table] = ($counts[$table] ?? 0) + DB::table($table)->whereIn($col, $ids)->delete(); };
            $del('invoice_transactions', 'service_invoice_id', $invoices); $del('service_invoices', 'id', $invoices); $del('lab_reports', 'test_order_id', $orders); $del('test_orders', 'id', $orders);
            $del('dose_alarm_states', 'dose_event_id', $events); $del('reminder_deliveries', 'dose_event_id', $events); $del('care_notifications', 'dose_event_id', $events);
            $del('dose_logs', 'dose_event_id', $events); $del('dose_events', 'id', $events); $del('medication_support_alerts', 'medication_course_id', $courses);
            $del('medication_problem_reports', 'medication_course_id', $courses); $del('medication_courses', 'id', $courses); $del('dispensings', 'prescription_item_id', $items);
            $del('prescription_items', 'id', $items); $del('prescriptions', 'id', $rx);
            $del('sharing_grants', 'patient_record_id', $patients); $del('sharing_requests', 'patient_record_id', $patients);
            $del('sharing_grants', 'recipient_id', $users); $del('sharing_requests', 'requester_id', $users);
            $appts = DB::table('appointments')->where(fn ($q) => $q->whereIn('patient_record_id', $patients)->orWhereIn('organization_id', $orgs)->orWhereIn('doctor_id', $users))->pluck('id');
            $del('appointment_status_history', 'appointment_id', $appts); $del('appointments', 'id', $appts);
            $del('doctor_affiliations', 'organization_id', $orgs); $del('doctor_affiliations', 'doctor_id', $users);
            $del('patient_links', 'patient_record_id', $patients); $del('patient_records', 'id', $patients);
            $del('pharmacy_establishment_licenses', 'organization_id', $orgs); $del('responsible_pharmacist_registrations', 'organization_id', $orgs);
            $del('organization_memberships', 'organization_id', $orgs); $del('organization_memberships', 'user_id', $users);
            $del('care_notifications', 'user_id', $users); $del('push_subscriptions', 'user_id', $users); $del('personal_access_tokens', 'tokenable_id', $users);
            $del('clinician_credentials', 'user_id', $users); $del('user_roles', 'user_id', $users);
            DB::table('audit_events')->whereIn('actor_user_id', $users)->update(['actor_user_id' => null]);
            $del('users', 'id', $users); $del('organizations', 'id', $orgs);
        });
        return $counts;
    }
}
