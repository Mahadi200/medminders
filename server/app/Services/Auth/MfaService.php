<?php

namespace App\Services\Auth;

use App\Models\User;
use RuntimeException;

class MfaService
{
    public function __construct(
        private readonly TotpMfaProvider $totp,
        private readonly ProductionSmsMfaProvider $sms,
    ) {}

    public function requiresMfa(User $user): bool
    {
        return collect(['DOCTOR', 'PHARMACIST', 'HOSPITAL_ADMIN', 'SUPERADMIN'])->contains(fn ($role) => $user->hasRole($role));
    }

    public function verify(User $user, string $code, ?string $secret = null): bool
    {
        if (app()->environment('production') && config('mfa.mock_enabled')) {
            throw new RuntimeException('Production MFA cannot use a development mock provider.');
        }
        if (config('mfa.provider') === 'sms') return $this->sms->verify($user, $code);
        return $secret ? $this->totp->verify($user, $code, $secret) : false;
    }

    public function issueSmsCode(User $user): string
    {
        if (app()->environment('production') && config('mfa.mock_enabled')) {
            throw new RuntimeException('Production MFA cannot use a development mock provider.');
        }
        return $this->sms->issue($user);
    }
}
