<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PharmacyController extends Controller
{
    public function dispense(Request $request, string $itemId)
    {
        $data = $request->validate([
            'organization_id' => 'required|ulid|exists:organizations,id', 'quantity' => 'required|integer|min:1',
            'product' => 'required|string|max:191', 'batch' => 'nullable|string|max:100', 'expires_on' => 'nullable|date',
            'counselling' => 'nullable|string|max:3000', 'supply_problem' => 'nullable|string|max:3000',
            'idempotency_key' => 'required|string|min:16|max:100',
        ]);
        $user = $request->user();
        abort_unless(DB::table('organization_memberships')->where('user_id', $user->id)->where('organization_id', $data['organization_id'])
            ->where('is_active', true)->whereIn('role', ['PHARMACY_ADMIN', 'DISPENSER'])->exists(), 403);
        abort_unless(DB::table('organizations')->where('id', $data['organization_id'])->where('type', 'PHARMACY')->exists(), 403);
        abort_unless(DB::table('organizations')->where('id', $data['organization_id'])->where('status', 'APPROVED')->exists(), 403, 'Pharmacy onboarding is still pending review.');
        abort_unless(DB::table('pharmacy_establishment_licenses')->where('organization_id', $data['organization_id'])->where('verification_status', 'VERIFIED')->exists(), 403);
        abort_unless(DB::table('responsible_pharmacist_registrations')->where('organization_id', $data['organization_id'])->where('verification_status', 'VERIFIED')->exists(), 403);
        return DB::transaction(function () use ($request, $itemId, $data, $user) {
            $item = DB::table('prescription_items')->where('id', $itemId)->lockForUpdate()->first();
            abort_unless($item, 404);
            $prescribedNames = array_map(fn ($name) => strtolower(trim($name)), array_filter([$item->generic_name, $item->brand_name]));
            if (! in_array(strtolower(trim($data['product'])), $prescribedNames, true)) {
                throw ValidationException::withMessages(['product' => 'The supplied product must match the prescribed generic or brand. Request prescriber review for a change.']);
            }
            $rx = DB::table('prescriptions')->find($item->prescription_id);
            abort_unless($rx->status === 'SIGNED' && ! $rx->superseded_at && ! $rx->cancelled_at, 422);
            $grant = DB::table('sharing_grants')->where('recipient_id', $user->id)->where('patient_record_id', $rx->patient_record_id)
                ->where('organization_id', $data['organization_id'])->where('resource_type', 'PRESCRIPTION')->where('resource_id', $rx->id)
                ->where('action', 'DISPENSE')->whereNull('revoked_at')->where('expires_at', '>', now())->exists();
            abort_unless($grant, 403);
            $existing = DB::table('dispensings')->where('idempotency_key', $data['idempotency_key'])->first();
            if ($existing) {
                abort_unless($existing->prescription_item_id === $itemId && $existing->organization_id === $data['organization_id'] && $existing->staff_id === $user->id, 409);
                return response()->json(['id' => $existing->id, 'quantity' => $existing->quantity, 'already_recorded' => true]);
            }
            if (! $item->quantity) throw ValidationException::withMessages(['quantity' => 'Prescriber quantity or refill authorization is required.']);
            $supplied = DB::table('dispensings')->where('prescription_item_id', $itemId)->sum('quantity');
            if ($supplied + $data['quantity'] > $item->quantity) throw ValidationException::withMessages(['quantity' => 'Quantity exceeds the remaining authorized supply.']);
            $id = (string) Str::ulid();
            DB::table('dispensings')->insert([
                'id' => $id, 'prescription_item_id' => $itemId, 'organization_id' => $data['organization_id'], 'staff_id' => $user->id,
                'quantity' => $data['quantity'], 'product' => $data['product'], 'batch' => $data['batch'] ?? null,
                'expires_on' => $data['expires_on'] ?? null, 'counselling' => $data['counselling'] ?? null,
                'supply_problem' => $data['supply_problem'] ?? null, 'supplied_at' => now(), 'idempotency_key' => $data['idempotency_key'],
                'created_at' => now(), 'updated_at' => now(),
            ]);
            AuditEvent::create(['actor_user_id' => $user->id, 'action' => 'MEDICINE_DISPENSED', 'entity_type' => 'dispensing', 'entity_id' => $id]);
            foreach (DB::table('patient_links')->where('patient_record_id', $rx->patient_record_id)->pluck('user_id') as $patientUser) {
                app(\App\Services\CareNotificationService::class)->create($patientUser, 'MEDICINE_DISPENSED', 'INFORMATION', 'NORMAL', 'DISPENSING', $id, '/patient-login#dashboard-courses', ['message' => $data['quantity'].' unit(s) of '.$data['product'].' recorded as supplied. Supply does not record that a dose was taken.']);
            }
            return response()->json(['id' => $id, 'remaining_quantity' => $item->quantity - $supplied - $data['quantity'], 'note' => 'Supply does not confirm consumption or treatment start.'], 201);
        });
    }
}
