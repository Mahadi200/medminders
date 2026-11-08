<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function antibioticUse(Request $request)
    {
        $organizationId = $request->validate(['organization_id' => 'required|ulid'])['organization_id'];
        abort_unless(DB::table('organization_memberships')->where('user_id', $request->user()->id)
            ->where('organization_id', $organizationId)->where('is_active', true)
            ->whereIn('role', ['HOSPITAL_ADMIN', 'REPORT_REVIEWER', 'DOCTOR', 'ANALYST'])->exists(), 403);

        $sharedPatientIds = DB::table('sharing_grants')->where('organization_id', $organizationId)
            ->whereIn('action', ['VIEW', 'DISPENSE'])->whereNull('revoked_at')->where('expires_at', '>', now())
            ->distinct()->pluck('patient_record_id');
        $items = DB::table('prescription_items as i')->join('prescriptions as p', 'p.id', '=', 'i.prescription_id')
            ->whereIn('p.patient_record_id', $sharedPatientIds)->where('i.is_antibiotic', true)
            ->whereNull('p.superseded_at')->whereNull('p.cancelled_at')
            ->select('i.aware_group', 'i.generic_name', 'i.id')->get();

        $known = $items->filter(fn ($item) => in_array($item->aware_group, ['ACCESS', 'WATCH', 'RESERVE'], true));
        $unknown = $items->count() - $known->count();
        $dispensed = DB::table('dispensings as d')->whereIn('d.prescription_item_id', $items->pluck('id'))->sum('quantity');
        return response()->json([
            'organization_id' => $organizationId,
            'denominators' => [
                'antibiotic_prescription_items' => $items->count(),
                'classified_items' => $known->count(),
                'unknown_or_missing_classification' => $unknown,
                'dispensed_units' => (int) $dispensed,
            ],
            'by_aware_group' => $known->groupBy('aware_group')->map->count()->sortKeys(),
            'unknown_entries' => $items->filter(fn ($item) => ! in_array($item->aware_group, ['ACCESS', 'WATCH', 'RESERVE'], true))
                ->groupBy('generic_name')->map->count()->sortKeys(),
            'interpretation' => 'Counts describe authorized records and dispensing events only. They are not resistance rates, adherence proof, or evidence of reduced AMR.',
        ]);
    }
}
