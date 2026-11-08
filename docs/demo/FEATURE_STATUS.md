# MedMinders — working features vs roadmap (8 Nov 2026)

Verified by `artisan test` (17 tests, 170 assertions), the Vite production build, and a real-browser walkthrough (Chrome via Playwright) of the full cross-role workflow. Attachments reviewed: Project details_ZRF.docx, both infographics (WhatsApp images), existing status docs. **Not reviewed in this pass:** `Project Summary_MedMinders.pdf` and `Team MedMinders (UIHP Seed) final.pptx/.pdf` (located but not opened; the earlier deck mapping in `docs/implementation-matrix.md` was relied on).

## Gap matrix (review findings → action taken)

| Feature | Found in code | Verification | Fix made | Priority |
|---|---|---|---|---|
| Role routing / session | Route-derived forms worked; a refresh or navigation during `/auth/me` **logged users out**; any role could sit on another role's URL | Browser repro | Session cleared only on HTTP 401; "Restoring session" state; URL normalised to the signed-in role's portal | P0 ✅ |
| Authenticator blocker | `MEDMINDERS_DEMO_DISABLE_MFA` also applied in production | Code review | Ignored when `APP_ENV=production` | P0 ✅ |
| API rate limit | 60/min keyed by IP because the limiter ran before Sanctum resolved the user → all demo users shared one bucket; dashboards failed silently | Browser + log | Limiter uses the `sanctum` guard; 240/min per user (env `API_RATE_LIMIT_PER_USER`); anonymous 60/min/IP; login/OTP throttles unchanged | P0 ✅ |
| Alarms | Client polled notifications that only existed if scheduler ran *and* patient opted in; Test alarm only beeped | Code review | `/alarms/due` (works without scheduler, idempotent notification), banner + modal, Taken/Taken late/Skipped/Not sure, snooze 5/10/15 (max 3), acknowledge, sound after user gesture, optional browser notification, labelled current-user Test alarm | P0 ✅ |
| Antibiotic tracking | Raw counts; "days logged"; supply = dispensed − taken unlabeled | Code review | Server `summary`: prescribed days, days elapsed, due-so-far denominator, taken/late/skipped/not-sure/unconfirmed, remaining, dispensed vs authorized, labelled estimate, shortfall only for active course | P0 ✅ |
| Doctor ↔ hospital | Free-text `hospital_clinic` only; patients typed doctor/org IDs | Code review | `doctor_affiliations` (org ID), hospital confirmation, slot generation, public catalogue shows confirmed affiliations | P0 ✅ |
| Booking | Patient booking required doctor-created record (impossible for self-registered patients); doctor saw pending requests | Test | Slot-validated requests → hospital desk → confirmed visible to doctor; duplicate/overlap/30-min patient clash checks; hospital-proposed time needs patient acceptance; optional, expiring consultation consent | P0 ✅ |
| Pharmacy / hospital access | Only staff-initiated requests by raw IDs | Code review | Patient-initiated, expiring, revocable shares to approved orgs; `/shared-with-me` queues for pharmacy and hospital | P1 ✅ |
| Notifications | Producers only for messages/problems | Code review | Added: prescription issued, sharing request/decision, appointment events, affiliation events, dispensing, support alerts, problem review, report release; mark-all-read | P1 ✅ |
| Medication problems | Doctor list only, no review | Code review | Review/resolve with response note; patient sees response | P1 ✅ |
| Reports | Ordering doctor needed an extra grant | Test | Ordering clinician sees released results of own order; pharmacy still denied | P1 ✅ |
| Antibiotic before allergy review | Backend blocked correctly; UI gave no way forward | Browser | Consented doctor can record allergy review (allergy fields only) | P1 ✅ |

## Working (demonstrable today)

- Patient password registration/login without SMS; phone/email shown as unverified; phone knowledge alone never links records.
- Doctor registration with BMDC format check (manual review, pending until reviewed), profile, photo, hospital affiliations with visiting days/times/slots/fee.
- Public doctor catalogue from real DB rows (verified + published only).
- Booking → hospital confirm/decline/propose → doctor sees confirmed appointments → patient status.
- Structured prescriptions (medicines, schedule, duration, quantity, tests, advice, follow-up); issued/amended/cancelled with history; patient sees issued prescriptions immediately.
- Patient-controlled sharing with pharmacy/hospital (7-day, revocable); staff request/approve flow.
- Pharmacy partial/full dispensing with oversupply protection and idempotency; never edits the prescription.
- First-dose confirmation, dose schedule, in-app alarms, dose logging with audited corrections, adherence summary with denominators, supply shortfall note.
- Medication problem / support requests → prescriber review → patient notified.
- Hospital: accept shared test orders, BDT billing, offline payment record, draft → released report; patient + ordering doctor see it.
- Records archive with search/filter, status and version labels; private report file download.
- Patient–doctor messaging inside an authorized relationship.
- Notification centre (in-app, persistent read/ack state).
- Bangla/English toggle, light/dark theme, logo, Back navigation, unsaved-prescription guard, mobile layout (390 px checked on login).

