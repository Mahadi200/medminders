<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * MedMinders Assistant — helps people find the right specialist and nearby hospital.
 * Deterministic: condition/synonym table + real catalogue/schedule data. It never diagnoses or names medicines/doses.
 * No LLM is configured; nothing personal is logged.
 */
class AssistantController extends Controller
{
    public const DISCLAIMER_EN = 'This assistant helps you find the right doctor; it does not give medical advice.';
    public const DISCLAIMER_BN = 'এই সহকারী সঠিক চিকিৎসক খুঁজে পেতে সাহায্য করে; এটি চিকিৎসা পরামর্শ দেয় না।';
    public const AREAS = ['Sonadanga' => [22.8166, 89.5403], 'Boyra' => [22.8235, 89.5389], 'KDA Avenue' => [22.8141, 89.5634], 'Khalishpur' => [22.8456, 89.5328],
        'Daulatpur' => [22.8778, 89.5167], 'Khulna Sadar' => [22.8098, 89.5644], 'Gollamari' => [22.8000, 89.5400], 'Nirala' => [22.8070, 89.5520]];

    public function conditions()
    {
        return DB::table('condition_specialties')->where('red_flag', false)->orderBy('id')->get(['key', 'name_en', 'name_bn']);
    }

    public static function normalize(string $t): string
    {
        return ' '.preg_replace('/\s+/u', ' ', mb_strtolower(trim(preg_replace('/[^\p{L}\p{M}\p{N}\s\']/u', ' ', $t)))).' ';
    }

    /** @return array{red_flags: array, condition: ?object} */
    public static function match(string $text, ?string $key = null): array
    {
        $norm = self::normalize($text);
        $rows = DB::table('condition_specialties')->get();
        $contains = fn (string $syn) => mb_strlen($syn) <= 3 ? str_contains($norm, ' '.$syn.' ') : str_contains($norm, mb_strtolower($syn));
        $flags = $rows->where('red_flag', true)->filter(fn ($r) => collect(json_decode($r->synonyms, true))->contains($contains))->values();
        if ($key) $condition = $rows->firstWhere('key', $key);
        else {
            // Most specific match wins: longest matching synonym.
            $best = null; $bestLen = 0;
            foreach ($rows->where('red_flag', false) as $r) foreach (json_decode($r->synonyms, true) as $syn) if ($contains($syn) && mb_strlen($syn) > $bestLen) { $best = $r; $bestLen = mb_strlen($syn); }
            $condition = $best;
        }
        return ['red_flags' => $flags->map(fn ($f) => ['key' => $f->key, 'en' => $f->name_en, 'bn' => $f->name_bn])->all(), 'condition' => $condition];
    }

