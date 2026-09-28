# MedMinders Security Architecture Maintenance & Hardening Notes

**Document Version:** 1.0.0  
**Effective Date:** September 2026  
**Audience:** Security Engineering, DevOps, Platform Architects  
**Scope:** Express API Server, Authentication Infrastructure, and PostgreSQL Datastore

---

## 1. Executive Summary

This security architecture note outlines the technical specification and implementation roadmap for three strategic hardening initiatives identified during Prompts D and E:
1. Migration of durable refresh token sessions from overloaded `IdempotencyRecord` entries to a dedicated, first-class `AuthSession` entity.
2. Migration from process-local in-memory sliding window rate limits (`RL-001`) to distributed rate limiting (Redis / PostgreSQL).
3. Enforcement of a production startup fail-closed invariant preventing accidental deployment with mock multi-factor authentication (MFA).

---

## 2. Initiative 1: Dedicated `AuthSession` Entity Migration

### 2.1 Current Architecture & Technical Debt
In Prompt D, session durability and token rotation/reuse detection across server restarts were established in PostgreSQL using the `IdempotencyRecord` table with `scope: 'REFRESH_SESSION'`. 

While functionally sound and compliant with RFC 6749 / 6819:
- It achieves durability across restarts and process boundaries.
- It detects reuse and revokes entire token families upon breach attempt.
- **Technical Debt**: Overloads the generic idempotency mechanism with relational authentication session semantics, complicating foreign key cascades, session lifecycle indexing, and device-level inventory queries.

### 2.2 Target Schema Design (`AuthSession`)

A dedicated relational model will be added in a subsequent migration:

```prisma
model AuthSession {
  id                 String    @id @default(cuid())
  userId             String
  user               User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  refreshTokenHash   String    @unique // SHA-256 hash of currently active refresh token
  familyId           String              // Token family identifier for rotation tracking
  rotationSequence   Int       @default(1)
  
  deviceFingerprint  String?
  userAgent          String?
  ipAddress          String?
  
  isRevoked          Boolean   @default(false)
  revokedAt          DateTime?
  revocationReason   String?   // 'USER_LOGOUT', 'TOKEN_ROTATION', 'REUSE_DETECTED', 'ADMIN_ACTION'
  
  lastActivityAt     DateTime  @default(now())
  expiresAt          DateTime            // Absolute session expiration
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  @@index([userId, isRevoked, expiresAt])
  @@index([familyId])
  @@index([refreshTokenHash])
}
```

### 2.3 Zero-Downtime Migration Strategy

1. **Phase 1: Dual-Write**: Update `DataStore` to write new refresh tokens and family states to both `AuthSession` and `IdempotencyRecord`.
2. **Phase 2: Dual-Read with Fallback**: Read from `AuthSession`; if not found (legacy active session), fall back to `IdempotencyRecord`.
3. **Phase 3: Backfill & Prune**: Execute migration script to backfill active sessions and delete expired `scope: 'REFRESH_SESSION'` records from `IdempotencyRecord`.
4. **Phase 4: Read/Write Exclusively `AuthSession`**: Remove fallback code; drop idempotency session helpers.

---

## 3. Initiative 2: Distributed Rate Limiting (Redis / PostgreSQL)

### 3.1 Vulnerability in Process-Local Limiter (`RL-001`)

The current `RateLimiter` (`server/src/middleware/rateLimiter.ts`) uses an in-memory sliding log window per Node.js process:
```
Single Pod: [Process Memory Store] -> Enforces 5 req / 15 min per IP/Email
Multi Pod:  [Pod A (5 req)] + [Pod B (5 req)] + [Pod C (5 req)] -> Attacker can execute 15 attempts
```

In a scaled cloud environment (Kubernetes, AWS ECS, or Cloud Run autoscaling), this enables horizontal brute-force spraying across replicas.

### 3.2 Target Distributed Architecture

#### Option A: Redis Sliding Window with Atomic Lua Script (Recommended for High Throughput)
- Utilizes `redis.eval()` with atomic `ZREMRANGEBYSCORE`, `ZCARD`, and `ZADD`.
- Latency: < 2ms per check.
- Fail-Closed Behavior on Sensitive Endpoints:
  - If Redis is unreachable during `/api/v1/auth/*` or `/api/v1/prescriptions/upload`, fail CLOSED (HTTP 503 `ServiceUnavailableError`).
  - For public catalogue search (`/api/v1/catalogue/*`), fail OPEN with alert to preserve emergency clinical reference reading.

#### Option B: PostgreSQL-Backed Token Bucket (Native Zero-Dependency Fallback)
For environments without a standalone Redis instance, use an atomic PostgreSQL upsert table:

```sql
CREATE TABLE "RateLimitBucket" (
  "key" VARCHAR(255) PRIMARY KEY,
  "tokens" INTEGER NOT NULL,
  "lastRefill" TIMESTAMP WITH TIME ZONE NOT NULL,
  "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX "idx_ratelimit_expires" ON "RateLimitBucket" ("expiresAt");
```

---

## 4. Initiative 3: Production Startup Fail-Closed Invariant for MFA

### 4.1 Threat Context
In development and integration testing, privileged roles (Doctors, Pharmacists, Superadmins) authenticate with mock OTP codes (`123456` or mocked SMS providers) to facilitate end-to-end automation without external telephony costs or flaky SMS gateways.

If an operator deploys the server with `NODE_ENV=production` while `MFA_PROVIDER=mock`, the secondary authentication factor is effectively nullified for all clinical staff.

### 4.2 Invariant Specification (`SEC-INV-004`)

The server bootstrap sequence (`server/src/server.ts` or `app.ts`) must enforce the following validation before binding to any network port:

```typescript
export function assertMfaProductionSafety(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const mfaProvider = (process.env.MFA_PROVIDER || 'mock').toLowerCase();

  if (isProduction && (mfaProvider === 'mock' || mfaProvider === 'test')) {
    const errorMsg = 'FATAL SECURITY INVARIANT VIOLATION: Production server started with mock/test MFA provider. MFA_PROVIDER must be configured with a verified production provider (e.g., totp, webauthn, sms).';
    logger.error(errorMsg, {
      code: 'FATAL_MFA_MOCK_IN_PRODUCTION',
      nodeEnv: process.env.NODE_ENV,
      mfaProvider,
    });
    console.error(`\x1b[31m[CRITICAL SECURITY FAULT] ${errorMsg}\x1b[0m`);
    process.exit(1);
  }
}
```

### 4.3 Automated Verification
A deployment gate test in CI/CD will execute `NODE_ENV=production MFA_PROVIDER=mock node dist/server.js` and assert that the process terminates immediately with exit code `1` and emits structured log code `FATAL_MFA_MOCK_IN_PRODUCTION`.

---

## 5. Security Responsibility & Review Matrix

| Component | Current State | Target State | Security Owner | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **Session Datastore** | `IdempotencyRecord` | `AuthSession` Table | Backend Lead | High (Next Sprint) |
| **Rate Limiter** | Process Memory Store | Redis Cluster / PgBucket | DevOps / SRE | High (Pre-Prod) |
| **MFA Configuration** | Soft-check runtime | Hard Fail-Closed Startup | Security Eng | Immediate (v1.1) |
| **Audit Logs** | Real PostgreSQL `AuditEvent` | Append-Only WORM Log | Security Eng | Maintained |
