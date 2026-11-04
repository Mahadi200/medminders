<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Prescription;
use Illuminate\Http\Request;

class PrescriptionController extends Controller
{
    public function index(Request $request)
    {
        $prescriptions = Prescription::with(['patient:id,email', 'doctor:id,email'])
            ->where('patient_id', $request->user()->id)
            ->latest()
            ->paginate(20);

        return response()->json($prescriptions);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'diagnosis' => 'nullable|string|max:5000',
            'instructions' => 'nullable|array',
        ]);

        $prescription = Prescription::create([
            ...$data,
            'patient_id' => $request->user()->id,
            'status' => 'DRAFT_UNREVIEWED',
        ]);

        return response()->json($prescription, 201);
    }

    public function show(Request $request, Prescription $prescription)
    {
        abort_unless($prescription->patient_id === $request->user()->id, 404);
        return response()->json($prescription->load(['patient:id,email', 'doctor:id,email', 'uploads']));
    }
}
