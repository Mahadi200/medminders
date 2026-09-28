# 🏥 MedMinders (মেডমাইন্ডার্স)
### *Next-Gen Smart Healthcare Portal & AI Prescription Scanner Platform*

[![React](https://img.shields.io/badge/React-19.1.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.3.5-646C9F?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.1.7-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tesseract.js](https://img.shields.io/badge/OCR-Tesseract.js_%7C_Cloud_Vision-009688)](https://tesseract.projectnaptha.com/)

---

## 📌 সূচিপত্র / Table of Contents
1. [Project Overview (পরিচিতি)](#-project-overview-পরিচিতি)
2. [System Architecture (সিস্টেম আর্কিটেকচার)](#-system-architecture-সিস্টেম-আর্কিটেকচার)
3. [Key Modules & Portals (প্রধান মডিউল ও পোর্টাল)](#-key-modules--portals-প্রধান-মডিউল-ও-পোর্টাল)
   - [Patient Portal & Dashboard](#1-patient-portal--dashboard-রোগীর-ড্যাশবোর্ড)
   - [Smart Prescription Scanner & OCR Engine](#2-smart-prescription-scanner--ocr-engine-প্রেসক্রিপশন-স্ক্যানার)
   - [Clinical Decision Support & Safety Engine](#3-clinical-decision-support--safety-engine-সুরক্ষা-ও-সতর্কবার্তা)
   - [Doctor Portal & Teleconsultation](#4-doctor-portal--teleconsultation-ডাক্তার-পোর্টাল)
   - [Hospital Administration Dashboard](#5-hospital-administration-dashboard-হাসপাতাল-ব্যবস্থাপনা)
   - [Pharmacy Fulfillment Portal](#6-pharmacy-fulfillment-portal-ফার্মেসি-পোর্টাল)
4. [Antibiotic Knowledge Base & XLSX Pipeline (অ্যান্টিবায়োটিক ডাটাবেজ)](#-antibiotic-knowledge-base--xlsx-pipeline)
5. [Tech Stack Breakdown (ব্যবহৃত প্রযুক্তি)](#-tech-stack-breakdown-ব্যবহৃত-প্রযুক্তি)
6. [Folder & File Structure (ফোল্ডার ও ফাইল পরিচিতি)](#-folder--file-structure-ফোল্ডার-ও-ফাইল-পরিচিতি)
7. [Installation & Getting Started (সেটআপ ও রান করার নিয়ম)](#-installation--getting-started-সেটআপ-ও-রান-করার-নিয়ম)
   - [Prerequisites](#prerequisites)
   - [Frontend Setup](#frontend-setup)
   - [Backend Setup & Database Migration](#backend-setup--database-migration)
   - [Environment Configuration](#environment-configuration)
8. [API Endpoints Reference (ব্যাকএন্ড এপিআই)](#-api-endpoints-reference-ব্যাকএন্ড-এপিআই)
9. [Medical & Regulatory Disclaimer (আইনি ও চিকিৎসা সতর্কতা)](#-medical--regulatory-disclaimer-আইনি-ও-চিকিৎসা-সতর্কতা)

---

## 📖 Project Overview (পরিচিতি)

**MedMinders** হলো একটি আধুনিক ও সমন্বিত স্মার্ট ডিজিটাল স্বাস্থ্যসেবা প্ল্যাটফর্ম। এটি রোগী, চিকিৎসক, হাসপাতাল এবং ফার্মেসি—এই চার প্রধান স্বাস্থ্যসেবা অংশীদারকে একটি নিরাপদ ও কেন্দ্রীয় ডিজিটাল ইকোসিস্টেমে সংযুক্ত করে।

প্ল্যাটফর্মটির অন্যতম প্রধান উদ্ভাবন হলো **AI Prescription Scanner & Antimicrobial Safety Engine**। এটি প্রেসক্রিপশন ইমেজ বা পিডিএফ থেকে স্বয়ংক্রিয়ভাবে ঔষধের নাম, ডোজ, সেবনবিধি (`1+0+1`, দিনে ২ বার ইত্যাদি), এবং সময়কাল বিশ্লেষণ করে। একই সাথে অ্যান্টিবায়োটিক শনাক্তকরণ, সম্পূর্ণ কোর্স সম্পন্ন করার নির্দেশিকা, ক্ষতিকর ড্রাগ-ইন্টারঅ্যাকশন এবং জরুরি রেড-ফ্ল্যাগ উপসর্গ শনাক্ত করে তাৎক্ষণিক রোগী সুরক্ষা নিশ্চিত করে।

---

## 🏛 System Architecture (সিস্টেম আর্কিটেকচার)

```mermaid
flowchart TD
    subgraph Frontend["React 19 Frontend (Vite + Tailwind CSS v4)"]
        UI["Modern UI / Portals\n(Patient, Doctor, Hospital, Pharmacy)"]
        ClientOCR["Client-side OCR\n(Tesseract.js Engine)"]
        LocalParser["Client Medicine Parser &\nSafety Advisory Rules"]
    end

    subgraph Backend["Express + TypeScript Backend"]
        API["REST API Router\n(/api/prescriptions, /api/antibiotics, /api/admin)"]
        Preproc["Image Preprocessor\n(Sharp: Grayscale, Deskew, Contrast)"]
        CloudOCR["Cloud OCR Provider\n(Google Cloud Vision API / Mock Fallback)"]
        ServerParser["NLP Medicine Parser\n(Dosage, Frequency, Duration)"]
        FuzzyMatcher["Antibiotic Matcher\n(Fast-Levenshtein Fuzzy Search)"]
        SafetyRules["Clinical Safety Engine\n(Stewardship, Red Flags, Interactions)"]
        XLSXImporter["XLSX Ingestion Pipeline\n(antibiotic_dose.xlsx Forward-Fill Parser)"]
    end

    subgraph Database["Data Layer"]
        Postgres[(PostgreSQL Database)]
        PrismaORM["Prisma ORM (Schema & Seed)"]
        BundledData["antibiotics.json (Client Fallback)"]
    end

    UI --> ClientOCR
    UI --> API
    ClientOCR --> LocalParser
    LocalParser --> BundledData
    API --> Preproc --> CloudOCR --> ServerParser --> FuzzyMatcher --> SafetyRules
    API --> XLSXImporter --> PrismaORM --> Postgres
    SafetyRules --> PrismaORM
```

---

## 🚀 Key Modules & Portals (প্রধান মডিউল ও পোর্টাল)

### 1. Patient Portal & Dashboard (রোগীর ড্যাশবোর্ড)
* **রুট**: `/patient-login`
* **স্বাস্থ্য তথ্য ও ভাইটালস**: রোগীর বয়স, রক্তের গ্রুপ, উচ্চতা, ওজন এবং পূর্ববর্তী ভিজিটের তথ্য প্রদর্শন।
* **চলমান প্রেসক্রিপশন ট্র্যাকিং**: বর্তমানে প্রেসক্রাইব করা প্রতিটি ঔষধের ডোজ, সেবনবিধি, উদ্দেশ্য এবং সময়কাল প্রদর্শন।
* **ডায়াগনস্টিক টেস্ট রিপোর্টস**: CBC (WBC, RBC, Hemoglobin, Platelets), Urine Culture (ব্যাকটেরিয়া সংবেদনশীলতা), HbA1c ইত্যাদি রিপোর্টের ডিজিটাল রেকর্ড সংরক্ষণ।

### 2. Smart Prescription Scanner & OCR Engine (প্রেসক্রিপশন স্ক্যানার)
* **মাল্টি-ফরম্যাট ইনপুট**: মোবাইল ক্যামেরা বা গ্যালারি থেকে সরাসরি ছবি (JPG, PNG, WebP), পিডিএফ ফাইল অথবা হাতে লেখা টেক্সট সরাসরি পেস্ট করার সুবিধা।
* **ডুয়াল-লেয়ার ওসিআর (Dual OCR Engine)**:
  1. **ক্লায়েন্ট সাইড**: ব্রাউজারে ইনস্ট্যান্ট অফলাইন প্রসেসিংয়ের জন্য `tesseract.js` ও লাইভ প্রোগ্রেস বার।
  2. **সার্ভার সাইড**: হাই-এক্যুরেসি প্রসেসিংয়ের জন্য Google Cloud Vision API ও `sharp` ইমেজ প্রি-প্রসেসিং।
* **বুদ্ধিমান মেডিসিন পার্সার (Medicine NLP Parser)**:
  - **ঔষধের নাম ও ধরন**: ট্যাবলেট (Tab), ক্যাপসুল (Cap), সিরাপ (Syr), ইনজেকশন (Inj), ড্রপস ইত্যাদি।
  - **শক্তি (Strength)**: `500mg`, `850mg`, `20mg`, `100ml` ইত্যাদি স্বয়ংক্রিয়ভাবে ফিল্টার করে।
  - **ফ্রিকোয়েন্সি (Frequency)**: প্রেসক্রিপশনের বহুল ব্যবহৃত নির্দেশনা যেমন `1+0+1` (সকাল ও রাত), `0+1+0`, `1+1+1`, `OD`, `BD`, `TDS`, `QID`, `At bedtime` ইত্যাদি সহজ ভাষায় রূপান্তর।
  - **সময়কাল (Duration)**: `7 days`, `x 5 days`, বাংলা সংখ্যায় `৭ দিন`, `১৪ দিন` ইত্যাদি শনাক্তকরণ।
  - **খাবারের নিয়ম**: খাবারের আগে বা পরে খাওয়ার সুনির্দিষ্ট সময়সূচী।

### 3. Clinical Decision Support & Safety Engine (সুরক্ষা ও সতর্কবার্তা)
* **অ্যান্টিমাইক্রোবিয়াল স্টুয়ার্ডশিপ (Antimicrobial Stewardship)**:
  - অ্যান্টিবায়োটিক ব্যবহারের ক্ষেত্রে কোর্স সম্পূর্ণ করার সতর্কবার্তা।
  - সময়কাল (Duration) অনুপস্থিত থাকলে চিকিৎসকের সাথে যাচাই করার নির্দেশ।
  - অপ্রয়োজনীয় বা যথেচ্ছ অ্যান্টিবায়োটিক রোধে সতর্কবার্তা।
* **রেড ফ্ল্যাগ ও জরুরি উপসর্গ ডিটেকশন (Red Flag Alerts)**:
  - অ্যানাফিল্যাক্সিস, তীব্র শ্বাসকষ্ট, গায়ে ফুসকুড়ি, উচ্চ জ্বর ইত্যাদি পার্শ্বপ্রতিক্রিয়া শনাক্ত হলে তাৎক্ষণিক হাসপাতালে যাওয়ার লাল সতর্কবার্তা।
* **ড্রাগ-ড্রাগ ইন্টারঅ্যাকশন (Drug-Drug Interactions)**:
  - একাধিক ঔষধের মধ্যে কোনো ক্ষতিকর প্রতিক্রিয়া (Contraindication) থাকলে ব্যবহারকারীকে অবহিত করা।

### 4. Doctor Portal & Teleconsultation (ডাক্তার পোর্টাল)
* **রুট**: `/DoctorAuth`, `/doctor-layout`
* **ডাক্তার ভেরিফিকেশন ও রেজিস্ট্রেশন**: নাম, বিএমডিসি/মেডিকেল লাইসেন্স নম্বর, হাসপাতাল অ্যাফিলিয়েশন এবং স্পেশালিটি দিয়ে নিরাপদ অথেনটিকেশন।
* **কনসাল্টেশন ড্যাশবোর্ড**: দৈনিক রোগীর সিরিয়াল, চিকিৎসা ইতিহাস পর্যালোচনা, ডিজিটাল প্রেসক্রিপশন জেনারেশন ও প্রেসক্রিপশন হিস্ট্রি ট্র্যাকিং।

### 5. Hospital Administration Dashboard (হাসপাতাল ব্যবস্থাপনা)
* **রুট**: `/hospital-login`
* **অপারেশনাল মেট্রিক্স**: মোট বেড সংখ্যা, ভর্তি রোগী, আইসিইউ অকুপেন্সি ও জরুরি বিভাগ ম্যানেজমেন্ট।
* **অন-ডিউটি ডাক্তার ও স্টাফ ম্যানেজমেন্ট**: বিভিন্ন ডিপার্টমেন্টের (কার্ডিওলজি, মেডিসিন, পেডিয়াট্রিক ইত্যাদি) ডিউটি শিডিউল।

### 6. Pharmacy Fulfillment Portal (ফার্মেসি পোর্টাল)
* **রুট**: `/pharmacy-login`
* **প্রেসক্রিপশন ডিসপেন্সিং**: প্রেসক্রিপশন ভেরিফাই করে সঠিক ঔষধ ডিসপেন্স ও রেকর্ড আপডেট।
* **ইনভেন্টরি ও স্টক অ্যালার্ট**: অ্যান্টিবায়োটিক ও জীবনরক্ষাকারী ঔষধের মজুদ পর্যবেক্ষণ ও এক্সপায়ারি ট্র্যাকিং।

---

## 📊 Antibiotic Knowledge Base & XLSX Pipeline

প্রজেক্টের রুটে সংরক্ষিত `antibiotic_dose.xlsx` এক্সেল ফাইলটি ব্যবহার করে একটি সমৃদ্ধ অ্যান্টিবায়োটিক জ্ঞানভাণ্ডার পরিচালিত হয়।

### এক্সেল ফিল্ড ম্যাপিং (Bengali to Schema):
| এক্সেল কলাম (বাংলা) | ডাটাবেজ ফিল্ড | বিবরণ |
|-------------------|-------------|-------|
| **জেনেরিক নাম** | `genericName` | মূল সক্রিয় উপাদানের নাম (যেমন: Ciprofloxacin, Azithromycin) |
| **গ্রুপ (শ্রেণিবিভাগ)** | `group` | অ্যান্টিবায়োটিক শ্রেণি (যেমন: Fluoroquinolone, Macrolide) |
| **কমার্শিয়াল নাম (উদাহরণ)** | `brandNames` | বাজারে প্রচলিত ব্র্যান্ড (যেমন: Ciprocin, Neofloxin) |
| **কোম্পানি (উদাহরণ)** | `companies` | প্রস্তুতকারক প্রতিষ্ঠান (যেমন: Square, Beximco, Incepta) |
| **ব্যবহারের ক্ষেত্রে প্রধান বয়সসীমা ও বিবেচনা** | `ageConsiderations` | শিশু, প্রাপ্তবয়স্ক ও গর্ভবতীদের ক্ষেত্রে ব্যবহারের নিয়মাবলী |
| **Dose & Duration (ডোজ ও সময়কাল)** | `doseDuration` | নির্দেশিত ডোজের মাত্রা ও কোর্স সময়কাল |
| **Side Effects (সাইড ইফেক্ট)** | `sideEffects` | পরিচিত পার্শ্বপ্রতিক্রিয়া ও সতর্কতা |

### স্মার্ট নরমালাইজেশন লজিক:
1. **Forward-Fill Algorithim**: এক্সেলে একাধিক ব্র্যান্ডের জন্য জেনেরিক নামের ঘর ফাঁকা থাকলে স্বয়ংক্রিয়ভাবে পূর্ববর্তী মান ধরে ডাটা নরমালাইজ করা হয়।
2. **Fuzzy Brand Matching**: `fast-levenshtein` অ্যালগরিদম ব্যবহার করে বানান সামান্য ভুল বা প্রেসক্রিপশনের অস্পষ্ট হাতের লেখার সাথে ব্র্যান্ড ও জেনেরিক নাম ম্যাচ করা হয়।

---

## 💻 Tech Stack Breakdown (ব্যবহৃত প্রযুক্তি)

### Frontend (ক্লায়েন্ট)
* **কোর ফ্রেমওয়ার্ক**: React 19, Vite 6
* **রাউটিং**: React Router DOM v7
* **স্টাইলিং**: Tailwind CSS v4, PostCSS
* **অ্যানিমেশন ও ইউআই**: Framer Motion, Motion, Keen Slider, React Icons
* **3D ও ভিজ্যুয়াল ইফেক্টস**: Three.js, React Three Fiber (`@react-three/fiber`), Drei (`@react-three/drei`), tsparticles
* **ক্লায়েন্ট ওসিআর**: Tesseract.js (Web Worker ভিত্তিক অপটিক্যাল ক্যারেক্টার রিকগনিশন)

### Backend (সার্ভার)
* **রানটাইম ও ফ্রেমওয়ার্ক**: Node.js, Express.js (ES Module + TypeScript)
* **টাইপসেফটি ও কম্পাইলার**: TypeScript, `tsx`
* **ইমেজ প্রসেসিং**: Sharp (কনট্রাস্ট বৃদ্ধি, গ্রেস্কেল কনভার্সন, নয়েজ রিডাকশন)
* **পিডিএফ এক্সট্রাকশন**: Poppler (`pdftoppm`)
* **ক্লাউড ওসিআর**: `@google-cloud/vision` (Enterprise Document Text Detection)
* **ফাইল হ্যান্ডলিং ও স্প্রেডশিট**: Multer, SheetJS (`xlsx`)
* **স্ট্রিং ডিসট্যান্স**: `fast-levenshtein` (অস্পষ্ট বানানের জন্য ফাজি অ্যালগরিদম)

### Database & ORM
* **ডাটাবেজ**: PostgreSQL
* **ওআরএম**: Prisma ORM (Schema, Push, Migrate, Seeding)

---

## 📁 Folder & File Structure (ফোল্ডার ও ফাইল পরিচিতি)

```text
MedMinders/
├── .git/                               # Git version control
├── antibiotic_dose.xlsx                # Clinical antibiotics master dataset (Excel)
├── eslint.config.js                    # ESLint configuration
├── index.html                          # Single-page application root HTML
├── package.json                        # Frontend dependencies & scripts
├── package-lock.json                   # Locked dependency tree
├── PRESCRIPTION_SCANNER_README.md      # Scanner-specific technical notes
├── README.md                           # Main project documentation (this file)
├── vercel.json                         # Vercel deployment configuration
├── vite.config.js                      # Vite bundler & Tailwind v4 plugin config
│
├── public/                             # Public static assets
│   └── image/assets/                   # UI graphics and static branding assets
│
├── src/                                # Frontend application source
│   ├── App.jsx                         # Main router definition & global loader
│   ├── index.css                       # Global styles & Tailwind imports
│   ├── main.jsx                        # React root entry point
│   ├── components/
│   │   └── home/
│   │       ├── DoctorAuth.jsx          # Doctor login/registration modal & form
│   │       ├── DoctorsSection.jsx      # Doctor directory cards with images
│   │       ├── Footer.jsx              # Application footer
│   │       ├── HelpDesk.jsx            # Interactive customer support widget
│   │       ├── Hero.jsx                # 3D interactive hero banner
│   │       ├── HeroHelpDesk.jsx        # Combined hero & support section
│   │       ├── MediMindersLoader.jsx   # Animated platform splash screen
│   │       ├── Navbar.jsx              # Top navigation bar
│   │       ├── PatientFeedback.jsx     # Testimonial carousel
│   │       ├── Doctor/                 # Doctor portal layouts & dashboard
│   │       │   ├── DashboardContent.jsx
│   │       │   ├── DocDashboard.jsx
│   │       │   ├── DocLayout.jsx
│   │       │   └── DoctorLayout.jsx
│   │       ├── Hospital/               # Hospital management portal
│   │       │   └── MedMindersHospitalDashboard.jsx
│   │       ├── Patient/                # Patient dashboard & scanner interface
│   │       │   ├── PatientDashboard.jsx
│   │       │   ├── PrescriptionUploadModal.jsx
│   │       │   └── PrescriptionResults.jsx
│   │       ├── Pharmacy/               # Pharmacy management portal
│   │       │   └── PharmacyDashboard.jsx
│   │       └── image/                  # Profile & doctor portrait assets (d1.jpg - d6.JPG)
│   ├── data/
│   │   └── antibiotics.json            # Client-bundled antibiotic dataset
│   ├── pages/
│   │   ├── AboutPage.jsx               # About MedMinders platform
│   │   ├── Contact.jsx                 # Contact form & helpline
│   │   ├── Home.jsx                    # Landing page
│   │   └── ServicesPage.jsx            # Detailed services catalog
│   └── utils/
│       ├── antibioticMatcher.js        # Client-side fuzzy antibiotic search
│       ├── medicineParser.js           # Client-side regex & NLP parser
│       └── safetyAlerts.js             # Antimicrobial & red-flag safety logic
│
└── server/                             # Backend API source (Node.js + TS)
    ├── package.json                    # Backend dependencies & scripts
    ├── tsconfig.json                   # TypeScript configuration
    ├── .env                            # Environment variables (DB, GCP credentials)
    ├── prisma/
    │   ├── schema.prisma               # Prisma data models (User, PrescriptionScan, Antibiotic)
    │   └── seed.ts                     # Database seeder script
    └── src/
        ├── index.ts                    # Express app server entry point
        ├── controllers/
        │   └── prescriptionsController.ts # Prescription upload & scan handlers
        ├── routes/
        │   ├── admin.ts                # Admin XLSX import endpoints
        │   ├── antibiotics.ts          # Antibiotic search endpoints
        │   └── prescriptions.ts        # Prescription processing endpoints
        └── services/
            ├── storage.ts              # Local & temporary file storage
            ├── antibiotics/
            │   ├── matcher.ts          # Levenshtein distance matcher
            │   └── xlsxImport.ts       # Excel reader & forward-fill normalizer
            ├── ocr/
            │   ├── googleVisionProvider.ts # Google Cloud Vision integration
            │   ├── mockOcrProvider.ts  # Offline mock OCR provider
            │   ├── imagePreprocessor.ts # Sharp image enhancement
            │   ├── pdfToImage.ts       # PDF to image rendering via poppler
            │   ├── types.ts            # OCR interfaces & types
            │   └── index.ts            # OCR provider factory
            ├── parser/
            │   ├── medicineParser.ts   # Core NLP parser for prescription text
            │   └── medicineParser.test.ts # Parser test suites
            └── safety/
                ├── interactions.ts     # Drug contraindication checks
                ├── redFlags.ts         # High-risk symptom detector
                └── stewardship.ts      # Antibiotic stewardship rules
```

---

## 🛠 Installation & Getting Started (সেটআপ ও রান করার নিয়ম)

### Prerequisites
* **Node.js**: v18.0.0 বা তার বেশি (Node v20+ বা v22+ রেকমেন্ডেড)
* **npm** বা **yarn**
* **PostgreSQL**: লোকাল ডাটাবেজ ইনস্ট্যান্স অথবা ক্লাউড ডাটাবেজ (Supabase, Neon, AWS RDS ইত্যাদি)
* *(ঐচ্ছিক - PDF সাপোর্টের জন্য)*: `poppler-utils`
  * **Ubuntu/Debian**: `sudo apt update && sudo apt install -y poppler-utils`
  * **macOS**: `brew install poppler`
  * **Windows**: Poppler binaries ডাউনলোড করে Environment `PATH` এ যুক্ত করুন।

---

### 1. Frontend Setup
প্রজেক্টের রুট ডিরেক্টরি থেকে:

```bash
# ১. ডিপেনডেন্সি ইনস্টল করুন
npm install

# ২. ডেভেলপমেন্ট সার্ভার চালু করুন
npm run dev
```
ব্রাউজারে ভিজিট করুন: `http://localhost:5173`

---

### 2. Backend Setup & Database Migration
সার্ভার চালু করার জন্য পৃথক টার্মিনালে:

```bash
# ১. server ফোল্ডারে প্রবেশ করুন
cd server

# ২. ব্যাকএন্ড ডিপেনডেন্সি ইনস্টল করুন
npm install

# ৩. Environment ফাইল কনফিগার করুন (.env)
```

`server/.env` ফাইলে আপনার ডাটাবেজের ইউআরএল দিন:
```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/medminders?schema=public"
PORT=4000
GOOGLE_APPLICATION_CREDENTIALS="./gcp-credentials.json" # ঐচ্ছিক (না থাকলে Mock OCR চলবে)
```

```bash
# ৪. প্রিজমা স্কিমা ডাটাবেজে পুশ করুন
npx prisma db push

# ৫. অ্যান্টিবায়োটিক প্রাথমিক ডাটা সিড করুন
npx prisma db seed

# ৬. ব্যাকএন্ড ডেভেলপমেন্ট সার্ভার রান করুন
npm run dev
```
ব্যাকএন্ড সার্ভার চালু হবে: `http://localhost:4000`

---

## 📡 API Endpoints Reference (ব্যাকএন্ড এপিআই)

| Method | Endpoint | Description | Auth / Access |
|---|---|---|---|
| `POST` | `/api/prescriptions/upload` | প্রেসক্রিপশন ইমেজ বা পিডিএফ ফাইল আপলোড | Public / Patient |
| `POST` | `/api/prescriptions/scan` | আপলোডকৃত ফাইল থেকে OCR, NLP পার্সিং ও সেফটি চেক সম্পন্নকরণ | Public / Patient |
| `GET` | `/api/prescriptions/:id` | নির্দিষ্ট প্রেসক্রিপশনের স্ক্যান রেজাল্ট ও এনালাইসিস প্রদর্শন | Public / Patient |
| `GET` | `/api/antibiotics/search?q=` | জেনেরিক বা ব্র্যান্ড নাম দিয়ে অ্যান্টিবায়োটিক সার্চ | Public / Search |
| `POST` | `/api/admin/antibiotics/import-xlsx` | `antibiotic_dose.xlsx` ফাইল আপলোড করে ডাটাবেজ রিফ্রেশ | Admin Only |

---

## ⚖️ Medical & Regulatory Disclaimer (আইনি ও চিকিৎসা সতর্কতা)

> [!WARNING]
> **শুধুমাত্র শিক্ষামূলক ও সহায়তামূলক ব্যবহারের জন্য (For Educational & Informational Use Only)**
> 
> ১. **MedMinders** কোনো চিকিৎসক বা নিবন্ধিত চিকিৎসালয়ের বিকল্প নয়।
> 
> ২. প্রেসক্রিপশন স্ক্যানার এবং এআই ইঞ্জিন দ্বারা প্রাপ্ত তথ্য কেবল রোগীর ধারণার জন্য। যেকোনো ঔষধ গ্রহণ, বন্ধ করা বা পরিবর্তন করার পূর্বে অবশ্যই নিবন্ধিত চিকিৎসকের (MBBS/Specialist) পরামর্শ গ্রহণ করুন।
> 
> ৩. কোনো রোগীর যদি অ্যানাফিল্যাক্সিস, তীব্র শ্বাসকষ্ট, বুকে ব্যথা বা অন্য কোনো জরুরি জটিলতা দেখা দেয়, তবে সফটওয়্যারের ফলাফলের ওপর নির্ভর না করে সরাসরি নিকটস্থ হাসপাতালের জরুরি বিভাগে যোগাযোগ করুন।

---

## 👨‍💻 Contributing & License

* **License**: MIT License
* **Repository**: [Mahadi200/medminders](https://github.com/Mahadi200/medminders)
* Developed with ❤️ for smarter, safer healthcare.
