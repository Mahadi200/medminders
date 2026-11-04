<?php

use Illuminate\Support\Facades\Route;

Route::any('/uploads/{any?}', fn () => response()->json(['message' => 'Direct upload access is disabled.'], 401))->where('any', '.*');
Route::get('/', fn () => response()->json([
    'service' => 'MedMinders API',
    'frontend' => 'http://127.0.0.1:5173',
    'docs' => '/api/v1/health/live',
]));
