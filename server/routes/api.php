<?php

use App\Http\Controllers\Api\v1\AuthController;
use App\Http\Controllers\Api\v1\CatalogueController;
use App\Http\Controllers\Api\v1\FileStreamController;
use App\Http\Controllers\Api\v1\HealthController;
use App\Http\Controllers\Api\v1\PrescriptionController;
use App\Http\Controllers\Api\v1\PatientAccessController;
use App\Http\Controllers\Api\v1\PatientRecordController;
use App\Http\Controllers\Api\v1\SharingController;
use App\Http\Controllers\Api\v1\DoctorController;
use App\Http\Controllers\Api\v1\ClinicalPrescriptionController;
use App\Http\Controllers\Api\v1\CourseController;
use App\Http\Controllers\Api\v1\PharmacyController;
use App\Http\Controllers\Api\v1\DiagnosticController;
use App\Http\Controllers\Api\v1\OrganizationController;
use App\Http\Controllers\Api\v1\AppointmentController;
use App\Http\Controllers\Api\v1\NotificationController;
use App\Http\Controllers\Api\v1\PatientLedgerController;
use App\Http\Controllers\Api\v1\AnalyticsController;
use App\Http\Controllers\Api\v1\MessagingController;
use App\Http\Controllers\Api\v1\MedicationProblemController;
use App\Http\Controllers\Api\v1\InteractionController;
use App\Http\Controllers\Api\v1\AffiliationController;
use App\Http\Controllers\Api\v1\AlarmController;
use App\Http\Controllers\Api\v1\CareTeamController;
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
        Route::post('/doctors/register', [AuthController::class, 'registerDoctor']);
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/mfa/verify', [AuthController::class, 'verifyMfa']);
        Route::middleware('auth:sanctum')->group(function () {
            Route::get('/me', [AuthController::class, 'me']);
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::post('/mfa/enroll', [AuthController::class, 'beginTotp']);
            Route::post('/mfa/enroll/confirm', [AuthController::class, 'confirmTotp']);
        });
    });

    Route::post('/patients/challenge', [PatientAccessController::class, 'challenge'])->middleware('throttle:5,1');
    Route::post('/patients/verify', [PatientAccessController::class, 'verify'])->middleware('throttle:10,1');
    Route::post('/auth/pharmacies/register', [OrganizationController::class, 'registerPharmacy']);
    Route::post('/auth/patients/register-password', [AuthController::class, 'registerPatientPassword'])->middleware('throttle:5,1');
    Route::post('/auth/patients/login-password', [AuthController::class, 'loginPatientPassword'])->middleware('throttle:10,1');
    Route::get('/doctors', [DoctorController::class, 'index']);
    Route::get('/doctors/{id}', [DoctorController::class, 'show']);
    Route::get('/doctors/{id}/photo', [DoctorController::class, 'photo']);
    Route::get('/affiliations/{id}/slots', [AppointmentController::class, 'slots'])->middleware('throttle:60,1');
    Route::get('/organizations/approved', [SharingController::class, 'organizations']);

    Route::middleware(['auth:sanctum', 'mfa.ready'])->group(function () {
        Route::get('/doctor/profile', [DoctorController::class, 'me']);
        Route::patch('/doctor/profile', [DoctorController::class, 'update']);
        Route::post('/doctor/profile/photo', [DoctorController::class, 'updatePhoto']);
        Route::post('/doctors/{id}/review', [DoctorController::class, 'review']);
        Route::get('/patients/records', [PatientAccessController::class, 'records']);
        Route::post('/patients/records', [PatientRecordController::class, 'store']);
        Route::get('/patients/records/{id}', [PatientRecordController::class, 'show']);
        Route::patch('/patients/records/{id}', [PatientRecordController::class, 'update']);
        Route::get('/sharing', [SharingController::class, 'index']);
        Route::post('/sharing/requests', [SharingController::class, 'request']);
        Route::post('/sharing/requests/{id}/decision', [SharingController::class, 'decide']);
        Route::post('/sharing/grants/{id}/revoke', [SharingController::class, 'revoke']);
        Route::get('/clinical-prescriptions', [ClinicalPrescriptionController::class, 'index']);
        Route::post('/clinical-prescriptions', [ClinicalPrescriptionController::class, 'store']);
        Route::get('/clinical-prescriptions/{prescription}', [ClinicalPrescriptionController::class, 'show']);
        Route::post('/clinical-prescriptions/{prescription}/amend', [ClinicalPrescriptionController::class, 'amend']);
        Route::post('/clinical-prescriptions/{prescription}/cancel', [ClinicalPrescriptionController::class, 'cancel']);
        Route::get('/appointments', [AppointmentController::class, 'index']);
        Route::post('/appointments', [AppointmentController::class, 'store']);
        Route::patch('/appointments/{id}', [AppointmentController::class, 'update']);
        Route::post('/appointments/{id}/respond', [AppointmentController::class, 'respond']);
        Route::get('/doctor/affiliations', [AffiliationController::class, 'mine']);
        Route::post('/doctor/affiliations', [AffiliationController::class, 'upsert']);
        Route::get('/organization/affiliations', [AffiliationController::class, 'forOrganization']);
        Route::post('/affiliations/{id}/decision', [AffiliationController::class, 'decide']);
        Route::get('/alarms/due', [AlarmController::class, 'due']);
        Route::post('/alarms/{eventId}/acknowledge', [AlarmController::class, 'acknowledge']);
        Route::post('/alarms/{eventId}/snooze', [AlarmController::class, 'snooze']);
        Route::post('/sharing/share', [SharingController::class, 'share']);
        Route::get('/shared-with-me', [SharingController::class, 'sharedWithMe']);
        Route::get('/doctor/patients', [CareTeamController::class, 'patients']);
        Route::get('/doctor/problems', [CareTeamController::class, 'problems']);
        Route::post('/medication-problems/{id}/review', [CareTeamController::class, 'reviewProblem']);
        Route::post('/support-alerts/{id}/respond', [CareTeamController::class, 'resolveAlert']);
        Route::post('/notifications/read-all', [NotificationController::class, 'readAll']);
        Route::get('/notification-preferences', [NotificationController::class, 'preferences']);
        Route::put('/notification-preferences', [NotificationController::class, 'updatePreferences']);
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::post('/notifications/{id}/read', [NotificationController::class, 'read']);
        Route::post('/notifications/{id}/acknowledge', [NotificationController::class, 'acknowledge']);
        Route::get('/conversations', [MessagingController::class, 'index']);
        Route::post('/conversations', [MessagingController::class, 'store']);
        Route::get('/conversations/{id}/messages', [MessagingController::class, 'messages']);
        Route::post('/conversations/{id}/messages', [MessagingController::class, 'send']);
        Route::get('/medication-problems', [MedicationProblemController::class, 'index']);
        Route::post('/medication-problems', [MedicationProblemController::class, 'store']);
        Route::post('/interactions/check', [InteractionController::class, 'check']);
        Route::get('/my-dispensings', [PatientLedgerController::class, 'dispensings']);
        Route::get('/my-invoices', [PatientLedgerController::class, 'invoices']);
        Route::get('/analytics/antibiotic-use', [AnalyticsController::class, 'antibioticUse']);
        Route::get('/courses', [CourseController::class, 'index']);
        Route::get('/courses/{id}', [CourseController::class, 'show']);
        Route::post('/courses/{id}/start', [CourseController::class, 'start']);
        Route::post('/courses/{id}/completion', [CourseController::class, 'reportStatus']);
        Route::post('/courses/{id}/support', [CourseController::class, 'support']);
        Route::get('/courses/{id}/alerts', [CourseController::class, 'alerts']);
        Route::post('/support-alerts/{alertId}/resolve', [CourseController::class, 'resolveAlert']);
        Route::post('/dose-events/{eventId}/logs', [CourseController::class, 'log']);
        Route::post('/organizations', [OrganizationController::class, 'create']);
        Route::post('/organizations/{organizationId}/staff', [OrganizationController::class, 'addStaff']);
        Route::get('/pharmacy/status', [OrganizationController::class, 'pharmacyStatus']);
        Route::post('/organizations/{organizationId}/pharmacy-review', [OrganizationController::class, 'reviewPharmacy']);
        Route::post('/prescription-items/{itemId}/dispensings', [PharmacyController::class, 'dispense']);
        Route::post('/test-orders/{orderId}/accept', [DiagnosticController::class, 'accept']);
        Route::get('/test-orders', [DiagnosticController::class, 'orders']);
        Route::get('/reports', [DiagnosticController::class, 'reports']);
        Route::post('/test-orders/{orderId}/bill', [DiagnosticController::class, 'bill']);
        Route::post('/invoices/{invoiceId}/payments', [DiagnosticController::class, 'recordPayment']);
        Route::post('/invoices/{invoiceId}/corrections', [DiagnosticController::class, 'correctPayment']);
        Route::post('/test-orders/{orderId}/reports', [DiagnosticController::class, 'upload']);
        Route::post('/reports/{reportId}/amend', [DiagnosticController::class, 'amendReport']);
        Route::post('/reports/{reportId}/release', [DiagnosticController::class, 'release']);
        Route::get('/reports/{reportId}', [DiagnosticController::class, 'show']);
        Route::get('/reports/{reportId}/file', [DiagnosticController::class, 'download']);
    });

    Route::prefix('catalogue')->group(function () {
        Route::get('/version', [CatalogueController::class, 'version']);
        Route::get('/antibiotics', [CatalogueController::class, 'index']);
        Route::get('/search', [CatalogueController::class, 'search']);
    });

    Route::middleware(['auth:sanctum', 'mfa.ready'])->prefix('prescriptions')->group(function () {
        Route::get('/', [PrescriptionController::class, 'index']);
        Route::post('/', [PrescriptionController::class, 'store']);
        Route::get('/{prescription}', [PrescriptionController::class, 'show']);
    });

    Route::middleware(['auth:sanctum', 'mfa.ready'])->get('/files/{id}', [FileStreamController::class, 'show']);
});

Route::middleware('auth:sanctum')->get('/user', fn (Request $request) => $request->user());
