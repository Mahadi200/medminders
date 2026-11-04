<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    public function live() { return response()->json(['ok' => true, 'status' => 'UP']); }

    public function ready()
    {
        try {
            DB::select('SELECT 1');
            return response()->json(['ok' => true, 'database' => 'UP']);
        } catch (\Throwable $exception) {
            return response()->json(['ok' => false, 'database' => 'DOWN'], 503);
        }
    }
}
