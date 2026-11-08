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
}
