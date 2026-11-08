# Connected care implementation status

## Running locally

The Laravel API uses the configured MySQL database. These migrations are additive; do not run `migrate:fresh` or reset the database.

```powershell
cd server
C:\xampp\php\php.exe artisan migrate --force
C:\xampp\php\php.exe artisan serve --host=127.0.0.1 --port=8000
```

In another terminal:

```powershell
cd client
npm.cmd run dev -- --host 127.0.0.1
```

For in-app reminders, run Laravel's scheduler continuously using your process manager or system scheduler:

```powershell
cd server
C:\xampp\php\php.exe artisan schedule:work
```

The scheduler calls `care:prepare-dose-notifications` every minute. Notifications are created idempotently in MySQL and shown only when a patient opts in. They are marked **available**, not confirmed delivered. Web push and SMS dose reminders are not implemented.

## Required environment names

- `DB_CONNECTION=mysql`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` for persistence.
- `APP_KEY`, `APP_ENV`, `APP_URL` for Laravel and encrypted TOTP secrets.
- `PATIENT_SMS_URL`, `PATIENT_SMS_TOKEN` for the SMS gateway adapter. The adapter POSTs `to` and `message`; adapt it to the chosen provider's API before production use. Missing configuration returns a 503. No OTP appears in an API response or application log. Tests replace the adapter with a mock.
- `VITE_API_URL` in the client for the Laravel API origin.

## Implemented paths

- Sanctum backed doctor registration, password login, TOTP enrollment and challenge, and a verification gated public profile catalogue. Only a platform administrator can record a manual BMDC review. The application does not verify BMDC against an external registry.
- Phone OTP patient registration and login, stable patient records, and a one-time invitation plus phone OTP claim for staff-created records. Matching phone numbers do not merge records.
- Assigned organization staff accounts, appointment booking, and patient approved resource and action grants. The staff session remains separate from the patient session. Grants expire and can be revoked.
- Verified doctor prescription issuance with medicine rows and test orders, issuance snapshots, amendment linkage, and cancellation of future events when a plan changes. No certified digital signature is claimed.
- Antibiotic courses generated only after a patient confirms actual start, explicit schedules, self-reported dose logs with correction history, completion reports, and medication support alerts. Clinician changes stop future dose events.
- Pharmacy partial dispensing with transactional oversupply checks, idempotency keys, and no automatic course start. Diagnostic order acceptance, BDT billing with immutable price entry, offline payment ledger and corrections, draft/released/amended reports, and private report storage.
- Optional generic in-app dose reminders and one follow-up for unconfirmed doses, with patient preferences and quiet hours. Preference changes do not change a regimen.
- Bangla/English public homepage, live published doctor list, connected portal entry, patient dashboard views, and a general AMR awareness page.

## Classification and editorial status

The existing local medicine data has not been verified against the latest authoritative WHO AWaRe release. The API currently returns `UNKNOWN` and `PENDING` for classification, suppresses its old reference dosing fields, and does not make treatment recommendations. Do not publish an AWaRe distribution or claim WHO/DGDA compliance until a clinical curator reconciles the data and records its source, version, and review date. The awareness page links to WHO's [AMR fact sheet](https://www.who.int/news-room/fact-sheets/detail/antimicrobial-resistance) and [AWaRe overview](https://www.who.int/teams/integrated-health-services/clinical-services-and-systems/essential-medicines/aware); its editorial review is pending.

## Outstanding before production use

The full requested system is not complete. In particular: current WHO catalogue import and clinical review; prescription and report PDF output; patient-facing report downloads; production SMS provider integration; web push and SMS reminders; appointment queue management; structured lab observations; prescription quantity refills; time-zone transition and complex schedule review; comprehensive version review UI; organization admin UI; analytics; detailed policy and authorization tests for every endpoint; external security and clinical review. Do not use this build for real patient care until those gaps are closed and deployment, backups, access control, and clinical safety are validated.

## Verification update (4 November 2026)

### Implemented in this pass

- Added additive AWaRe provenance columns and the `catalogue:import-aware` command. It accepts only an explicit curator CSV, records the WHO version/source/review date, writes an unmapped JSON report, and leaves unmatched entries `UNKNOWN`.
- Updated the catalogue API to expose the checked WHO 2025 source metadata and to state that AWaRe never changes treatment.
- Added an organization-authorized antibiotic-use analytics endpoint with explicit classified/unknown denominators and a non-resistance interpretation statement.
- Expanded end-to-end coverage for doctor/assistant appointment permissions and partial pharmacy dispensing limits.

### Automated checks performed

- `C:\xampp\php\php.exe artisan migrate --force` (additive migration `2026_11_04_000010_add_aware_provenance`).
- `C:\xampp\php\php.exe artisan test` — **11 tests, 87 assertions, all passing**.
- `npm.cmd run build` in `client` — Vite production build passed.
- `C:\xampp\php\php.exe artisan route:list --path=api/v1` — 72 API routes loaded, including analytics, sharing, prescriptions, pharmacy, billing, reports, courses, notifications, and private file streaming.
- `C:\xampp\php\php.exe artisan list` — confirmed `catalogue:import-aware` and `care:prepare-dose-notifications` are registered.
- Live health check while the server was running: `GET /api/v1/health/ready` returned `{"ok":true,"database":"UP"}`.

The suite now exercises patient claim single-use behavior, shared-phone non-merging, doctor verification, scoped share/revoke, appointment assistant limits, prescription amendment/cancellation, partial dispensing and oversupply protection, diagnostic billing/payment correction/report release, dose start/log correction/support/completion, reminder idempotency, clinician treatment stop, unshared report denial, and amendment lineage. It does not yet cover every route or browser interaction.

### Changed files

- `server/database/migrations/2026_11_04_000010_add_aware_provenance.php`
- `server/app/Console/Commands/ImportAwareCatalogue.php`
- `server/app/Models/Generic.php`
- `server/app/Http/Controllers/Api/v1/CatalogueController.php`
- `server/app/Http/Controllers/Api/v1/AnalyticsController.php`
- `server/routes/api.php`
- `server/tests/Feature/ConnectedCareTest.php`
- `docs/aware-catalogue-import.md`

### Required environment names

Existing names remain: `APP_KEY`, `APP_ENV`, `APP_URL`, `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `PATIENT_SMS_URL`, `PATIENT_SMS_TOKEN`, and client `VITE_API_URL`. No secrets were added. SMS credentials are still absent in the local environment; the existing adapter fails closed and tests use a mock.

