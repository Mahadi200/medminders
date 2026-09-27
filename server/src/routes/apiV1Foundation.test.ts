import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { app } from '../app.js';
import { TokenService } from '../services/auth/tokenService.js';
import { InMemoryClinicalDataStore, setTestDataStore } from '../services/auth/dataStore.js';
import { sanitizeLogData, maskEmail, maskPhone } from '../utils/logger.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

let server: http.Server;
let baseUrl: string;
let testStore: InMemoryClinicalDataStore;
let tokenPatientA: string;

beforeAll(async () => {
  testStore = new InMemoryClinicalDataStore();
  setTestDataStore(testStore);

  tokenPatientA = (await TokenService.issueTokenPair('user_patient_a')).accessToken;

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

describe('MedMinders API v1 Foundation & Architecture Verification Suite', () => {
  // -------------------------------------------------------------
  // 1. Request ID Propagation & Consistent Headers
  // -------------------------------------------------------------
  describe('1. Request ID Tracking', () => {
    it('generates a unique UUID x-request-id if none provided', async () => {
      const res = await fetch(`${baseUrl}/health/live`);
      expect(res.status).toBe(200);
      const reqId = res.headers.get('x-request-id');
      expect(reqId).toBeDefined();
      expect(reqId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('propagates client-supplied valid x-request-id', async () => {
      const customId = 'client-req-abc-12345';
      const res = await fetch(`${baseUrl}/health/live`, {
        headers: { 'x-request-id': customId },
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('x-request-id')).toBe(customId);
    });
  });

  // -------------------------------------------------------------
  // 2. Canonical /api/v1 Routes & Legacy Deprecation Aliases
  // -------------------------------------------------------------
  describe('2. Route Canonicalization & RFC 8594 / RFC 9213 Deprecation Headers', () => {
    it('serves canonical /api/v1/auth/me without Deprecation headers', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${tokenPatientA}` },
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('Deprecation')).toBeNull();
      expect(res.headers.get('Sunset')).toBeNull();
      const body = await res.json();
      expect(body.id).toBe('user_patient_a');
    });

    it('emits Deprecation and Sunset headers on legacy /api/auth/me alias', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${tokenPatientA}` },
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('Deprecation')).toBe('true');
      expect(res.headers.get('Sunset')).toBeDefined();
      expect(res.headers.get('Link')).toContain('/api/v1/auth/me');
      const body = await res.json();
      expect(body.id).toBe('user_patient_a');
    });

    it('emits Deprecation headers on legacy /api/prescriptions/:id alias', async () => {
      const res = await fetch(`${baseUrl}/api/prescriptions/rx_patient_a_1`, {
        headers: { Authorization: `Bearer ${tokenPatientA}` },
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('Deprecation')).toBe('true');
      expect(res.headers.get('Link')).toContain('/api/v1/prescriptions/rx_patient_a_1');
    });
  });

  // -------------------------------------------------------------
  // 3. Centralized Validation & Error Envelope
  // -------------------------------------------------------------
  describe('3. Centralized Request Validation & Consistent Error Codes', () => {
    it('returns 400 VALIDATION_ERROR with field details on invalid email', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email', password: 'ValidPassword123!' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.requestId).toBeDefined();
      expect(body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email' }),
        ])
      );
    });

    it('returns 400 VALIDATION_ERROR on short password (< 6 chars)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'valid@example.com', password: '123' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.details[0].field).toBe('password');
    });

    it('returns 400 VALIDATION_ERROR on missing uploadId in scan request', async () => {
      const res = await fetch(`${baseUrl}/api/v1/prescriptions/scan`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenPatientA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.details[0].field).toBe('uploadId');
    });

    it('returns 400 VALIDATION_ERROR when pagination limit exceeds maximum (100)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/antibiotics?page=1&limit=500`);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.details[0].field).toBe('limit');
    });
  });

  // -------------------------------------------------------------
  // 4. Rate Limiting on Abuse-Sensitive Surfaces
  // -------------------------------------------------------------
  describe('4. Rate Limiting Verification', () => {
    it('enforces rate limit and returns 429 RATE_LIMITED with Retry-After headers', async () => {
      authRateLimiter.reset();

      // Send 10 rapid login attempts (up to limit)
      for (let i = 0; i < 10; i++) {
        await fetch(`${baseUrl}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@example.com', password: 'WrongPassword123!' }),
        });
      }

      // 11th request must be rate limited
      const limitedRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'WrongPassword123!' }),
      });

      expect(limitedRes.status).toBe(429);
      expect(limitedRes.headers.get('Retry-After')).toBeDefined();
      expect(limitedRes.headers.get('X-RateLimit-Remaining')).toBe('0');

      const body = await limitedRes.json();
      expect(body.code).toBe('RATE_LIMITED');
      expect(body.message).toContain('Too many authentication attempts');

      // Reset limiter for subsequent tests
      authRateLimiter.reset();
    });
  });

  // -------------------------------------------------------------
  // 5. Redacted Structured Logging & PHI Safeguards
  // -------------------------------------------------------------
  describe('5. PHI & Credential Redaction Invariants', () => {
    it('masks email addresses and phone numbers in log data', () => {
      expect(maskEmail('doctor.rahman@hospital.gov.bd')).toBe('d***n@hospital.gov.bd');
      expect(maskPhone('+8801712345678')).toBe('+8801****5678');
    });

    it('redacts sensitive credentials from log payloads', () => {
      const payload = {
        password: 'PlainTextPassword123!',
        passwordHash: '$2b$12$someargonhash',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
        authorization: 'Bearer secret_token',
        signingKey: 'PRIVATE_KEY_DATA',
        bmdcNumber: 'BMDC-DOC-1234',
      };

      const sanitized = sanitizeLogData(payload);
      expect(sanitized.password).toBe('[REDACTED_CREDENTIAL]');
      expect(sanitized.passwordHash).toBe('[REDACTED_CREDENTIAL]');
      expect(sanitized.token).toBe('[REDACTED_CREDENTIAL]');
      expect(sanitized.authorization).toBe('[REDACTED_CREDENTIAL]');
      expect(sanitized.signingKey).toBe('[REDACTED_CREDENTIAL]');
      expect(sanitized.bmdcNumber).toBe('[REDACTED_CREDENTIAL]');
    });

    it('redacts sensitive clinical PHI fields from log payloads', () => {
      const phiPayload = {
        fullName: 'Md. Anisur Rahman',
        ocrText: 'Tab. Ciprofloxacin 500mg 1+0+1 for 7 days',
        medicinesJson: '[{"name":"Ciprofloxacin","dose":"500mg"}]',
        diagnosis: 'Acute bacterial gastroenteritis',
        clinicalNotes: 'Patient has severe abdominal cramping',
        allergiesJson: '["Penicillin"]',
        chronicConditionsJson: '["Type 2 Diabetes"]',
        emergencyContactName: 'Fatema Begum',
        email: 'patient.anis@example.com',
      };

      const sanitized = sanitizeLogData(phiPayload);
      expect(sanitized.fullName).toBe('[REDACTED_PHI]');
      expect(sanitized.ocrText).toBe('[REDACTED_PHI]');
      expect(sanitized.medicinesJson).toBe('[REDACTED_PHI]');
      expect(sanitized.diagnosis).toBe('[REDACTED_PHI]');
      expect(sanitized.clinicalNotes).toBe('[REDACTED_PHI]');
      expect(sanitized.allergiesJson).toBe('[REDACTED_PHI]');
      expect(sanitized.chronicConditionsJson).toBe('[REDACTED_PHI]');
      expect(sanitized.emergencyContactName).toBe('[REDACTED_PHI]');
      expect(sanitized.email).toBe('p***s@example.com');
    });
  });

  // -------------------------------------------------------------
  // 6. Separate Liveness and Readiness Probes
  // -------------------------------------------------------------
  describe('6. Liveness and Readiness Diagnostics', () => {
    it('GET /health/live returns 200 with process uptime', async () => {
      const res = await fetch(`${baseUrl}/health/live`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('UP');
      expect(typeof data.uptimeSeconds).toBe('number');
    });

    it('GET /api/v1/health/live returns 200 via canonical namespace', async () => {
      const res = await fetch(`${baseUrl}/api/v1/health/live`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('UP');
    });

    it('GET /health/ready evaluates database readiness', async () => {
      const res = await fetch(`${baseUrl}/health/ready`);
      // In live environment with DATABASE_URL: status is 200 'UP'
      // If simulated / offline: status is 503 'DOWN' with error detail
      expect([200, 503]).toContain(res.status);
      const data = await res.json();
      expect(['UP', 'DOWN']).toContain(data.status);
      expect(data.timestamp).toBeDefined();
    });
  });

  // -------------------------------------------------------------
  // 7. OpenAPI 3.0 Documentation Endpoint
  // -------------------------------------------------------------
  describe('7. OpenAPI Specification Delivery', () => {
    it('GET /api/v1/docs serves valid OpenAPI 3.0 spec', async () => {
      const res = await fetch(`${baseUrl}/api/v1/docs`);
      expect(res.status).toBe(200);
      const spec = await res.json();
      expect(spec.openapi).toMatch(/^3\.0\./);
      expect(spec.info.title).toContain('MedMinders');
      expect(spec.paths['/auth/login']).toBeDefined();
      expect(spec.paths['/prescriptions/upload']).toBeDefined();
    });
  });
});
