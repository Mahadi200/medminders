<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Additive data: the 20 assistant conditions → specialty mapping plus red-flag patterns. Editable later by clinicians.
// insertOrIgnore by key, so re-running never overwrites curated edits.
return new class extends Migration {
    public function up(): void
    {
        $rows = [
            ['fever', 'Fever / viral fever', 'জ্বর / ভাইরাল জ্বর', ['fever', 'viral fever', 'temperature', 'jor', 'jwor', 'জ্বর', 'ভাইরাল'], ['Medicine']],
            ['dengue', 'Dengue', 'ডেঙ্গু', ['dengue', 'dengu', 'ডেঙ্গু', 'ডেঙ্গি'], ['Medicine']],
            ['typhoid', 'Typhoid', 'টাইফয়েড', ['typhoid', 'taifoyed', 'টাইফয়েড'], ['Medicine']],
            ['cold_cough', 'Cold, cough, sore throat', 'সর্দি, কাশি, গলা ব্যথা', ['cold', 'cough', 'sore throat', 'throat pain', 'kashi', 'sordi', 'কাশি', 'সর্দি', 'গলা ব্যথা'], ['ENT', 'Medicine']],
            ['pneumonia', 'Pneumonia', 'নিউমোনিয়া', ['pneumonia', 'neumonia', 'নিউমোনিয়া'], ['Respiratory']],
            ['asthma_copd', 'Asthma / COPD', 'হাঁপানি / সিওপিডি', ['asthma', 'copd', 'wheeze', 'hapani', 'হাঁপানি', 'শ্বাসকষ্টের রোগ'], ['Respiratory']],
            ['tuberculosis', 'Tuberculosis', 'যক্ষ্মা', ['tuberculosis', 'tb', 'jokkha', 'যক্ষ্মা', 'যক্ষা'], ['Respiratory']],
            ['uti', 'Urinary tract infection', 'প্রস্রাবের সংক্রমণ', ['uti', 'urine infection', 'urinary', 'burning urine', 'prosrab', 'প্রস্রাবে জ্বালা', 'প্রস্রাব'], ['Medicine'], 'Pregnant? See Gynaecology & Obstetrics.', 'গর্ভবতী হলে গাইনি বিশেষজ্ঞ দেখান।'],
            ['diarrhoea', 'Diarrhoea / gastroenteritis', 'ডায়রিয়া / পেটের সংক্রমণ', ['diarrhoea', 'diarrhea', 'loose motion', 'gastroenteritis', 'patla paikhana', 'ডায়রিয়া', 'পাতলা পায়খানা'], ['Gastroenterology', 'Medicine']],
            ['gastric', 'Gastric ulcer / acidity', 'গ্যাস্ট্রিক আলসার / অ্যাসিডিটি', ['gastric', 'acidity', 'ulcer', 'heartburn', 'gas', 'গ্যাস্ট্রিক', 'অ্যাসিডিটি', 'বুক জ্বালা'], ['Gastroenterology']],
            ['jaundice', 'Jaundice / hepatitis', 'জন্ডিস / হেপাটাইটিস', ['jaundice', 'hepatitis', 'liver', 'jondis', 'জন্ডিস', 'হেপাটাইটিস'], ['Gastroenterology']],
            ['diabetes', 'Diabetes', 'ডায়াবেটিস', ['diabetes', 'sugar', 'blood sugar', 'dayabetis', 'ডায়াবেটিস', 'সুগার'], ['Endocrinology']],
            ['hypertension', 'High blood pressure', 'উচ্চ রক্তচাপ', ['blood pressure', 'hypertension', 'high bp', 'bp', 'pressure', 'উচ্চ রক্তচাপ', 'প্রেসার'], ['Cardiology', 'Medicine']],
            ['heart', 'Chest pain / heart problems', 'বুকে ব্যথা / হৃদরোগ', ['heart', 'chest pain', 'palpitation', 'বুকে ব্যথা', 'হৃদরোগ', 'হার্ট'], ['Cardiology']],
            ['skin', 'Skin infection, fungal infection, allergy', 'চর্মরোগ, ছত্রাক, অ্যালার্জি', ['skin', 'rash', 'fungal', 'itch', 'allergy', 'eczema', 'chulkani', 'চুলকানি', 'চর্ম', 'অ্যালার্জি', 'দাদ'], ['Dermatology']],
            ['ear', 'Ear infection', 'কানের সংক্রমণ', ['ear', 'ear pain', 'ear infection', 'kan', 'কান', 'কানে ব্যথা'], ['ENT']],
            ['eye', 'Eye infection / conjunctivitis', 'চোখের সংক্রমণ / কনজাংটিভাইটিস', ['eye', 'conjunctivitis', 'red eye', 'chokh', 'চোখ', 'চোখ ওঠা'], ['Ophthalmology']],
            ['child', 'Child fever / infection', 'শিশুর জ্বর / সংক্রমণ', ['child', 'baby', 'kid', 'infant', 'shishu', 'বাচ্চা', 'শিশু'], ['Paediatrics']],
            ['pregnancy', 'Pregnancy care / gynae problems', 'গর্ভাবস্থা / স্ত্রীরোগ', ['pregnant', 'pregnancy', 'period', 'menstrual', 'gynae', 'গর্ভবতী', 'মাসিক', 'গাইনি'], ['Gynaecology']],
            ['joint', 'Joint pain / arthritis', 'জয়েন্টে ব্যথা / বাত', ['joint', 'arthritis', 'knee', 'back pain', 'bat', 'বাত', 'হাঁটু', 'জয়েন্ট'], ['Orthopaedics']],
        ];
        $flags = [
            ['rf_chest', 'Chest pain', 'বুকে ব্যথা', ['chest pain', 'বুকে ব্যথা', 'বুকে চাপ', 'crushing chest']],
            ['rf_breathing', 'Breathing difficulty', 'শ্বাসকষ্ট', ['breathing difficulty', 'cannot breathe', "can't breathe", 'shortness of breath', 'শ্বাসকষ্ট', 'শ্বাস নিতে কষ্ট']],
            ['rf_faint', 'Fainting / unconscious', 'অজ্ঞান', ['faint', 'fainted', 'unconscious', 'অজ্ঞান', 'জ্ঞান হারানো']],
            ['rf_bleeding', 'Severe bleeding', 'গুরুতর রক্তপাত', ['severe bleeding', 'heavy bleeding', 'vomiting blood', 'রক্তপাত', 'রক্তবমি']],
            ['rf_confusion', 'Confusion', 'বিভ্রান্তি', ['confusion', 'confused', 'not responding', 'বিভ্রান্ত', 'অসংলগ্ন']],
            ['rf_infant_fever', 'Very high fever in an infant', 'শিশুর খুব বেশি জ্বর', ['infant high fever', 'baby high fever', 'newborn fever', 'নবজাতকের জ্বর', 'শিশুর খুব জ্বর']],
            ['rf_dengue', 'Dengue warning signs', 'ডেঙ্গুর বিপদচিহ্ন', ['severe abdominal pain', 'persistent vomiting', 'bleeding gums', 'blood in vomit', 'restless', 'পেটে তীব্র ব্যথা', 'দাঁতের মাড়ি থেকে রক্ত', 'বারবার বমি']],
        ];
        foreach ($rows as $r) DB::table('condition_specialties')->insertOrIgnore(['key' => $r[0], 'name_en' => $r[1], 'name_bn' => $r[2], 'synonyms' => json_encode($r[3], JSON_UNESCAPED_UNICODE),
            'specialties' => json_encode($r[4]), 'note_en' => $r[5] ?? null, 'note_bn' => $r[6] ?? null, 'red_flag' => false, 'created_at' => now(), 'updated_at' => now()]);
        foreach ($flags as $r) DB::table('condition_specialties')->insertOrIgnore(['key' => $r[0], 'name_en' => $r[1], 'name_bn' => $r[2], 'synonyms' => json_encode($r[3], JSON_UNESCAPED_UNICODE),
            'specialties' => json_encode([]), 'red_flag' => true, 'created_at' => now(), 'updated_at' => now()]);
    }

    public function down(): void
    {
        // Data migration: leave curated rows in place.
    }
};
