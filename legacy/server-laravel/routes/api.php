<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\CatalogueController;

Route::get('/health', function () {
    return response()->json([
        'ok' => true,
        'service' => 'MedMinders Laravel API',
        'version' => app()->version(),
    ]);
});

Route::prefix('v1')->group(function () {
    Route::get('/health', fn () => response()->json(['ok' => true, 'status' => 'UP']));
    Route::get('/catalogue/version', [CatalogueController::class, 'version']);
    Route::get('/catalogue/antibiotics', [CatalogueController::class, 'antibiotics']);
    Route::get('/catalogue/search', [CatalogueController::class, 'search']);
});

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});
