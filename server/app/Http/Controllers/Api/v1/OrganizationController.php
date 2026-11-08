<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class OrganizationController extends Controller
{
    public function registerPharmacy(Request $request)
    {
        $data = $request->validate([
            'pharmacy_legal_name' => 'required|string|max:191', 'pharmacy_trading_name' => 'nullable|string|max:191',
            'address' => 'required|string|max:2000', 'contact_phone' => 'required|string|max:32',
            'contact_email' => 'required|email|max:191', 'responsible_owner_name' => 'required|string|max:191',
            'license_number' => 'required|string|max:191', 'license_issuing_authority' => 'nullable|string|max:191',
            'license_issued_on' => 'nullable|date', 'license_expires_on' => 'nullable|date|after_or_equal:license_issued_on',
            'license_document' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'pharmacist_full_name' => 'required|string|max:191', 'pharmacist_registration_number' => 'required|string|max:191',
            'pharmacist_registration_category' => 'nullable|string|max:16', 'pharmacist_issuing_authority' => 'nullable|string|max:191',
            'pharmacist_issued_on' => 'nullable|date', 'pharmacist_expires_on' => 'nullable|date|after_or_equal:pharmacist_issued_on',
            'pharmacist_document' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'email' => 'required|email|max:191|unique:users,email', 'password' => 'required|string|min:12|confirmed',
        ]);
        $licensePath = $request->file('license_document')->store('private-pharmacy-credentials', 'local');
        $pharmacistPath = $request->file('pharmacist_document')->store('private-pharmacy-credentials', 'local');
        try {
            return DB::transaction(function () use ($data, $licensePath, $pharmacistPath) {
                $user = User::create(['name' => $data['responsible_owner_name'], 'email' => $data['email'], 'password' => $data['password']]);
                Role::create(['user_id' => $user->id, 'role' => 'PHARMACIST']);
                $organizationId = (string) Str::ulid();
                DB::table('organizations')->insert(['id' => $organizationId, 'name' => $data['pharmacy_trading_name'] ?: $data['pharmacy_legal_name'], 'legal_name' => $data['pharmacy_legal_name'], 'trading_name' => $data['pharmacy_trading_name'] ?? null, 'type' => 'PHARMACY', 'status' => 'SUBMITTED', 'address' => $data['address'], 'contact_phone' => $data['contact_phone'], 'contact_email' => $data['contact_email'], 'responsible_owner_name' => $data['responsible_owner_name'], 'created_at' => now(), 'updated_at' => now()]);
                DB::table('organization_memberships')->insert(['id' => (string) Str::ulid(), 'organization_id' => $organizationId, 'user_id' => $user->id, 'role' => 'PHARMACY_ADMIN', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
                DB::table('pharmacy_establishment_licenses')->insert(['id' => (string) Str::ulid(), 'organization_id' => $organizationId, 'license_number' => $data['license_number'], 'issuing_authority' => $data['license_issuing_authority'] ?? null, 'issued_on' => $data['license_issued_on'] ?? null, 'expires_on' => $data['license_expires_on'] ?? null, 'document_path' => $licensePath, 'created_at' => now(), 'updated_at' => now()]);
                DB::table('responsible_pharmacist_registrations')->insert(['id' => (string) Str::ulid(), 'organization_id' => $organizationId, 'full_name' => $data['pharmacist_full_name'], 'registration_number' => $data['pharmacist_registration_number'], 'registration_category' => $data['pharmacist_registration_category'] ?? null, 'issuing_authority' => $data['pharmacist_issuing_authority'] ?? null, 'issued_on' => $data['pharmacist_issued_on'] ?? null, 'expires_on' => $data['pharmacist_expires_on'] ?? null, 'document_path' => $pharmacistPath, 'created_at' => now(), 'updated_at' => now()]);
                return response()->json(['status' => 'SUBMITTED', 'organization_id' => $organizationId, 'message' => 'Pharmacy application submitted for review.'], 201);
            });
        } catch (\Throwable $e) {
            Storage::disk('local')->delete([$licensePath, $pharmacistPath]);
            throw $e;
        }
    }

    public function pharmacyStatus(Request $request)
    {
        $membership = DB::table('organization_memberships')->where('user_id', $request->user()->id)->where('role', 'PHARMACY_ADMIN')->where('is_active', true)->first();
        abort_unless($membership, 403);
        $org = DB::table('organizations')->find($membership->organization_id);
        return response()->json(['organization' => $org, 'establishment_license' => DB::table('pharmacy_establishment_licenses')->where('organization_id', $org->id)->first(['license_number', 'issuing_authority', 'issued_on', 'expires_on', 'verification_status', 'reviewed_at', 'review_reason']), 'responsible_pharmacist' => DB::table('responsible_pharmacist_registrations')->where('organization_id', $org->id)->first(['full_name', 'registration_number', 'registration_category', 'issuing_authority', 'issued_on', 'expires_on', 'verification_status', 'reviewed_at', 'review_reason'])]);
    }

    public function reviewPharmacy(Request $request, string $organizationId)
    {
        abort_unless($request->user()->hasRole('SUPERADMIN'), 403);
        $data = $request->validate(['decision' => 'required|in:APPROVED,REJECTED,SUSPENDED,PENDING_CORRECTION', 'reason' => 'required|string|max:2000']);
        $status = $data['decision'] === 'PENDING_CORRECTION' ? 'PENDING_REVIEW' : $data['decision'];
        DB::transaction(function () use ($request, $organizationId, $status, $data) {
            DB::table('organizations')->where('id', $organizationId)->update(['status' => $status, 'reviewed_by' => $request->user()->id, 'reviewed_at' => now(), 'review_reason' => $data['reason'], 'updated_at' => now()]);
            DB::table('pharmacy_establishment_licenses')->where('organization_id', $organizationId)->update(['verification_status' => $status === 'APPROVED' ? 'VERIFIED' : $status, 'reviewed_by' => $request->user()->id, 'reviewed_at' => now(), 'review_reason' => $data['reason'], 'updated_at' => now()]);
            DB::table('responsible_pharmacist_registrations')->where('organization_id', $organizationId)->update(['verification_status' => $status === 'APPROVED' ? 'VERIFIED' : $status, 'reviewed_by' => $request->user()->id, 'reviewed_at' => now(), 'review_reason' => $data['reason'], 'updated_at' => now()]);
        });
        return response()->json(['status' => $status]);
    }

    public function create(Request $request)
    {
        abort_unless($request->user()->hasRole('SUPERADMIN'), 403);
        $data = $request->validate(['name' => 'required|string|max:191', 'type' => 'required|in:CLINIC,PHARMACY,HOSPITAL,DIAGNOSTIC']);
        $id = (string) Str::ulid();
        DB::table('organizations')->insert($data + ['id' => $id, 'created_at' => now(), 'updated_at' => now()]);
        return response()->json(['id' => $id], 201);
    }

    public function addStaff(Request $request, string $organizationId)
    {
        $actor = $request->user();
        $admin = $actor->hasRole('SUPERADMIN') || DB::table('organization_memberships')->where('organization_id', $organizationId)
            ->where('user_id', $actor->id)->where('is_active', true)->whereIn('role', ['PHARMACY_ADMIN', 'HOSPITAL_ADMIN'])->exists();
        abort_unless($admin, 403);
        $organization = DB::table('organizations')->findOrFail($organizationId);
        $data = $request->validate([
            'name' => 'required|string|max:191', 'email' => 'required|email|max:191|unique:users,email',
            'password' => 'required|string|min:12|confirmed',
            'role' => 'required|in:DOCTOR_ASSISTANT,PHARMACY_ADMIN,DISPENSER,HOSPITAL_ADMIN,HOSPITAL_RECEPTION,BILLING,LAB_STAFF,REPORT_REVIEWER',
            'assigned_doctor_id' => 'nullable|ulid|exists:users,id',
        ]);
        $allowedRoles = match ($organization->type) {
            'CLINIC' => ['DOCTOR_ASSISTANT'],
            'PHARMACY' => ['PHARMACY_ADMIN', 'DISPENSER'],
            default => ['HOSPITAL_ADMIN', 'HOSPITAL_RECEPTION', 'BILLING', 'LAB_STAFF', 'REPORT_REVIEWER'],
        };
        abort_unless(in_array($data['role'], $allowedRoles, true), 422);
        if ($data['role'] === 'DOCTOR_ASSISTANT') {
            abort_unless($data['assigned_doctor_id'] ?? null, 422);
            abort_unless(User::find($data['assigned_doctor_id'])?->hasRole('DOCTOR'), 422);
        }
        return DB::transaction(function () use ($data, $organizationId) {
            $user = User::create(['name' => $data['name'], 'email' => $data['email'], 'password' => $data['password']]);
            DB::table('organization_memberships')->insert([
                'id' => (string) Str::ulid(), 'organization_id' => $organizationId, 'user_id' => $user->id,
                'role' => $data['role'], 'assigned_doctor_id' => $data['assigned_doctor_id'] ?? null,
                'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
            ]);
            return response()->json(['id' => $user->id, 'role' => $data['role']], 201);
        });
    }
}
