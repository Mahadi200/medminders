# 🔍 MedMinders Current-State Discovery & Repository Audit

## 1. Git Repository Status & File Inventory

* **Branch**: `main`
* **Remote Tracking**: `origin/main` (up to date)
* **Status at Discovery**:
  - Modified uncommitted files:
    - `antibiotic_dose.xlsx`: Local modifications present.
    - `src/components/home/Patient/PatientDashboard.jsx`: Uncommitted UI adjustments.
    - `src/pages/Home.jsx`: Uncommitted home page edits.
    - `src/utils/medicineParser.js`: Updated in Slice 1 for multi-line parity.
    - `README.md`: Updated with repository documentation.
  - Untracked files:
    - `server/`: Complete backend application directory (untracked in git root).
    - `public/image/assets/`: Contained a sample prescription image (removed in Slice 3 due to PHI).
    - `src/components/home/PatientFeedback.jsx`: Added testimonials carousel component.

---

## 2. Package Manifests & Dependencies

### 2.1 Root Web Portal (`package.json`)
* **Name**: `medminders`
* **Version**: `0.0.0`
* **Framework**: React 19.1.0 + Vite 6.3.5
* **Core Dependencies**:
  - `@react-three/fiber` (9.1.2) & `@react-three/drei` (10.3.0) & `three` (0.177.0) (3D graphics)
  - `@tailwindcss/vite` (4.1.7) & `tailwindcss` (4.1.7) (Tailwind CSS v4)
  - `framer-motion` (12.18.1) & `motion` (12.12.1) (UI animations)
  - `keen-slider` (6.8.6) (Touch carousel)
  - `react-icons` (5.5.0) (FontAwesome, Material icons)
  - `react-router-dom` (7.6.0) (SPA Routing)
  - `react-tsparticles` (2.12.2) & `tsparticles` (3.8.1) (Particle effects)
  - `tesseract.js` (5.1.1) (Client-side Web Worker OCR)
* **Build Verification**: `npm run build` succeeds (1702 modules transformed, `dist/index.html` generated in 12.56s).

### 2.2 Server (`server/package.json`)
* **Name**: `medminders-server`
* **Version**: `1.0.0`
* **Framework**: Node.js + Express 4.21.0 + TypeScript 5.6.3
* **Core Dependencies**:
  - `@google-cloud/vision` (4.2.0) (Document Text OCR)
  - `@prisma/client` & `prisma` (5.22.0) (PostgreSQL ORM)
  - `cors` (2.8.5) (CORS middleware)
  - `express` (4.21.0) (REST API framework)
  - `fast-levenshtein` (3.0.0) & `@types/fast-levenshtein` (Fuzzy matching)
  - `multer` (1.4.5-lts.1) (Multipart form data file uploads)
  - `sharp` (0.33.5) (Native image processing)
  - `xlsx` (0.18.5) (Spreadsheet parser)
  - `tsx` (4.19.2) (TypeScript runtime execution)
  - `vitest` (5.0.2) (Test runner added in Slice 1)
* **Build Verification**: `npm run build` succeeds (`tsc` outputs cleanly to `dist/`).
* **Test Verification**: `npm test` runs `vitest run` on `src/services/parser/medicineParser.test.ts` (3/3 passing).

---

## 3. Web Routes Map (`src/App.jsx`)

| URL Path | Element / Component | Real vs Mock State |
|---|---|---|
| `/` | `<Home />` | **Functional UI**: Hero with 3D/canvas, DoctorsSection, Testimonials, Footer. |
| `/about` | `<AboutPage />` | **Static Content**: Information about platform mission and team. |
| `/service` | `<ServicesPage />` | **Static Content**: Medical services description. |
| `/contact` | `<Contact />` | **Static UI**: Contact form without backend connection. |
| `/DoctorAuth` | `<DoctorAuth />` | **Mock UI**: Form submission triggers local `useState` modal. No backend auth. |
| `/doctor-layout` | `<DocLayout />` | **Mock UI**: Hardcoded doctor appointments and consultation layout. |
| `/patient-login` | `<PatientDashboard />` | **Hybrid**: Mock patient data, real in-browser `tesseract.js` prescription upload and OCR parser. |
| `/hospital-login` | `<MedMindersHospitalDashboard />` | **Mock UI**: Hardcoded bed occupancy, staff counts, and department status. |
| `/pharmacy-login` | `<PharmacyDashboard />` | **Mock UI**: Hardcoded dispensing log and inventory levels. |

---

## 4. Server Endpoints Map (`server/src/index.ts`)

| Method | Endpoint | Handler | Security & Auth Status |
|---|---|---|---|
| `POST` | `/api/prescriptions/upload` | `uploadPrescription` | **INSECURE**: No auth. Defaults to `userId: 'demo-patient'`. Stores to public web path. |
| `POST` | `/api/prescriptions/scan` | `scanPrescription` | **INSECURE**: No auth. Accepts arbitrary `uploadId` or manual text. Saves to DB without user validation. |
| `GET` | `/api/prescriptions/:id` | `getScanResult` | **CRITICAL FLAW**: Completely public. Anyone with an ID can read full patient prescription data. |
| `GET` | `/api/antibiotics/search?q=` | inline router | **Public**: Performs fuzzy matching or searches Prisma database. |
| `POST` | `/api/admin/antibiotics/import-xlsx` | inline router | **CRITICAL FLAW**: No admin authentication. Allows public overwrite of the antibiotic database via Excel upload. |
| `GET` | `/api/health` | inline router | **Public**: Returns `{ ok: true }`. |
| `GET` | `/uploads/*` | `express.static` | **CRITICAL FLAW**: Entire uploads directory is statically served without any access token or session check. |

