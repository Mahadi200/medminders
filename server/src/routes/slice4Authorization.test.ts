import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { app } from '../app.js';
import { getDataStore, InMemoryClinicalDataStore, setTestDataStore } from '../services/auth/dataStore.js';
import { TokenService } from '../services/auth/tokenService.js';
import { AuditService } from '../services/audit/auditService.js';

let server: http.Server;
let baseUrl: string;
let testStore: InMemoryClinicalDataStore;

// Pre-generated JWT tokens for integration testing
let tokenPatientA: string;
let tokenPatientB: string;
let tokenDocVerifiedRel: string;
let tokenDocVerifiedConsent: string;
let tokenDocUnverified: string;
let tokenDocRevokedConsent: string;
let tokenDocExpiredConsent: string;
let tokenDocCrossOrg: string;
let tokenPharmacyStaff: string;
let tokenRepresentative: string;

beforeAll(async () => {
  // 1. Initialize clean simulated in-memory clinical test store and mock audit logger
  testStore = new InMemoryClinicalDataStore();
  setTestDataStore(testStore);
  AuditService.setPrismaInstance({
    auditEvent: {
      create: async () => ({ id: 'mock_audit_1' }),
    },
  } as any);

  // 2. Mint test tokens for all roles
  tokenPatientA = (await TokenService.issueTokenPair('user_patient_a')).accessToken;
  tokenPatientB = (await TokenService.issueTokenPair('user_patient_b')).accessToken;
  tokenDocVerifiedRel = (await TokenService.issueTokenPair('user_doc_verified_rel')).accessToken;
  tokenDocVerifiedConsent = (await TokenService.issueTokenPair('user_doc_verified_consent')).accessToken;
  tokenDocUnverified = (await TokenService.issueTokenPair('user_doc_unverified')).accessToken;
  tokenDocRevokedConsent = (await TokenService.issueTokenPair('user_doc_revoked_consent')).accessToken;
  tokenDocExpiredConsent = (await TokenService.issueTokenPair('user_doc_expired_consent')).accessToken;
  tokenDocCrossOrg = (await TokenService.issueTokenPair('user_doc_cross_org')).accessToken;
  tokenPharmacyStaff = (await TokenService.issueTokenPair('user_pharmacy_staff')).accessToken;
  tokenRepresentative = (await TokenService.issueTokenPair('user_representative')).accessToken;

  // 3. Start test HTTP server
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

describe('Slice 4: Authentication, Session Rotation, and Object-Level Authorization Gate', () => {
  // -------------------------------------------------------------
  // 1. Authentication, Sessions & Refresh-Token Rotation
  // -------------------------------------------------------------
  describe('Authentication Lifecycle', () => {
    it('authenticates valid credentials and returns JWT access token + refresh token', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'patient_a@test.local',
          password: 'TestSecurePass!2026',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.tokens).toBeDefined();
      expect(data.tokens.accessToken).toContain('.');
      expect(data.tokens.refreshToken).toMatch(/^rft_/);
      expect(data.user.id).toBe('user_patient_a');
      expect(data.user.roles[0].role).toBe('PATIENT');
    });

    it('rejects invalid password with 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'patient_a@test.local',
          password: 'WrongPassword123!',
        }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toContain('Invalid credentials');
    });

    it('rotates refresh token, invalidating old token and issuing fresh pair', async () => {
      // 1. Issue initial pair
      const initial = await TokenService.issueTokenPair('user_patient_a');

      // 2. Rotate token
      const res = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: initial.refreshToken }),
      });

      expect(res.status).toBe(200);
      const rotated = await res.json();
      expect(rotated.refreshToken).not.toBe(initial.refreshToken);
      expect(rotated.accessToken).toBeDefined();

      // 3. Security Replay Detection: Old refresh token must be rejected
      const replayRes = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: initial.refreshToken }),
      });
      expect(replayRes.status).toBe(401);
      const replayBody = await replayRes.json();
      expect(replayBody.error).toContain('reuse detected');
    });

    it('terminates session on logout', async () => {
      const pair = await TokenService.issueTokenPair('user_patient_a');
      const res = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: pair.refreshToken }),
      });
      expect(res.status).toBe(200);

      // Attempting to refresh with logged-out token fails
      const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: pair.refreshToken }),
      });
      expect(refreshRes.status).toBe(401);
    });
  });

  // -------------------------------------------------------------
  // 2. Patient Ownership & Cross-Patient Boundary
  // -------------------------------------------------------------
  describe('Patient Ownership & Object Isolation', () => {
    it('Patient A can view their own prescription (rx_patient_a_1)', async () => {
      const res = await fetch(`${baseUrl}/api/prescriptions/rx_patient_a_1`, {
        headers: { Authorization: `Bearer ${tokenPatientA}` },
      });
      expect(res.status).toBe(200);
      const rx = await res.json();
      expect(rx.id).toBe('rx_patient_a_1');
      expect(rx.patientId).toBe('user_patient_a');
    });

    it('Patient A is FORBIDDEN from viewing Patient B prescription (rx_patient_b_1)', async () => {
      const res = await fetch(`${baseUrl}/api/prescriptions/rx_patient_b_1`, {
        headers: { Authorization: `Bearer ${tokenPatientA}` },
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain('Forbidden');
    });

    it('Patient A is FORBIDDEN from viewing Patient B scan result (scan_patient_b_1)', async () => {
      const res = await fetch(`${baseUrl}/api/prescriptions/scan_patient_b_1`, {
        headers: { Authorization: `Bearer ${tokenPatientA}` },
      });
      expect(res.status).toBe(403);
    });

    it('Patient A is FORBIDDEN from streaming Patient B file (upload_patient_b_1)', async () => {
      const res = await fetch(`${baseUrl}/api/files/upload_patient_b_1`, {
        headers: { Authorization: `Bearer ${tokenPatientA}` },
      });
      expect(res.status).toBe(403);
    });
  });

  // -------------------------------------------------------------
  // 3. Clinician Credentials, Care Relationships & Consent
  // -------------------------------------------------------------
  describe('Clinician Verification Gate & Clinical Access', () => {
    it('Unverified clinician is FORBIDDEN from viewing Patient A record', async () => {
      const res = await fetch(`${baseUrl}/api/prescriptions/rx_patient_a_1`, {
        headers: { Authorization: `Bearer ${tokenDocUnverified}` },
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain('Clinician credentials pending verification');
    });

    it('Unverified clinician is FORBIDDEN from signing prescriptions', async () => {
      const res = await fetch(`${baseUrl}/api/prescriptions/rx_patient_a_1/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenDocUnverified}`,
        },
        body: JSON.stringify({
          signatureBytes: 'fake_sig',
          signaturePayloadHash: 'fake_hash',
          signingKeyId: 'fake_key',
        }),
      });
      expect(res.status).toBe(403);
    });

    it('Verified clinician with active CareRelationship CAN view Patient A prescription', async () => {
      const res = await fetch(`${baseUrl}/api/prescriptions/rx_patient_a_1`, {
        headers: { Authorization: `Bearer ${tokenDocVerifiedRel}` },
      });
      expect(res.status).toBe(200);
      const rx = await res.json();
      expect(rx.id).toBe('rx_patient_a_1');
    });

    it('Verified clinician with active ConsentGrant CAN view Patient A prescription', async () => {
      const res = await fetch(`${baseUrl}/api/prescriptions/rx_patient_a_1`, {
        headers: { Authorization: `Bearer ${tokenDocVerifiedConsent}` },
      });
      expect(res.status).toBe(200);
      const rx = await res.json();
      expect(rx.id).toBe('rx_patient_a_1');
    });

    it('Verified clinician with REVOKED consent is FORBIDDEN from viewing Patient A record', async () => {
      const res = await fetch(`${baseUrl}/api/prescriptions/rx_patient_a_1`, {
        headers: { Authorization: `Bearer ${tokenDocRevokedConsent}` },
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain('Patient consent has been revoked');
    });

    it('Verified clinician with EXPIRED consent is FORBIDDEN from viewing Patient A record', async () => {
      const res = await fetch(`${baseUrl}/api/prescriptions/rx_patient_a_1`, {
        headers: { Authorization: `Bearer ${tokenDocExpiredConsent}` },
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain('Patient consent has expired');
    });

    it('Verified clinician from another organization without relationship or consent is FORBIDDEN', async () => {
      const res = await fetch(`${baseUrl}/api/prescriptions/rx_patient_a_1`, {
        headers: { Authorization: `Bearer ${tokenDocCrossOrg}` },
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain('No active care relationship or consent grant exists');
    });
  });

  // -------------------------------------------------------------
  // 4. Pharmacy Staff Data Minimization & Scoped QR Verification
  // -------------------------------------------------------------
  describe('Pharmacy Staff Scope & Data Minimization', () => {
    it('Pharmacy staff attempting to access full chart directly receives 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/prescriptions/rx_patient_a_1`, {
        headers: { Authorization: `Bearer ${tokenPharmacyStaff}` },
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain('Pharmacy staff cannot view the full patient chart');
    });

    it('Pharmacy staff using scoped verification endpoint receives MINIMUM dispense data only', async () => {
      const rawToken = 'secret_rx_token_pt_a_001';
      const res = await fetch(`${baseUrl}/api/prescriptions/verify/${rawToken}`, {
        headers: { Authorization: `Bearer ${tokenPharmacyStaff}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();

      // Minimum required info:
      expect(data.prescriptionId).toBe('rx_patient_a_1');
      expect(data.status).toBe('SIGNED');
      expect(data.prescriberBmdc).toBe('BMDC-DOC-1001');
      expect(data.prescriberVerified).toBe(true);
      expect(data.items.length).toBeGreaterThan(0);
      expect(data.items[0].medicineName).toBe('Amoxicillin 500mg');
      expect(data.items[0].prescribedQuantity).toBe(15);

      // Data Minimization Principle: Sensitive chart info must NOT be disclosed:
      expect(data.diagnosis).toBeUndefined();
      expect(data.clinicalNotes).toBeUndefined();
      expect(data.patientDob).toBeUndefined();
      expect(data.otherPrescriptions).toBeUndefined();
    });
  });

  // -------------------------------------------------------------
  // 5. Representative Strict Denial
  // -------------------------------------------------------------
  describe('Representative Role Strict Clinical Exclusion', () => {
    it('Representative is FORBIDDEN from accessing any prescription record', async () => {
      const res = await fetch(`${baseUrl}/api/prescriptions/rx_patient_a_1`, {
        headers: { Authorization: `Bearer ${tokenRepresentative}` },
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain('Representatives are strictly prohibited from accessing clinical records');
    });

    it('Representative is FORBIDDEN from accessing scan results', async () => {
      const res = await fetch(`${baseUrl}/api/prescriptions/scan_patient_a_1`, {
        headers: { Authorization: `Bearer ${tokenRepresentative}` },
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain('Representatives are strictly prohibited from accessing clinical records');
    });

    it('Representative is FORBIDDEN from accessing clinical files', async () => {
      const res = await fetch(`${baseUrl}/api/files/upload_patient_a_1`, {
        headers: { Authorization: `Bearer ${tokenRepresentative}` },
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain('Representatives are strictly prohibited from accessing clinical records');
    });
  });

  // -------------------------------------------------------------
  // 6. Clinical Safety Invariant: OCR Scan Status DRAFT_UNREVIEWED
  // -------------------------------------------------------------
  describe('Clinical Safety: OCR Scan Invariant', () => {
    it('Patient A viewing their scan result confirms status is DRAFT_UNREVIEWED', async () => {
      const res = await fetch(`${baseUrl}/api/prescriptions/scan_patient_a_1`, {
        headers: { Authorization: `Bearer ${tokenPatientA}` },
      });
      expect(res.status).toBe(200);
      const scan = await res.json();
      expect(scan.id).toBe('scan_patient_a_1');
      expect(scan.scanStatus).toBe('DRAFT_UNREVIEWED');
    });
  });
});
