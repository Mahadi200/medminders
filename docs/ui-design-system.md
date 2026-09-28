# MedMinders Ocean Breeze UI Design System & Clinical Standards

**Version:** 1.0.0  
**Effective Date:** September 2026  
**Audience:** Frontend Developers, Mobile Engineers, UI/UX Designers, Clinical Auditors  
**Compliance Target:** WCAG 2.1 AA / AAA Accessible, Bilingual (Bangla/English), DGDA/MOHFW Credibility

---

## 1. System Philosophy & Aesthetic Identity

MedMinders is a nationwide clinical antimicrobial resistance (AMR) stewardship and electronic prescription verification platform designed for Bangladesh. The user interface must project **calm clinical credibility, uncompromising data legibility, and high-stakes clarity** across diverse environments: from rural tertiary clinics on 3G connections to central government oversight dashboards.

### Core Principles
1. **Credible, Not Playful**: Elimination of non-essential 3D canvas animations, spinning particles, cluttered floating badges, and faux-decorative cards.
2. **Multi-Sensory Status Communication**: Color alone must **never** convey state. Every status is delivered with a triad: **Semantic Color + Distinct Icon + Explicit Text Badge**.
3. **Bangla-First Legibility**: High font-weight contrast and generous line-heights specifically calibrated for the complex conjuncts and diacritics of Bengali script.
4. **Clinical Draft Protection**: Scanned and extracted prescriptions are visually and textually quarantined as `DRAFT_UNREVIEWED` until authenticated human clinical sign-off is completed.

---

## 2. Ocean Breeze Color Palette

The Ocean Breeze palette blends deep oceanic navies with soothing seafoam teals and crisp coastal mist surfaces, providing soothing low-fatigue contrast for clinicians and patients.

### 2.1 Core Palette Tokens

