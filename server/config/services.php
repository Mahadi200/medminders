<?php

return [
    'patient_sms' => ['url' => env('PATIENT_SMS_URL'), 'token' => env('PATIENT_SMS_TOKEN'), 'dev_channel' => env('PATIENT_SMS_DEV_CHANNEL', false)],
    'webpush' => ['public_key' => env('VAPID_PUBLIC_KEY'), 'private_key' => env('VAPID_PRIVATE_KEY'), 'subject' => env('VAPID_SUBJECT', 'mailto:support@medminders.example'), 'openssl_conf' => env('OPENSSL_CONF_PATH', 'C:/xampp/php/extras/ssl/openssl.cnf')],
    'llm' => ['provider' => env('ASSISTANT_LLM_PROVIDER')],

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
        'scheme' => 'https',
    ],

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

];
