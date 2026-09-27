# MedMinders API Versioning & Legacy Route Retirement Plan

## 1. Versioning Architecture
MedMinders adopts canonical URI path versioning for all public and internal service interfaces.
The current active canonical API is:
```text
/api/v1/*
```

All new endpoints, clinical schemas, and authentication flows must be introduced under `/api/v1`.

---

## 2. Legacy Route Aliasing & Compatibility Guarantees

To ensure continuous operation for existing mobile and web clients without introducing security regressions, legacy unversioned routes (`/api/*`) are preserved **exclusively as authenticated, object-authorized aliases** to their `/api/v1` equivalents:

| Legacy Route | Canonical Successor | Security & Authorization Policy |
| :--- | :--- | :--- |
| `POST /api/auth/login` | `POST /api/v1/auth/login` | Rate-limited (10 req/15min), audit-logged |
| `POST /api/auth/refresh` | `POST /api/v1/auth/refresh` | Replay-detection, session family rotation |
| `POST /api/auth/logout` | `POST /api/v1/auth/logout` | Session revocation, audit-logged |
| `GET /api/auth/me` | `GET /api/v1/auth/me` | Bearer token authentication required |
| `POST /api/prescriptions/upload` | `POST /api/v1/prescriptions/upload` | Patient authentication, rate-limited |
| `POST /api/prescriptions/scan` | `POST /api/v1/prescriptions/scan` | Strict invariant: creates `DRAFT_UNREVIEWED` |
| `GET /api/prescriptions/:id` | `GET /api/v1/prescriptions/:id` | Object-level authorization (patient/clinician) |
| `POST /api/prescriptions/:id/sign` | `POST /api/v1/prescriptions/:id/sign` | Doctor credential verification, ECDSA signature |
| `GET /api/prescriptions/verify/:token` | `GET /api/v1/prescriptions/verify/:token` | Pharmacist verification, data-minimized |
| `GET /api/files/:fileId` | `GET /api/v1/files/:fileId` | Medical file streaming with audit logging |
| `GET /api/antibiotics` | `GET /api/v1/antibiotics` | Bounded pagination (default 20, max 100) |
| `POST /api/admin/antibiotics/import-xlsx` | `POST /api/v1/admin/antibiotics/import-xlsx` | Verified admin role required |

Every response served through a legacy `/api/*` route includes standard RFC 8594 / RFC 9213 deprecation headers:
```http
Deprecation: true
Sunset: Sun, 01 Nov 2026 00:00:00 GMT
Link: </api/v1/prescriptions/upload>; rel="successor-version"
```

---

## 3. Deprecation & Sunset Timeline

* **Phase 1: Dual Support & Notification (September 2026 - October 2026)**
  * Legacy endpoints remain fully functional with deprecation headers.
  * Web and mobile clients are migrated to `/api/v1`.
  * Telemetry tracks legacy route caller volume.

* **Phase 2: Final Warning Window (October 2026)**
  * Audit logging flags remaining client applications still invoking legacy paths.
  * Direct client notifications issued for any outdated builds.

* **Phase 3: Formal Sunset (November 1, 2026)**
  * Legacy `/api/*` routes are decommissioned.
  * Invocations receive HTTP `410 Gone` with payload pointing to `/api/v1`.
