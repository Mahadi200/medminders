<?php

return [
    'provider' => env('MFA_PROVIDER', 'totp'),
    'mock_enabled' => (bool) env('MFA_MOCK_ENABLED', false),
    'totp_issuer' => env('MFA_TOTP_ISSUER', 'MedMinders'),
    'sms_ttl' => 300,
];
