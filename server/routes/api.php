<?php

use App\Http\Controllers\Api\v1\AuthController;
use App\Http\Controllers\Api\v1\CatalogueController;
use App\Http\Controllers\Api\v1\FileStreamController;
use App\Http\Controllers\Api\v1\HealthController;
use App\Http\Controllers\Api\v1\PrescriptionController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/health', [HealthController::class, 'live']);
Route::get('/uploads/{id}', fn () => response()->json(['message' => 'Direct upload access is disabled.'], 401));

Route::prefix('v1')->group(function () {
    Route::get('/health', [HealthController::class, 'live']);
    Route::get('/health/live', [HealthController::class, 'live']);
    Route::get('/health/ready', [HealthController::class, 'ready']);

    Route::prefix('auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/mfa/verify', [AuthController::class, 'verifyMfa']);
        Route::middleware('auth:sanctum')->group(function () {
            Route::get('/me', [AuthController::class, 'me']);
            Route::post('/logout', [AuthController::class, 'logout']);
        });
    });

    Route::prefix('catalogue')->group(function () {
        Route::get('/version', [CatalogueController::class, 'version']);
        Route::get('/antibiotics', [CatalogueController::class, 'index']);
        Route::get('/search', [CatalogueController::class, 'search']);
    });

    Route::middleware('auth:sanctum')->prefix('prescriptions')->group(function () {
        Route::get('/', [PrescriptionController::class, 'index']);
        Route::post('/', [PrescriptionController::class, 'store']);
        Route::get('/{prescription}', [PrescriptionController::class, 'show']);
    });

    Route::middleware('auth:sanctum')->get('/files/{id}', [FileStreamController::class, 'show']);
});

Route::middleware('auth:sanctum')->get('/user', fn (Request $request) => $request->user());
