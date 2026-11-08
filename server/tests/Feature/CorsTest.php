<?php

namespace Tests\Feature;

use Tests\TestCase;

class CorsTest extends TestCase
{
    private function preflight(string $origin)
    {
        return $this->call('OPTIONS', '/api/v1/health/ready', [], [], [], [
            'HTTP_ORIGIN' => $origin, 'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
            'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'authorization,ngrok-skip-browser-warning',
        ]);
    }

    public function test_allowed_frontends_receive_cors_headers(): void
    {
        foreach (['https://medminders.vercel.app', 'http://127.0.0.1:5173', 'http://localhost:5173'] as $origin) {
            $this->assertSame($origin, $this->preflight($origin)->headers->get('Access-Control-Allow-Origin'), $origin);
        }
    }

    public function test_unknown_origin_is_not_allowed_and_no_credentials_are_used(): void
    {
        $response = $this->preflight('https://evil.example');
        $this->assertNull($response->headers->get('Access-Control-Allow-Origin'));
        $this->assertNull($this->preflight('https://medminders.vercel.app')->headers->get('Access-Control-Allow-Credentials'));
    }
}
