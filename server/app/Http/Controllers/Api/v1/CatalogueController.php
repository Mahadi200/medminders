<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Generic;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;

class CatalogueController extends Controller
{
    public function version() { return response()->json(['version' => 'v1.0.0', 'source' => 'WHO AWaRe / DGDA']); }

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
            if (! $verifiedClinician) $item['reference_dosing_guidance'] = null;
            return $item;
        });
        $response = response()->json(['version' => 'v1.0.0', 'items' => $items, 'disclaimer' => 'Reference information only. Patient dosing requires a qualified prescriber.']);
        return $response->withHeaders(['Vary' => 'Authorization, Accept-Encoding', 'Cache-Control' => $verifiedClinician ? 'private, no-store' : 'public, max-age=300']);
    }

    public function search(Request $request)
    {
        return $this->index($request);
    }
}
