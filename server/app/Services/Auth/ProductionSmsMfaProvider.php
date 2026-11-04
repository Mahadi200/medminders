<?php

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Cache;

class ProductionSmsMfaProvider
{
    public function issue(User $user): string
    {
        $code = (string) random_int(100000, 999999);
        $salt = bin2hex(random_bytes(16));
        Cache::put("mfa:sms:{$user->id}", ['salt' => $salt, 'hash' => hash('sha256', $salt . $code)], now()->addSeconds(config('mfa.sms_ttl')));
        return $code; // Hand off to the SMS gateway; never log this value.
    }

    public function verify(User $user, string $code): bool
    {
        $record = Cache::pull("mfa:sms:{$user->id}");
        return $record && hash_equals($record['hash'], hash('sha256', $record['salt'] . $code));
    }
}
