# MedMinders Legacy Data Migration Path & Delta Reference

## Overview
This document preserves the delta migration and mapping strategy used to transition legacy MedMinders datasets (e.g., prototype SQLite/PostgreSQL schemas with unverified roles, flat permissions, and unreviewed OCR scans) into the canonical Clinical & Security Schema.

---

## 1. Why the Delta Was Not Applied to Empty Supabase
The original migration (`20260926100000_clinical_schema_evolution`) was authored as an `ALTER TABLE` delta against an existing database containing legacy tables (`User`, `PrescriptionScan`, `Antibiotic`, `PrescriptionUpload`).
Applying that delta to a fresh PostgreSQL database fails immediately because `relation "User" does not exist`.

For greenfield deployments and fresh environments (including our Supabase project), MedMinders uses `20260927000000_init_clinical_schema`, which creates all 20 canonical tables, 13 enums, indexes, foreign keys, and 5 clinical CHECK constraints from scratch.

---

## 2. Legacy Schema Assumptions
The legacy database contained:
- `User` with a plain string column `role` ('patient' | 'doctor' | 'admin'), no password hash, and no verified role assignments.
- `PrescriptionScan` without an explicit `scanStatus` column (risk of treating draft OCR as verified clinical records).
- `Antibiotic` without WHO AWaRe classification columns (`awareCategory`, `whoListingUrl`).
- `PrescriptionUpload` as a raw file pointer without cryptographic integrity or authorization tracking.

---

## 3. Data Mapping & Ingestion Procedures for Legacy Datasets

When importing data from legacy systems or spreadsheets into the canonical schema:

### A. Users & Roles
1. Insert legacy users into `public."User"`:
   - Map legacy `role` into `legacyRole` column.
   - Generate `id`, copy `email` and `phoneNumber`.
2. Insert role assignments into `public."UserRoleAssignment"`:
   - For `legacyRole = 'patient'`: assign `role = 'PATIENT'`, `isVerified = true`.
   - For `legacyRole = 'doctor'`: assign `role = 'DOCTOR'`, `isVerified = false` (requires BMDC credential verification before clinical write operations).
   - For `legacyRole = 'admin'`: assign `role = 'HOSPITAL_ADMIN'` or `SUPERADMIN` with verification pending admin review.

### B. Prescription Scans & Safety Isolation
1. Insert uploads into `public."PrescriptionUpload"`.
2. Insert OCR scans into `public."PrescriptionScan"`.
   - **MANDATORY**: Set `scanStatus = 'DRAFT_UNREVIEWED'`.
   - **RULE**: An OCR scan must NEVER be directly converted to a `Prescription` with status `SIGNED` during import. A verified clinician must explicitly review and sign the draft.

### C. Antibiotic Master Knowledge Base
1. Insert antibiotic records into `public."Antibiotic"`.
2. Set `awareCategory = 'UNCLASSIFIED'` for unmatched rows; update with WHO AWaRe list (`ACCESS`, `WATCH`, `RESERVE`) via verified XLSX stewardship imports.

---

## 4. Historical Delta SQL Reference
The original legacy-to-target migration SQL is preserved below for reference when executing in-place upgrades of legacy database instances:

```sql
-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('PATIENT', 'CAREGIVER', 'DOCTOR', 'PHARMACIST', 'HOSPITAL_ADMIN', 'SUPERADMIN');
CREATE TYPE "OrganizationType" AS ENUM ('HOSPITAL', 'CLINIC', 'PHARMACY', 'DIAGNOSTIC');
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED');
CREATE TYPE "RelationshipType" AS ENUM ('ATTENDING', 'CONSULTING', 'EMERGENCY_REFERRAL');
CREATE TYPE "CaregiverRelation" AS ENUM ('PARENT', 'SPOUSE', 'CHILD', 'LEGAL_GUARDIAN');
CREATE TYPE "ConsentStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE "ConsentPurpose" AS ENUM ('CLINICAL_CARE', 'DISPENSING', 'DIAGNOSTIC_REVIEW');
CREATE TYPE "ConsultationStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "PrescriptionStatus" AS ENUM ('DRAFT_UNREVIEWED', 'CLINICIAN_REVIEWED', 'SIGNED', 'DISPENSED', 'CANCELLED');
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "AlertType" AS ENUM ('STEWARDSHIP', 'RED_FLAG', 'INTERACTION', 'ALLERGY');
CREATE TYPE "DispenseStatus" AS ENUM ('PARTIAL', 'COMPLETED', 'REJECTED');
CREATE TYPE "AwareCategory" AS ENUM ('ACCESS', 'WATCH', 'RESERVE', 'UNCLASSIFIED');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "legacyRole" TEXT,
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "phoneNumber" TEXT;

-- AlterTable
ALTER TABLE "PrescriptionScan" ADD COLUMN     "scanStatus" TEXT NOT NULL DEFAULT 'DRAFT_UNREVIEWED';

-- AlterTable
ALTER TABLE "Antibiotic" ADD COLUMN     "awareCategory" "AwareCategory" NOT NULL DEFAULT 'UNCLASSIFIED',
ADD COLUMN     "whoListingUrl" TEXT;

-- (Remaining tables, indexes, and constraints as created in 20260927000000_init_clinical_schema)
```
