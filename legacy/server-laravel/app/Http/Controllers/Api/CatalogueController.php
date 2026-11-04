<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Antibiotic;
use Illuminate\Http\Request;

class CatalogueController extends Controller
{
    public function version()
    {
        return response()->json([
            'version' => 'v1.0.0-laravel',
            'source' => 'MedMinders MySQL catalogue',
            'publishedAt' => now()->toISOString(),
        ]);
    }

    public function antibiotics(Request $request)
    {
        $items = Antibiotic::query()->orderBy('generic_name')->get();
        return response()->json(['version' => 'v1.0.0-laravel', 'totalGenerics' => $items->count(), 'items' => $items]);
    }

    public function search(Request $request)
    {
        $query = trim((string) $request->query('q', ''));
        if (mb_strlen($query) < 2) return response()->json(['items' => []]);
        $items = Antibiotic::query()->where('generic_name', 'like', "%{$query}%")->orderBy('generic_name')->limit(25)->get();
        return response()->json(['items' => $items]);
    }
}
