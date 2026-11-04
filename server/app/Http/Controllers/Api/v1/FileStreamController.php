<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\PrescriptionUpload;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class FileStreamController extends Controller
{
    public function show(Request $request, string $id)
    {
        $upload = PrescriptionUpload::with('prescription')->findOrFail($id);
        $user = $request->user();
        $allowed = $upload->user_id === $user->id || $upload->prescription?->doctor_id === $user->id;
        abort_unless($allowed, 403);
        abort_unless(Storage::disk('local')->exists($upload->file_path), 404);
        AuditEvent::create(['actor_user_id' => $user->id, 'target_user_id' => $upload->user_id, 'action' => 'PHI_FILE_STREAMED', 'entity_type' => 'prescription_upload', 'entity_id' => $upload->id, 'ip_address' => $request->ip(), 'user_agent' => $request->userAgent(), 'metadata' => ['file_type' => $upload->file_type]]);
        $stream = Storage::disk('local')->readStream($upload->file_path);
        return response()->stream(fn () => fpassthru($stream), 200, ['Content-Type' => $upload->file_type === 'pdf' ? 'application/pdf' : 'image/*', 'Cache-Control' => 'private, no-store']);
    }
}
