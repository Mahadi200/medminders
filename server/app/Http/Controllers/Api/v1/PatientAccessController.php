<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\Role;
use App\Models\User;
use App\Services\Auth\PatientSmsGateway;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PatientAccessController extends Controller
{
    public static function phone(string $value): string
    {
        $phone = preg_replace('/[\s\-()]/', '', $value);
        if (preg_match('/^01[3-9]\d{8}$/', $phone)) return '+88'.$phone;
        if (preg_match('/^8801[3-9]\d{8}$/', $phone)) return '+'.$phone;
        if (preg_match('/^\+8801[3-9]\d{8}$/', $phone)) return $phone;
        throw ValidationException::withMessages(['phone' => 'Enter a valid Bangladesh mobile number.']);
    }

    public function challenge(Request $request, PatientSmsGateway $sms)
    {
        $data = $request->validate(['phone' => 'required|string|max:32', 'name' => 'nullable|string|max:191', 'patient_record_id' => 'nullable|ulid', 'claim_code' => 'required_with:patient_record_id|string|max:100']);
        $phone = self::phone($data['phone']);
        $purpose = isset($data['patient_record_id']) ? 'CLAIM' : (isset($data['name']) ? 'REGISTER' : 'LOGIN');
        $recent = DB::table('phone_challenges')->where('phone_number', $phone)->where('purpose', $purpose)->where('created_at', '>', now()->subMinute())->exists();
        if ($recent) return response()->json(['message' => 'If eligible, a code has been sent.']);
        $eligible = match ($purpose) {
            'LOGIN' => User::where('phone_number', $phone)->whereHas('roles', fn ($q) => $q->where('role', 'PATIENT'))->exists(),
            'CLAIM' => ($record = DB::table('patient_records')->where('id', $data['patient_record_id'])->where('phone_number', $phone)->first())
                && $record->claim_secret_hash && Hash::check($data['claim_code'], $record->claim_secret_hash),
            default => ! User::where('phone_number', $phone)->exists(),
        };
        if (! $eligible) return response()->json(['message' => 'If eligible, a code has been sent.', 'challenge_id' => (string) Str::ulid()]);
        $code = (string) random_int(100000, 999999);
        $id = (string) Str::ulid();
        DB::table('phone_challenges')->insert([
            'id' => $id, 'phone_number' => $phone, 'purpose' => $purpose,
            'patient_record_id' => $data['patient_record_id'] ?? null, 'pending_name' => $data['name'] ?? null,
            'code_hash' => Hash::make($code), 'expires_at' => now()->addMinutes(5), 'created_at' => now(), 'updated_at' => now(),
        ]);
        try { $sms->send($phone, $code); }
        catch (\Throwable $e) {
            DB::table('phone_challenges')->where('id', $id)->delete();
            return response()->json(['message' => 'SMS delivery is unavailable.'], 503);
        }
        return response()->json(['message' => 'If eligible, a code has been sent.', 'challenge_id' => $id]);
    }

    public function verify(Request $request)
    {
        $data = $request->validate(['challenge_id' => 'required|ulid', 'code' => 'required|digits:6']);
        return DB::transaction(function () use ($data) {
            $challenge = DB::table('phone_challenges')->where('id', $data['challenge_id'])->lockForUpdate()->first();
            if (! $challenge || $challenge->consumed_at || now()->greaterThan($challenge->expires_at) || $challenge->attempts >= 5) {
                return response()->json(['message' => 'Invalid or expired code.'], 422);
            }
            DB::table('phone_challenges')->where('id', $challenge->id)->increment('attempts');
            if (! Hash::check($data['code'], $challenge->code_hash)) return response()->json(['message' => 'Invalid or expired code.'], 422);
            DB::table('phone_challenges')->where('id', $challenge->id)->update(['consumed_at' => now()]);
            if ($challenge->purpose === 'REGISTER') {
                if (User::where('phone_number', $challenge->phone_number)->exists()) return response()->json(['message' => 'Registration is unavailable.'], 422);
                $user = User::create(['name' => $challenge->pending_name, 'phone_number' => $challenge->phone_number]);
                Role::create(['user_id' => $user->id, 'role' => 'PATIENT']);
                $recordId = (string) Str::ulid();
                DB::table('patient_records')->insert(['id' => $recordId, 'name' => $challenge->pending_name, 'phone_number' => $challenge->phone_number, 'created_by' => $user->id, 'created_at' => now(), 'updated_at' => now()]);
                DB::table('patient_links')->insert(['id' => (string) Str::ulid(), 'patient_record_id' => $recordId, 'user_id' => $user->id, 'relationship' => 'SELF', 'verified_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
            } else {
                $user = User::where('phone_number', $challenge->phone_number)->whereHas('roles', fn ($q) => $q->where('role', 'PATIENT'))->first();
                if (! $user && $challenge->purpose === 'CLAIM') {
                    $recordForName = DB::table('patient_records')->find($challenge->patient_record_id);
                    $user = User::create(['name' => $recordForName->name, 'phone_number' => $challenge->phone_number]);
                    Role::create(['user_id' => $user->id, 'role' => 'PATIENT']);
                }
                if (! $user) return response()->json(['message' => 'Account unavailable.'], 422);
                if ($challenge->purpose === 'CLAIM') {
                    $record = DB::table('patient_records')->where('id', $challenge->patient_record_id)->lockForUpdate()->first();
                    abort_unless($record && $record->claim_secret_hash, 422);
                    DB::table('patient_links')->updateOrInsert(
                        ['patient_record_id' => $challenge->patient_record_id, 'user_id' => $user->id],
                        ['id' => (string) Str::ulid(), 'relationship' => 'SELF', 'verified_at' => now(), 'updated_at' => now(), 'created_at' => now()]
                    );
                    DB::table('patient_records')->where('id', $record->id)->update(['claim_secret_hash' => null]);
                }
            }
            AuditEvent::create(['actor_user_id' => $user->id, 'target_user_id' => $user->id, 'action' => 'PATIENT_PHONE_VERIFIED', 'entity_type' => 'phone_challenge', 'entity_id' => $challenge->id]);
            return response()->json(['token' => $user->createToken('patient-web')->plainTextToken,
                'user' => ['id' => $user->id, 'name' => $user->name, 'phone_number' => $user->phone_number, 'roles' => ['PATIENT'], 'memberships' => []]]);
        });
    }

    public function records(Request $request)
    {
        abort_unless($request->user()->hasRole('PATIENT'), 403);
        return DB::table('patient_records')->join('patient_links', 'patient_links.patient_record_id', '=', 'patient_records.id')
            ->where('patient_links.user_id', $request->user()->id)->select('patient_records.id', 'patient_records.name', 'patient_records.phone_number',
                'patient_records.email', 'patient_records.date_of_birth', 'patient_records.estimated_age', 'patient_records.allergy_status',
                'patient_records.allergies', 'patient_records.history', 'patient_records.address', 'patient_links.relationship')->get();
    }
}
