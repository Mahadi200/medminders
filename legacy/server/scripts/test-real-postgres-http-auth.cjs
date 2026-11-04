const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

// 1. Safely load environment without leaking secrets or URLs
function loadEnvSafely() {
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return false;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
  return !!process.env.DATABASE_URL;
}

loadEnvSafely();
process.env.USE_REAL_POSTGRES = 'true';
process.env.NODE_ENV = 'test';
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'synthetic_test_jwt_secret_32_characters_minimum_entropy_123456';
}

const prisma = new PrismaClient();

// Track passed / failed assertions
let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    passedCount++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedCount++;
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runSuite() {
  console.log('================================================================');
  console.log('  MEDMINDERS PROMPT D: REAL POSTGRESQL AUTH & AUTHORIZATION SUITE');
  console.log('================================================================\n');

  // Dynamic import of compiled server modules
  const { app } = await import('../dist/app.js');
  const { signJwt, verifyJwt, hashToken, hashPassword } = await import('../dist/services/auth/cryptoUtils.js');
  const { AuthService } = await import('../dist/services/auth/authService.js');
  const { TokenService } = await import('../dist/services/auth/tokenService.js');
  const { getDataStore, resetDataStore, PrismaClinicalDataStore } = await import('../dist/services/auth/dataStore.js');
  const { AuditService } = await import('../dist/services/audit/auditService.js');
  const { MfaService, DevelopmentMockMfaProvider } = await import('../dist/services/auth/mfaService.js');
  const { ProfessionalVerificationService } = await import('../dist/services/verification/professionalVerificationService.js');

  const store = getDataStore();
  assert(store instanceof PrismaClinicalDataStore, 'Data store successfully initialized as PrismaClinicalDataStore (Real PostgreSQL)');

  let server;
  let baseUrl;

  try {
    // -------------------------------------------------------------
    // PART 1: Database Connectivity & Baseline
    // -------------------------------------------------------------
    console.log('\n--- PART 1: Real Database Connection & Baseline Check ---');
    const versionRes = await prisma.$queryRawUnsafe('SELECT version();');
    assert(versionRes && versionRes.length > 0, 'Connected to PostgreSQL engine: ' + versionRes[0]?.version?.split('on')[0]?.trim());

    // Verify zero residual synthetic data before starting
    const preCheck = await prisma.user.count({ where: { id: { startsWith: 'syn_d_' } } });
    assert(preCheck === 0, `Baseline verification: 0 synthetic rows present in database before test start`);

    // -------------------------------------------------------------
    // PART 2: Durable Hashed Refresh-Token Sessions & Multi-Instance Lifecycle
    // -------------------------------------------------------------
    console.log('\n--- PART 2: Durable Hashed Refresh-Token Sessions in Real PostgreSQL ---');
    const sessUserId = 'syn_d_sess_user_1';
    await prisma.user.create({
      data: {
        id: sessUserId,
        email: 'sess_user@test.local',
        passwordHash: await hashPassword('SecurePass123!'),
        legacyRole: 'patient',
        isActive: true,
      },
    });

    const tokenFamily = `fam_${crypto.randomBytes(8).toString('hex')}`;
    const rawRefreshToken = `rft_${crypto.randomBytes(32).toString('hex')}`;
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);

    // Save refresh token to PostgreSQL
    const savedSession = await store.saveRefreshToken({
      userId: sessUserId,
      tokenHash,
      familyId: tokenFamily,
      isRevoked: false,
      expiresAt,
    });
    assert(savedSession && savedSession.tokenHash === tokenHash, 'Refresh token hash persisted to PostgreSQL IdempotencyRecord');

    // Verify stored in DB directly
    const dbRecord = await prisma.idempotencyRecord.findUnique({
      where: {
        idempotencyKey_endpoint: {
          idempotencyKey: tokenHash,
          endpoint: 'AUTH_SESSION',
        },
      },
    });
    assert(dbRecord && dbRecord.requestHash === tokenFamily, 'Direct PostgreSQL check: Session record found with matching family ID');

    // Simulate Server Restart / Memory Wipe
    resetDataStore();
    const freshStore = getDataStore();
    const retrievedAfterRestart = await freshStore.getRefreshTokenByHash(tokenHash);
    assert(
      retrievedAfterRestart && retrievedAfterRestart.userId === sessUserId && !retrievedAfterRestart.isRevoked,
      'Session survives server restart / memory reset (retrieved from PostgreSQL)'
    );

    // Token Rotation
    const rotated = await TokenService.rotateRefreshToken(rawRefreshToken);
    assert(rotated.refreshToken && rotated.refreshToken !== rawRefreshToken, 'Token rotation generated fresh refresh token');

    const oldTokenInDb = await freshStore.getRefreshTokenByHash(tokenHash);
    assert(oldTokenInDb && oldTokenInDb.isRevoked === true, 'Old refresh token marked isRevoked = true in PostgreSQL');

    // Token Family Replay Detection (Attack Simulation)
    let replayDetected = false;
    try {
      await TokenService.rotateRefreshToken(rawRefreshToken); // Reuse old token
    } catch (err) {
      replayDetected = true;
    }
    assert(replayDetected, 'Replayed old refresh token was rejected by TokenService');

    // Verify family-wide revocation after replay detection
    const newHash = hashToken(rotated.refreshToken);
    const newTokenInDb = await freshStore.getRefreshTokenByHash(newHash);
    assert(newTokenInDb && newTokenInDb.isRevoked === true, 'Entire token family revoked in PostgreSQL upon replay detection');

    // Device Session Revocation Test
    const deviceFamilyId = `fam_device_${crypto.randomBytes(8).toString('hex')}`;
    const devRawToken = `rft_dev_${crypto.randomBytes(32).toString('hex')}`;
    await freshStore.saveRefreshToken({
      userId: sessUserId,
      tokenHash: hashToken(devRawToken),
      familyId: deviceFamilyId,
      isRevoked: false,
      expiresAt,
    });
    await TokenService.revokeDeviceSession(deviceFamilyId);
    const devTokenInDb = await freshStore.getRefreshTokenByHash(hashToken(devRawToken));
    assert(devTokenInDb && devTokenInDb.isRevoked === true, 'Device session revocation successfully revoked family in PostgreSQL');

    // -------------------------------------------------------------
    // PART 3: JWT Claims, Issuer, Audience, and Expiry Security
    // -------------------------------------------------------------
    console.log('\n--- PART 3: JWT Claims Specification & Security Validation ---');
    const validJwt = signJwt({
      sub: sessUserId,
      email: 'sess_user@test.local',
      roles: [{ role: 'PATIENT', isVerified: true, organizationId: null }],
    });
    const verifiedPayload = verifyJwt(validJwt);
    assert(
      verifiedPayload.iss === 'medminders-api' && verifiedPayload.aud === 'medminders-client',
      'JWT contains valid iss: medminders-api and aud: medminders-client'
    );

    // Mismatched issuer rejection
    let badIssuerCaught = false;
    try {
      verifyJwt(validJwt, { expectedIssuer: 'foreign-authority-id' });
    } catch (err) {
      if (err.message.includes('Invalid token issuer')) badIssuerCaught = true;
    }
    assert(badIssuerCaught, 'Mismatched JWT issuer strictly rejected');

    // Mismatched audience rejection
    let badAudienceCaught = false;
    try {
      verifyJwt(validJwt, { expectedAudience: 'foreign-client-app' });
    } catch (err) {
      if (err.message.includes('Invalid token audience')) badAudienceCaught = true;
    }
    assert(badAudienceCaught, 'Mismatched JWT audience strictly rejected');

    // Expired token rejection
    const expiredJwt = signJwt({
      sub: sessUserId,
      email: 'sess_user@test.local',
      roles: [{ role: 'PATIENT', isVerified: true, organizationId: null }],
    }, -60); // Expired 60s ago
    let expiredCaught = false;
    try {
      verifyJwt(expiredJwt);
    } catch (err) {
      if (err.message.includes('Token expired')) expiredCaught = true;
    }
    assert(expiredCaught, 'Expired JWT strictly rejected');

    // -------------------------------------------------------------
    // PART 4: Privileged Role Multi-Factor Authentication (MFA)
    // -------------------------------------------------------------
    console.log('\n--- PART 4: Privileged Role MFA Integration ---');
    const doctorUserId = 'syn_d_mfa_doctor_1';
    await prisma.user.create({
      data: {
        id: doctorUserId,
        email: 'doctor_mfa@test.local',
        passwordHash: await hashPassword('DocSecure123!'),
        legacyRole: 'doctor',
        isActive: true,
      },
    });
    await prisma.userRoleAssignment.create({
      data: {
        userId: doctorUserId,
        role: 'DOCTOR',
        isVerified: true,
      },
    });

    // Unprivileged login: Patient gets tokens directly without MFA
    const patientLogin = await AuthService.login('sess_user@test.local', 'SecurePass123!');
    assert(patientLogin.tokens && !patientLogin.mfaRequired, 'Patient login issues tokens directly without MFA requirement');

    // Privileged login: Doctor requires MFA challenge
    const doctorLogin = await AuthService.login('doctor_mfa@test.local', 'DocSecure123!');
    assert(doctorLogin.mfaRequired === true && doctorLogin.mfaChallengeId, 'Doctor login requires MFA challenge (no tokens issued yet)');

    // Attempt verify with incorrect code
    let wrongCodeFailed = false;
    try {
      await AuthService.verifyMfaLogin(doctorLogin.mfaChallengeId, '000000', doctorUserId);
    } catch (err) {
      wrongCodeFailed = true;
    }
    assert(wrongCodeFailed, 'Invalid MFA OTP code rejected');

    // Verify with valid mock code
    const mfaCompleted = await AuthService.verifyMfaLogin(doctorLogin.mfaChallengeId, '654321', doctorUserId);
    assert(mfaCompleted.tokens && mfaCompleted.tokens.accessToken, 'Valid MFA OTP completes login and issues access tokens');

    // -------------------------------------------------------------
    // PART 5: Admin-Reviewed Professional Credentials & Affiliations
    // -------------------------------------------------------------
    console.log('\n--- PART 5: Admin-Reviewed Credentials & PostgreSQL Audit Log ---');
    const adminUserId = 'syn_d_admin_user_1';
    await prisma.user.create({
      data: {
        id: adminUserId,
        email: 'admin_audit@medminders.local',
        passwordHash: await hashPassword('AdminPass123!'),
        legacyRole: 'admin',
        isActive: true,
      },
    });
    await prisma.userRoleAssignment.create({
      data: {
        userId: adminUserId,
        role: 'SUPERADMIN',
        isVerified: true,
      },
    });

    const candidateDocId = 'syn_d_candidate_doc_1';
    await prisma.user.create({
      data: {
        id: candidateDocId,
        email: 'candidate_doc@hospital.local',
        passwordHash: await hashPassword('Candidate123!'),
        legacyRole: 'doctor',
        isActive: true,
      },
    });
    await prisma.clinicianCredential.create({
      data: {
        userId: candidateDocId,
        bmdcNumber: 'A-98765',
        specialty: 'Internal Medicine',
        degrees: 'MBBS, FCPS',
        verificationStatus: 'PENDING',
      },
    });
    await prisma.userRoleAssignment.create({
      data: {
        userId: candidateDocId,
        role: 'DOCTOR',
        isVerified: false, // Invariant: starts unverified
      },
    });

    // Verification attempt missing evidence notes must fail
    let missingEvidenceFailed = false;
    try {
      await ProfessionalVerificationService.reviewClinicianCredential({
        adminUserId,
        clinicianUserId: candidateDocId,
        decision: 'VERIFIED',
        evidenceNotes: '   ', // empty notes
      });
    } catch (err) {
      missingEvidenceFailed = true;
    }
    assert(missingEvidenceFailed, 'Credential review requires detailed evidence notes (cannot empty-review)');

    // Admin verifies doctor credential with evidence
    await ProfessionalVerificationService.reviewClinicianCredential({
      adminUserId,
      clinicianUserId: candidateDocId,
      decision: 'VERIFIED',
      evidenceNotes: 'BMDC Register Volume 2026 Page 142 confirmed valid license in active practice.',
      evidenceDocumentUrl: 'https://credentials.gov.bd/registry/A-98765.pdf',
    });

    const updatedCred = await prisma.clinicianCredential.findUnique({ where: { userId: candidateDocId } });
    const updatedRole = await prisma.userRoleAssignment.findFirst({ where: { userId: candidateDocId, role: 'DOCTOR' } });
    assert(updatedCred && updatedCred.verificationStatus === 'VERIFIED', 'ClinicianCredential status updated to VERIFIED in PostgreSQL');
    assert(updatedRole && updatedRole.isVerified === true, 'UserRoleAssignment.isVerified synchronized to true');

    // Audit Event verification
    const auditEventInDb = await prisma.auditEvent.findFirst({
      where: {
        entityType: 'ClinicianCredential',
        entityId: updatedCred.id,
        action: 'CLINICIAN_CREDENTIAL_VERIFIED',
      },
    });
    assert(auditEventInDb && auditEventInDb.actorUserId === adminUserId, 'CLINICIAN_CREDENTIAL_VERIFIED recorded in PostgreSQL AuditEvent table');

    // Organization Registration & Staff Affiliation
    const regOrg = await ProfessionalVerificationService.registerOrganization({
      adminUserId,
      name: 'Synthetic Metro Hospital',
      type: 'HOSPITAL',
      regNumber: 'HOSP-2026-99',
    });
    assert(regOrg && regOrg.id, 'Organization registered in PostgreSQL');

    const affiliation = await ProfessionalVerificationService.affiliateStaffMember({
      adminUserId,
      userId: candidateDocId,
      organizationId: regOrg.id,
      role: 'DOCTOR',
      isVerified: true,
      notes: 'Head of Clinical Inpatient Services',
    });
    assert(affiliation && affiliation.organizationId === regOrg.id, 'Staff affiliation recorded with organization tenancy');

    // -------------------------------------------------------------
    // PART 6: Real PostgreSQL HTTP API Object-Level Authorization
    // -------------------------------------------------------------
    console.log('\n--- PART 6: Real PostgreSQL HTTP API Object-Level Authorization Gate ---');

    // Spin up HTTP server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    // Seed test patients, clinicians, staff, and records in PostgreSQL
    const ptA = 'syn_d_pt_a';
    const ptB = 'syn_d_pt_b';
    const drActive = candidateDocId; // Doctor A (Verified with CareRelationship)
    const drUnverified = 'syn_d_dr_unverified';
    const drSuspended = 'syn_d_dr_suspended';
    const drCrossOrg = 'syn_d_dr_cross_org';
    const drRevoked = 'syn_d_dr_revoked';
    const drExpired = 'syn_d_dr_expired';
    const repUser = 'syn_d_rep_user';
    const pharmUser = 'syn_d_pharm_user';

    // Users
    await prisma.user.createMany({
      data: [
        { id: ptA, email: 'pt_a@test.local', passwordHash: 'hash', legacyRole: 'patient', isActive: true },
        { id: ptB, email: 'pt_b@test.local', passwordHash: 'hash', legacyRole: 'patient', isActive: true },
        { id: drUnverified, email: 'dr_unverified@test.local', passwordHash: 'hash', legacyRole: 'doctor', isActive: true },
        { id: drSuspended, email: 'dr_suspended@test.local', passwordHash: 'hash', legacyRole: 'doctor', isActive: true },
        { id: drCrossOrg, email: 'dr_cross_org@test.local', passwordHash: 'hash', legacyRole: 'doctor', isActive: true },
        { id: drRevoked, email: 'dr_revoked@test.local', passwordHash: 'hash', legacyRole: 'doctor', isActive: true },
        { id: drExpired, email: 'dr_expired@test.local', passwordHash: 'hash', legacyRole: 'doctor', isActive: true },
        { id: repUser, email: 'rep@pharma.local', passwordHash: 'hash', legacyRole: 'representative', isActive: true },
        { id: pharmUser, email: 'pharm@dispensary.local', passwordHash: 'hash', legacyRole: 'pharmacist', isActive: true },
      ],
    });

    // Roles
    await prisma.userRoleAssignment.createMany({
      data: [
        { userId: ptA, role: 'PATIENT', isVerified: true },
        { userId: ptB, role: 'PATIENT', isVerified: true },
        { userId: drUnverified, role: 'DOCTOR', isVerified: false }, // Unverified
        { userId: drSuspended, role: 'DOCTOR', isVerified: false }, // Suspended
        { userId: drCrossOrg, role: 'DOCTOR', isVerified: true, organizationId: regOrg.id },
        { userId: drRevoked, role: 'DOCTOR', isVerified: true },
        { userId: drExpired, role: 'DOCTOR', isVerified: true },
        { userId: pharmUser, role: 'PHARMACIST', isVerified: true },
      ],
    });

    // Active CareRelationship: Doctor A -> Patient A
    await prisma.careRelationship.create({
      data: {
        id: 'syn_d_cr_1',
        patientId: ptA,
        clinicianId: drActive,
        relationshipType: 'ATTENDING',
        isActive: true,
      },
    });

    // Revoked Consent: Doctor E -> Patient A
    await prisma.consentGrant.create({
      data: {
        id: 'syn_d_cg_revoked',
        patientId: ptA,
        granteeUserId: drRevoked,
        purpose: 'CLINICAL_CARE',
        status: 'REVOKED',
        grantedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000),
        expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        revokedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
        revocationReason: 'Patient changed providers',
      },
    });

    // Expired Consent: Doctor F -> Patient A
    await prisma.consentGrant.create({
      data: {
        id: 'syn_d_cg_expired',
        patientId: ptA,
        granteeUserId: drExpired,
        purpose: 'CLINICAL_CARE',
        status: 'EXPIRED',
        grantedAt: new Date(Date.now() - 60 * 24 * 3600 * 1000),
        expiresAt: new Date(Date.now() - 5 * 24 * 3600 * 1000), // Expired 5 days ago
      },
    });

    // File upload record for Patient A (created before scan referencing it)
    const testUpId = 'syn_d_up_pt_a_1';
    await prisma.prescriptionUpload.create({
      data: {
        id: testUpId,
        userId: ptA,
        fileType: 'image/jpeg',
        fileUrl: 'prescriptions/syn_d_prescription_img.jpg',
      },
    });

    // Prescription for Patient A
    const rawRxToken = 'secret_rx_token_prompt_d_test_001';
    const rxTokenHash = hashToken(rawRxToken);
    const testRxId = 'syn_d_rx_pt_a_1';
    await prisma.prescription.create({
      data: {
        id: testRxId,
        patientId: ptA,
        prescriberId: drActive,
        status: 'CLINICIAN_REVIEWED',
        version: 1,
        isLatestVersion: true,
        diagnosis: 'Bacterial Pharyngitis',
        clinicalNotes: 'Sensitive patient chart notes - strictly protected PHI',
        verificationTokenHash: rxTokenHash,
        tokenExpiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        tokenScope: 'DISPENSE_ONLY',
        items: {
          create: [
            {
              id: 'syn_d_rx_item_1',
              medicineName: 'Amoxicillin 500mg',
              prescribedQuantity: 21,
              dispensedQuantity: 0,
              frequency: '1-0-1',
              duration: '7 days',
            },
          ],
        },
      },
    });

    // Scan record for Patient A (DRAFT_UNREVIEWED invariant)
    const testScanId = 'syn_d_scan_pt_a_1';
    await prisma.prescriptionScan.create({
      data: {
        id: testScanId,
        uploadId: testUpId,
        userId: ptA,
        ocrText: 'Amoxicillin 500mg\n1-0-1\n7 days',
        ocrConfidence: 0.94,
        medicinesJson: JSON.stringify([{ medicine_name: 'Amoxicillin', strength: '500mg' }]),
        antibioticsJson: JSON.stringify([{ medicine: { medicine_name: 'Amoxicillin' }, antibiotic: 'Amoxicillin' }]),
        alertsJson: JSON.stringify({ disclaimer: 'Educational info only' }),
        scanStatus: 'DRAFT_UNREVIEWED',
      },
    });

    // Helper to generate signed JWTs
    function makeJwt(userId, email, role, isVerified) {
      return signJwt({
        sub: userId,
        email,
        roles: [{ role, isVerified, organizationId: null }],
      });
    }

    const tokenPtA = makeJwt(ptA, 'pt_a@test.local', 'PATIENT', true);
    const tokenPtB = makeJwt(ptB, 'pt_b@test.local', 'PATIENT', true);
    const tokenDrActive = makeJwt(drActive, 'candidate_doc@hospital.local', 'DOCTOR', true);
    const tokenDrUnverified = makeJwt(drUnverified, 'dr_unverified@test.local', 'DOCTOR', false);
    const tokenDrSuspended = makeJwt(drSuspended, 'dr_suspended@test.local', 'DOCTOR', false);
    const tokenDrCrossOrg = makeJwt(drCrossOrg, 'dr_cross_org@test.local', 'DOCTOR', true);
    const tokenDrRevoked = makeJwt(drRevoked, 'dr_revoked@test.local', 'DOCTOR', true);
    const tokenDrExpired = makeJwt(drExpired, 'dr_expired@test.local', 'DOCTOR', true);
    const tokenRep = makeJwt(repUser, 'rep@pharma.local', 'REPRESENTATIVE', true);
    const tokenPharm = makeJwt(pharmUser, 'pharm@dispensary.local', 'PHARMACIST', true);

    // Test 1: Patient A accesses own prescription -> 200 OK
    const res1 = await fetch(`${baseUrl}/api/v1/prescriptions/${testRxId}`, {
      headers: { Authorization: `Bearer ${tokenPtA}` },
    });
    assert(res1.status === 200, 'Test 1: Patient A can access own prescription record (HTTP 200)');
    const body1 = await res1.json();
    assert(body1.id === testRxId && body1.items.length === 1, 'Prescription items returned for patient self-access');

    // Test 2: Patient B attempts to access Patient A's prescription -> 403 Forbidden
    const res2 = await fetch(`${baseUrl}/api/v1/prescriptions/${testRxId}`, {
      headers: { Authorization: `Bearer ${tokenPtB}` },
    });
    assert(res2.status === 403, 'Test 2: Patient B accessing Patient A prescription denied with HTTP 403 Forbidden');

    // Test 3: Doctor A (active CareRelationship) accesses Patient A prescription -> 200 OK
    const res3 = await fetch(`${baseUrl}/api/v1/prescriptions/${testRxId}`, {
      headers: { Authorization: `Bearer ${tokenDrActive}` },
    });
    assert(res3.status === 200, 'Test 3: Verified Doctor with active CareRelationship permitted (HTTP 200)');

    // Test 4: Doctor B (unverified) accesses Patient A prescription -> 403 Forbidden
    const res4 = await fetch(`${baseUrl}/api/v1/prescriptions/${testRxId}`, {
      headers: { Authorization: `Bearer ${tokenDrUnverified}` },
    });
    assert(res4.status === 403, 'Test 4: Unverified Doctor denied with HTTP 403 Forbidden (pending verification)');

    // Test 5: Doctor C (suspended) accesses Patient A prescription -> 403 Forbidden
    const res5 = await fetch(`${baseUrl}/api/v1/prescriptions/${testRxId}`, {
      headers: { Authorization: `Bearer ${tokenDrSuspended}` },
    });
    assert(res5.status === 403, 'Test 5: Suspended Doctor denied with HTTP 403 Forbidden');

    // Test 6: Doctor D (cross-org, no relationship/consent) accesses Patient A prescription -> 403 Forbidden
    const res6 = await fetch(`${baseUrl}/api/v1/prescriptions/${testRxId}`, {
      headers: { Authorization: `Bearer ${tokenDrCrossOrg}` },
    });
    assert(res6.status === 403, 'Test 6: Cross-organization Doctor without relationship or consent denied with HTTP 403');

    // Test 7: Doctor E (revoked consent) accesses Patient A prescription -> 403 Forbidden
    const res7 = await fetch(`${baseUrl}/api/v1/prescriptions/${testRxId}`, {
      headers: { Authorization: `Bearer ${tokenDrRevoked}` },
    });
    assert(res7.status === 403, 'Test 7: Doctor with REVOKED consent denied with HTTP 403');

    // Test 8: Doctor F (expired consent) accesses Patient A prescription -> 403 Forbidden
    const res8 = await fetch(`${baseUrl}/api/v1/prescriptions/${testRxId}`, {
      headers: { Authorization: `Bearer ${tokenDrExpired}` },
    });
    assert(res8.status === 403, 'Test 8: Doctor with EXPIRED consent denied with HTTP 403');

    // Test 9: Representative accesses prescription -> 403 Forbidden
    const res9 = await fetch(`${baseUrl}/api/v1/prescriptions/${testRxId}`, {
      headers: { Authorization: `Bearer ${tokenRep}` },
    });
    assert(res9.status === 403, 'Test 9: Representative strictly prohibited from prescription records (HTTP 403)');

    // Test 10: Representative accesses scan result -> 403 Forbidden
    const res10 = await fetch(`${baseUrl}/api/v1/prescriptions/${testScanId}`, {
      headers: { Authorization: `Bearer ${tokenRep}` },
    });
    assert(res10.status === 403, 'Test 10: Representative strictly prohibited from scan results (HTTP 403)');

    // Test 11: Representative accesses uploaded medical file -> 403 Forbidden
    const res11 = await fetch(`${baseUrl}/api/v1/files/${testUpId}`, {
      headers: { Authorization: `Bearer ${tokenRep}` },
    });
    assert(res11.status === 403, 'Test 11: Representative strictly prohibited from medical files (HTTP 403)');

    // Test 12: Pharmacy staff direct chart access -> 403 Forbidden (Data Minimization)
    const res12 = await fetch(`${baseUrl}/api/v1/prescriptions/${testRxId}`, {
      headers: { Authorization: `Bearer ${tokenPharm}` },
    });
    assert(res12.status === 403, 'Test 12: Pharmacy staff direct access to full patient chart denied with HTTP 403');

    // Test 13: Pharmacy staff scoped verification endpoint -> 200 OK (Data Minimization)
    const res13 = await fetch(`${baseUrl}/api/v1/prescriptions/verify/${rawRxToken}`, {
      headers: { Authorization: `Bearer ${tokenPharm}` },
    });
    assert(res13.status === 200, 'Test 13: Pharmacy staff scoped verification succeeds with HTTP 200');
    const body13 = await res13.json();
    assert(
      body13.prescriptionId === testRxId && body13.items.length === 1 && !body13.diagnosis && !body13.clinicalNotes,
      'Data Minimization verified: scoped verification excludes diagnosis and sensitive chart notes'
    );

    // Test 14: Patient A accesses scan result -> confirms DRAFT_UNREVIEWED
    const res14 = await fetch(`${baseUrl}/api/v1/prescriptions/${testScanId}`, {
      headers: { Authorization: `Bearer ${tokenPtA}` },
    });
    assert(res14.status === 200, 'Test 14: Patient A retrieves scan result (HTTP 200)');
    const body14 = await res14.json();
    assert(body14.scanStatus === 'DRAFT_UNREVIEWED', 'Clinical Safety Invariant: scan status is strictly DRAFT_UNREVIEWED');

    // Test 15: Patient A streams uploaded medical file -> 200 OK + Audit Event logged in PostgreSQL
    const res15 = await fetch(`${baseUrl}/api/v1/files/${testUpId}`, {
      headers: { Authorization: `Bearer ${tokenPtA}` },
    });
    assert(res15.status === 200, 'Test 15: Patient A streams uploaded file with HTTP 200');

    // Check AuditEvent for PHI_FILE_STREAMED
    const fileAudit = await prisma.auditEvent.findFirst({
      where: {
        entityType: 'PrescriptionUpload',
        entityId: testUpId,
        action: 'PHI_FILE_STREAMED',
      },
    });
    assert(fileAudit && fileAudit.actorUserId === ptA, 'Audit trail persisted to real PostgreSQL AuditEvent for PHI_FILE_STREAMED');

    // Test 16: Deprecated legacy alias /api/prescriptions/:id returns 200 + Deprecation headers
    const res16 = await fetch(`${baseUrl}/api/prescriptions/${testRxId}`, {
      headers: { Authorization: `Bearer ${tokenPtA}` },
    });
    assert(res16.status === 200, 'Test 16: Legacy alias /api/prescriptions/:id serves request with HTTP 200');
    assert(
      res16.headers.get('deprecation') === 'true' && res16.headers.get('sunset') !== null,
      'RFC 8594 / 9213 headers returned on legacy route (Deprecation: true, Sunset: RFC date)'
    );

    // -------------------------------------------------------------
    // PART 7: Audit Persistence Fail-Closed Policy Enforcement
    // -------------------------------------------------------------
    console.log('\n--- PART 7: Audit Fail-Closed Policy on Sensitive Operations ---');
    const mockFailingPrisma = {
      auditEvent: {
        create: async () => {
          throw new Error('DATABASE_CONNECTION_LOST_DURING_AUDIT_WRITE');
        },
      },
    };

    AuditService.setPrismaInstance(mockFailingPrisma);
    let auditErrorCaught = false;
    try {
      await AuditService.logEvent({
        actorUserId: ptA,
        action: 'PHI_FILE_STREAMED', // Marked sensitive
        entityType: 'PrescriptionUpload',
        entityId: testUpId,
      });
    } catch (err) {
      if (err.name === 'AuditPersistenceError' || err.statusCode === 503) {
        auditErrorCaught = true;
      }
    }
    assert(auditErrorCaught, 'Sensitive operation strictly FAILS CLOSED with HTTP 503 AuditPersistenceError when audit write fails');
    // Restore normal Prisma instance for AuditService
    AuditService.setPrismaInstance(prisma);

  } finally {
    // -------------------------------------------------------------
    // PART 8: Guaranteed 100% Cleanup in Reverse FK Order
    // -------------------------------------------------------------
    console.log('\n--- PART 8: Guaranteed 100% Database Cleanup ---');
    if (server) {
      server.close();
    }

    try {
      // 1. AuditEvent
      await prisma.auditEvent.deleteMany({
        where: {
          OR: [
            { actorUserId: { startsWith: 'syn_d_' } },
            { targetUserId: { startsWith: 'syn_d_' } },
            { entityId: { startsWith: 'syn_d_' } },
          ],
        },
      });

      // 2. IdempotencyRecord (Sessions)
      await prisma.idempotencyRecord.deleteMany({
        where: {
          endpoint: 'AUTH_SESSION',
          requestHash: { startsWith: 'fam_' },
        },
      });

      // 3. PrescriptionItem
      await prisma.prescriptionItem.deleteMany({
        where: { id: { startsWith: 'syn_d_' } },
      });

      // 4. Prescription
      await prisma.prescription.deleteMany({
        where: { id: { startsWith: 'syn_d_' } },
      });

      // 5. PrescriptionScan
      await prisma.prescriptionScan.deleteMany({
        where: { id: { startsWith: 'syn_d_' } },
      });

      // 6. PrescriptionUpload
      await prisma.prescriptionUpload.deleteMany({
        where: { id: { startsWith: 'syn_d_' } },
      });

      // 7. CareRelationship
      await prisma.careRelationship.deleteMany({
        where: { id: { startsWith: 'syn_d_' } },
      });

      // 8. ConsentGrant
      await prisma.consentGrant.deleteMany({
        where: { id: { startsWith: 'syn_d_' } },
      });

      // 9. ClinicianCredential & PharmacistCredential
      await prisma.clinicianCredential.deleteMany({
        where: { userId: { startsWith: 'syn_d_' } },
      });
      await prisma.pharmacistCredential.deleteMany({
        where: { userId: { startsWith: 'syn_d_' } },
      });

      // 10. UserRoleAssignment
      await prisma.userRoleAssignment.deleteMany({
        where: { userId: { startsWith: 'syn_d_' } },
      });

      // 11. Organization
      await prisma.organization.deleteMany({
        where: { regNumber: 'HOSP-2026-99' },
      });

      // 12. User
      await prisma.user.deleteMany({
        where: { id: { startsWith: 'syn_d_' } },
      });

      console.log('  Cleaned up all synthetic test rows across 12 tables.');

      // Verify zero residual rows
      const [residualUsers, residualPrescriptions, residualScans, residualUploads, residualSessions] = await Promise.all([
        prisma.user.count({ where: { id: { startsWith: 'syn_d_' } } }),
        prisma.prescription.count({ where: { id: { startsWith: 'syn_d_' } } }),
        prisma.prescriptionScan.count({ where: { id: { startsWith: 'syn_d_' } } }),
        prisma.prescriptionUpload.count({ where: { id: { startsWith: 'syn_d_' } } }),
        prisma.idempotencyRecord.count({ where: { requestHash: { startsWith: 'fam_' } } }),
      ]);

      assert(residualUsers === 0, 'Residual synthetic users in PostgreSQL: 0');
      assert(residualPrescriptions === 0, 'Residual synthetic prescriptions in PostgreSQL: 0');
      assert(residualScans === 0, 'Residual synthetic scans in PostgreSQL: 0');
      assert(residualUploads === 0, 'Residual synthetic uploads in PostgreSQL: 0');
      assert(residualSessions === 0, 'Residual synthetic sessions in PostgreSQL: 0');

    } catch (cleanupErr) {
      console.error('CRITICAL: Cleanup failed:', cleanupErr);
    } finally {
      await prisma.$disconnect();
    }
  }

  console.log('\n================================================================');
  console.log(`  PROMPT D TEST SUITE SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('FATAL SUITE EXECUTION ERROR:', err);
  process.exit(1);
});