---

## 5. Current Prisma Models (`server/prisma/schema.prisma`)

* **Database Engine**: PostgreSQL
* **Migration Strategy in use**: Only `prisma db push` was used. No versioned migration history in `prisma/migrations/`.
* **Current Models**:
  1. `User`: `id`, `email`, `role` (`"patient" | "doctor" | "admin"`), `createdAt`, `updatedAt`.
  2. `PrescriptionUpload`: `id`, `userId`, `fileType`, `fileUrl`, `createdAt`.
  3. `PrescriptionScan`: `id`, `uploadId`, `userId`, `ocrText`, `ocrConfidence`, `medicinesJson`, `antibioticsJson`, `alertsJson`, `createdAt`.
  4. `Antibiotic`: `id`, `genericName`, `group`, `brandNames` (string array), `companies` (string array), `ageConsiderations`, `doseDuration`, `sideEffects`, `createdAt`, `updatedAt`.
* **Database Gaps**:
  - Missing Patient profile and demographic tables.
  - Missing Clinician credentials, BMDC license verification, and digital signature logs.
  - Missing Dispense logs, pessimistic lock tracking, and transaction idempotency records.
  - Missing Tenant / Hospital / Clinic organization models.
  - Missing Consent and Care Relationship records.
  - Missing Audit log table.

---

## 6. OCR, NLP Parser & Safety Services Audit

### 6.1 OCR Pipeline
* Provider factory in `server/src/services/ocr/index.ts`:
  - Uses `GoogleVisionOcrProvider` if `GOOGLE_APPLICATION_CREDENTIALS` or `GCP_KEY` exists.
  - Falls back to `MockOcrProvider` in non-production.
  - Includes `imagePreprocessor.ts` with `sharp` grayscale, thresholding, and contrast filters.
  - Includes `pdfToImage.ts` using `pdftoppm` (requires external Poppler binary).

### 6.2 Medicine Parser
* `server/src/services/parser/medicineParser.ts`:
  - Regexes for strength (`STRENGTH_REGEX`), duration (`DURATION_REGEX`, `BENGALI_DAYS`), frequency (`FREQUENCY_MAP`), form (`FORM_KEYWORDS`), and route (`ROUTE_KEYWORDS`).
  - Multi-line continuation logic attached in Slice 1 ensures secondary dosage lines are linked to the active medicine entity.

### 6.3 Antibiotic Matcher & XLSX Ingestion
* `server/src/services/antibiotics/matcher.ts`:
  - Queries `prisma.antibiotic.findMany()`.
  - Normalizes string and applies exact generic match, exact brand match, trigram similarity, and Levenshtein distance.
* `server/src/services/antibiotics/xlsxImport.ts`:
  - Parses `antibiotic_dose.xlsx` buffer.
  - Maps Bengali headers (`জেনেরিক নাম`, `গ্রুপ`, `কমার্শিয়াল নাম`, `কোম্পানি`, ইত্যাদি).
  - Applies forward-fill normalization for merged/blank rows.

### 6.4 Safety Engine
* `server/src/services/safety/`:
  - `interactions.ts`: Checks against hardcoded 4 drug pair rules (e.g. Ciprofloxacin + Calcium).
  - `redFlags.ts`: Checks keywords for allergies, pregnancy, pediatric, multiple antibiotics, unclear duration.
  - `stewardship.ts`: Returns generic guidance warnings if antibiotics are present or duration is missing.
  - **Limitation**: All safety warnings are static text without clinical source citation, versioning, or clinician review approval metadata.

---

## 7. Environment Variables & Deployment

* `server/.env.example`:
  ```env
  DATABASE_URL="postgresql://user:password@localhost:5432/medminders"
  GOOGLE_APPLICATION_CREDENTIALS="./gcp-credentials.json"
  PORT=4000
  FRONTEND_URL=http://localhost:5173
  API_BASE_URL=http://localhost:4000
  MAX_UPLOAD_MB=10
  ```
* `vercel.json`: Minimal SPA rewrite rule routing all paths to `/`.
* **Deployment Gap**: No Dockerfile, CI/CD pipeline, production secrets management, or DB migration runner configured.

---

## 8. Summary of Critical Vulnerabilities & Remediation Requirements

1. **Unprotected PHI File Storage**: Remove `express.static('/uploads')`. Replace with authenticated streaming or short-lived pre-signed URLs.
2. **Missing Authentication on PHI Routes**: Implement JWT/session verification on `/api/v1/prescriptions/*`.
3. **Missing Object-Level Authorization (IDOR)**: Enforce checks verifying that the requesting user owns the prescription or has an active doctor-patient care relationship.
4. **Unprotected Admin Ingestion**: Protect `/api/v1/admin/*` with strict Role-Based Access Control (`role: 'superadmin'`).
5. **No Versioned Migrations**: Transition database lifecycle from `prisma db push` to `prisma migrate dev`.
