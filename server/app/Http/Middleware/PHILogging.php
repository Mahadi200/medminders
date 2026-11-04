<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\Log;

class PHILogging
{
    public function handle($request, Closure $next)
    {
        $response = $next($request);
        if ($request->is('api/v1/files/*')) Log::info('PHI endpoint accessed', ['path' => $request->path(), 'user_id' => $request->user()?->id]);
        return $response;
    }
}
