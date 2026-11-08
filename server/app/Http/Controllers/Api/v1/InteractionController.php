<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Services\DrugInteractionProvider;
use Illuminate\Http\Request;
use RuntimeException;

class InteractionController extends Controller
{
    public function check(Request $request, DrugInteractionProvider $provider)
    {
        $data = $request->validate(['ingredients' => 'required|array|min:1|max:50', 'ingredients.*' => 'required|string|max:191', 'history' => 'nullable|array|max:100', 'history.*' => 'string|max:191']);
        try {
            return response()->json($provider->check($data['ingredients'], $data['history'] ?? []));
        } catch (RuntimeException $exception) {
            return response()->json(['status' => 'PROVIDER_UNAVAILABLE', 'message' => 'Interaction checking is unavailable because no licensed source is configured. Do not treat this as evidence that medicines are safe.', 'source' => null], 503);
        }
    }
}
