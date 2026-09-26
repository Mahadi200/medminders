# 🏛 MedMinders Architecture Specification

## 1. Overview & Vision
MedMinders is a full-stack, clinical-grade digital health platform designed to bridge patients, registered healthcare providers, pharmacies, and hospital networks. The core purpose of the platform is to streamline prescription management, digitize handwritten and printed prescriptions through intelligent Optical Character Recognition (OCR), and provide antimicrobial stewardship alerts to prevent antibiotic misuse while enforcing rigorous clinical safety and data privacy boundaries.

---

## 2. Target Monorepo Topology

```text
MedMinders/
├── client/
│   ├── web/                     # Existing React 19 + Vite 6 + Tailwind CSS v4 portal
│   │   ├── src/                 # Web portal UI (Patient, Doctor, Hospital, Pharmacy)
│   │   ├── public/              # Static public web assets
│   │   ├── package.json
│   │   └── vite.config.js
│   └── mobile/                  # New Expo / React Native TypeScript application
│       ├── app/ or src/         # Mobile screens & navigation (Bangla-first, patient/doctor)
│       ├── package.json
│       └── app.json
├── server/                      # Node.js + Express + TypeScript backend
│   ├── prisma/                  # Versioned schema migrations & seeds
│   ├── src/
│   │   ├── controllers/         # REST API controller handlers
│   │   ├── middleware/          # Auth, ABAC, tenant isolation, rate limiting
│   │   ├── routes/              # Versioned API routes (/api/v1/...)
│   │   ├── services/            # OCR, NLP parser, antibiotic matcher, safety, storage
│   │   └── index.ts             # Express server bootstrap
│   ├── package.json
│   └── tsconfig.json
├── docs/                        # Engineering, clinical risk & governance specs
│   ├── architecture.md          # System architecture & data flow (this file)
│   ├── current-state.md         # Repository inventory & security audit
│   ├── permission-matrix.md     # RBAC & object-level authorization rules
│   ├── clinical-risk-register.md # Clinical safety hazards & mitigations
│   └── implementation-plan.md  # Sequential vertical slices & file migration plan
├── antibiotic_dose.xlsx         # Master clinical antibiotic dataset (Excel)
├── package.json                 # Monorepo root workspace configuration
└── README.md                    # Primary repository overview
```

---

## 3. High-Level System Architecture

```mermaid
flowchart TD
    subgraph Clients["Frontend Clients"]
        WebPortal["Web Portal (client/web)\nReact 19 + Vite + Tailwind\n• Patient Portal\n• Doctor Dashboard\n• Hospital Management\n• Pharmacy Portal"]
        MobileApp["Mobile App (client/mobile)\nExpo / React Native (TypeScript)\n• Offline-first Draft View\n• Mobile Camera Ingestion\n• Bangla-first UI"]
    end

    subgraph Edge["API Gateway & Security Boundary"]
        ReverseProxy["Reverse Proxy / Nginx\nTLS Termination & Rate Limiting"]
        AuthMiddleware["Server-Side Auth & ABAC\n• JWT / Session Validation\n• Object-Level Authorization\n• Tenant Isolation Middleware"]
    end

    subgraph BackendServices["Express / TypeScript Backend (server)"]
        RESTRouter["REST API Router (/api/v1)"]
        
        subgraph IngestionEngine["Ingestion & Parsing Pipeline"]
            SharpPre["Sharp Image Preprocessor\n(Grayscale, Deskew, Contrast)"]
            PopplerPDF["Poppler PDF to PNG Engine"]
            DualOCR["Dual OCR Router\n• Google Cloud Vision API\n• Local Mock Provider (Dev)"]
            NLPEngine["Multi-Line NLP Medicine Parser\n(Strength, Frequency, Duration)"]
        end

        subgraph ClinicalEngine["Clinical Decision Support Engine"]
            FuzzyMatcher["Antibiotic Matcher\n(Fast-Levenshtein + Token Overlap)"]
            StewardshipService["Antimicrobial Stewardship Rules\n(WHO AWaRe Classification)"]
            SafetyRules["Drug Interactions & Red-Flag Warnings\n(Emergency Escalation Protocol)"]
        end

        subgraph CoreBusiness["Transaction & Core Services"]
            PrescriptionService["Prescription Service\n(Draft -> Signed -> Dispensed)"]
            DispenseService["Pharmacy Dispense Engine\n(Pessimistic Row Lock & Idempotency)"]
            ConsentService["Consent & Care Relationship Manager\n(Active Consent & Instant Revocation)"]
            AuditService["Immutable Audit Logger\n(PHI Access, Overrides, Exports)"]
        end

        subgraph StorageLayer["Private Storage Layer"]
            PrivateFS["Private Object Store / Encrypted Disk\n(No Public Web Access)"]
            PresignedSigner["Short-Lived Signed URL Signer\n(TTL <= 15 minutes)"]
        end
    end

    subgraph DataStorage["Persistence Layer (PostgreSQL)"]
        PrismaORM["Prisma ORM (Versioned Migrations)"]
        PostgresDB[(PostgreSQL Database)]
    end

    Clients --> ReverseProxy
    ReverseProxy --> AuthMiddleware
    AuthMiddleware --> RESTRouter
    RESTRouter --> IngestionEngine
    RESTRouter --> ClinicalEngine
    RESTRouter --> CoreBusiness
    CoreBusiness --> StorageLayer
    CoreBusiness --> PrismaORM
    ClinicalEngine --> PrismaORM
    PrismaORM --> PostgresDB
```

