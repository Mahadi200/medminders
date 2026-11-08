<?php

namespace Tests\Unit;

use App\Services\WebPushService;
use Tests\TestCase;

class WebPushServiceTest extends TestCase
{
    private function cfg(): array
    {
        $c = config('services.webpush.openssl_conf');
        return $c && file_exists($c) ? ['config' => $c] : [];
    }

    public function test_payload_encryption_round_trips_per_rfc8291(): void
    {
        // Simulated browser (user agent) key pair and auth secret.
        $ua = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC] + $this->cfg());
        $uaPublic = WebPushService::rawPublic($ua);
        $auth = random_bytes(16);
        $body = WebPushService::encrypt('{"title":"Dose due"}', $uaPublic, $auth);

        // Receiver-side decryption.
        $salt = substr($body, 0, 16);
        $this->assertSame(4096, unpack('N', substr($body, 16, 4))[1]);
        $asPublic = substr($body, 21, 65);
        $cipher = substr($body, 86, -16); $tag = substr($body, -16);
        $shared = openssl_pkey_derive(WebPushService::publicKeyFromRaw($asPublic), $ua, 32);
        $ikm = hash_hkdf('sha256', $shared, 32, "WebPush: info\0".$uaPublic.$asPublic, $auth);
        $cek = hash_hkdf('sha256', $ikm, 16, "Content-Encoding: aes128gcm\0", $salt);
        $nonce = hash_hkdf('sha256', $ikm, 12, "Content-Encoding: nonce\0", $salt);
        $plain = openssl_decrypt($cipher, 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag);
        $this->assertSame('{"title":"Dose due"}'."\x02", $plain);
    }

    public function test_vapid_jwt_is_a_valid_es256_signature(): void
    {
        $pair = WebPushService::generateKeyPair();
        config(['services.webpush.private_key' => base64_encode($pair['private_pem']), 'services.webpush.public_key' => WebPushService::b64u($pair['public'])]);
        $jwt = WebPushService::vapidJwt('https://fcm.googleapis.com/fcm/send/abc');
        [$h, $c, $sig] = explode('.', $jwt);
        $claims = json_decode(WebPushService::unb64u($c), true);
        $this->assertSame('https://fcm.googleapis.com', $claims['aud']);
        $raw = WebPushService::unb64u($sig);
        $this->assertSame(64, strlen($raw));
        $int = fn ($v) => (ord(ltrim($v, "\0")[0] ?? "\0") > 0x7f ? "\0" : '').ltrim($v, "\0");
        $r = $int(substr($raw, 0, 32)); $s = $int(substr($raw, 32));
        $seq = "\x02".chr(strlen($r)).$r."\x02".chr(strlen($s)).$s;
        $der = "\x30".chr(strlen($seq)).$seq;
        $this->assertSame(1, openssl_verify($h.'.'.$c, $der, WebPushService::publicKeyFromRaw($pair['public']), OPENSSL_ALGO_SHA256));
    }
}
