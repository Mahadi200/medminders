<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Minimal standards-based Web Push sender (RFC 8030 + RFC 8291 aes128gcm + RFC 8292 VAPID) using PHP OpenSSL only.
 * Keys: VAPID_PUBLIC_KEY = base64url(uncompressed P-256 point, 65 bytes); VAPID_PRIVATE_KEY = base64(PEM).
 */
class WebPushService
{
    private const SPKI_P256_PREFIX = '3059301306072a8648ce3d020106082a8648ce3d030107034200';

    public static function b64u(string $bin): string { return rtrim(strtr(base64_encode($bin), '+/', '-_'), '='); }
    public static function unb64u(string $s): string { return base64_decode(strtr($s, '-_', '+/').str_repeat('=', (4 - strlen($s) % 4) % 4)); }

    public static function configured(): bool
    {
        return (bool) (config('services.webpush.public_key') && config('services.webpush.private_key'));
    }

    private static function opensslConfig(): array
    {
        $conf = config('services.webpush.openssl_conf');
        return $conf && file_exists($conf) ? ['config' => $conf] : [];
    }

    /** @return array{public:string, private_pem:string} */
    public static function generateKeyPair(): array
    {
        $key = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC] + self::opensslConfig());
        if (! $key) throw new RuntimeException('Unable to generate an EC key (check OPENSSL_CONF_PATH).');
        openssl_pkey_export($key, $pem, null, self::opensslConfig());
        return ['public' => self::rawPublic($key), 'private_pem' => $pem];
    }

    public static function rawPublic($key): string
    {
        $d = openssl_pkey_get_details($key)['ec'];
        return "\x04".str_pad($d['x'], 32, "\0", STR_PAD_LEFT).str_pad($d['y'], 32, "\0", STR_PAD_LEFT);
    }

    public static function publicKeyFromRaw(string $raw)
    {
        $pem = "-----BEGIN PUBLIC KEY-----\n".chunk_split(base64_encode(hex2bin(self::SPKI_P256_PREFIX).$raw), 64, "\n")."-----END PUBLIC KEY-----\n";
        $key = openssl_pkey_get_public($pem);
        if (! $key) throw new RuntimeException('Invalid subscription public key.');
        return $key;
    }

    /** RFC 8291 encryption. Returns the request body (header + ciphertext). */
    public static function encrypt(string $payload, string $uaPublicRaw, string $authSecret, $ephemeral = null, ?string $salt = null): string
    {
        $ephemeral ??= openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC] + self::opensslConfig());
        $salt ??= random_bytes(16);
        $asPublic = self::rawPublic($ephemeral);
        $shared = openssl_pkey_derive(self::publicKeyFromRaw($uaPublicRaw), $ephemeral, 32);
        $ikm = hash_hkdf('sha256', $shared, 32, "WebPush: info\0".$uaPublicRaw.$asPublic, $authSecret);
        $cek = hash_hkdf('sha256', $ikm, 16, "Content-Encoding: aes128gcm\0", $salt);
        $nonce = hash_hkdf('sha256', $ikm, 12, "Content-Encoding: nonce\0", $salt);
        $cipher = openssl_encrypt($payload."\x02", 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag);
        return $salt.pack('N', 4096).chr(65).$asPublic.$cipher.$tag;
    }

    /** ES256 VAPID JWT for the push service origin. */
    public static function vapidJwt(string $endpoint, ?int $expires = null): string
    {
        $parts = parse_url($endpoint);
        $header = self::b64u(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
        $claims = self::b64u(json_encode(['aud' => $parts['scheme'].'://'.$parts['host'], 'exp' => $expires ?? time() + 12 * 3600, 'sub' => config('services.webpush.subject')]));
        $key = openssl_pkey_get_private(base64_decode(config('services.webpush.private_key')));
        if (! $key) throw new RuntimeException('VAPID private key is invalid.');
        openssl_sign($header.'.'.$claims, $der, $key, OPENSSL_ALGO_SHA256);
        return $header.'.'.$claims.'.'.self::b64u(self::derToRaw($der));
    }

    public static function derToRaw(string $der): string
    {
        $offset = 3; // 0x30 len 0x02
        $rLen = ord($der[$offset]); $r = substr($der, $offset + 1, $rLen);
        $offset += 1 + $rLen + 1; $sLen = ord($der[$offset]); $s = substr($der, $offset + 1, $sLen);
        return str_pad(ltrim($r, "\0"), 32, "\0", STR_PAD_LEFT).str_pad(ltrim($s, "\0"), 32, "\0", STR_PAD_LEFT);
    }

    /** @return int HTTP status from the push service (201 = accepted; 404/410 = subscription gone). */
    public function send(object $subscription, array $payload, int $ttl = 900): int
    {
        if (! self::configured()) throw new RuntimeException('Web push is not configured.');
        $body = self::encrypt(json_encode($payload), self::unb64u($subscription->p256dh), self::unb64u($subscription->auth));
        $response = Http::withHeaders([
            'Authorization' => 'vapid t='.self::vapidJwt($subscription->endpoint).', k='.config('services.webpush.public_key'),
            'Content-Encoding' => 'aes128gcm', 'TTL' => (string) $ttl, 'Urgency' => 'high',
        ])->withBody($body, 'application/octet-stream')->timeout(10)->post($subscription->endpoint);
        return $response->status();
    }
}
