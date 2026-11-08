<?php

return [
    'provider' => env('MFA_PROVIDER', 'totp'),
    'mock_enabled' => (bool) env('MFA_MOCK_ENABLED', false),
    // This explicit flag is enabled only for the local/demo deployment. Stored MFA secrets and APIs remain intact.
    'demo_disable_enrollment' => (bool) env('MEDMINDERS_DEMO_DISABLE_MFA', false),
    'totp_issuer' => env('MFA_TOTP_ISSUER', 'MedMinders'),
    'sms_ttl' => 300,
];
