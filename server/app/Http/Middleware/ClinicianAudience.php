<?php

namespace App\Http\Middleware;

use Closure;

class ClinicianAudience
{
    public function handle($request, Closure $next)
    {
        return $next($request);
    }
}