### Still incomplete or externally blocked

- Authorized prescription, invoice, receipt, and released-report PDF generation is not implemented. The existing private report file download is protected, but Bangla font rendering and multi-page PDF verification remain outstanding.
- Reminder delivery is currently idempotent in-app availability only. Queue worker retry/dead-letter tracking, a configured production SMS reminder adapter, and web push are not connected. No patient SMS or OTP was sent by these checks.
- The AWaRe import workflow is reproducible, but no clinical curator has supplied or approved the actual mapping CSV; local unmatched records therefore remain unknown.
- Full portal usability, mobile/browser checks, organization administration, queue management, structured lab observations, refills, time-zone edge cases, and comprehensive cross-route authorization tests remain outstanding.

### Remaining clinical/security review

Before any real-patient use, an independent clinical review must validate prescription/amendment safety, dose scheduling, treatment-change cancellation, AWaRe interpretation, reminder wording, and analytics denominators. An independent security review must validate organization isolation, consent expiry/revocation, private attachment access, OTP throttling/replay resistance, audit completeness, session expiry, and every staff/patient role boundary. Passing automated tests and a successful build do not establish clinical readiness.

## Portal routing and password access update (4 November 2026)

### Implemented

- Portal selection now uses route-derived configuration. `/patient-login`, `/patient-register`, `/patient-otp`, `/patient-claim`, `/doctor-login`, `/doctor-register`, `/pharmacy-login`, `/pharmacy-register`, and `/hospital-login` render their matching role/form on direct navigation, refresh, and browser history changes. The portal dialog closes after navigation and returns focus to its trigger.
- Removed the mixed all-role form. Patient record claiming remains inside the patient workflow; doctor, pharmacy, and hospital controls are separate.
- Added password-based patient registration and login at `/api/v1/auth/patients/register-password` and `/api/v1/auth/patients/login-password`. Registration creates a new patient profile and self-link only, stores a hashed password, leaves phone/email unverified, and never links existing records by contact match. Login is throttled and accepts a verified phone, pending phone plus the account password, or linked email plus password.
- Existing OTP challenge/claim flow remains available at the patient OTP routes and still requires invitation/code verification for existing records.
- Integrated the supplied `Polished MedMinders Healthcare Logo.png` into navbar, footer, authenticated branding, and the runtime favicon. No screenshot was embedded as a logo.

