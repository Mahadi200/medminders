<?php

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Cache;

class TotpMfaProvider
{
    public function verify(User $user, string $code, string $secret): bool
    {
        $lockKey = "mfa:lock:{$user->id}";
        if (Cache::has($lockKey)) return false;

        $valid = false;
        $counter = intdiv(time(), 30);
        foreach ([-1, 0, 1] as $drift) {
            if (hash_equals($this->hotp($secret, $counter + $drift), str_pad($code, 6, '0', STR_PAD_LEFT))) {
                $valid = true;
                break;
            }
        }

        if ($valid) {
            Cache::forget("mfa:attempts:{$user->id}");
            return true;
        }

        $attempts = Cache::increment("mfa:attempts:{$user->id}");
        Cache::put("mfa:attempts:{$user->id}", $attempts, now()->addMinutes(5));
        if ($attempts >= 3) Cache::put($lockKey, true, now()->addMinutes(5));
        return false;
    }

    private function hotp(string $base32Secret, int $counter): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $secret = '';
        $buffer = 0;
        $bits = 0;
        foreach (str_split(strtoupper(preg_replace('/[^A-Z2-7]/', '', $base32Secret))) as $char) {
            $buffer = ($buffer << 5) | strpos($alphabet, $char);
            $bits += 5;
            if ($bits >= 8) { $bits -= 8; $secret .= chr(($buffer >> $bits) & 0xff); }
        }
        $binaryCounter = pack('N*', 0) . pack('N*', $counter);
        $hash = hash_hmac('sha1', $binaryCounter, $secret, true);
        $offset = ord($hash[19]) & 0x0f;
        $number = ((ord($hash[$offset]) & 0x7f) << 24) | ((ord($hash[$offset + 1]) & 0xff) << 16) | ((ord($hash[$offset + 2]) & 0xff) << 8) | (ord($hash[$offset + 3]) & 0xff);
        return str_pad((string) ($number % 1000000), 6, '0', STR_PAD_LEFT);
    }
}
