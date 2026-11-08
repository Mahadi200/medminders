# Demo shot list

Recorded file: `docs/demo-video/MedMinders_demo_captioned.webm` (1280×720, 3:36, captions burned in, no audio). Record the voiceover from `VIDEO_SCRIPT.md` / `VIDEO_SCRIPT_BN.md` on top. To reach ~2:45, trim loading pauses in an editor (the recording runs in real time against the local API).

| # | Scene | Route | Role | Action | On-screen caption | Duration |
|---|---|---|---|---|---|---|
| 1 | Problem | title card | — | — | Antibiotics only work when they are used right. | 7 s |
| 2 | Ecosystem | `/` | Public | Home page | MedMinders — patient-centred antimicrobial stewardship support | 7 s |
| 3 | Education | `/amr-awareness` | Public | AMR page | Bangla/English AMR education | 6 s |
| 4 | Doctor profile | `/doctor-login` | Doctor | Dashboard, then Hospital affiliations | Doctor: BMDC-reviewed profile / Visiting schedule confirmed by the hospital | 10 s |
| 5 | Booking | `/patient-login#dashboard-book` | Patient | Pick doctor, tomorrow, slot, consent, Request | Patient: book a verified doctor / Consent is explicit and time-limited / Request goes to the correct hospital | 15 s |
| 6 | Confirmation | `/hospital-login` | Hospital | Confirm the request | Hospital front desk receives the request / Confirmed | 8 s |
| 7 | Prescription | `/doctor-login#dashboard-prescribe` | Doctor | Allergy review, Amoxicillin q8h × 5 days, qty 15, CBC, follow-up → Issue | Structured prescription … MedMinders never suggests a drug or dose | 20 s |
| 8 | Sharing | `#dashboard-prescriptions` | Patient | Share with pharmacy, then hospital | Patient controls sharing | 10 s |
| 9 | Dispensing | `/pharmacy-login` | Pharmacy | Quantity 6 → Record supply | Pharmacy sees only what the patient shared | 8 s |
| 10 | First dose + alarm | `#dashboard-courses` | Patient | Confirm first dose → alarm modal → Taken | The schedule starts from the confirmed first dose / Due-dose alarm in the open app | 15 s |
| 11 | Course picture | `#dashboard-courses` | Patient | Stats, supply note | Clear course picture with honest denominators / Supply alert only when supply is short | 11 s |
| 12 | Test alarm | `#dashboard-alarm` | Patient | Test alarm (demo) | Test alarm for demonstrations — this device only | 4 s |
| 13 | Problem report | `#dashboard-problems` | Patient → Doctor | Report nausea → doctor resolves | Patient reports a medication problem / Authorized doctor sees adherence and the report | 15 s |
| 14 | Report release | `#dashboard-orders` → `#dashboard-reports` | Hospital → Patient | Accept, bill ৳450, draft, release → patient View | Hospital: accept test, bill in BDT, release a reviewed report / Patient’s private records archive | 15 s |
| 15 | Close | closing card | — | — | Right medicine. Right dose. Right time. (aims, not outcomes; roadmap) | 8 s |

Re-record at any time (all fictional data; staff sign in by token, so no password appears on screen): see `DEMO_RUNBOOK.md` §6.
