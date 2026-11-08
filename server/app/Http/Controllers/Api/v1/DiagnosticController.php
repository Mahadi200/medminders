<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DiagnosticController extends Controller
{
    public function orders(Request $request)
    {
        $user = $request->user();
        $patientIds = DB::table('patient_links')->where('user_id', $user->id)->pluck('patient_record_id');
        $organizationIds = DB::table('organization_memberships')->where('user_id', $user->id)->where('is_active', true)->pluck('organization_id');
        return DB::table('test_orders as t')->join('patient_records as pr', 'pr.id', '=', 't.patient_record_id')->leftJoin('organizations as o', 'o.id', '=', 't.performing_organization_id')
            ->leftJoin('service_invoices as v', 'v.test_order_id', '=', 't.id')
            ->where(fn ($q) => $q->whereIn('t.patient_record_id', $patientIds)->orWhereIn('t.performing_organization_id', $organizationIds))
            ->select('t.*', 'pr.name as patient_name', 'o.name as organization_name', 'v.id as invoice_id', 'v.price_paisa', 'v.discount_paisa', 'v.paid_paisa')
            ->orderByDesc('t.created_at')->limit(100)->get();
    }

    public function reports(Request $request)
    {
        $user = $request->user();
        $patientIds = DB::table('patient_links')->where('user_id', $user->id)->pluck('patient_record_id');
        $organizationIds = DB::table('organization_memberships')->where('user_id', $user->id)->where('is_active', true)
            ->whereIn('role', ['LAB_STAFF', 'REPORT_REVIEWER', 'HOSPITAL_ADMIN'])->pluck('organization_id');
        $orderedBy = DB::table('test_orders as t')->join('prescriptions as p', 'p.id', '=', 't.prescription_id')->where('p.doctor_id', $user->id)->pluck('t.id');
        return DB::table('lab_reports as r')->join('test_orders as t', 't.id', '=', 'r.test_order_id')->leftJoin('organizations as o', 'o.id', '=', 'r.organization_id')
            ->join('patient_records as pr', 'pr.id', '=', 'r.patient_record_id')
            ->where(function ($q) use ($patientIds, $organizationIds, $orderedBy) {
                $q->where(fn ($p) => $p->whereIn('r.patient_record_id', $patientIds)->where('r.status', 'RELEASED'))
                    ->orWhere(fn ($p) => $p->whereIn('r.test_order_id', $orderedBy)->where('r.status', 'RELEASED'))
                    ->orWhereIn('r.organization_id', $organizationIds);
            })->select('r.id', 'r.test_order_id', 'r.patient_record_id', 'r.organization_id', 'r.supersedes_id', 'r.status', 'r.released_at', 'r.created_at',
                'r.observations', 'r.amendment_reason', 't.test_name', 'o.name as organization_name', 'pr.name as patient_name')
            ->selectRaw('CASE WHEN r.file_path IS NULL THEN 0 ELSE 1 END as has_file')->orderByDesc('r.created_at')->limit(100)->get();
    }

    private function staff(Request $request, string $organizationId, array $roles): void
    {
        abort_unless(DB::table('organization_memberships')->where('user_id', $request->user()->id)->where('organization_id', $organizationId)
            ->where('is_active', true)->whereIn('role', $roles)->exists(), 403);
        abort_unless(DB::table('organizations')->where('id', $organizationId)->whereIn('type', ['HOSPITAL', 'DIAGNOSTIC'])->exists(), 403);
    }

    public function accept(Request $request, string $orderId)
    {
        $data = $request->validate(['organization_id' => 'required|ulid']);
        $this->staff($request, $data['organization_id'], ['HOSPITAL_ADMIN', 'HOSPITAL_RECEPTION']);
        return DB::transaction(function () use ($request, $orderId, $data) {
            $order = DB::table('test_orders')->where('id', $orderId)->lockForUpdate()->first();
            abort_unless($order && $order->status === 'ORDERED', 422);
            $rx = DB::table('prescriptions')->find($order->prescription_id);
            abort_unless($rx->status === 'SIGNED', 422);
            $grant = DB::table('sharing_grants')->where('recipient_id', $request->user()->id)->where('organization_id', $data['organization_id'])
                ->where('patient_record_id', $order->patient_record_id)->where('resource_type', 'PRESCRIPTION')
                ->where('resource_id', $rx->id)->where('action', 'VIEW')->whereNull('revoked_at')->where('expires_at', '>', now())->exists();
            abort_unless($grant, 403);
            DB::table('test_orders')->where('id', $orderId)->update(['status' => 'ACCEPTED', 'performing_organization_id' => $data['organization_id'], 'updated_at' => now()]);
            AuditEvent::create(['actor_user_id' => $request->user()->id, 'action' => 'TEST_ORDER_ACCEPTED', 'entity_type' => 'test_order', 'entity_id' => $orderId]);
            return response()->json(['status' => 'ACCEPTED']);
        });
    }

    public function bill(Request $request, string $orderId)
    {
        $data = $request->validate(['price_bdt' => 'required|numeric|min:0|max:999999', 'discount_bdt' => 'nullable|numeric|min:0|max:999999']);
        return DB::transaction(function () use ($request, $orderId, $data) {
            $order = DB::table('test_orders')->where('id', $orderId)->lockForUpdate()->first();
            abort_unless($order && $order->performing_organization_id && in_array($order->status, ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED']), 422);
            $this->staff($request, $order->performing_organization_id, ['HOSPITAL_ADMIN', 'BILLING']);
            abort_if(DB::table('service_invoices')->where('test_order_id', $orderId)->exists(), 409);
            $price = (int) round($data['price_bdt'] * 100);
            $discount = (int) round(($data['discount_bdt'] ?? 0) * 100);
            abort_if($discount > $price, 422);
            $id = (string) Str::ulid();
            DB::table('service_invoices')->insert(['id' => $id, 'patient_record_id' => $order->patient_record_id,
                'organization_id' => $order->performing_organization_id, 'test_order_id' => $orderId,
                'price_paisa' => $price, 'discount_paisa' => $discount, 'paid_paisa' => 0,
                'created_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
            return response()->json(['id' => $id, 'due_paisa' => $price - $discount], 201);
        });
    }

    public function recordPayment(Request $request, string $invoiceId)
    {
        $data = $request->validate(['amount_bdt' => 'required|numeric|min:0.01|max:999999', 'note' => 'nullable|string|max:1000']);
        return DB::transaction(function () use ($request, $invoiceId, $data) {
            $invoice = DB::table('service_invoices')->where('id', $invoiceId)->lockForUpdate()->first();
            abort_unless($invoice, 404);
            $this->staff($request, $invoice->organization_id, ['HOSPITAL_ADMIN', 'BILLING']);
            $amount = (int) round($data['amount_bdt'] * 100);
            abort_if($invoice->paid_paisa + $amount > $invoice->price_paisa - $invoice->discount_paisa, 422);
            $id = (string) Str::ulid();
            $receipt = 'MM-'.strtoupper($id);
            DB::table('invoice_transactions')->insert(['id' => $id, 'service_invoice_id' => $invoiceId,
                'actor_id' => $request->user()->id, 'type' => 'RECORDED_PAYMENT', 'amount_paisa' => $amount,
                'receipt_number' => $receipt, 'reason' => $data['note'] ?? null, 'created_at' => now(), 'updated_at' => now()]);
            DB::table('service_invoices')->where('id', $invoiceId)->update(['paid_paisa' => $invoice->paid_paisa + $amount, 'updated_at' => now()]);
            AuditEvent::create(['actor_user_id' => $request->user()->id, 'action' => 'OFFLINE_PAYMENT_RECORDED', 'entity_type' => 'service_invoice', 'entity_id' => $invoiceId]);
            return response()->json(['receipt_number' => $receipt, 'due_paisa' => $invoice->price_paisa - $invoice->discount_paisa - $invoice->paid_paisa - $amount,
                'note' => 'Recorded by staff; no online payment was processed.'], 201);
        });
    }

    public function correctPayment(Request $request, string $invoiceId)
    {
        $data = $request->validate(['amount_bdt' => 'required|numeric|min:0.01|max:999999', 'reason' => 'required|string|max:2000']);
        return DB::transaction(function () use ($request, $invoiceId, $data) {
            $invoice = DB::table('service_invoices')->where('id', $invoiceId)->lockForUpdate()->first();
            abort_unless($invoice, 404);
            $this->staff($request, $invoice->organization_id, ['HOSPITAL_ADMIN']);
            $amount = (int) round($data['amount_bdt'] * 100);
            abort_if($amount > $invoice->paid_paisa, 422);
            DB::table('invoice_transactions')->insert(['id' => (string) Str::ulid(), 'service_invoice_id' => $invoiceId,
                'actor_id' => $request->user()->id, 'type' => 'PAYMENT_CORRECTION', 'amount_paisa' => -$amount,
                'reason' => $data['reason'], 'created_at' => now(), 'updated_at' => now()]);
            DB::table('service_invoices')->where('id', $invoiceId)->update(['paid_paisa' => $invoice->paid_paisa - $amount, 'updated_at' => now()]);
            AuditEvent::create(['actor_user_id' => $request->user()->id, 'action' => 'OFFLINE_PAYMENT_CORRECTED', 'entity_type' => 'service_invoice', 'entity_id' => $invoiceId]);
            return response()->json(['due_paisa' => $invoice->price_paisa - $invoice->discount_paisa - $invoice->paid_paisa + $amount]);
        });
    }

    public function upload(Request $request, string $orderId)
    {
        $data = $request->validate(['observations' => 'nullable|string|max:10000', 'file' => 'nullable|file|mimes:pdf,png,jpg,jpeg|max:10240']);
        abort_unless(($data['observations'] ?? null) || $request->hasFile('file'), 422);
        $order = DB::table('test_orders')->find($orderId);
        abort_unless($order && $order->performing_organization_id && in_array($order->status, ['ACCEPTED', 'IN_PROGRESS']), 422);
        $this->staff($request, $order->performing_organization_id, ['LAB_STAFF']);
        $path = $request->hasFile('file') ? $request->file('file')->store('private-reports', 'local') : null;
        $id = (string) Str::ulid();
        DB::table('lab_reports')->insert(['id' => $id, 'test_order_id' => $orderId, 'patient_record_id' => $order->patient_record_id,
            'organization_id' => $order->performing_organization_id, 'author_id' => $request->user()->id,
            'status' => 'DRAFT', 'observations' => $data['observations'] ?? null, 'file_path' => $path, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('test_orders')->where('id', $orderId)->update(['status' => 'IN_PROGRESS', 'updated_at' => now()]);
        return response()->json(['id' => $id, 'status' => 'DRAFT'], 201);
    }

    public function amendReport(Request $request, string $reportId)
    {
        $data = $request->validate(['reason' => 'required|string|max:2000', 'observations' => 'nullable|string|max:10000',
            'file' => 'nullable|file|mimes:pdf,png,jpg,jpeg|max:10240']);
        abort_unless(($data['observations'] ?? null) || $request->hasFile('file'), 422);
        $original = DB::table('lab_reports')->find($reportId);
        abort_unless($original && $original->status === 'RELEASED', 422);
        $this->staff($request, $original->organization_id, ['LAB_STAFF']);
        $path = $request->hasFile('file') ? $request->file('file')->store('private-reports', 'local') : null;
        $id = (string) Str::ulid();
        DB::table('lab_reports')->insert(['id' => $id, 'test_order_id' => $original->test_order_id,
            'patient_record_id' => $original->patient_record_id, 'organization_id' => $original->organization_id,
            'author_id' => $request->user()->id, 'supersedes_id' => $original->id, 'status' => 'DRAFT',
            'observations' => $data['observations'] ?? null, 'file_path' => $path, 'amendment_reason' => $data['reason'],
            'created_at' => now(), 'updated_at' => now()]);
        AuditEvent::create(['actor_user_id' => $request->user()->id, 'action' => 'LAB_REPORT_AMENDMENT_DRAFTED',
            'entity_type' => 'lab_report', 'entity_id' => $id]);
        return response()->json(['id' => $id, 'status' => 'DRAFT', 'supersedes_id' => $reportId], 201);
    }

    public function release(Request $request, string $reportId)
    {
        return DB::transaction(function () use ($request, $reportId) {
            $report = DB::table('lab_reports')->where('id', $reportId)->lockForUpdate()->first();
            abort_unless($report && $report->status === 'DRAFT', 422);
            $this->staff($request, $report->organization_id, ['REPORT_REVIEWER']);
            DB::table('lab_reports')->where('id', $reportId)->update(['status' => 'RELEASED', 'reviewer_id' => $request->user()->id, 'released_at' => now(), 'updated_at' => now()]);
            DB::table('test_orders')->where('id', $report->test_order_id)->update(['status' => 'COMPLETED', 'updated_at' => now()]);
            AuditEvent::create(['actor_user_id' => $request->user()->id, 'action' => 'LAB_REPORT_RELEASED', 'entity_type' => 'lab_report', 'entity_id' => $reportId]);
            $notify = app(\App\Services\CareNotificationService::class);
            foreach (DB::table('patient_links')->where('patient_record_id', $report->patient_record_id)->pluck('user_id') as $patientUser) {
                $notify->create($patientUser, 'REPORT_RELEASED', 'INFORMATION', 'NORMAL', 'LAB_REPORT', $reportId, '/patient-login#dashboard-reports', ['message' => 'A reviewed test report is available in your private records.']);
            }
            $orderingDoctor = DB::table('test_orders as t')->join('prescriptions as p', 'p.id', '=', 't.prescription_id')->where('t.id', $report->test_order_id)->value('p.doctor_id');
            if ($orderingDoctor) $notify->create($orderingDoctor, 'REPORT_RELEASED', 'INFORMATION', 'NORMAL', 'LAB_REPORT', $reportId, '/doctor-login#dashboard-reports', ['message' => 'A report for a test you ordered was released.']);
            return response()->json(['status' => 'RELEASED']);
        });
    }

    public function show(Request $request, string $reportId)
    {
        $report = DB::table('lab_reports')->find($reportId);
        abort_unless($report && $report->status === 'RELEASED', 404);
        $order = DB::table('test_orders')->find($report->test_order_id);
        $rx = DB::table('prescriptions')->find($order->prescription_id);
        $user = $request->user();
        $allowed = SharingController::owns($user->id, $report->patient_record_id)
            || ($rx->doctor_id === $user->id && $user->hasRole('DOCTOR')) // ordering clinician receives the result of their own order
            || SharingController::granted($user->id, $report->patient_record_id, 'REPORT', $reportId, 'VIEW')
            || DB::table('organization_memberships')->where('user_id', $user->id)->where('organization_id', $report->organization_id)
                ->where('is_active', true)->whereIn('role', ['LAB_STAFF', 'REPORT_REVIEWER', 'HOSPITAL_ADMIN'])->exists();
        abort_unless($allowed, 404);
        AuditEvent::create(['actor_user_id' => $user->id, 'action' => 'LAB_REPORT_VIEWED', 'entity_type' => 'lab_report', 'entity_id' => $reportId]);
        return response()->json(collect($report)->except('file_path')->all() + ['has_file' => (bool) $report->file_path]);
    }

    public function download(Request $request, string $reportId)
    {
        $response = $this->show($request, $reportId);
        $report = DB::table('lab_reports')->find($reportId);
        abort_unless($report->file_path && Storage::disk('local')->exists($report->file_path), 404);
        return Storage::disk('local')->download($report->file_path, 'report-'.$reportId.'.'.pathinfo($report->file_path, PATHINFO_EXTENSION));
    }
}
