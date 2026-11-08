# MedMinders implementation matrix

| Requirement | Source | Existing code/API | Missing functionality | Status | Verification evidence |
|---|---|---|---|---|---|
| Brand, mission, pocket healthcare assistant | Deck slide 1 | Public layout, supplied logo, theme.css | Final brand copy approval | Implemented locally | Browser public pages; Vite build |
| Forgetfulness, interactions, side effects, limited history, AMR | Deck slide 2; earlier AMR requirement | Courses, support alerts, AWaRe provenance, AMR page | Licensed interaction source; richer side-effect attachments | Partial | Interaction endpoint fails closed; course tests |
| Six product solutions | Deck slide 3 | Connected portal, prescriptions, reports, reminders, messaging, medication problems | PDF archive and AI assistance | Partial | API tests and dashboard build |
| Commercial/financial pitch content | Deck slides 4–5 | Operational billing/invoices only | None for excluded pitch content | Excluded | No marketing/pricing pages added |
| Live deployment (Vercel + tunnel) | Phase 1 request | CORS list, bearer auth, ngrok header, start-backend.ps1, SPA rewrite | Owner: ngrok domain, Vercel env var, build log | Partial | CorsTest; local build |
| Four portals | Deck slide 6; portal requirements | Route-derived patient/doctor/pharmacy/hospital entry and dashboards | Full approved staff browser fixtures | Implemented locally | Browser role-switch checks; auth tests |
| Team | Deck slide 7 | Team page and homepage preview | Separate verified portraits and title confirmation | Implemented from supplied text, titles flagged | `/team` browser render |
| Recognition/appreciation claims | Deck slide 8 | None published | Evidence review | Intentionally omitted | No endorsement or institutional claim in UI |
| Central notifications | Earlier notification requirement | `care_notifications`, preferences, scheduler | Full event producers, queue retries, external channels | Partial | Expanded lifecycle schema, read/ack APIs, tests |
| Core patient journey (catalogue → OTP booking → assignment → prescription → push reminders → authorized hospital/pharmacy → revoke) | Phase 2 | CareJourneyController, PushController, AssistantController, SampleData | Phase 3 redesign, Phase 4 features | Implemented | CorePatientJourneyTest; browser smoke |
| Medication scheduling | Earlier clinical requirement | Courses, explicit schedules, dose logs, treatment stop | Full timezone edge-case review | Partial | Existing dose/amendment tests |
| Patient–doctor messaging | Current request | New conversations/messages APIs and dashboard panel | Attachments, pagination UX, abuse controls | Implemented foundation | Participant-isolation test |
| Medication problem reports | Current request | New structured report table/API and support notification | Private attachment upload and clinician triage UI | Implemented foundation | API authorization path; full fixture pending |
| Interaction checker | Current request | Provider interface and unavailable-state endpoint/UI | Licensed maintained provider configuration | Safely unavailable | 503 unavailable test |
| AI assistance | Current request | None | Provider, consent, source-grounded summaries | Incomplete by design | No fake AI output exposed |
| PDFs/archive | Current request | Private report download and versioned reports | Bangla PDFs, archive search/filter UI | Incomplete | Existing authorization tests; PDF blocker documented |
