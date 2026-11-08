<?php

namespace App\Console\Commands;

use App\Models\AuditEvent;
use App\Models\Role;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Creates clearly fictional demo accounts and organizations for the pitch demo.
 * - Never runs in production. Never touches existing non-demo rows. Idempotent.
 * - Fixture "verification" is recorded as a DEMO_FIXTURE audit event, not as a real BMDC/DGDA/PCB review.
 * - Passwords are random and written only to storage/app/demo-credentials.local.txt (git-ignored).
 */
class SeedDemoFixtures extends Command
{
    protected $signature = 'demo:seed-fictional {--rotate-passwords : Generate new passwords for existing demo accounts}';
    protected $description = 'Create clearly fictional demo organizations and accounts (non-production only)';

    private const DOMAIN = 'demo.medminders.test';
    private array $credentials = [];

    public function handle(): int
    {
        if (app()->environment('production')) {
            $this->error('Refusing to create demo fixtures in production.');
            return self::FAILURE;
        }
        DB::transaction(function () {
            $hospital = $this->organization('HOSPITAL', 'Demo Riverside General Hospital (Fictional)', 'Fictional address for demonstration, Dhaka');
            $pharmacy = $this->organization('PHARMACY', 'Demo Green Leaf Pharmacy (Fictional)', 'Fictional address for demonstration, Dhaka');
            $this->pharmacyCredentials($pharmacy);

            $doctor = $this->user('doctor', 'Dr. Demo Ayesha Rahman (Fictional)', ['DOCTOR']);
            $credentialId = DB::table('clinician_credentials')->where('user_id', $doctor->id)->value('id');
            $profile = ['bmdc_number' => 'A-999901', 'specialty' => 'Internal Medicine (demo profile)', 'verification_status' => 'VERIFIED', 'verified_at' => now(),
                'hospital_clinic' => 'Demo Riverside General Hospital (Fictional)', 'qualifications' => 'MBBS (fictional demo profile)',
                'experience_years' => 8, 'biography' => 'Fictional doctor profile used only to demonstrate MedMinders workflows.',
                'chamber' => 'Outpatient wing (fictional)', 'fee_bdt' => 800, 'is_published' => true, 'updated_at' => now()];
            if ($credentialId) DB::table('clinician_credentials')->where('id', $credentialId)->update($profile);
            else DB::table('clinician_credentials')->insert($profile + ['id' => (string) Str::ulid(), 'user_id' => $doctor->id, 'created_at' => now()]);

            $hospitalStaff = $this->user('hospital', 'Demo Hospital Desk (Fictional)', []);
            foreach (['HOSPITAL_ADMIN', 'HOSPITAL_RECEPTION', 'LAB_STAFF', 'REPORT_REVIEWER', 'BILLING'] as $role) $this->membership($hospital, $hospitalStaff->id, $role);
            $pharmacist = $this->user('pharmacy', 'Demo Pharmacist (Fictional)', ['PHARMACIST']);
            foreach (['PHARMACY_ADMIN', 'DISPENSER'] as $role) $this->membership($pharmacy, $pharmacist->id, $role);

            // Visiting schedule: every day 08:00–22:00 so the demo works at any rehearsal time.
            if (! DB::table('doctor_affiliations')->where('doctor_id', $doctor->id)->where('organization_id', $hospital)->exists()) {
                DB::table('doctor_affiliations')->insert(['id' => (string) Str::ulid(), 'doctor_id' => $doctor->id, 'organization_id' => $hospital,
                    'branch_label' => 'Outpatient department', 'visiting_days' => json_encode(['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI']),
                    'start_time' => '08:00', 'end_time' => '22:00', 'slot_minutes' => 15, 'fee_bdt' => 800, 'status' => 'CONFIRMED',
                    'decided_by' => $hospitalStaff->id, 'decided_at' => now(), 'decision_note' => 'Demo fixture', 'created_at' => now(), 'updated_at' => now()]);
            }

            $patient = $this->user('patient', 'Demo Patient Rahim (Fictional)', ['PATIENT']);
            if (! DB::table('patient_links')->where('user_id', $patient->id)->exists()) {
                $recordId = (string) Str::ulid();
                DB::table('patient_records')->insert(['id' => $recordId, 'name' => $patient->name, 'email' => $patient->email, 'phone_number' => '+8801900000001', 'allergy_status' => 'NONE_KNOWN',
                    'estimated_age' => 34, 'created_by' => $patient->id, 'created_at' => now(), 'updated_at' => now()]);
                DB::table('patient_links')->insert(['id' => (string) Str::ulid(), 'patient_record_id' => $recordId, 'user_id' => $patient->id,
                    'relationship' => 'SELF', 'verified_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
            }
            AuditEvent::create(['action' => 'DEMO_FIXTURE_SEEDED', 'entity_type' => 'demo_fixture', 'entity_id' => $hospital,
                'metadata' => ['note' => 'Fictional demo data. Verification states are fixture values, not real regulator reviews.']]);
        });

        $path = storage_path('app/demo-credentials.local.txt');
        if ($this->credentials) {
            $lines = ["MedMinders FICTIONAL demo credentials (local only — do not commit or share). Generated ".now()->toDateTimeString(), ''];
            foreach ($this->credentials as $role => [$email, $password]) $lines[] = str_pad($role, 10).' '.$email.'  /  '.$password;
            file_put_contents($path, implode(PHP_EOL, $lines).PHP_EOL.PHP_EOL.'Patient logs in at /patient-login with the email above. Staff use /doctor-login, /pharmacy-login, /hospital-login.'.PHP_EOL);
            $this->info('New credentials written to '.$path);
        } else {
            $this->info('Demo fixtures already exist; passwords unchanged. Use --rotate-passwords to generate new ones.');
        }
        return self::SUCCESS;
    }

    private function organization(string $type, string $name, string $address): string
    {
        $id = DB::table('organizations')->where('name', $name)->value('id');
        if ($id) return $id;
        $id = (string) Str::ulid();
        DB::table('organizations')->insert(['id' => $id, 'name' => $name, 'legal_name' => $name, 'trading_name' => $name, 'address' => $address,
            'contact_phone' => null, 'contact_email' => strtolower($type).'@'.self::DOMAIN, 'type' => $type, 'status' => 'APPROVED',
            'reviewed_at' => now(), 'review_reason' => 'Demo fixture (fictional organization)', 'created_at' => now(), 'updated_at' => now()]);
        return $id;
    }

    private function pharmacyCredentials(string $organizationId): void
    {
        if (! DB::table('pharmacy_establishment_licenses')->where('organization_id', $organizationId)->exists()) {
            DB::table('pharmacy_establishment_licenses')->insert(['id' => (string) Str::ulid(), 'organization_id' => $organizationId, 'license_number' => 'DEMO-LICENCE-0001',
                'issuing_authority' => 'Fictional demo value', 'document_path' => $this->placeholderDocument(), 'verification_status' => 'VERIFIED', 'reviewed_at' => now(), 'review_reason' => 'Demo fixture',
                'created_at' => now(), 'updated_at' => now()]);
        }
        if (! DB::table('responsible_pharmacist_registrations')->where('organization_id', $organizationId)->exists()) {
            DB::table('responsible_pharmacist_registrations')->insert(['id' => (string) Str::ulid(), 'organization_id' => $organizationId, 'full_name' => 'Demo Pharmacist (Fictional)',
                'registration_number' => 'DEMO-PCB-0001', 'registration_category' => 'A', 'issuing_authority' => 'Fictional demo value', 'document_path' => $this->placeholderDocument(), 'verification_status' => 'VERIFIED',
                'reviewed_at' => now(), 'review_reason' => 'Demo fixture', 'created_at' => now(), 'updated_at' => now()]);
        }
    }

    private function user(string $key, string $name, array $roles): User
    {
        $email = $key.'@'.self::DOMAIN;
        $user = User::where('email', $email)->first();
        if (! $user || $this->option('rotate-passwords')) {
            $password = Str::password(14, symbols: false);
            if (! $user) {
                $user = new User();
                $user->forceFill(['name' => $name, 'email' => $email, 'password' => Hash::make($password), 'is_active' => true])->save();
            } else {
                $user->forceFill(['password' => Hash::make($password)])->save();
            }
            $this->credentials[$key] = [$email, $password];
        }
        foreach ($roles as $role) if (! $user->hasRole($role)) Role::create(['user_id' => $user->id, 'role' => $role, 'is_verified' => $role !== 'PATIENT']);
        return $user->fresh();
    }

    private function membership(string $organizationId, string $userId, string $role): void
    {
        if (DB::table('organization_memberships')->where('organization_id', $organizationId)->where('user_id', $userId)->where('role', $role)->exists()) return;
        DB::table('organization_memberships')->insert(['id' => (string) Str::ulid(), 'organization_id' => $organizationId, 'user_id' => $userId,
            'role' => $role, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
    }

    private function placeholderDocument(): string
    {
        $path = 'demo-fixtures/fictional-credential-placeholder.txt';
        \Illuminate\Support\Facades\Storage::disk('local')->put($path, 'Fictional demo fixture. No real licence or registration document exists.');
        return $path;
    }
}
