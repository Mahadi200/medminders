<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PatientLedgerController extends Controller
{
    public function dispensings(Request $request)
    {
        abort_unless($request->user()->hasRole('PATIENT'), 403);
        $ids = DB::table('patient_links')->where('user_id', $request->user()->id)->pluck('patient_record_id');
        return DB::table('dispensings as d')->join('prescription_items as i', 'i.id', '=', 'd.prescription_item_id')
            ->join('prescriptions as p', 'p.id', '=', 'i.prescription_id')->whereIn('p.patient_record_id', $ids)
            ->select('d.id', 'd.prescription_item_id', 'd.organization_id', 'd.quantity', 'd.product', 'd.supplied_at',
                'd.supply_problem', 'd.counselling', 'i.generic_name', 'p.patient_record_id')->orderByDesc('d.supplied_at')->limit(100)->get();
    }

    public function invoices(Request $request)
    {
        abort_unless($request->user()->hasRole('PATIENT'), 403);
        $ids = DB::table('patient_links')->where('user_id', $request->user()->id)->pluck('patient_record_id');
        return DB::table('service_invoices as v')->join('test_orders as o', 'o.id', '=', 'v.test_order_id')
            ->whereIn('v.patient_record_id', $ids)->select('v.id', 'v.test_order_id', 'v.organization_id',
                'v.price_paisa', 'v.discount_paisa', 'v.paid_paisa', 'o.test_name', 'v.created_at')
            ->selectSub(function ($q) {
                $q->from('invoice_transactions')->select('receipt_number')->whereColumn('service_invoice_id', 'v.id')
                    ->whereNotNull('receipt_number')->orderByDesc('created_at')->limit(1);
            }, 'last_receipt_number')
            ->orderByDesc('v.created_at')->limit(100)->get();
    }
}
