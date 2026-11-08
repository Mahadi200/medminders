# MedMinders demo runbook (pitch, 9 Nov 2026)

All people, organizations and records used in the demo are **fictional**. Never show real patient data, passwords, tokens or the credentials file on screen.

## 1. Start everything (Windows, XAMPP PHP + MySQL)

Open four terminals in the repository root.

```powershell
# Terminal 1 — MySQL (skip if XAMPP Control Panel already runs it)
C:\xampp\mysql\bin\mysqld.exe --defaults-file=C:\xampp\mysql\bin\my.ini --standalone

# Terminal 2 — API (Laravel)
cd server
C:\xampp\php\php.exe artisan migrate --force          # additive only; never migrate:fresh
C:\xampp\php\php.exe artisan serve --host=127.0.0.1 --port=8000

# Terminal 3 — scheduler (in-app reminder availability + cancellation of obsolete reminders)
cd server
C:\xampp\php\php.exe artisan schedule:work

# Terminal 4 — web app
cd client
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

Open http://127.0.0.1:5173. Health check: http://127.0.0.1:8000/api/v1/health/ready → `{"ok":true,"database":"UP"}`.

Queue: `QUEUE_CONNECTION=sync` — notifications are written synchronously in the same request, so no queue worker is needed for the demo. Notifications are idempotent (unique `user_id + event_key`).

`MEDMINDERS_DEMO_DISABLE_MFA=true` in `server/.env` keeps authenticator-app setup from blocking the demo. It is ignored when `APP_ENV=production`.

## 2. Prepare demo data (once, before rehearsal)

```powershell
cd server
C:\xampp\php\php.exe artisan demo:seed-fictional
```

Creates (idempotently, never in production): a fictional approved hospital and pharmacy, a doctor with a hospital-confirmed visiting schedule (every day 08:00–22:00, 15-min slots), a hospital desk account, a pharmacist account, and a demo patient. Verification states are **fixture values**, recorded in the audit log as `DEMO_FIXTURE_SEEDED` — not real BMDC/DGDA/PCB reviews.

Credentials are written only to `server/storage/app/demo-credentials.local.txt` (git-ignored). Open it off-screen. Rotate with `--rotate-passwords`.

**For the live demo, register a fresh patient** at `/patient-register` (e.g. "Rahim (Fictional)", phone `019xxxxxxxx`) so the story starts clean. Use a browser profile with saved passwords, or paste from the local file with the screen share paused.

Tip: use one browser window per role (e.g. Chrome profiles or one normal + one incognito window per role), all signed in before you start. Sessions are per-tab (`sessionStorage`).

## 3. Demo sequence (≈3 minutes live)

| # | Role | Route | Action |
|---|------|-------|--------|
| 1 | — | `/` then `/amr-awareness` | Problem and ecosystem, language toggle (EN/বাংলা), dark mode |
| 2 | Doctor | `/doctor-login` | Show BMDC review badge, “Hospital affiliations” → schedule *Confirmed by hospital* |
| 3 | Patient | `/patient-login#dashboard-book` | Pick Dr. Demo Ayesha → date → slot → keep consent ticked → Request |
| 4 | Hospital | `/hospital-login` | Appointment requests → **Confirm** |
| 5 | Doctor | `/doctor-login#dashboard-prescribe` | Choose patient → allergy review “No known drug allergy” → Amoxicillin 500 mg, 1 capsule, Oral, every 8 h, 5 days, qty 15, Antibiotic ✓, indication → test “Complete blood count” → Issue |
| 6 | Patient | `#dashboard-prescriptions` | Share with **Demo Green Leaf Pharmacy** and **Demo Riverside General Hospital** |
| 7 | Pharmacy | `/pharmacy-login` | Quantity 6 → Record supply (partial) |
| 8 | Patient | `#dashboard-courses` | **I took the first dose now** → refresh → alarm modal → **Taken**; show stats, supply-shortfall note; Enable alarm sound → **Test alarm** |
| 9 | Patient → Doctor | `#dashboard-problems` | Report mild nausea → doctor Problems → response → Resolve |
| 10 | Hospital → Patient | `#dashboard-orders` → `#dashboard-reports` | Accept → bill ৳450 → draft → Review and release → patient View |
| 11 | Any | — | Refresh (session restores), Sign out, open another role URL (redirected to own portal) |

## 4. Recovery

| Symptom | Fix |
|---|---|
| “Cannot reach the MedMinders API” | Terminal 2 stopped → restart `artisan serve`; check `VITE_API_URL` in `client/.env` = `http://127.0.0.1:8000` |
| Health shows database DOWN | Start MySQL (Terminal 1 / XAMPP) |
| No slots for the doctor | Pick another date (slots in the past are hidden); re-run `demo:seed-fictional` |
| “You already have an open request with this doctor” | Expected duplicate protection — use the existing appointment or register another fictional patient |
| Prescription error “allergy review are required” | Choose an allergy review value for the patient before issuing an antibiotic |
| Alarm modal does not appear | It polls every 30 s; reload the page. Only doses due within the last 6 h ring. Use **Test alarm** to demonstrate sound |
| No sound | Click **Enable alarm sound** first (browser requires a user gesture); unmute the tab |
| Pharmacy sees nothing | Patient must share the prescription with that pharmacy (7-day share) |
| Hospital sees no test order | Patient must share the prescription with that hospital |
| Dashboard slow | `artisan serve` is single-threaded; wait a moment — for the pitch keep only the windows you need open |
| Wrong password / forgotten | `demo:seed-fictional --rotate-passwords` (off-screen) |

## 5. Verification done for this build

- `C:\xampp\php\php.exe artisan test` → 17 tests, 170 assertions passing (includes `DemoWorkflowTest`: booking → hospital confirmation → prescription → sharing → partial dispensing → alarms/snooze → problem review → report release → cross-patient isolation, and proposed-time acceptance).
- `npm.cmd run build` → passes.
- Real-browser walkthrough (headless Chrome via Playwright) of all 10 workflow steps plus a 390 px mobile check: all passed.

## 6. Re-run the browser walkthrough or re-record the video

Both scripts use `playwright-core` with the installed Google Chrome and read credentials from the git-ignored local file (never printed or typed on screen in the video).

```powershell
mkdir $env:TEMP\mm-tools; cd $env:TEMP\mm-tools; npm init -y; npm i playwright-core@1.47.2
node node_modules\playwright-core\cli.js install ffmpeg      # once, for video recording
$env:NODE_PATH="$env:TEMP\mm-tools\node_modules"
# walkthrough (needs Vite dev server on 5173)
node "D:\WEB DESIGN IT\IDEA\MedMinders\tools\demo\browser-walkthrough.cjs"
# video (build + preview on 4173 for speed)
cd "D:\WEB DESIGN IT\IDEA\MedMinders\client"; npm.cmd run build; npx vite preview --host 127.0.0.1 --port 4173
node "D:\WEB DESIGN IT\IDEA\MedMinders\tools\demo\record-demo-video.cjs"
```

Each run registers a new fictional patient and books one slot; it never touches non-demo records.