    public static function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $r = 6371; $dLat = deg2rad($lat2 - $lat1); $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return round($r * 2 * atan2(sqrt($a), sqrt(1 - $a)), 1);
    }

    public function ask(Request $request, CareJourneyController $journey)
    {
        $data = $request->validate(['message' => 'nullable|string|max:300', 'condition_key' => 'nullable|string|max:40', 'pregnant' => 'nullable|boolean',
            'lat' => 'nullable|numeric|between:-90,90', 'lng' => 'nullable|numeric|between:-180,180', 'area' => 'nullable|string|max:60']);
        abort_unless(($data['message'] ?? null) || ($data['condition_key'] ?? null), 422, 'Tell me the problem or pick a condition.');
        $m = self::match($data['message'] ?? '', $data['condition_key'] ?? null);
        $out = ['disclaimer' => ['en' => self::DISCLAIMER_EN, 'bn' => self::DISCLAIMER_BN], 'red_flags' => $m['red_flags']];
        if ($m['red_flags']) {
            $out['urgent'] = ['en' => 'This may be an emergency. Call 999 or go to the nearest emergency department now. Do not wait for an appointment.',
                'bn' => 'এটি জরুরি অবস্থা হতে পারে। এখনই ৯৯৯-এ কল করুন অথবা নিকটস্থ জরুরি বিভাগে যান। অ্যাপয়েন্টমেন্টের জন্য অপেক্ষা করবেন না।'];
        }
        $c = $m['condition'];
        if (! $c) {
            $out['condition'] = null;
            $out['message'] = ['en' => 'I could not match that to one of the conditions I know. Pick one below, or see a Medicine doctor.', 'bn' => 'বিষয়টি মেলাতে পারিনি। নিচ থেকে একটি বেছে নিন অথবা মেডিসিন বিশেষজ্ঞ দেখান।'];
            $out['quick_replies'] = $this->conditions();
            return response()->json($out);
        }
        $specialties = json_decode($c->specialties, true);
        if ($c->key === 'uti' && ! empty($data['pregnant'])) array_unshift($specialties, 'Gynaecology');
        $catalogue = collect($journey->catalogue(new Request())->getData(true)['doctors']);
        $doctors = collect(); $used = null;
        foreach ($specialties as $spec) {
            $doctors = $catalogue->filter(fn ($d) => str_starts_with(mb_strtolower((string) $d['specialty']), mb_strtolower($spec)))->values();
            if ($doctors->isNotEmpty()) { $used = $spec; break; }
        }
        $fallback = false;
        if ($doctors->isEmpty()) { $fallback = true; $used = 'Medicine'; $doctors = $catalogue->filter(fn ($d) => str_starts_with(mb_strtolower((string) $d['specialty']), 'medicine'))->values(); }
        // Origin for distance: browser location, else chosen area centroid.
        $origin = isset($data['lat'], $data['lng']) ? [(float) $data['lat'], (float) $data['lng']] : (self::AREAS[$data['area'] ?? ''] ?? null);
        $hospitals = collect();
        foreach ($doctors as $d) foreach ($d['affiliations'] as $a) {
            if (! $a['latitude']) continue;
            $hospitals[$a['organization_id']] = ['id' => $a['organization_id'], 'name' => $a['organization_name'], 'area' => $a['area'], 'is_sample' => $a['organization_is_sample'],
                'distance_km' => $origin ? self::haversineKm($origin[0], $origin[1], (float) $a['latitude'], (float) $a['longitude']) : null,
                'directions_url' => 'https://www.google.com/maps/dir/?api=1&destination='.$a['latitude'].','.$a['longitude']];
        }
        $hospitals = $hospitals->values()->sortBy(fn ($h) => $h['distance_km'] ?? 9999)->values();
        $out += ['condition' => ['key' => $c->key, 'en' => $c->name_en, 'bn' => $c->name_bn, 'note_en' => $c->note_en, 'note_bn' => $c->note_bn],
            'specialty' => $used, 'primary_specialty' => $specialties[0], 'fallback' => $fallback,
            'doctors' => $doctors->take(6)->map(fn ($d) => ['id' => $d['id'], 'user_id' => $d['user_id'], 'name' => $d['name'], 'specialty' => $d['specialty'], 'qualifications' => $d['qualifications'],
                'fee_bdt' => $d['fee_bdt'], 'is_sample' => $d['is_sample'], 'has_photo' => (bool) $d['has_photo'], 'next_available' => $d['next_available'],
                'affiliations' => collect($d['affiliations'])->map(fn ($a) => ['id' => $a['id'], 'organization_name' => $a['organization_name'], 'area' => $a['area']])->all()])->all(),
            'nearest_hospital' => $hospitals->first(), 'hospitals' => $hospitals->take(4)->all(), 'areas' => array_keys(self::AREAS)];
        if ($fallback) $out['message'] = ['en' => "No {$specialties[0]} specialist is on MedMinders yet. A Medicine doctor can assess you and refer you.", 'bn' => 'এই বিষয়ের বিশেষজ্ঞ এখনো MedMinders-এ নেই। একজন মেডিসিন বিশেষজ্ঞ আপনাকে দেখে প্রয়োজনে রেফার করবেন।'];
        return response()->json($out);
    }
}
