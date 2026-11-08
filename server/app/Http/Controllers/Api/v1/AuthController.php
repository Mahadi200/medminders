<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use App\Services\Auth\MfaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Http\Controllers\Api\v1\PatientAccessController;

class AuthController extends Controller
{
    public function __construct(private readonly MfaService $mfa) {}

    public function register(Request $request)
    {
        return response()->json(['message' => 'Patient registration requires phone verification. Use /api/v1/patients/challenge.'], 410);
    }

    public function registerPatientPassword(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:191',
            'phone' => 'required|string|max:32',
            'email' => 'nullable|email|max:191|unique:users,email',
            'date_of_birth' => 'nullable|date|before:today',
            'password' => 'required|string|min:8|confirmed',
        ]);
        $phone = PatientAccessController::phone($data['phone']);
        $user = DB::transaction(function () use ($data, $phone) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'] ?? null,
                'password' => $data['password'],
                'pending_phone_number' => $phone,
            ]);
            Role::create(['user_id' => $user->id, 'role' => 'PATIENT', 'is_verified' => false]);
            $recordId = (string) Str::ulid();
            DB::table('patient_records')->insert([
                'id' => $recordId, 'name' => $data['name'], 'phone_number' => $phone,
                'email' => $data['email'] ?? null, 'date_of_birth' => $data['date_of_birth'] ?? null,
                'created_by' => $user->id, 'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('patient_links')->insert([
                'id' => (string) Str::ulid(), 'patient_record_id' => $recordId, 'user_id' => $user->id,
                'relationship' => 'SELF', 'verified_at' => now(), 'created_at' => now(), 'updated_at' => now(),
            ]);
            return $user;
        });
        return $this->tokenResponse($user->fresh());
    }

    public function loginPatientPassword(Request $request)
    {
        $data = $request->validate(['identifier' => 'required|string|max:191', 'password' => 'required|string']);
        $identifier = trim($data['identifier']);
        $phone = null;
        if (preg_match('/^(?:\+?88)?01[3-9]\d{8}$/', preg_replace('/[\s\-()]/', '', $identifier))) {
            $phone = PatientAccessController::phone($identifier);
        }
        $user = User::with('roles')->when($phone, fn ($q) => $q->where(function ($inner) use ($phone) {
                $inner->where('phone_number', $phone)->orWhere('pending_phone_number', $phone);
            }))
            ->when(! $phone, fn ($q) => $q->where('email', $identifier))
            ->whereHas('roles', fn ($q) => $q->where('role', 'PATIENT'))->first();
        if (! $user || ! $user->is_active || ! Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Invalid patient credentials.'], 401);
        }
        return $this->tokenResponse($user);
    }

    public function registerDoctor(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:191', 'bmdc_number' => 'required|string|max:191|unique:clinician_credentials,bmdc_number|regex:/^[AP]-\d{6}$/',
            'hospital_clinic' => 'required|string|max:191', 'email' => 'required|email|max:191|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
        ]);
        $user = DB::transaction(function () use ($data) {
            $user = User::create(['name' => $data['name'], 'email' => $data['email'], 'password' => $data['password']]);
            Role::create(['user_id' => $user->id, 'role' => 'DOCTOR']);
            $user->clinicianCredential()->create(['bmdc_number' => $data['bmdc_number'], 'hospital_clinic' => $data['hospital_clinic'], 'verification_status' => 'PENDING']);
            return $user;
        });
        return response()->json(['user' => $user->load('roles', 'clinicianCredential')], 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate(['email' => 'required|email', 'password' => 'required|string']);
        $user = User::with(['roles', 'clinicianCredential', 'pharmacistCredential'])->where('email', $data['email'])->first();
        if (! $user || ! $user->is_active || ! Hash::check($data['password'], $user->password)) return response()->json(['message' => 'Invalid credentials.'], 401);
        if ($user->hasRole('PATIENT')) return response()->json(['message' => 'Use phone verification for patient login.'], 403);
        if ($this->mfa->requiresMfa($user) && $user->mfa_secret_encrypted) {
            $challenge = bin2hex(random_bytes(24));
            Cache::put("mfa:challenge:{$challenge}", $user->id, now()->addMinutes(5));
            return response()->json(['mfa_required' => true, 'challenge' => $challenge], 202);
        }
        return $this->tokenResponse($user);
    }

    public function verifyMfa(Request $request)
    {
        $data = $request->validate(['challenge' => 'required|string', 'code' => 'required|string']);
        $userId = Cache::pull("mfa:challenge:{$data['challenge']}");
        $user = $userId ? User::find($userId) : null;
        $secret = $user?->mfa_secret_encrypted ? Crypt::decryptString($user->mfa_secret_encrypted) : null;
        if (! $user || ! $this->mfa->verify($user, $data['code'], $secret)) return response()->json(['message' => 'MFA verification failed.'], 401);
        return $this->tokenResponse($user);
    }

    public function me(Request $request) { return response()->json($this->userPayload($request->user())); }
    public function logout(Request $request) { $request->user()->currentAccessToken()?->delete(); return response()->json(['ok' => true]); }

    public function beginTotp(Request $request)
    {
        $user = $request->user();
        abort_unless($this->mfa->requiresMfa($user) && ! $user->mfa_secret_encrypted, 403);
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $secret = '';
        for ($i = 0; $i < 32; $i++) $secret .= $alphabet[random_int(0, 31)];
        Cache::put("mfa:enroll:{$user->id}", Crypt::encryptString($secret), now()->addMinutes(10));
        return response()->json(['secret' => $secret, 'issuer' => config('mfa.totp_issuer')]);
    }

    public function confirmTotp(Request $request)
    {
        $data = $request->validate(['code' => 'required|digits:6']);
        $user = $request->user();
        $encrypted = Cache::get("mfa:enroll:{$user->id}");
        abort_unless($encrypted && ! $user->mfa_secret_encrypted, 422);
        abort_unless(app(\App\Services\Auth\TotpMfaProvider::class)->verify($user, $data['code'], Crypt::decryptString($encrypted)), 422);
        $user->mfa_secret_encrypted = $encrypted;
        $user->save();
        Cache::forget("mfa:enroll:{$user->id}");
        $user->tokens()->where('id', '!=', $user->currentAccessToken()?->id)->delete();
        return response()->json(['ok' => true]);
    }

    private function userPayload(User $user): array
    {
        return ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'phone_number' => $user->phone_number,
            'mfa_enrollment_required' => $this->mfa->requiresMfa($user) && ! $user->mfa_secret_encrypted,
            'roles' => $user->roles()->pluck('role'),
            'memberships' => DB::table('organization_memberships')->where('user_id', $user->id)->where('is_active', true)
                ->get(['organization_id', 'role', 'assigned_doctor_id'])];
    }

    private function tokenResponse(User $user) { return response()->json(['token' => $user->createToken('medminders-web')->plainTextToken,
        'mfa_enrollment_required' => $this->mfa->requiresMfa($user) && ! $user->mfa_secret_encrypted,
        'user' => $this->userPayload($user)]); }
}
