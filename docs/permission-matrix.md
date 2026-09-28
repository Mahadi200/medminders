# 🔐 MedMinders Permission Matrix & Authorization Specification

## 1. System Roles & Access Hierarchy

| Role Code | Role Name | Verification Requirement | Core Domain & Boundaries |
|---|---|---|---|
| `PATIENT` | Registered Patient | Email / Phone OTP | Personal PHI, own prescription drafts, own diagnostic tests, consent management. |
| `REPRESENTATIVE` | Patient Caregiver / Legal Guardian | Consent Grant Verification | Scoped delegated access to designated dependent’s records. **Has zero standalone clinical data**. |
| `DOCTOR_UNVERIFIED` | Registered Medical Practitioner | Pending Credential Verification | Profile management, view demo dashboard. **Cannot access patient charts or sign prescriptions**. |
| `DOCTOR_VERIFIED` | Licensed Physician | Verified BMDC / Medical Council License | Patient chart review under active care relationship, review OCR drafts, digital prescription signing. |
| `PHARMACIST_UNVERIFIED`| Pharmacy Staff | Pending Pharmacy License Verification | Inventory views. **Cannot confirm dispensing of prescriptions**. |
| `PHARMACIST_VERIFIED`| Licensed Pharmacist | Verified Pharmacy License | Scoped verification of signed prescriptions via QR/Token; confirm dispensing with row lock. **No broad chart access**. |
| `HOSPITAL_ADMIN` | Clinic / Hospital Administrator | Facility Admin Credentials | Operational metrics, staffing, department allocations. **No unrestricted patient medical records access**. |
| `SUPERADMIN` | Platform Security Officer | MFA + Hardware Key / VPN | System health, tenant provisioning, master antibiotic dataset ingestion, audit inspection. |

---

## 2. Multi-Tenancy & Care Relationship Isolation

### 2.1 Tenant Boundaries
* Hospitals and medical centers operate under strict multi-tenant boundaries (`tenantId`).
* Operational records (departments, doctor shift rotas, bed allocations) are isolated by `tenantId`.
* A patient’s global identity persists across the platform, but access by clinical staff requires:
  1. Affiliation with the patient’s active consultation hospital/clinic (`tenantId`), **AND**
  2. An active, unexpired care relationship or emergency referral.

### 2.2 Patient Consent & Immediate Revocation
* Delegated access (Representative) or provider access (Doctor/Hospital) requires an active `ConsentRecord`:
  - `status`: `ACTIVE` | `REVOKED` | `EXPIRED`
  - `expiresAt`: UTC timestamp
* **Revocation Rule**: If a patient or guardian sets `status = REVOKED`, the server evaluates this condition immediately on the next request. Cached authorization tokens for delegated users are immediately invalidated via Redis/DB blacklist checks.

### 2.3 Scoped QR / Verification Tokens for Pharmacies
* To dispense medication, the patient provides a scoped `VerificationToken` (encoded in a QR code).
* **Scope Restriction**: The token allows a `PHARMACIST_VERIFIED` to:
  1. Retrieve *only* the specific signed prescription order.
  2. View active prescribed medication names, dosages, durations, and prescribing doctor’s verification status.
* **Prohibition**: The pharmacy token **never** grants access to the patient's full medical history, diagnostic lab reports (e.g. CBC, HbA1c), or unrelated past prescriptions.

---

## 3. Comprehensive Endpoint Permission Matrix (`/api/v1`)

| Method | Endpoint | Required Role | Object-Level Authorization Rule (ABAC) | Audit Log Event |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Public | None (rate limited) | `AUTH_LOGIN_SUCCESS` / `FAILURE` |
| `POST` | `/api/v1/auth/register` | Public | Role self-selection (clinical roles default to unverified) | `USER_REGISTERED` |
| `GET` | `/api/v1/patient/profile` | `PATIENT`, `REPRESENTATIVE` | `req.user.id == target.id` OR active guardian consent | `PHI_VIEW_PROFILE` |
| `PUT` | `/api/v1/patient/profile` | `PATIENT`, `REPRESENTATIVE` | `req.user.id == target.id` OR active guardian consent | `PHI_UPDATE_PROFILE` |
| `POST` | `/api/v1/prescriptions/upload` | `PATIENT`, `DOCTOR_VERIFIED` | Upload for self OR patient in active consultation | `PRESCRIPTION_UPLOADED` |
| `POST` | `/api/v1/prescriptions/scan` | `PATIENT`, `DOCTOR_VERIFIED` | Must own upload record or have active care relationship | `OCR_SCAN_REQUESTED` |
| `GET` | `/api/v1/prescriptions/:id` | `PATIENT`, `REPRESENTATIVE`, `DOCTOR_VERIFIED` | `prescription.patientId == req.user.id` OR active care relationship | `PHI_VIEW_PRESCRIPTION` |
| `GET` | `/api/v1/prescriptions/:id/file`| `PATIENT`, `DOCTOR_VERIFIED` | Authenticated stream / signed URL. Same ownership check | `PHI_DOWNLOAD_FILE` |
| `POST` | `/api/v1/prescriptions/:id/sign` | `DOCTOR_VERIFIED` | Doctor assigned to consultation; prescription must be unreviewed/draft | `PRESCRIPTION_SIGNED` |
| `POST` | `/api/v1/dispense/verify-token` | `PHARMACIST_VERIFIED` | Scoped token validation (unexpired, matching prescription) | `PHARMACY_VERIFY_TOKEN` |
| `POST` | `/api/v1/dispense/confirm` | `PHARMACIST_VERIFIED` | Pessimistic row lock (`FOR UPDATE`), must be `SIGNED`, `Idempotency-Key` present | `MEDICATION_DISPENSED` |
| `GET` | `/api/v1/antibiotics/search` | Any authenticated user | Public catalog search (no PHI) | None |
| `POST` | `/api/v1/admin/antibiotics/import-xlsx` | `SUPERADMIN` | Superadmin privilege required; input validation on `.xlsx` | `ANTIBIOTIC_DATASET_IMPORTED` |
| `POST` | `/api/v1/consent/revoke` | `PATIENT` | `consent.patientId == req.user.id` | `CONSENT_REVOKED` |
| `GET` | `/api/v1/audit/logs` | `SUPERADMIN`, `HOSPITAL_ADMIN` (tenant-scoped) | Tenant isolation applied | `AUDIT_LOG_EXPORT` |

---

## 4. Representative Role Safeguards
* **Zero Autonomous Clinical Records**: A representative user has an account purely for authorization delegation. They cannot store their own personal health data under the representative persona.
* **Prohibited Actions for Representatives**:
  - Cannot grant third-party consent to external research entities.
  - Cannot sign clinical prescriptions.
  - Cannot access patient data once the patient reaches the legal age of majority without refreshed explicit adult consent.
