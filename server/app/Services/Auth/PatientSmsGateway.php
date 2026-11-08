<?php

namespace App\Services\Auth;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class PatientSmsGateway
{
    public function send(string $phone, string $code): void
    {
        if (app()->environment('testing')) {
            TestingPatientSmsGateway::$deliveries[] = ['phone' => $phone, 'code' => $code];
            return;
        }
        $url = config('services.patient_sms.url');
        $token = config('services.patient_sms.token');
        if (! $url || ! $token) throw new RuntimeException('Patient SMS gateway is not configured.');
        Http::withToken($token)->timeout(10)->post($url, [
            'to' => $phone, 'message' => 'Your MedMinders verification code is '.$code.'. It expires in 5 minutes.',
        ])->throw();
    }
    public static function configured(): bool
    {
        return (bool) (config('services.patient_sms.url') && config('services.patient_sms.token'));
    }

    /** Dev-only OTP channel: never in production, only when no SMS provider is configured and explicitly enabled. */
    public static function devChannelEnabled(): bool
    {
        return ! app()->environment('production') && ! self::configured() && (bool) config('services.patient_sms.dev_channel');
    }

    /**
     * Sends an OTP. Returns the code only when the dev channel is used (so the UI can show it, clearly marked);
     * returns null after a real SMS. Codes are never written to logs.
     */
    public function deliverCode(string $phone, string $code): ?string
    {
        if (app()->environment('testing') || self::configured()) { $this->send($phone, $code); return null; }
        if (self::devChannelEnabled()) return $code;
        throw new RuntimeException('Patient SMS gateway is not configured.');
    }

    /** Generic SMS (used for reminder fallback). Throws if no provider is configured. */
    public function sendText(string $phone, string $message): void
    {
        if (app()->environment('testing')) { TestingPatientSmsGateway::$deliveries[] = ['phone' => $phone, 'message' => $message]; return; }
        if (! self::configured()) throw new RuntimeException('Patient SMS gateway is not configured.');
        Http::withToken(config('services.patient_sms.token'))->timeout(10)->post(config('services.patient_sms.url'), ['to' => $phone, 'message' => $message])->throw();
    }
}
