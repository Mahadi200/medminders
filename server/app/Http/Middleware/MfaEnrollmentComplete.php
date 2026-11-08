<?php

namespace App\Http\Middleware;

use App\Services\Auth\MfaService;
use Closure;

class MfaEnrollmentComplete
{
    public function __construct(private readonly MfaService $mfa) {}

    public function handle($request, Closure $next)
    {
        $user = $request->user();
        abort_unless($user && (! $this->mfa->requiresMfa($user) || $user->mfa_secret_encrypted), 403, 'Authenticator enrollment is required.');
        return $next($request);
    }
}