### Changed files

- `client/src/RootApp.jsx`
- `client/src/main.jsx`
- `client/src/components/home/Navbar.jsx`
- `client/src/components/home/Footer.jsx`
- `client/src/pages/ConnectedPortal.jsx`
- `client/src/Polished MedMinders Healthcare Logo.png`
- `server/app/Http/Controllers/Api/v1/AuthController.php`
- `server/app/Models/User.php`
- `server/routes/api.php`
- `server/database/migrations/2026_11_04_000012_add_patient_password_contacts.php`
- `server/tests/Feature/ConnectedCareTest.php`

### Verification performed

- `C:\xampp\php\php.exe artisan migrate --force` applied the additive patient contact migration without resetting data.
- `C:\xampp\php\php.exe artisan test` — **13 tests, 101 assertions, all passing**.
- `npm.cmd run build` in `client` — Vite production build passed, including the supplied logo asset.
- Browser checks confirmed role-specific rendering on `/doctor-login`, `/doctor-register`, `/pharmacy-login`, `/pharmacy-register`, `/hospital-login`, `/patient-login`, `/patient-register`, and `/patient-claim`. The prior generic-form state no longer persists across route changes.

### Remaining limitations

- Phone/email verification for password-created patient accounts is still a separate future verification flow. Password registration does not prove contact ownership and does not expose historical records.
- Password reset delivery is not advertised because no configured email/SMS reset transport exists. The SMS adapter remains available only when provider credentials are configured; test delivery remains local-only.

## Role dashboard update (4 November 2026)

### Implemented and connected

- Patient dashboard: profile/contact verification state, linked records, appointments, prescriptions, antibiotic courses with actual-start and dose-log actions, reminder preferences/notifications, sharing decisions and revocation, dispensing history, diagnostic bills, test orders, reports, and medication support/completion reporting.
- Doctor dashboard: BMDC approval/profile status, editable public profile, photo upload, appointment queue/booking, patient-record creation with private invitation code, patient-access requests, prescription editor, test/report lists, and MFA enrollment.
- Pharmacy dashboard: organization onboarding status, separate establishment-licence and responsible-pharmacist review states, consent-gated prescription data, partial/full dispensing action with idempotency, and supply/receipt history where authorized. Pending organizations receive status information but remain blocked by backend approval checks.
- Hospital dashboard: organization-scoped appointment/test-order list, test acceptance, billing, draft report upload, and report release actions. Backend authorization remains the source of truth for every action.
- Added a responsive dashboard header with role-specific navigation anchors, access-scope summary, honest empty states, and theme-token surfaces. No counts, charts, records, or activity were fabricated.

### Browser workflows checked

- Registered a fictional patient through `/patient-register`; the UI opened the new patient dashboard.
- Signed out, signed back in with the linked email/password, and refreshed; the session restored the patient dashboard.
- Tested Access Portal role switching without a reload: Doctor opened `/doctor-login`, Pharmacy opened `/pharmacy-login`, and Hospital opened `/hospital-login` with the correct role-specific form.
- Confirmed pharmacy registration exposes both credential sections and direct `/pharmacy-register` refresh works.

