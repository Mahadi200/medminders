# MedMinders – Smart Prescription Scanner

Production-ready Patient Portal with prescription upload, OCR, antibiotics knowledge base, and safety alerts.

## Architecture

- **Frontend**: React + Vite + Tailwind (existing)
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma
- **OCR**: Google Cloud Vision API (interchangeable provider)

---

## Setup

### 1. Backend

```bash
cd server
npm install
```

### 2. Environment

Copy `server/.env.example` to `server/.env` and configure:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/medminders"
GOOGLE_APPLICATION_CREDENTIALS="./gcp-credentials.json"
```

### 3. Database

```bash
cd server
npx prisma db push
npx prisma db seed
```

### 4. Google Cloud Vision

1. Create a GCP project
2. Enable **Cloud Vision API**
3. Create a service account, download JSON key
4. Set `GOOGLE_APPLICATION_CREDENTIALS` to the key path

In development without GCP, the app uses a **mock OCR provider** (sample prescription text).

### 5. PDF Support

For PDF uploads, install **poppler-utils**:

- **Ubuntu/Debian**: `apt install poppler-utils`
- **macOS**: `brew install poppler`
- **Windows**: Install via conda or extract poppler binaries

---

## Running

**Backend** (from `server/`):

```bash
npm run dev
```

**Frontend** (from project root):

```bash
npm run dev
```

Visit `http://localhost:5173/patient-login` → click **Upload Prescription**.

---

## Antibiotics XLSX Import

### Bengali headers (expected)

| Header (Bengali) | Field |
|------------------|-------|
| জেনেরিক নাম | generic_name |
| গ্রুপ (শ্রেণিবিভাগ) | group |
| কমার্শিয়াল নাম (উদাহরণ) | brand_names |
| কোম্পানি (উদাহরণ) | companies |
| ব্যবহারের ক্ষেত্রে প্রধান বয়সসীমা ও বিবেচনা | age_considerations |
| Dose & Duration (ডোজ ও সময়কাল) | dose_duration |
| Side Effects (সাইড ইফেক্ট) | side_effects |

### Import

```bash
curl -X POST http://localhost:4000/api/admin/antibiotics/import-xlsx \
  -F "file=@antibiotic_dose.xlsx"
```

Or use Postman: `POST /api/admin/antibiotics/import-xlsx` with form-data `file`.

### Normalization

- Blank "জেনেরিক নাম" rows use **forward-fill** (previous non-empty value)
- Same for group, age considerations, dose/duration, side effects
- Brand names and companies are aggregated per generic and deduplicated

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/prescriptions/upload | Upload prescription (image/PDF) |
| POST | /api/prescriptions/scan | OCR + parse + match antibiotics |
| GET | /api/prescriptions/:id | Get scan result |
| GET | /api/antibiotics/search?q= | Search/match antibiotics |
| POST | /api/admin/antibiotics/import-xlsx | Import XLSX (admin) |

---

## Folder Structure

```
server/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── index.ts
│   ├── controllers/
│   ├── routes/
│   └── services/
│       ├── ocr/           # OCR provider + preprocessing + PDF
│       ├── parser/        # Medicine NLP parser
│       ├── antibiotics/   # Matcher, XLSX import
│       ├── safety/        # Stewardship, red flags, interactions
│       └── storage.ts
└── .env

src/components/home/Patient/
├── PatientDashboard.jsx
├── PrescriptionUploadModal.jsx
└── PrescriptionResults.jsx
```

---

## Security & Disclaimers

- Auth: Demo uses `userId: 'demo-patient'`. Wire up real auth before production.
- Admin import: Add RBAC/middleware for `/api/admin/*`.
- OCR keys: Keep `GOOGLE_APPLICATION_CREDENTIALS` server-side only.
- **Educational use only.** Not for diagnosis. Follow your doctor. Seek medical help for urgent symptoms.
