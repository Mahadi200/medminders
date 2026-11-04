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

class AuthController extends Controller
{
    public function __construct(private readonly MfaService $mfa) {}

    public function register(Request $request)
    {
        $data = $request->validate(['email' => 'required|email|max:191|unique:users,email', 'password' => 'required|string|min:8']);
        $user = User::create($data + ['password' => Hash::make($data['password'])]);
        Role::create(['user_id' => $user->id, 'role' => 'PATIENT']);
        return response()->json(['user' => $user->load('roles')], 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate(['email' => 'required|email', 'password' => 'required|string']);
        $user = User::with(['roles', 'clinicianCredential', 'pharmacistCredential'])->where('email', $data['email'])->first();
        if (! $user || ! $user->is_active || ! Hash::check($data['password'], $user->password)) return response()->json(['message' => 'Invalid credentials.'], 401);
        if ($this->mfa->requiresMfa($user)) {
            $challenge = bin2hex(random_bytes(24));
            Cache::put("mfa:challenge:{$challenge}", $user->id, now()->addMinutes(5));
            return response()->json(['mfa_required' => true, 'challenge' => $challenge], 202);
        }
        return $this->tokenResponse($user);
    }

    public function verifyMfa(Request $request)
    {
        $data = $request->validate(['challenge' => 'required|string', 'code' => 'required|string', 'secret' => 'nullable|string']);
        $userId = Cache::pull("mfa:challenge:{$data['challenge']}");
        $user = $userId ? User::find($userId) : null;
        $secret = $data['secret'] ?? ($user?->mfa_secret_encrypted ? Crypt::decryptString($user->mfa_secret_encrypted) : null);
        if (! $user || ! $this->mfa->verify($user, $data['code'], $secret)) return response()->json(['message' => 'MFA verification failed.'], 401);
        return $this->tokenResponse($user);
    }

    public function me(Request $request) { return response()->json($request->user()->load('roles')); }
    public function logout(Request $request) { $request->user()->currentAccessToken()?->delete(); return response()->json(['ok' => true]); }

    private function tokenResponse(User $user) { return response()->json(['token' => $user->createToken('medminders-web')->plainTextToken, 'user' => $user->load('roles')]); }
}