---

## 4. Core Subsystems & Workflows

### 4.1 Ingestion & OCR Processing: "Draft Only" Paradigm
* **Clinical Principle**: OCR and fuzzy string matching generate **uncertain drafts only**. Algorithmic extractions are never silently converted into active prescriptions, patient charts, or medication intake schedules.
* **Dual Pipeline**:
  1. **Client-Side (Web / Mobile)**: Offline pre-validation using `tesseract.js` for instant feedback and edge processing.
  2. **Server-Side**: Canonical processing via Google Cloud Vision API preceded by `sharp` pre-processing (deskewing, contrast normalization, grayscale conversion) and `pdftoppm` for PDF ingestion.
* **Extraction Normalization**: The multi-line NLP parser matches drug entities, strengths (mg, ml, g), dosage forms (tablet, syrup, suspension, drops, injection), frequencies (`1+0+1`, `0+1+0`, `1+1+1`, OD, BD, TDS, QID), and durations (e.g. `7 days`, `৫ দিন`).

```mermaid
sequenceDiagram
    autonumber
    actor Patient as Patient / User
    participant App as Client (Web / Mobile)
    participant Server as Backend (/api/v1)
    participant Storage as Private Storage
    participant Vision as Google Cloud Vision API
    participant DB as PostgreSQL (Prisma)

    Patient->>App: Capture / Select prescription image or PDF
    App->>Server: POST /api/v1/prescriptions/draft (Multipart)
    Note over Server: Check Auth & Patient Consent
    Server->>Storage: Store file in private directory (random UUID)
    Server->>Vision: Send image buffer for Document Text Detection
    Vision-->>Server: Return full text and bounding blocks
    Server->>Server: Run multi-line NLP medicine parser
    Server->>Server: Match antibiotics via Levenshtein fuzzy matcher
    Server->>Server: Evaluate clinical safety & stewardship rules
    Server->>DB: Save PrescriptionDraft (status: DRAFT_UNREVIEWED)
    Server-->>App: Return draft with explicit "Uncertain Draft" disclaimer
    App-->>Patient: Display editable draft with clinical verification warnings
```

---

### 4.2 Clinician Review & Digital Signing Workflow
* **Clinical Principle**: An extracted draft becomes an actionable prescription **only** when a verified physician (with registered medical licensing/BMDC credentials) reviews, edits, and cryptographically signs it.
* **State Transition**: `DRAFT_UNREVIEWED` → `CLINICIAN_REVIEWED` → `SIGNED`.
* **Tamper Evident**: A SHA-256 digital hash of the clinician-verified items is generated upon signing.

