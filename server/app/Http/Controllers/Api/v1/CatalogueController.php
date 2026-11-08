<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Generic;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;

class CatalogueController extends Controller
{
    public function version() { return response()->json(['version' => '2025', 'source' => 'https://www.who.int/publications/i/item/B09489', 'review_status' => 'PARTIAL', 'review_date' => '2026-11-04', 'notice' => 'Only curator-reviewed mappings are classified; unmatched records remain UNKNOWN. AWaRe is descriptive stewardship metadata and never changes treatment.']); }

    public function index(Request $request)
    {
        $user = Auth::guard('sanctum')->user();
        $verifiedClinician = $user?->isVerifiedClinician() === true;
        $query = Generic::with('brands')->orderBy('name');
        if ($search = trim((string) $request->query('q', ''))) $query->where('name', 'like', "%{$search}%");
        $items = $query->get()->map(function (Generic $generic) use ($verifiedClinician) {
            $item = $generic->toArray();
            $item['generic_name'] = $generic->name;
            $item['brand_names'] = $generic->brands->pluck('brand_name')->values();
            $item['aware_group'] = $generic->aware_review_status === 'REVIEWED' ? $generic->aware_group : 'UNKNOWN';
            $item['aware_version'] = $generic->aware_version;
            $item['aware_source_url'] = $generic->aware_source_url;
            $item['aware_reviewed_on'] = optional($generic->aware_reviewed_on)->toDateString();
            $item['classification_review_status'] = $generic->aware_review_status ?? 'UNKNOWN';
            $item['reference_dosing_guidance'] = null;
            return $item;
        });
        $response = response()->json(['version' => '2025', 'source' => 'https://www.who.int/publications/i/item/B09489', 'items' => $items, 'disclaimer' => 'AWaRe classification is curator-reviewed metadata for stewardship monitoring. It is not an individual resistance score and never changes treatment.']);
        return $response->withHeaders(['Vary' => 'Authorization, Accept-Encoding', 'Cache-Control' => $verifiedClinician ? 'private, no-store' : 'public, max-age=300']);
    }

    public function search(Request $request)
    {
        return $this->index($request);
    }
}
