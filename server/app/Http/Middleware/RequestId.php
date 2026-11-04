<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Str;

class RequestId
{
    public function handle($request, Closure $next)
    {
        $id = $request->header('X-Request-Id', (string) Str::ulid());
        return $next($request)->header('X-Request-Id', $id);
    }
}