| Token Name | Hex Code | Tailwind Equivalent | Purpose / Usage | WCAG Contrast Ratio (on #FFFFFF) |
| :--- | :--- | :--- | :--- | :--- |
| `ocean-deep` | `#0A2342` | `slate-900` / custom | Primary headers, app bars, brand authority | **14.2:1** (AAA) |
| `ocean-dark` | `#0F3A66` | `blue-900` / custom | Secondary headers, active navigation pills | **10.1:1** (AAA) |
| `ocean-primary`| `#028090` | `teal-700` / custom | Primary buttons, verified badges, key links | **4.9:1** (AA Large/Normal) |
| `ocean-vibrant`| `#00A896` | `teal-600` / custom | Accent highlights, active tab indicators | **3.8:1** (UI Components) |
| `ocean-light`  | `#E0F2F1` | `teal-50` / custom | Selected table rows, subtle pill backgrounds| Background surface |
| `ocean-mist`   | `#F4F8FA` | `slate-50` / custom | Application canvas, page background | Background surface |
| `ocean-border` | `#D1E3EB` | `slate-200` / custom| Subtle borders, divider rules | Component boundary |
| `ocean-slate`  | `#334E68` | `slate-600` / custom| Body text, clinical descriptions | **7.4:1** (AAA) |
| `ocean-heading`| `#102A43` | `slate-900` / custom| Section titles, patient names | **12.8:1** (AAA) |

### 2.2 Clinical Semantic State Tokens

| Clinical State | Text Color | Background | Border Color | Icon | Bilingual Text Badge |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **WHO ACCESS** | `#065F46` | `#ECFDF5` | `#A7F3D0` | 🛡️ | `WHO ACCESS (প্রথম সারি)` |
| **WHO WATCH**  | `#92400E` | `#FFFBEB` | `#FDE68A` | ⚠️ | `WHO WATCH (সতর্কতা)` |
| **WHO RESERVE**| `#991B1B` | `#FEF2F2` | `#FECACA` | 🛑 | `WHO RESERVE (সংরক্ষিত)` |
| **DRAFT_UNREVIEWED** | `#334155` | `#F1F5F9` | `#CBD5E1` | 📝 | `খসড়া (Unreviewed Draft)` |
| **SIGNED** | `#0F766E` | `#F0FDFA` | `#99F6E4` | ✅ | `স্বাক্ষরিত (Doctor Signed)` |
| **URGENT_ALERT** | `#991B1B` | `#FEF2F2` | `#EF4444` | 🚨 | `জরুরি রেড-ফ্ল্যাগ অ্যালার্ট` |
| **OFFLINE_OUTDATED** | `#92400E` | `#FFFBEB` | `#FCD34D` | ⚠️ | `অফলাইন রেফারেন্স (পুরোনো তথ্য)` |
| **ACCESS_DENIED** | `#374151` | `#F9FAFB` | `#D1D5DB` | 🔒 | `প্রবেশাধিকার সংরক্ষিত (403)` |

---

## 3. Bilingual Typography System

Bengali typography requires 20–30% higher line-height (`line-height: 1.6 - 1.7`) than Latin text to accommodate upper and lower vowel markers (*matras* and *kars*).

### 3.1 Font Stacks
- **English**: `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Bangla**: `'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', 'Hind Siliguri', sans-serif`

### 3.2 Typographic Hierarchy

| Level | Size (Desktop) | Size (Mobile) | Line Height | Weight | Tailwind Classes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display Header** | 28px (`1.75rem`) | 24px (`1.5rem`) | 36px | 800 (Bold) | `text-2xl sm:text-3xl font-extrabold text-[#0A2342]` |
| **Section Title**  | 20px (`1.25rem`) | 18px (`1.125rem`) | 28px | 700 (Bold) | `text-lg sm:text-xl font-bold text-[#102A43]` |
| **Card Header**    | 16px (`1.0rem`)  | 16px (`1.0rem`)   | 24px | 600 (Semibold) | `text-base font-semibold text-[#102A43]` |
| **Body Text**      | 14px (`0.875rem`)| 14px (`0.875rem`) | 22px | 400 (Regular) | `text-sm text-[#334E68] leading-relaxed` |
| **Caption / Meta** | 12px (`0.75rem`) | 11px (`0.6875rem`)| 18px | 500 (Medium) | `text-xs text-[#627D98] leading-normal` |

---

## 4. Spacing, Touch Targets & Grid

- **Base Spacing Unit**: 4px. Standard increments: `4px` (`p-1`), `8px` (`p-2`), `12px` (`p-3`), `16px` (`p-4`), `24px` (`p-6`), `32px` (`p-8`).
- **Touch Targets**:
  - Web clickable elements: Minimum **44px × 44px**.
  - Mobile interactive buttons: Minimum **48px × 48px** with at least **8px** padding separation.
- **Card Padding**:
  - Compact (Mobile list items): `12px`.
  - Standard (Clinical records, prescription items): `16px`.
  - Featured (Emergency alert, landing hero): `24px`.

---

## 5. Component Patterns & Visual Previews

### 5.1 Prescription Scan Status: `DRAFT_UNREVIEWED`
```html
<div class="rounded-xl border border-slate-300 bg-slate-50 p-4 shadow-sm">
  <div class="flex items-center justify-between mb-2">
    <div class="flex items-center gap-2">
      <span class="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-800">
        📝 খসড়া (DRAFT_UNREVIEWED)
      </span>
      <span class="text-xs text-slate-600 font-medium">স্বয়ংক্রিয় ওসিআর এক্সট্রাকশন</span>
    </div>
    <span class="text-xs font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
      স্বাক্ষরহীন (Unsigned)
    </span>
  </div>
  <p class="text-xs text-slate-700 bg-white p-2.5 rounded border border-slate-200 mb-2">
    ⚠️ <strong>ক্লিনিকাল সতর্কতা:</strong> এটি একটি স্বয়ংক্রিয় ওসিআর খসড়া। নিবন্ধিত চিকিৎসকের পর্যালোচনা ও স্বাক্ষর ব্যতীত এটি কোনো সক্রিয় প্রেসক্রিপশন বা ওষুধ সেবনের চূড়ান্ত নির্দেশিকা নয়।
  </p>
</div>
```

### 5.2 Confirmed & Signed Record: `SIGNED`
```html
<div class="rounded-xl border border-teal-200 bg-teal-50/40 p-4 shadow-sm">
  <div class="flex items-center justify-between mb-2">
    <span class="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-800">
      ✅ অনুমোদিত ও স্বাক্ষরিত (SIGNED)
    </span>
    <span class="text-xs text-teal-700">ডিজিটাল ভেরিফাইড প্রেসক্রিপশন</span>
  </div>
  <p class="text-xs text-slate-700">
    চিকিৎসক: <strong>ডাঃ ফাহিম আহমেদ (BMDC Reg: A-54912)</strong> | তারিখ: <strong>২৭ সেপ্টেম্বর ২০২৬</strong>
  </p>
</div>
```

### 5.3 Offline / Outdated Reference: `OFFLINE_OUTDATED`
```html
<div class="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs flex items-center justify-between text-amber-900">
  <span class="font-semibold flex items-center gap-1.5">
    ⚠️ অফলাইন রেফারেন্স (পুরোনো তথ্য - v2024.11 স্ন্যাপশট)
  </span>
  <span class="text-[11px] text-amber-800">লাইভ সার্ভার সংযোগ বিচ্ছিন্ন</span>
</div>
```

### 5.4 Urgent Red-Flag Emergency Banner: `URGENT_ALERT`
```html
<div class="rounded-xl border-2 border-red-500 bg-red-50 p-4 text-red-900 shadow-md">
  <div class="flex items-center gap-2 mb-1">
    <span class="text-lg">🚨</span>
    <h3 class="font-extrabold text-sm text-red-950">জরুরি চিকিৎসা সতর্কতা (Urgent Care Escalation)</h3>
  </div>
  <p class="text-xs text-red-900 leading-relaxed mb-3">
    শ্বাসকষ্ট, গলা বা মুখ ফুলে যাওয়া, অথবা তীব্র চর্মরোগ দেখা দিলে অবিলম্বে নিকটস্থ হাসপাতালের জরুরি বিভাগে যোগাযোগ করুন অথবা ৯৯৯ এ কল করুন।
  </p>
  <a href="tel:999" class="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition">
    📞 জাতীয় জরুরি সেবা: ৯৯৯
  </a>
</div>
```

### 5.5 Access Denied: `ACCESS_DENIED`
```html
<div class="rounded-xl border border-gray-300 bg-gray-50 p-6 text-center shadow-sm">
  <span class="text-3xl mb-2 inline-block">🔒</span>
  <h4 class="font-bold text-sm text-gray-800">প্রবেশাধিকার সংরক্ষিত (403 Forbidden)</h4>
  <p class="text-xs text-gray-600 max-w-sm mx-auto mt-1 mb-3">
    আপনার বর্তমান অ্যাকাউন্টের এই রোগীর মেডিকেল রেকর্ড দেখার অনুমতি নেই। সক্রিয় কনসেন্ট অনুদান বা তত্ত্বাবধায়ক অনুমোদন প্রয়োজন।
  </p>
</div>
```

---

## 6. Accessibility & Public-Sector Credibility Rules

1. **Zero Text in Color Alone**: Always accompany color shifts with a textual status chip (`खসড়া`, `অনুমোদিত`, `জরুরি`) and an accessible icon.
2. **Keyboard Navigation**: Form inputs, action buttons, and modal dialogs must provide a visible `2px` focus ring using `ocean-primary` (`#028090`).
3. **Screen Readers**:
   - Status chips use `aria-label="Status: [State]"`.
   - Modals trap focus and specify `role="dialog" aria-modal="true"`.
   - Prescription file previews specify `alt="Prescription document for [Patient Name]"`.
4. **Performance & Device Tiering**:
   - Heavy 3D libraries (`@react-three/fiber`, `@react-three/drei`, `three`) and particle engines (`tsparticles`) are excluded from clinical dashboards to prevent frame drops on lower-spec mobile devices and hospital desktop monitors.