### Still incomplete

- No production doctor/pharmacy/hospital credentials were available for a full browser sign-in into each restricted dashboard during this pass. Backend tests remain the verification source for approval, consent, and organization isolation.
- Encounter-specific UI, richer queue filters, hospital review queues, receipt/PDF downloads, and complete medication-support alert triage still need dedicated screens or backend endpoints.

## Authentication, pharmacy onboarding, and public UI update (4 November 2026)

### Implemented

- Doctor registration now validates BMDC values using the documented `A-`/`P-` plus six-digit format, keeps the account pending/unverified, persists the profile transactionally, and rejects name-like values. BMDC review remains manual; no regulator lookup is claimed.
- Patient SMS OTP delivery now fails closed when `PATIENT_SMS_URL` or `PATIENT_SMS_TOKEN` is absent. A testing-only in-memory gateway is used by automated tests; production responses and logs do not contain OTP values. Network errors and validation failures are surfaced as actionable UI messages.
- Pharmacy registration stores a pharmacy establishment licence and responsible pharmacist registration as separate private credential records. Organizations begin in `SUBMITTED`; reviewers can approve, reject, request correction, suspend, or record a reason. Dispensing requires an approved organization and verified credentials.
- Restored public routes and shared layouts: Home, About, Services, Information/AMR Awareness, Team, Contact, and portal entry. Added responsive navigation, portal menu, language/theme controls, shared footer, role-aware auth entry, theme tokens, honest empty/error states, and mobile-friendly public/auth layouts.
- The Team page explicitly reports that public biographies/photos are not present in the repository rather than inventing people or qualifications. Contact uses a mail link and does not claim a backend submission succeeded.

### Changed files

- `client/src/theme.css`
- `client/src/index.css`
- `client/src/components/public/PublicLayout.jsx`
- `client/src/components/public/PageHeader.jsx`
- `client/src/components/home/Navbar.jsx`
- `client/src/components/home/Footer.jsx`
- `client/src/pages/Home.jsx`
- `client/src/pages/ServicesPage.jsx`
- `client/src/pages/TeamPage.jsx`
- `client/src/pages/AmrAwareness.jsx`
- `client/src/pages/Contact.jsx`
- `client/src/pages/ConnectedPortal.jsx`
- `client/src/RootApp.jsx`
- `server/app/Http/Controllers/Api/v1/AuthController.php`
- `server/app/Http/Controllers/Api/v1/OrganizationController.php`
- `server/app/Http/Controllers/Api/v1/PharmacyController.php`
- `server/app/Services/Auth/TestingPatientSmsGateway.php`
- `server/database/migrations/2026_11_04_000011_add_pharmacy_onboarding.php`
- `server/routes/api.php`
- `server/tests/Feature/ConnectedCareTest.php`

### Verification performed

- `C:\xampp\php\php.exe artisan test` — **12 tests, 93 assertions, all passing**.
- `npm.cmd run build` in `client` — Vite production build passed after the public layout, theme, auth, and pharmacy changes.
- Laravel API health and direct doctor registration/login were verified while the backend was running on `127.0.0.1:8000`.
- Browser checks on the running client covered `/`, `/about`, `/service`, `/amr-awareness`, `/team`, `/contact`, `/patient-login`, and `/pharmacy-login`. Header, footer, nested-route refresh, portal controls, and the pharmacy login entry rendered successfully. The only browser console message was the existing React Router future-flag warning.
- The configured frontend origin is `VITE_API_URL` (currently targeting the local Laravel service). The observed “Failed to fetch” condition was the client’s generic network error handling; the backend endpoint itself was reachable. Missing SMS credentials remain a separate, explicit 503 delivery-service condition.

### Official terminology sources used