```mermaid
sequenceDiagram
    autonumber
    actor Doctor as Verified Clinician
    participant App as Clinician Portal
    participant Server as Backend (/api/v1)
    participant DB as PostgreSQL

    Doctor->>App: Review Patient Draft Prescription
    App->>Server: GET /api/v1/prescriptions/:id
    Server-->>App: Return Draft + OCR raw image (short-lived URL)
    Doctor->>App: Adjust dosage, confirm indication, sign
    App->>Server: POST /api/v1/prescriptions/:id/sign
    Note over Server: Validate Doctor Role, License & Tenant Context
    Server->>DB: Update Prescription (status: SIGNED, signatureHash, signedAt: UTC)
    Server->>DB: Log to AuditLog (action: PRESCRIPTION_SIGNED)
    Server-->>App: Return confirmation with verifiable QR Token
```

---

### 4.3 Pharmacy Dispensing with Pessimistic Row Lock & Idempotency
* **Clinical Principle**: Prevent lethal duplicate dispensing of antibiotics or controlled substances across multiple pharmacies.
* **Dispensing Protocol**:
  1. Pharmacist scans QR or submits prescription verification token.
  2. Server opens an atomic PostgreSQL transaction with a pessimistic row lock (`FOR UPDATE`).
  3. Verifies current status is `SIGNED` and `dispensedStatus != FULLY_DISPENSED`.
  4. Requires `Idempotency-Key` header to prevent double submissions from network retries.
  5. Updates dispensing status to `DISPENSED`, records pharmacist ID, timestamp, and audit event within the transaction.

```mermaid
sequenceDiagram
    autonumber
    actor Pharmacist as Verified Pharmacist
    participant Portal as Pharmacy Portal
    participant Server as Backend (/api/v1)
    participant DB as PostgreSQL (Transaction)

    Pharmacist->>Portal: Scan Patient QR Token
    Portal->>Server: POST /api/v1/dispense (Idempotency-Key: UUID)
    Server->>DB: BEGIN TRANSACTION
    Server->>DB: SELECT * FROM Prescription WHERE id = :id FOR UPDATE
    alt Prescription already dispensed or invalid
        Server->>DB: ROLLBACK
        Server-->>Portal: 409 Conflict: "Already Dispensed"
    else Valid signed prescription
        Server->>DB: UPDATE Prescription SET status = 'DISPENSED'
        Server->>DB: INSERT INTO DispenseRecord (...)
        Server->>DB: INSERT INTO AuditLog (...)
        Server->>DB: COMMIT TRANSACTION
        Server-->>Portal: 200 OK: Dispense Confirmed
    end
```

---

## 5. Storage & Privacy Architecture
* **Current Vulnerability**: The current repository serves files through `app.use('/uploads', express.static(...))`, exposing all medical files to anyone with a guessed URL.
* **Target Architecture**:
  1. Files are stored in a private directory outside web roots (or in private S3/GCS buckets).
  2. Access is mediated exclusively through authenticated endpoints:
     - `GET /api/v1/prescriptions/:id/file` validates user role, patient ownership, or active clinician care relationship.
     - Files are streamed with `Cache-Control: private, no-store` or signed with short-lived tokens (TTL $\le$ 15 minutes).
  3. Files are encrypted at rest where the underlying filesystem or bucket supports KMS.

---

## 6. Internationalization & Localization (i18n)
* **Bangla-First UX**:
  - Primary UI labels, dosage instructions, and patient safety alerts are rendered in standard Bengali with clear typography.
  - Frequency patterns like `1+0+1` are translated into intuitive Bengali terms (যেমন: "সকাল ১টি + রাত ১টি, দুপুরে প্রয়োজন নেই").
* **Timestamp & Timezone Standard**:
  - All timestamps are persisted in PostgreSQL in **UTC** (`TIMESTAMPTZ`).
  - Client applications convert and display dates in **Asia/Dhaka** local time (`BST`, UTC+6).
