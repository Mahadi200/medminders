<?php

namespace App\Services\Auth;

/**
 * Testing-only delivery sink. It is never selected outside the testing environment.
 */
class TestingPatientSmsGateway extends PatientSmsGateway
{
    public static array $deliveries = [];

    public function send(string $phone, string $code): void
    {
        self::$deliveries[] = ['phone' => $phone, 'code' => $code];
    }
}