- BMDC registration material: [BMDC registration form](https://payment.bmdc.org.bd/upl/doc/forms/P4vthDZcpXoK.pdf) and [BMDC registration guidance](https://www.bmdc.org.bd/docs/Registration-for-Medical-Dental-Practitioners17.pdf).
- DGDA official Form-7 reference: [DGDA Form-7](https://dgda.gov.bd/pages/static-pages/6922ddf4933eb65569e17469).
- Pharmacy Council references: [PCB automation portal](https://automation.pcb.gov.bd/) and [PCB official background/categories](https://pcb.gov.bd/pages/static-pages/6922e0c2933eb65569e287d2).

These sources informed configurable labels and the BMDC format check; they do not provide an automated licensing verification integration in this project.

### Remaining blockers and review needs

- Real phone delivery still requires provider credentials and an adapter mapping to the selected Bangladesh SMS provider. The implemented adapter requires `PATIENT_SMS_URL` and `PATIENT_SMS_TOKEN`; any provider-specific sender or account fields must be added to the adapter configuration when that provider is selected, along with the deployment queue/worker configuration. No real SMS was sent in verification.
- Email verification transport is not enabled as a separate production flow; the UI must not advertise it until mail transport and verification endpoints are configured.
- The requested PDF documents, production reminder delivery/retries/web push, live regulator checks, full organization reviewer UI, and complete mobile viewport screenshots remain incomplete.
- Independent clinical and security review remains required for consent boundaries, OTP throttling/replay resistance, private credential/report downloads, notification privacy, authorization isolation, and all prescription/dose safety rules.

## Deck-aligned product completion update (4 November 2026)

- Added [implementation-matrix.md](./implementation-matrix.md), mapping the supplied UIHP Seed deck slides and earlier requirements to code, gaps, status, and evidence.
- Added additive notification lifecycle fields and a central read/acknowledge centre for all authorized recipients. The existing dose scheduler remains in-app and opt-in; external SMS/email/push are not claimed.
- Added authorized patient–doctor conversation APIs with participant isolation, idempotent message keys, timestamps, and in-app message notifications. Prescription changes still require the structured prescription amendment workflow.
- Added structured medication-problem reports linked to a medication course, including symptoms, onset/taken/last-dose fields, contact action, and care-team notification. Reports are not diagnoses or resistance findings.
- Added a drug-interaction provider interface with an explicit unavailable response and clinician/pharmacist dashboard state. No obsolete RxNav endpoint, invented rule, or LLM-generated interaction result is used.
- Added dashboard panels for notifications, messaging, medication-problem reporting, and interaction-provider status.

Verification after this update: `C:\xampp\php\php.exe artisan migrate --force`; `C:\xampp\php\php.exe artisan test` — **15 tests, 109 assertions, all passing**; `npm.cmd run build` — passed. The new interaction test confirms fail-closed `503 PROVIDER_UNAVAILABLE`; the messaging test confirms authorized patient/doctor participants and outsider denial.

Still incomplete: licensed interaction data integration, private message/problem attachments, full notification event producers and queue retry/dead-letter operations, AI provider/consent workflow, Bangla PDF generation/archive filters, and independent clinical/security review. Deck slide 8 recognition claims remain unpublished pending evidence. Commercial pitch content remains excluded.

## Pitch-demo pass (8 November 2026)

See `docs/demo/FEATURE_STATUS.md` for the gap matrix, working-vs-roadmap list and external blockers, and `docs/demo/DEMO_RUNBOOK.md` for startup, fixtures and recovery. Key additions: additive migration `2026_11_08_000001_add_affiliations_booking_and_alarm_state`; `AffiliationController`, `AlarmController`, `CareTeamController`; patient-initiated sharing and `/shared-with-me`; event-producer notifications; `demo:seed-fictional` command (non-production, credentials in git-ignored `storage/app/demo-credentials.local.txt`); new portal components under `client/src/components/portal/`; `tests/Feature/DemoWorkflowTest.php`. Fixed: session loss on navigation, production MFA bypass guard, IP-keyed rate limiting. Verification: 17 tests / 170 assertions; Vite build; real-browser walkthrough of all 10 demo steps.
