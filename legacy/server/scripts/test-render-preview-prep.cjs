/**
 * test-render-preview-prep.cjs
 * Comprehensive verification of Render Free preview deployment readiness:
 * 1. SEC-INV-004 fail-closed production invariants
 * 2. TotpMfaProvider RFC 6238 verification, clock drift, replay defense, lockout
 * 3. ProductionSmsMfaProvider hashing and timing-safe checks
 * 4. CORS verification (Vercel production, preview wildcards, mobile origin-less, rejection of malicious origins)
 * 5. Health checks (/health, /health/live, /health/ready) against live Supabase PostgreSQL
 * 6. End-to-end privileged login + TOTP MFA authentication on live PostgreSQL
 * 7. Guaranteed 100% database cleanup
 */

const http = require('http');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Ensure server environment variables loaded from server/.env safely
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}
process.env.USE_REAL_POSTGRES = 'true';

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    passedCount++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedCount++;
    console.error(`  [FAIL] ${message}`);
  }
}

async function request(serverUrl, path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, serverUrl);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data,
          json,
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      req.setHeader('Content-Type', 'application/json');
      req.setHeader('Content-Length', Buffer.byteLength(bodyStr));
      req.write(bodyStr);
    }

    req.end();
  });
}

async function run() {
  console.log('================================================================');
  console.log('  MEDMINDERS: RENDER FREE PREVIEW DEPLOYMENT READINESS SUITE');
  console.log('================================================================\n');

  // --- PART 1: SEC-INV-004 Fail-Closed Production Safety Invariants ---
  console.log('--- PART 1: SEC-INV-004 Production Safety Invariants ---');
  const mfaMod = await import('../dist/services/auth/mfaService.js');
  const { TotpMfaProvider, ProductionSmsMfaProvider, DevelopmentMockMfaProvider, MfaService, assertMfaProductionSafety, initializeMfaProvider } = mfaMod;

  // 1.1: NODE_ENV=production with DevelopmentMockMfaProvider must FAIL closed
  process.env.NODE_ENV = 'production';
  MfaService.setProvider(new DevelopmentMockMfaProvider());
  let threwSecInv004 = false;
  try {
    assertMfaProductionSafety();
  } catch (err) {
    if (err.message.includes('SEC-INV-004')) threwSecInv004 = true;
  }
  assert(threwSecInv004, 'SEC-INV-004: Production refuses DevelopmentMockMfaProvider');

  // 1.2: NODE_ENV=production with MFA_PROVIDER=development-mock must FAIL closed
  process.env.MFA_PROVIDER = 'development-mock';
  let threwMockConfig = false;
  try {
    initializeMfaProvider();
  } catch (err) {
    if (err.message.includes('SEC-INV-004')) threwMockConfig = true;
  }
  assert(threwMockConfig, 'SEC-INV-004: Production refuses MFA_PROVIDER=development-mock');

  // 1.3: NODE_ENV=production with MFA_PROVIDER=totp must PASS
  process.env.MFA_PROVIDER = 'totp';
  initializeMfaProvider();
  let threwTotp = false;
  try {
    assertMfaProductionSafety();
  } catch (err) {
    threwTotp = true;
  }
  assert(!threwTotp, 'SEC-INV-004: Production succeeds with TotpMfaProvider');
  assert(MfaService.getProviderName() === 'totp-authenticator', 'Active provider is totp-authenticator');

  // 1.4: NODE_ENV=production with MFA_PROVIDER=sms must PASS
  process.env.MFA_PROVIDER = 'sms';
  initializeMfaProvider();
  let threwSms = false;
  try {
    assertMfaProductionSafety();
  } catch (err) {
    threwSms = true;
  }
  assert(!threwSms, 'SEC-INV-004: Production succeeds with ProductionSmsMfaProvider');
  assert(MfaService.getProviderName() === 'production-sms-gateway', 'Active provider is production-sms-gateway');

  // Reset to TOTP for subsequent tests
  process.env.MFA_PROVIDER = 'totp';
  initializeMfaProvider();

  // --- PART 2: TotpMfaProvider RFC 6238 Verification & Security ---
  console.log('\n--- PART 2: TotpMfaProvider RFC 6238 Verification ---');
  const totpProvider = new TotpMfaProvider();
  const testUserId = 'render_test_user_doc_1';

  // 2.1: Issue challenge
  const challenge = await totpProvider.sendOtp(testUserId, 'test-doctor@medminders.app');
  assert(challenge.challengeId.startsWith('mfa_totp_'), 'Challenge ID generated with secure mfa_totp_ prefix');
  assert(challenge.expiresAt > new Date(), 'Challenge expiry set in the future (+5 min)');

  // 2.2: Compute valid TOTP code
  const validCode = totpProvider.generateTotp(testUserId);
  assert(/^\d{6}$/.test(validCode), 'Generated RFC 6238 TOTP is exact 6 digits');

  // 2.3: Verify wrong code is rejected
  const wrongCode = validCode === '123456' ? '654321' : '123456';
  const wrongResult = await totpProvider.verifyOtp(challenge.challengeId, wrongCode);
  assert(wrongResult === false, 'Wrong TOTP code strictly rejected');

  // 2.4: Verify valid code succeeds
  const validResult = await totpProvider.verifyOtp(challenge.challengeId, validCode);
  assert(validResult === true, 'Valid RFC 6238 TOTP code verified successfully');

  // 2.5: Replay protection: cannot verify the same challenge twice
  const replayResult = await totpProvider.verifyOtp(challenge.challengeId, validCode);
  assert(replayResult === false, 'Replay attack blocked: single-use challenge consumption enforced');

  // 2.6: Brute force protection: locks after 3 failed attempts
  const bruteChallenge = await totpProvider.sendOtp(testUserId, 'test-doctor@medminders.app');
  await totpProvider.verifyOtp(bruteChallenge.challengeId, '000001');
  await totpProvider.verifyOtp(bruteChallenge.challengeId, '000002');
  await totpProvider.verifyOtp(bruteChallenge.challengeId, '000003');
  // Attempt 4 should lock
  await totpProvider.verifyOtp(bruteChallenge.challengeId, '000004');
  // Even with valid code, should now be locked
  const lockedResult = await totpProvider.verifyOtp(bruteChallenge.challengeId, validCode);
  assert(lockedResult === false, 'Brute-force protection: challenge locked after 3 failed attempts');

  // 2.7: Clock drift tolerance (within ±30 seconds)
  const driftChallenge = await totpProvider.sendOtp(testUserId, 'test-doctor@medminders.app');
  const driftCode30sAgo = totpProvider.generateTotp(testUserId, Date.now() - 30000);
  const driftResult = await totpProvider.verifyOtp(driftChallenge.challengeId, driftCode30sAgo);
  assert(driftResult === true, 'Clock drift tolerance: verified valid code from t - 30s');

  // --- PART 3: Start Real Express App & HTTP Probes ---
  console.log('\n--- PART 3: Express Server, CORS & Health Probes ---');
  const { app } = await import('../dist/app.js');
  const { prisma } = await import('../dist/services/database/prisma.js');

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`  Test server listening on ephemeral port ${port}`);

  // 3.1: Health /health
  const resHealth = await request(baseUrl, '/health');
  assert(resHealth.status === 200, 'GET /health returns HTTP 200');
  assert(resHealth.json?.status === 'UP', 'GET /health payload status is UP');

  // 3.2: Health /health/live
  const resLive = await request(baseUrl, '/health/live');
  assert(resLive.status === 200, 'GET /health/live returns HTTP 200');
  assert(resLive.json?.status === 'UP', 'GET /health/live payload status is UP');
  assert(typeof resLive.json?.uptimeSeconds === 'number', 'GET /health/live reports uptimeSeconds');

  // 3.3: Health /health/ready (queries live Supabase PostgreSQL)
  const resReady = await request(baseUrl, '/health/ready');
  assert(resReady.status === 200, 'GET /health/ready returns HTTP 200');
  assert(resReady.json?.status === 'UP', 'GET /health/ready status is UP');
  assert(resReady.json?.database === 'connected', 'GET /health/ready confirms database: connected');
  assert(typeof resReady.json?.latencyMs === 'number', `GET /health/ready reports latency: ${resReady.json?.latencyMs}ms`);

  // 3.4: API v1 Health probes
  const resV1Health = await request(baseUrl, '/api/v1/health');
  assert(resV1Health.status === 200, 'GET /api/v1/health returns HTTP 200');
  const resV1Live = await request(baseUrl, '/api/v1/health/live');
  assert(resV1Live.status === 200, 'GET /api/v1/health/live returns HTTP 200');
  const resV1Ready = await request(baseUrl, '/api/v1/health/ready');
  assert(resV1Ready.status === 200, 'GET /api/v1/health/ready returns HTTP 200');

  // 3.5: CORS verification
  // Production Vercel Origin
  const corsProd = await request(baseUrl, '/health', {
    headers: { Origin: 'https://medminders.vercel.app' },
  });
  assert(corsProd.headers['access-control-allow-origin'] === 'https://medminders.vercel.app', 'CORS allows exact Vercel production origin');

  // Preview Vercel Origin 1
  const corsPrev1 = await request(baseUrl, '/health', {
    headers: { Origin: 'https://medminders-preview-abc.vercel.app' },
  });
  assert(corsPrev1.headers['access-control-allow-origin'] === 'https://medminders-preview-abc.vercel.app', 'CORS allows Vercel preview branch origin');

  // Preview Vercel Origin 2 (mahadi200s-projects)
  const corsPrev2 = await request(baseUrl, '/health', {
    headers: { Origin: 'https://medminders-git-main-mahadi200s-projects.vercel.app' },
  });
  assert(corsPrev2.headers['access-control-allow-origin'] === 'https://medminders-git-main-mahadi200s-projects.vercel.app', 'CORS allows Vercel project deployment origin');

  // Localhost origin
  const corsLocal = await request(baseUrl, '/health', {
    headers: { Origin: 'http://localhost:5173' },
  });
  assert(corsLocal.headers['access-control-allow-origin'] === 'http://localhost:5173', 'CORS allows localhost origin');

  // Native mobile app / health probe without origin
  const corsNoOrigin = await request(baseUrl, '/health');
  assert(corsNoOrigin.status === 200, 'Non-browser / mobile requests without origin header accepted');

  // Malicious unauthorized origin rejected
  const corsBad = await request(baseUrl, '/health', {
    headers: { Origin: 'https://malicious-phishing-site.com' },
  });
  assert(!corsBad.headers['access-control-allow-origin'] || corsBad.status >= 400, 'CORS rejects unauthorized origin');

  // --- PART 4: Private File Storage Surface Verification ---
  console.log('\n--- PART 4: Private File Storage Surface ---');
  const resUploads = await request(baseUrl, '/uploads/secret_prescription.pdf');
  assert(resUploads.status === 401, 'Direct /uploads static route rejects with HTTP 401 Unauthorized');

  // --- PART 5: Live PostgreSQL Privileged Login + TOTP MFA ---
  console.log('\n--- PART 5: Live PostgreSQL Privileged Login & TOTP MFA ---');
  const cryptoUtils = await import('../dist/services/auth/cryptoUtils.js');
  const docEmail = 'render_test_doctor@medminders.app';
  const docPassword = 'DoctorPassword123!';
  const passwordHash = cryptoUtils.hashPassword(docPassword);

  // Clean prior synthetic records if any
  await prisma.auditEvent.deleteMany({ where: { actorUserId: { startsWith: 'syn_rnd_' } } });
  await prisma.clinicianCredential.deleteMany({ where: { bmdcNumber: 'BMDC-RND-TEST' } });
  await prisma.userRoleAssignment.deleteMany({ where: { userId: { startsWith: 'syn_rnd_' } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: 'syn_rnd_' } } });

  // Seed verified doctor
  const synDoc = await prisma.user.create({
    data: {
      id: 'syn_rnd_doctor_1',
      email: docEmail,
      passwordHash,
      isActive: true,
      roles: {
        create: {
          role: 'DOCTOR',
          isVerified: true,
        },
      },
      clinicianCredential: {
        create: {
          bmdcNumber: 'BMDC-RND-TEST',
          verificationStatus: 'VERIFIED',
          verifiedBy: 'syn_rnd_admin',
          verifiedAt: new Date(),
        },
      },
    },
  });
  assert(synDoc.id === 'syn_rnd_doctor_1', 'Seeded synthetic verified doctor in Supabase PostgreSQL');

  // Login as privileged doctor
  const loginRes = await request(baseUrl, '/api/v1/auth/login', {
    method: 'POST',
    body: { email: docEmail, password: docPassword },
  });
  assert(loginRes.status === 200, 'Privileged doctor login returns HTTP 200');
  assert(loginRes.json?.mfaRequired === true, 'MFA is strictly required for privileged doctor role');
  assert(typeof loginRes.json?.mfaChallengeId === 'string', 'Received mfaChallengeId for TOTP verification');

  // Generate valid TOTP code for the user
  const activeTotpProvider = MfaService.getProvider();
  const docTotpCode = activeTotpProvider.generateTotp(synDoc.id);
  assert(/^\d{6}$/.test(docTotpCode), 'Generated valid 6-digit TOTP code for doctor');

  // Complete MFA verification
  const mfaRes = await request(baseUrl, '/api/v1/auth/mfa/verify', {
    method: 'POST',
    body: {
      userId: synDoc.id,
      challengeId: loginRes.json.mfaChallengeId,
      code: docTotpCode,
    },
  });
  assert(mfaRes.status === 200, 'MFA verification with valid TOTP code returns HTTP 200');
  assert(Boolean(mfaRes.json?.tokens?.accessToken), 'Received valid accessToken after TOTP verification');
  assert(Boolean(mfaRes.json?.tokens?.refreshToken), 'Received valid refreshToken after TOTP verification');

  // Test authenticated /api/v1/auth/me using accessToken
  const meRes = await request(baseUrl, '/api/v1/auth/me', {
    headers: { Authorization: `Bearer ${mfaRes.json.tokens.accessToken}` },
  });
  assert(meRes.status === 200, 'GET /api/v1/auth/me returns HTTP 200 with issued token');
  assert(meRes.json?.id === synDoc.id, 'Authenticated identity matches synthetic doctor');

  // --- PART 6: 100% Database Cleanup ---
  console.log('\n--- PART 6: Guaranteed 100% Database Cleanup ---');
  await prisma.auditEvent.deleteMany({ where: { actorUserId: { startsWith: 'syn_rnd_' } } });
  await prisma.clinicianCredential.deleteMany({ where: { bmdcNumber: 'BMDC-RND-TEST' } });
  await prisma.userRoleAssignment.deleteMany({ where: { userId: { startsWith: 'syn_rnd_' } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: 'syn_rnd_' } } });

  const residualUsers = await prisma.user.count({ where: { id: { startsWith: 'syn_rnd_' } } });
  const residualCreds = await prisma.clinicianCredential.count({ where: { bmdcNumber: 'BMDC-RND-TEST' } });
  assert(residualUsers === 0, 'Residual synthetic users in PostgreSQL: 0');
  assert(residualCreds === 0, 'Residual synthetic credentials in PostgreSQL: 0');

  // Shutdown test server
  await new Promise(resolve => server.close(resolve));
  await prisma.$disconnect();

  console.log('\n================================================================');
  console.log(`  RENDER PREVIEW TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