## Partial / honest limitations

- Alarms work **only while the MedMinders tab is open**. No SMS, phone push or background service worker.
- Bangla coverage: alarm, key warnings and public pages are bilingual; most dashboard labels are English only.
- Records archive: no PDF generation (browser print only); Bangla PDF not done.
- Caregiver/dependent access, daily symptom/barrier logs: not built.
- Doctor/organization verification is a manual MedMinders review; there is no admin UI yet (Admin Panel deferred). Demo fixtures are pre-approved and labelled fictional.
- `php artisan serve` is single-threaded: fine for a demo, not for load.

## Roadmap (not working — do not demo as features)

- AI-assisted summaries/adherence insights: **no AI provider is connected**; nothing AI-generated is shown.
- Drug-interaction checks: endpoint returns an honest "provider unavailable" state; needs a licensed, maintained source.
- SMS/email delivery (OTP, reminders, verification): needs a configured Bangladesh SMS provider and mail transport.
- Web push / native app reminders, caregiver access, Bangla PDFs, organization admin UI, AWaRe curated mapping, clinical evaluation of outcomes.

## External-service blockers

| Need | Blocker |
|---|---|
| Phone OTP / SMS reminders | `PATIENT_SMS_URL`/`PATIENT_SMS_TOKEN` + provider contract (adapter fails closed) |
| Email verification / reset | Mail transport not configured |
| AI summaries | Provider, consent model and clinical review |
| Interaction checker | Licensed interaction database |
| BMDC / DGDA / PCB verification | No public verification API; manual review only |

## Update — core patient journey (Phase 2, 9 Nov 2026)

**Working (tested: CorePatientJourneyTest, WebPushServiceTest, SampleDataTest, CorsTest; browser smoke of catalogue → OTP booking → assistant):**
- Public catalogue `/doctors`, `/doctors/:id`, Home "Find a doctor" and About "Our doctors": search + filters (specialty, hospital, area, day, today), next available slot, BMDC badge, "Sample profile" badge.
- Booking with mandatory phone OTP (5-min codes, attempt and send limits, never logged). Dev-only code shown on screen when `PATIENT_SMS_DEV_CHANNEL=true` and no SMS provider (ignored in production). Existing profile is matched by name + DOB; otherwise created.
- Hospital: assign requested or another affiliated doctor, auto serial number, reschedule proposal, cancel with reason, check-in, no-show; full status history; automatic consultation grant (30 days after completion), visible/revocable by the patient.
- Doctor: today's queue by serial (age, sex, masked phone, reason, needs-attention: 2 consecutive missed or open side-effect report), scoped patient view, Start consultation → prescription linked to the appointment (completes it). Dose patterns (1+0+1, 1+1+1, …), meal timing, auto quantity.
- Dose reminders: scheduler queues jobs (database queue, retries, delivery status QUEUED/SENT/FAILED/SKIPPED), standards-based Web Push (VAPID + aes128gcm, no third-party library) with Taken / Snooze actions from the notification, SMS fallback when configured, 30-min follow-up, recorded as missed after 60 min (patient can correct). Quiet hours never silence antibiotic reminders. Installable PWA (manifest, service worker, install prompt, iOS home-screen guidance).
- Patient: Today's doses timeline, next-dose countdown, progress ring, adherence %, streak, completed state; Access & sharing (authorize doctor/hospital/pharmacy with scopes and duration, revoke, access log).
- Hospital and pharmacy: find patient by phone (masked until authorized), request access, then accept tests / dispense with oversupply protection. Revocation removes access immediately.
- Assistant: 20 conditions in an editable DB table (Bangla/English synonyms), red-flag emergency message, specialty → doctors sorted by next availability → nearest hospital (browser location or area, Haversine, Google Maps link), honest fallback to Medicine. No LLM; no personal data used.
- Sample data: `php artisan demo:seed-fictional` (or `db:seed --class=SampleDataSeeder`) — 4 Khulna hospitals, 12 doctors with generated avatars, 10 patients in different states, 1 pharmacy, 1 admin; logins in git-ignored `SAMPLE_ACCOUNTS.md`; `php artisan sample:purge` removes it all.

**Not done yet (roadmap / next session):**
- Phase 3 full "clinical futurism" redesign (shared dashboard shell, sidebar/bottom tabs, aurora background, fonts, counters, kanban, skeletons everywhere). Only the hero copy/CTAs, team photos and the assistant panel use the new direction so far.
- Phase 4 F1–F9: admin review screens, notification preferences per type, PDFs with Bangla fonts, structured lab values, refills/stock, attachments, rule-based adherence insights module, curated interaction rules, AMR quiz, analytics dashboards, full route authorization matrix tests, accessibility/performance pass.
- Real SMS (provider not chosen), production push needs HTTPS (works via the tunnel or Vercel origin).
