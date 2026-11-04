const fs = require('fs');
const path = require('path');
const http = require('http');
const XLSX = require('xlsx');
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

// Helper to make local HTTP requests
function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch {
          // not json
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          json,
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      if (typeof postData === 'string' || Buffer.isBuffer(postData)) {
        req.write(postData);
      } else {
        req.write(JSON.stringify(postData));
      }
    }
    req.end();
  });
}

// Helper to create an in-memory XLSX buffer
function createXlsxBuffer(rows) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Antibiotics');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

async function runSuite() {
  console.log('================================================================');
  console.log('  MEDMINDERS PROMPT E: REAL POSTGRESQL CATALOGUE INTEGRATION SUITE');
  console.log('================================================================\n');

  // Dynamic import of compiled server modules
  const { app } = await import('../dist/app.js');
  const { CatalogueImportService } = await import('../dist/services/catalogue/catalogueImportService.js');
  const { CatalogueMatcher } = await import('../dist/services/catalogue/catalogueMatcher.js');
  const { matchAntibiotic } = await import('../dist/services/antibiotics/matcher.js');
  const { signJwt, hashPassword } = await import('../dist/services/auth/cryptoUtils.js');

  const SYN_PREFIX = 'syn_cat_';
  let server;
  let baseUrl;
  let serverPort;

  try {
    // -------------------------------------------------------------
    // PART 1: Database Connectivity & Schema Verification
    // -------------------------------------------------------------
    console.log('--- PART 1: Live PostgreSQL Schema & Model Verification ---');
    await prisma.$queryRaw`SELECT 1 as connected;`;
    assert(true, 'Connected to live Supabase PostgreSQL via Session Pooler');

    const tableCheck = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('CatalogueRelease', 'MedicineGeneric', 'MedicineBrand', 'CatalogueStagingBatch', 'Antibiotic');
    `;
    const foundTables = tableCheck.map(t => t.table_name);
    assert(foundTables.includes('CatalogueRelease'), 'CatalogueRelease table verified in public schema');
    assert(foundTables.includes('MedicineGeneric'), 'MedicineGeneric table verified in public schema');
    assert(foundTables.includes('MedicineBrand'), 'MedicineBrand table verified in public schema');
    assert(foundTables.includes('CatalogueStagingBatch'), 'CatalogueStagingBatch table verified in public schema');
    assert(foundTables.includes('Antibiotic'), 'Antibiotic table verified in public schema');

    // -------------------------------------------------------------
    // Setup: Seed Synthetic Users for Staging, Curation, and Role-Based Authorization
    // -------------------------------------------------------------
    const curatorUserId = `${SYN_PREFIX}curator_1`;
    const patientUserId = `${SYN_PREFIX}patient_1`;
    const repUserId = `${SYN_PREFIX}rep_1`;
    const docUnverifiedId = `${SYN_PREFIX}doc_unverified`;
    const docSuspendedId = `${SYN_PREFIX}doc_suspended`;
    const docVerifiedId = `${SYN_PREFIX}doc_verified`;
    const pharmVerifiedId = `${SYN_PREFIX}pharm_verified`;
    const allSyntheticUserIds = [
      curatorUserId,
      patientUserId,
      repUserId,
      docUnverifiedId,
      docSuspendedId,
      docVerifiedId,
      pharmVerifiedId,
    ];

    const defaultPasswordHash = hashPassword('TestPassword123!');

    // Clean prior runs if any
    await prisma.clinicianCredential.deleteMany({ where: { userId: { in: allSyntheticUserIds } } });
    await prisma.pharmacistCredential.deleteMany({ where: { userId: { in: allSyntheticUserIds } } });
    await prisma.userRoleAssignment.deleteMany({ where: { userId: { in: allSyntheticUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: allSyntheticUserIds } } });

    // 1. Curator (SUPERADMIN)
    await prisma.user.create({
      data: {
        id: curatorUserId,
        email: `${curatorUserId}@medminders.local`,
        passwordHash: defaultPasswordHash,
        legacyRole: 'admin',
        isActive: true,
      },
    });
    await prisma.userRoleAssignment.create({
      data: {
        userId: curatorUserId,
        role: 'SUPERADMIN',
        isVerified: true,
        verifiedAt: new Date(),
      },
    });

    // 2. Patient
    await prisma.user.create({
      data: {
        id: patientUserId,
        email: `${patientUserId}@medminders.local`,
        passwordHash: defaultPasswordHash,
        legacyRole: 'patient',
        isActive: true,
      },
    });
    await prisma.userRoleAssignment.create({
      data: {
        userId: patientUserId,
        role: 'PATIENT',
        isVerified: true,
        verifiedAt: new Date(),
      },
    });

    // 3. Representative (Marketing / Sales)
    await prisma.user.create({
      data: {
        id: repUserId,
        email: `${repUserId}@medminders.local`,
        passwordHash: defaultPasswordHash,
        legacyRole: 'representative',
        isActive: true,
      },
    });
    await prisma.userRoleAssignment.create({
      data: {
        userId: repUserId,
        role: 'PATIENT',
        isVerified: true,
        verifiedAt: new Date(),
      },
    });

    // 4. Unverified Doctor (PENDING BMDC)
    await prisma.user.create({
      data: {
        id: docUnverifiedId,
        email: `${docUnverifiedId}@medminders.local`,
        passwordHash: defaultPasswordHash,
        legacyRole: 'doctor',
        isActive: true,
      },
    });
    await prisma.userRoleAssignment.create({
      data: {
        userId: docUnverifiedId,
        role: 'DOCTOR',
        isVerified: false,
      },
    });
    await prisma.clinicianCredential.create({
      data: {
        userId: docUnverifiedId,
        bmdcNumber: 'BMDC-TEST-PENDING-991',
        verificationStatus: 'PENDING',
      },
    });

    // 5. Suspended Doctor (SUSPENDED BMDC)
    await prisma.user.create({
      data: {
        id: docSuspendedId,
        email: `${docSuspendedId}@medminders.local`,
        passwordHash: defaultPasswordHash,
        legacyRole: 'doctor',
        isActive: true,
      },
    });
    await prisma.userRoleAssignment.create({
      data: {
        userId: docSuspendedId,
        role: 'DOCTOR',
        isVerified: true,
      },
    });
    await prisma.clinicianCredential.create({
      data: {
        userId: docSuspendedId,
        bmdcNumber: 'BMDC-TEST-SUSPENDED-992',
        verificationStatus: 'SUSPENDED',
      },
    });

    // 6. Verified Doctor (VERIFIED BMDC)
    await prisma.user.create({
      data: {
        id: docVerifiedId,
        email: `${docVerifiedId}@medminders.local`,
        passwordHash: defaultPasswordHash,
        legacyRole: 'doctor',
        isActive: true,
      },
    });
    await prisma.userRoleAssignment.create({
      data: {
        userId: docVerifiedId,
        role: 'DOCTOR',
        isVerified: true,
        verifiedAt: new Date(),
      },
    });
    await prisma.clinicianCredential.create({
      data: {
        userId: docVerifiedId,
        bmdcNumber: 'BMDC-TEST-VERIFIED-993',
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
      },
    });

    // 7. Verified Pharmacist (VERIFIED License)
    await prisma.user.create({
      data: {
        id: pharmVerifiedId,
        email: `${pharmVerifiedId}@medminders.local`,
        passwordHash: defaultPasswordHash,
        legacyRole: 'pharmacist',
        isActive: true,
      },
    });
    await prisma.userRoleAssignment.create({
      data: {
        userId: pharmVerifiedId,
        role: 'PHARMACIST',
        isVerified: true,
        verifiedAt: new Date(),
      },
    });
    await prisma.pharmacistCredential.create({
      data: {
        userId: pharmVerifiedId,
        licenseNumber: 'PHARM-TEST-VERIFIED-994',
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
      },
    });

    // Mint test JWTs
    const curatorJwt = signJwt({
      sub: curatorUserId,
      email: `${curatorUserId}@medminders.local`,
      roles: [{ role: 'SUPERADMIN', isVerified: true }],
    }, 3600);

    const patientJwt = signJwt({
      sub: patientUserId,
      email: `${patientUserId}@medminders.local`,
      roles: [{ role: 'PATIENT', isVerified: true }],
    }, 3600);

    const repJwt = signJwt({
      sub: repUserId,
      email: `${repUserId}@medminders.local`,
      roles: [{ role: 'PATIENT', isVerified: true }],
    }, 3600);

    const docUnverifiedJwt = signJwt({
      sub: docUnverifiedId,
      email: `${docUnverifiedId}@medminders.local`,
      roles: [{ role: 'DOCTOR', isVerified: false }],
    }, 3600);

    const docSuspendedJwt = signJwt({
      sub: docSuspendedId,
      email: `${docSuspendedId}@medminders.local`,
      roles: [{ role: 'DOCTOR', isVerified: true }],
    }, 3600);

    const docVerifiedJwt = signJwt({
      sub: docVerifiedId,
      email: `${docVerifiedId}@medminders.local`,
      roles: [{ role: 'DOCTOR', isVerified: true }],
    }, 3600);

    const pharmVerifiedJwt = signJwt({
      sub: pharmVerifiedId,
      email: `${pharmVerifiedId}@medminders.local`,
      roles: [{ role: 'PHARMACIST', isVerified: true }],
    }, 3600);

    assert(true, 'Seeded synthetic users across all roles in PostgreSQL (Curator, Patient, Rep, Unverified/Suspended/Verified Doc, Verified Pharm)');


    // -------------------------------------------------------------
    // PART 2: Malformed XLSX Rows, Duplicate Brands, and Rejection Lifecycle
    // -------------------------------------------------------------
    console.log('\n--- PART 2: Malformed XLSX Parsing, Conflicting Brands & Rejection ---');

    // Synthetic spreadsheet with:
    // 1. Missing generic name row
    // 2. Blank spacer row
    // 3. Duplicate brand assigned to two different generics (syn_cat_clash_brand)
    // 4. Unknown WHO AWaRe classification
    const malformedRows = [
      ['generic', 'group', 'brand', 'company', 'dose', 'aware', 'side effects'],
      ['', 'Penicillin', 'syn_cat_orphan_brand', 'Square', '500 mg', 'ACCESS', ''], // Missing generic
      ['', '', '', '', '', '', ''], // Blank spacer line
      ['syn_cat_gen_alpha', 'Cephalosporin', 'syn_cat_clash_brand', 'Square', '1 g IV daily', 'WATCH', 'Rash'],
      ['', '', 'syn_cat_brand_alpha_2', 'Incepta', '500 mg', '', ''], // Forward filled
      ['syn_cat_gen_beta', 'Macrolide', 'syn_cat_clash_brand', 'Beximco', '500 mg daily', 'UNKNOWN_WHO_CATEGORY', 'Nausea'], // Brand clash & unknown aware
    ];

    const malformedBuffer = createXlsxBuffer(malformedRows);

    const stageResult1 = await CatalogueImportService.stageXlsx({
      buffer: malformedBuffer,
      filename: 'syn_cat_test_malformed.xlsx',
      uploadedByUserId: curatorUserId,
    });

    assert(stageResult1.batchId, `Staging batch created with ID: ${stageResult1.batchId}`);
    assert(stageResult1.requiresCuratorApproval === true, 'Batch flagged as requiring curator approval');
    assert(stageResult1.errors.length > 0, `Captured ${stageResult1.errors.length} validation errors (missing generic handled)`);
    assert(stageResult1.diffSummary.conflictingBrands.length > 0, 'Detected conflicting brand (syn_cat_clash_brand assigned to multiple generics)');
    assert(
      stageResult1.diffSummary.conflictingBrands.some(c => c.brandName.toLowerCase().includes('syn_cat_clash_brand')),
      'Exact conflicting brand identified in staging diff'
    );

    // Verify rejection lifecycle
    const rejectResult = await CatalogueImportService.rejectStagingBatch(
      stageResult1.batchId,
      curatorUserId,
      'Rejected due to duplicate brand assignment and malformed rows'
    );

    assert(rejectResult.status === 'REJECTED', 'Batch status updated to REJECTED');
    assert(rejectResult.reviewedByUserId === curatorUserId, 'Curator user recorded on rejected batch');

    // Confirm that no CatalogueRelease was created for rejected batch
    const rejectedReleases = await prisma.catalogueRelease.count({
      where: { sourceSha256: stageResult1.fileSha256 },
    });
    assert(rejectedReleases === 0, 'No CatalogueRelease created from rejected staging batch');

    // -------------------------------------------------------------
    // PART 3: Valid Staged Batch Approval & Publication
    // -------------------------------------------------------------
    console.log('\n--- PART 3: Staging Batch Approval, Publication & Projection ---');

    const cleanRowsV1 = [
      ['generic', 'group', 'brand', 'company', 'dose', 'aware', 'side effects'],
      ['syn_cat_amoxicillin', 'Penicillin', 'syn_cat_moxacil', 'Square Pharmaceuticals', '500 mg every 8 hours for 7 days', 'ACCESS', 'Mild diarrhea'],
      ['', '', 'syn_cat_furoclav', 'Incepta Pharmaceuticals', '', '', ''], // Contiguous forward fill
      ['syn_cat_meropenem', 'Carbapenem', 'syn_cat_meropen', 'Beximco Pharmaceuticals', '1 g IV every 8 hours for 10 days', 'WATCH', 'Nausea, headache'],
    ];

    const cleanBufferV1 = createXlsxBuffer(cleanRowsV1);

    const stageResult2 = await CatalogueImportService.stageXlsx({
      buffer: cleanBufferV1,
      filename: 'syn_cat_v1.xlsx',
      uploadedByUserId: curatorUserId,
    });

    assert(stageResult2.diffSummary.conflictingBrands.length === 0, 'Zero conflicting brands in clean staging batch');
    assert(stageResult2.diffSummary.newGenericsCount === 2, 'Staged 2 new generics');
    assert(stageResult2.diffSummary.totalStagedBrands === 3, 'Staged 3 brands across 2 generics');

    // Approve and publish v999.1.0
    const publishedRelease1 = await CatalogueImportService.approveAndPublish({
      batchId: stageResult2.batchId,
      curatorUserId,
      version: 'v999.1.0',
      curatorNotes: 'Approved synthetic test catalogue v1',
    });

    assert(publishedRelease1.version === 'v999.1.0', 'Release published with version v999.1.0');
    assert(publishedRelease1.status === 'PUBLISHED', 'Release status is PUBLISHED');

    // Check PostgreSQL persistence in MedicineGeneric and MedicineBrand
    const dbGenericsV1 = await prisma.medicineGeneric.findMany({
      where: { catalogueReleaseId: publishedRelease1.id },
      include: { brands: true },
    });
    assert(dbGenericsV1.length === 2, 'Persisted 2 MedicineGeneric rows in PostgreSQL');
    const amoxGen = dbGenericsV1.find(g => g.genericName.toLowerCase().includes('amoxicillin'));
    assert(amoxGen && amoxGen.awareGroup === 'ACCESS', 'Amoxicillin categorized with WHO AWaRe ACCESS');
    assert(amoxGen.brands.length === 2, 'Amoxicillin linked to 2 brand rows (syn_cat_moxacil, syn_cat_furoclav)');
    assert(
      amoxGen.referenceDosingGuidance.includes('General adult reference only'),
      'Reference dosing guidance contains mandatory adult clinical disclaimer'
    );

    // Verify projection into legacy/interim Antibiotic table with catalogueVersion
    const projectedAntibiotics = await prisma.antibiotic.findMany({
      where: { catalogueVersion: 'v999.1.0' },
    });
    assert(projectedAntibiotics.length >= 2, `Projected ${projectedAntibiotics.length} records into Antibiotic table`);
    assert(
      projectedAntibiotics.some(a => a.genericName.includes('syn_cat_amoxicillin')),
      'Projected Antibiotic record matches syn_cat_amoxicillin'
    );

    // -------------------------------------------------------------
    // PART 4: Version Rollback Without History Deletion
    // -------------------------------------------------------------
    console.log('\n--- PART 4: Version Rollback (Non-Destructive History Preservation) ---');

    // Stage and publish version v999.2.0
    const rowsV2 = [
      ['generic', 'group', 'brand', 'company', 'dose', 'aware', 'side effects'],
      ['syn_cat_amoxicillin', 'Penicillin', 'syn_cat_moxacil', 'Square Pharmaceuticals', '500 mg every 8 hours for 7 days', 'ACCESS', 'Mild diarrhea'],
      ['syn_cat_linezolid', 'Oxazolidinone', 'syn_cat_linox', 'Incepta', '600 mg BD for 14 days', 'RESERVE', 'Thrombocytopenia'],
    ];

    const bufferV2 = createXlsxBuffer(rowsV2);
    const stageResult3 = await CatalogueImportService.stageXlsx({
      buffer: bufferV2,
      filename: 'syn_cat_v2.xlsx',
      uploadedByUserId: curatorUserId,
    });

    const publishedRelease2 = await CatalogueImportService.approveAndPublish({
      batchId: stageResult3.batchId,
      curatorUserId,
      version: 'v999.2.0',
      curatorNotes: 'Published v2 with Linezolid RESERVE',
    });

    assert(publishedRelease2.status === 'PUBLISHED', 'Version v999.2.0 is now PUBLISHED');

    // Verify v999.1.0 was marked SUPERSEDED
    const releaseV1Status = await prisma.catalogueRelease.findUnique({
      where: { id: publishedRelease1.id },
    });
    assert(releaseV1Status.status === 'SUPERSEDED', 'Previous release v999.1.0 was marked SUPERSEDED');

    // Rollback to v999.1.0
    const rollbackResult = await CatalogueImportService.rollbackToVersion(
      publishedRelease1.id,
      curatorUserId,
      'Rolling back to v999.1.0 due to validation recall on v2'
    );

    assert(rollbackResult.version === 'v999.1.0', 'Rollback re-activated v999.1.0');
    assert(rollbackResult.status === 'PUBLISHED', 'v999.1.0 status is PUBLISHED');

    // Verify v999.2.0 was marked SUPERSEDED
    const releaseV2Status = await prisma.catalogueRelease.findUnique({
      where: { id: publishedRelease2.id },
    });
    assert(releaseV2Status.status === 'SUPERSEDED', 'v999.2.0 is marked SUPERSEDED');

    // Strict Invariant: Assert ZERO records were deleted
    const allSyntheticReleases = await prisma.catalogueRelease.findMany({
      where: { version: { in: ['v999.1.0', 'v999.2.0'] } },
    });
    assert(allSyntheticReleases.length === 2, 'All historical releases preserved in PostgreSQL (0 records deleted)');

    const linezolidGeneric = await prisma.medicineGeneric.findFirst({
      where: { genericName: 'syn_cat_linezolid' },
    });
    assert(linezolidGeneric !== null, 'Superseded generic records remain preserved for clinical audit trail');

    // -------------------------------------------------------------
    // PART 5: Fuzzy Matching & Ambiguity Safe Gate
    // -------------------------------------------------------------
    console.log('\n--- PART 5: Fuzzy Matching & Ambiguity Safe Gate ---');

    // 1. Direct high-confidence match on generic name
    const matchGen = await matchAntibiotic('syn_cat_amoxicillin 500mg', prisma);
    assert(matchGen.match !== null, 'Exact generic search returned match');
    assert(matchGen.confidence >= 0.95, `High confidence for generic match: ${matchGen.confidence}`);
    assert(matchGen.isAmbiguous === false, 'Generic match marked isAmbiguous: false');
    assert(matchGen.matched_on === 'generic', 'Matched on generic');

    // 2. Direct high-confidence match on brand name
    const matchBrand = await matchAntibiotic('syn_cat_moxacil 500mg capsule', prisma);
    assert(matchBrand.match !== null, 'Exact brand search returned match');
    assert(matchBrand.isAmbiguous === false, 'Brand match marked isAmbiguous: false');
    assert(matchBrand.matched_on === 'brand', 'Matched on brand');

    // 3. Ambiguity Handling: close scores or unclear OCR input
    // Test fuzzy matcher directly on ambiguous spelling
    const fuzzyAmbiguous = await CatalogueMatcher.match('syn_cat_mox', prisma);
    assert(fuzzyAmbiguous.candidates.length > 0, `Matcher returned ${fuzzyAmbiguous.candidates.length} candidates`);
    // If candidates exist but score is under decisive threshold or close to runner up:
    if (fuzzyAmbiguous.isAmbiguous) {
      assert(fuzzyAmbiguous.selectedCandidate === null, 'Ambiguous match strictly withholds candidate auto-selection');
      assert(typeof fuzzyAmbiguous.ambiguityReason === 'string', `Ambiguity reason provided: ${fuzzyAmbiguous.ambiguityReason}`);
    } else {
      assert(fuzzyAmbiguous.confidence >= 0.85, 'Unambiguous match meets >= 0.85 confidence invariant');
    }

    // -------------------------------------------------------------
    // PART 6: Express HTTP API, SEC-INV-005 Audience Authorization & Cache Isolation
    // -------------------------------------------------------------
    console.log('\n--- PART 6: Express HTTP API, SEC-INV-005 Audience Authorization & Cache Isolation ---');

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        serverPort = addr.port;
        baseUrl = `http://127.0.0.1:${serverPort}`;
        resolve();
      });
    });

    // 1. GET /api/v1/catalogue/version
    const versionRes = await httpRequest({
      hostname: '127.0.0.1',
      port: serverPort,
      path: '/api/v1/catalogue/version',
      method: 'GET',
    });
    assert(versionRes.statusCode === 200, 'GET /api/v1/catalogue/version returned HTTP 200');
    assert(versionRes.json.version === 'v999.1.0', `Reported active catalogue version: ${versionRes.json.version}`);
    assert(versionRes.json.source.includes('syn_cat_v1.xlsx'), 'Reported classification source provenance');

    // 2. GET /api/v1/catalogue/antibiotics - SEC-INV-005 Multi-Role Audience Audit
    console.log('\n  [SEC-INV-005 Multi-Role Audience Audit: /api/v1/catalogue/antibiotics]');

    // 2a. Anonymous Caller (No token)
    const anonRes = await httpRequest({
      hostname: '127.0.0.1',
      port: serverPort,
      path: '/api/v1/catalogue/antibiotics',
      method: 'GET',
    });
    assert(anonRes.statusCode === 200, 'Anonymous GET /catalogue/antibiotics returns HTTP 200');
    assert(anonRes.json.audience === 'PATIENT_PUBLIC', 'Anonymous caller derived as PATIENT_PUBLIC audience');
    const anonItems = anonRes.json.data || anonRes.json.items || [];
    assert(anonItems.length >= 2, `Anonymous received ${anonItems.length} catalogue items`);
    assert(
      anonItems.every(i => i.referenceDosingGuidance === null),
      'Anonymous caller strictly receives referenceDosingGuidance: null on all items'
    );
    assert(
      anonItems.every(i => i.ageConsiderations === null),
      'Anonymous caller strictly receives ageConsiderations: null on all items'
    );
    assert(
      (anonRes.headers['vary'] || '').includes('Authorization'),
      'Cache Isolation: Vary header includes Authorization'
    );
    assert(
      (anonRes.headers['cache-control'] || '').includes('public'),
      'Cache Isolation: Public Cache-Control set for anonymous response'
    );
    assert(
      !(anonRes.headers['cache-control'] || '').includes('private'),
      'Cache Isolation: Anonymous response is NOT marked private'
    );

    // 2b. Anonymous Caller attempting client spoof: ?audience=clinician
    const anonSpoofRes = await httpRequest({
      hostname: '127.0.0.1',
      port: serverPort,
      path: '/api/v1/catalogue/antibiotics?audience=clinician',
      method: 'GET',
    });
    assert(anonSpoofRes.statusCode === 200, 'Anonymous spoof ?audience=clinician returns HTTP 200');
    assert(
      anonSpoofRes.json.audience === 'PATIENT_PUBLIC',
      'Client ?audience=clinician COMPLETELY IGNORED; derived audience remains PATIENT_PUBLIC'
    );
    const anonSpoofItems = anonSpoofRes.json.data || anonSpoofRes.json.items || [];
    assert(
      anonSpoofItems.every(i => i.referenceDosingGuidance === null),
      'Anonymous spoof caller strictly receives referenceDosingGuidance: null (Zero Leakage)'
    );

    // 2c. Patient Caller (Valid JWT, role: PATIENT) passing ?audience=clinician
    const patientRes = await httpRequest({
      hostname: '127.0.0.1',
      port: serverPort,
      path: '/api/v1/catalogue/antibiotics?audience=clinician',
      method: 'GET',
      headers: { Authorization: `Bearer ${patientJwt}` },
    });
    assert(patientRes.statusCode === 200, 'Patient GET /catalogue/antibiotics returns HTTP 200');
    assert(patientRes.json.audience === 'PATIENT_PUBLIC', 'Patient user derived as PATIENT_PUBLIC audience');
    const patientItems = patientRes.json.data || patientRes.json.items || [];
    assert(
      patientItems.every(i => i.referenceDosingGuidance === null),
      'Patient user strictly receives referenceDosingGuidance: null even with ?audience=clinician'
    );

    // 2d. Representative Caller (Valid JWT, role: representative/patient) passing ?audience=clinician
    const repRes = await httpRequest({
      hostname: '127.0.0.1',
      port: serverPort,
      path: '/api/v1/catalogue/antibiotics?audience=clinician',
      method: 'GET',
      headers: { Authorization: `Bearer ${repJwt}` },
    });
    assert(repRes.statusCode === 200, 'Representative GET /catalogue/antibiotics returns HTTP 200');
    assert(repRes.json.audience === 'PATIENT_PUBLIC', 'Representative derived as PATIENT_PUBLIC audience');
    const repItems = repRes.json.data || repRes.json.items || [];
    assert(
      repItems.every(i => i.referenceDosingGuidance === null),
      'Representative strictly receives referenceDosingGuidance: null'
    );

    // 2e. Unverified Doctor Caller (role: DOCTOR, ClinicianCredential: PENDING)
    const docUnverifiedRes = await httpRequest({
      hostname: '127.0.0.1',
      port: serverPort,
      path: '/api/v1/catalogue/antibiotics?audience=clinician',
      method: 'GET',
      headers: { Authorization: `Bearer ${docUnverifiedJwt}` },
    });
    assert(docUnverifiedRes.statusCode === 200, 'Unverified doctor GET /catalogue/antibiotics returns HTTP 200');
    assert(docUnverifiedRes.json.audience === 'PATIENT_PUBLIC', 'Unverified doctor derived as PATIENT_PUBLIC');
    const docUnverifiedItems = docUnverifiedRes.json.data || docUnverifiedRes.json.items || [];
    assert(
      docUnverifiedItems.every(i => i.referenceDosingGuidance === null),
      'Unverified doctor strictly receives referenceDosingGuidance: null'
    );

    // 2f. Suspended Doctor Caller (role: DOCTOR, ClinicianCredential: SUSPENDED)
    const docSuspendedRes = await httpRequest({
      hostname: '127.0.0.1',
      port: serverPort,
      path: '/api/v1/catalogue/antibiotics?audience=clinician',
      method: 'GET',
      headers: { Authorization: `Bearer ${docSuspendedJwt}` },
    });
    assert(docSuspendedRes.statusCode === 200, 'Suspended doctor GET /catalogue/antibiotics returns HTTP 200');
    assert(docSuspendedRes.json.audience === 'PATIENT_PUBLIC', 'Suspended doctor derived as PATIENT_PUBLIC');
    const docSuspendedItems = docSuspendedRes.json.data || docSuspendedRes.json.items || [];
    assert(
      docSuspendedItems.every(i => i.referenceDosingGuidance === null),
      'Suspended doctor strictly receives referenceDosingGuidance: null'
    );

    // 2g. Verified Doctor Caller (role: DOCTOR, ClinicianCredential: VERIFIED)
    const docVerifiedRes = await httpRequest({
      hostname: '127.0.0.1',
      port: serverPort,
      path: '/api/v1/catalogue/antibiotics',
      method: 'GET',
      headers: { Authorization: `Bearer ${docVerifiedJwt}` },
    });
    assert(docVerifiedRes.statusCode === 200, 'Verified doctor GET /catalogue/antibiotics returns HTTP 200');
    assert(docVerifiedRes.json.audience === 'CLINICIAN', 'Verified doctor derived as CLINICIAN audience');
    const docVerifiedItems = docVerifiedRes.json.data || docVerifiedRes.json.items || [];
    assert(
      docVerifiedItems.some(i => typeof i.referenceDosingGuidance === 'string' && i.referenceDosingGuidance.length > 0),
      'Verified doctor receives referenceDosingGuidance'
    );
    assert(
      (docVerifiedRes.headers['cache-control'] || '').includes('private'),
      'Cache Isolation: Verified doctor response marked Cache-Control: private'
    );
    assert(
      (docVerifiedRes.headers['vary'] || '').includes('Authorization'),
      'Cache Isolation: Verified doctor response includes Vary: Authorization'
    );

    // 2h. Verified Pharmacist Caller (role: PHARMACIST, PharmacistCredential: VERIFIED)
    const pharmVerifiedRes = await httpRequest({
      hostname: '127.0.0.1',
      port: serverPort,
      path: '/api/v1/catalogue/antibiotics',
      method: 'GET',
      headers: { Authorization: `Bearer ${pharmVerifiedJwt}` },
    });
    assert(pharmVerifiedRes.statusCode === 200, 'Verified pharmacist GET /catalogue/antibiotics returns HTTP 200');
    assert(pharmVerifiedRes.json.audience === 'CLINICIAN', 'Verified pharmacist derived as CLINICIAN audience');
    const pharmVerifiedItems = pharmVerifiedRes.json.data || pharmVerifiedRes.json.items || [];
    assert(
      pharmVerifiedItems.some(i => typeof i.referenceDosingGuidance === 'string' && i.referenceDosingGuidance.length > 0),
      'Verified pharmacist receives referenceDosingGuidance'
    );
    assert(
      (pharmVerifiedRes.headers['cache-control'] || '').includes('private'),
      'Cache Isolation: Verified pharmacist response marked Cache-Control: private'
    );

    // 3. Detail Endpoint: GET /api/v1/catalogue/generics/:id
    console.log('\n  [SEC-INV-005 Detail Endpoint Audit: /api/v1/catalogue/generics/:id]');
    const amoxGenId = amoxGen.id;

    // 3a. Anonymous caller to detail endpoint
    const anonDetailRes = await httpRequest({
      hostname: '127.0.0.1',
      port: serverPort,
      path: `/api/v1/catalogue/generics/${amoxGenId}`,
      method: 'GET',
    });
    assert(anonDetailRes.statusCode === 200, 'Anonymous GET /catalogue/generics/:id returns HTTP 200');
    assert(anonDetailRes.json.audience === 'PATIENT_PUBLIC', 'Anonymous detail caller derived as PATIENT_PUBLIC');
    assert(anonDetailRes.json.referenceDosingGuidance === null, 'Anonymous detail caller receives referenceDosingGuidance: null');
    assert(anonDetailRes.json.ageConsiderations === null, 'Anonymous detail caller receives ageConsiderations: null');
    assert(typeof anonDetailRes.json.patientNotice === 'string', 'Patient advisory notice present on detail view');
    assert((anonDetailRes.headers['cache-control'] || '').includes('public'), 'Cache Isolation: Detail response is public for anonymous');

    // 3b. Patient caller spoofing ?audience=clinician on detail endpoint
    const patientDetailRes = await httpRequest({
      hostname: '127.0.0.1',
      port: serverPort,
      path: `/api/v1/catalogue/generics/${amoxGenId}?audience=clinician`,
      method: 'GET',
      headers: { Authorization: `Bearer ${patientJwt}` },
    });
    assert(patientDetailRes.statusCode === 200, 'Patient GET /catalogue/generics/:id returns HTTP 200');
    assert(patientDetailRes.json.audience === 'PATIENT_PUBLIC', 'Patient spoof derived as PATIENT_PUBLIC');
    assert(patientDetailRes.json.referenceDosingGuidance === null, 'Patient spoof receives referenceDosingGuidance: null');

    // 3c. Suspended Doctor on detail endpoint
    const docSuspendedDetailRes = await httpRequest({
      hostname: '127.0.0.1',
      port: serverPort,
      path: `/api/v1/catalogue/generics/${amoxGenId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${docSuspendedJwt}` },
    });
    assert(docSuspendedDetailRes.statusCode === 200, 'Suspended doctor detail returns HTTP 200');
    assert(docSuspendedDetailRes.json.audience === 'PATIENT_PUBLIC', 'Suspended doctor derived as PATIENT_PUBLIC');
    assert(docSuspendedDetailRes.json.referenceDosingGuidance === null, 'Suspended doctor receives referenceDosingGuidance: null');

    // 3d. Verified Doctor on detail endpoint
    const docVerifiedDetailRes = await httpRequest({
      hostname: '127.0.0.1',
      port: serverPort,
      path: `/api/v1/catalogue/generics/${amoxGenId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${docVerifiedJwt}` },
    });
    assert(docVerifiedDetailRes.statusCode === 200, 'Verified doctor detail returns HTTP 200');
    assert(docVerifiedDetailRes.json.audience === 'CLINICIAN', 'Verified doctor derived as CLINICIAN');
    assert(
      typeof docVerifiedDetailRes.json.referenceDosingGuidance === 'string' && docVerifiedDetailRes.json.referenceDosingGuidance.length > 0,
      'Verified doctor receives full referenceDosingGuidance on detail view'
    );
    assert((docVerifiedDetailRes.headers['cache-control'] || '').includes('private'), 'Cache Isolation: Verified doctor detail is private');

    // 4. Antibiotics Endpoint: GET /api/v1/antibiotics (and legacy /api/antibiotics)
    console.log('\n  [SEC-INV-005 Antibiotics Endpoint Audit: /api/v1/antibiotics]');

    // 4a. Anonymous caller to /api/v1/antibiotics
    const anonAbRes = await httpRequest({
      hostname: '127.0.0.1',
      port: serverPort,
      path: '/api/v1/antibiotics?audience=clinician',
      method: 'GET',
    });
    assert(anonAbRes.statusCode === 200, 'Anonymous GET /api/v1/antibiotics returns HTTP 200');
    const anonAbItems = anonAbRes.json.data || anonAbRes.json.items || [];
    assert(
      anonAbItems.every(a => a.doseDuration === null),
      'Anonymous caller to /api/v1/antibiotics strictly receives doseDuration: null on all records'
    );
    assert((anonAbRes.headers['cache-control'] || '').includes('public'), 'Cache Isolation: /api/v1/antibiotics is public for anonymous');

    // 4b. Verified Doctor caller to /api/v1/antibiotics
    const docAbRes = await httpRequest({
      hostname: '127.0.0.1',
      port: serverPort,
      path: '/api/v1/antibiotics',
      method: 'GET',
      headers: { Authorization: `Bearer ${docVerifiedJwt}` },
    });
    assert(docAbRes.statusCode === 200, 'Verified doctor GET /api/v1/antibiotics returns HTTP 200');
    const docAbItems = docAbRes.json.data || docAbRes.json.items || [];
    assert(
      docAbItems.some(a => typeof a.doseDuration === 'string' && a.doseDuration.length > 0),
      'Verified doctor caller to /api/v1/antibiotics receives populated doseDuration'
    );
    assert((docAbRes.headers['cache-control'] || '').includes('private'), 'Cache Isolation: /api/v1/antibiotics is private for clinician');

    // 4c. Legacy alias: GET /api/antibiotics
    const legacyAbRes = await httpRequest({
      hostname: '127.0.0.1',
      port: serverPort,
      path: '/api/antibiotics',
      method: 'GET',
    });
    assert(legacyAbRes.statusCode === 200, 'Legacy GET /api/antibiotics returns HTTP 200');
    assert(legacyAbRes.headers['deprecation'] === 'true', 'Legacy alias returns RFC 8594 Deprecation header');
    const legacyAbItems = legacyAbRes.json.data || legacyAbRes.json.items || [];
    assert(
      legacyAbItems.every(a => a.doseDuration === null),
      'Anonymous caller to legacy /api/antibiotics strictly receives doseDuration: null'
    );

    // 5. Search endpoint: GET /api/v1/catalogue/search?q=amox
    console.log('\n  [SEC-INV-005 Search Endpoint Audit: /api/v1/catalogue/search]');
    const searchRes = await httpRequest({
      hostname: '127.0.0.1',
      port: serverPort,
      path: '/api/v1/catalogue/search?q=amox',
      method: 'GET',
    });
    assert(searchRes.statusCode === 200, 'GET /api/v1/catalogue/search returned HTTP 200');
    assert((searchRes.headers['cache-control'] || '').includes('public'), 'Search Cache-Control is public');
    const searchCandidates = searchRes.json.candidates || searchRes.json.items || [];
    assert(
      searchCandidates.some(c => (c.genericName || '').toLowerCase().includes('amoxicillin')),
      'Search returned matching amoxicillin generic'
    );
    assert(
      searchCandidates.every(c => c.referenceDosingGuidance === undefined && c.doseDuration === undefined),
      'Search candidates contain zero dosing guidance fields'
    );

    // 6. Admin route access control: POST /api/v1/admin/catalogue/import/stage
    console.log('\n  [Admin Staging Guard Verification]');
    const unauthStageRes = await httpRequest({
      hostname: '127.0.0.1',
      port: serverPort,
      path: '/api/v1/admin/catalogue/import/stage',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, {});
    assert(unauthStageRes.statusCode === 401, 'Unauthenticated staging request rejected with HTTP 401');

    const patientStageRes = await httpRequest({
      hostname: '127.0.0.1',
      port: serverPort,
      path: '/api/v1/admin/catalogue/import/stage',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientJwt}`,
      },
    }, {});
    assert(patientStageRes.statusCode === 403, 'Patient staging request rejected with HTTP 403 Forbidden');

    // 7. Deprecated legacy alias: GET /api/catalogue/version
    const legacyRes = await httpRequest({
      hostname: '127.0.0.1',
      port: serverPort,
      path: '/api/catalogue/version',
      method: 'GET',
    });
    assert(legacyRes.statusCode === 200, 'Deprecated legacy GET /api/catalogue/version returned HTTP 200');
    assert(legacyRes.headers['deprecation'] === 'true', 'RFC 8594 Deprecation: true header returned on legacy alias');
    assert(legacyRes.headers['sunset'] === 'Sun, 01 Nov 2026 00:00:00 GMT', 'RFC 8594 Sunset date header returned');
    assert(
      legacyRes.headers['link'] && legacyRes.headers['link'].includes('/api/v1/catalogue/version'),
      'RFC 8594 Link header with successor-version returned'
    );

  } finally {

    // -------------------------------------------------------------
    // PART 7: 100% Database Cleanup & Zero Residuals Guarantee
    // -------------------------------------------------------------
    console.log('\n--- PART 7: Guaranteed 100% Database Cleanup ---');

    if (server) {
      await new Promise(r => server.close(r));
    }

    try {
      // 1. Delete Antibiotic table projections
      await prisma.antibiotic.deleteMany({
        where: {
          OR: [
            { catalogueVersion: { in: ['v999.1.0', 'v999.2.0'] } },
            { genericName: { startsWith: 'syn_cat_' } },
          ],
        },
      });

      // 2. Delete Staging Batches
      await prisma.catalogueStagingBatch.deleteMany({
        where: { filename: { startsWith: 'syn_cat_' } },
      });

      // 3. Delete MedicineBrands and MedicineGenerics linked to test releases
      const testReleases = await prisma.catalogueRelease.findMany({
        where: { version: { in: ['v999.1.0', 'v999.2.0'] } },
      });
      const testReleaseIds = testReleases.map(r => r.id);

      await prisma.medicineBrand.deleteMany({
        where: { generic: { catalogueReleaseId: { in: testReleaseIds } } },
      });
      await prisma.medicineGeneric.deleteMany({
        where: { catalogueReleaseId: { in: testReleaseIds } },
      });
      await prisma.catalogueRelease.deleteMany({
        where: { id: { in: testReleaseIds } },
      });

      // 4. Delete Audit Events for test actions
      await prisma.auditEvent.deleteMany({
        where: {
          OR: [
            { actorUserId: { startsWith: 'syn_cat_' } },
            { entityId: { startsWith: 'syn_cat_' } },
          ],
        },
      });

      // 5. Delete synthetic credentials and users
      await prisma.clinicianCredential.deleteMany({
        where: { userId: { startsWith: 'syn_cat_' } },
      });
      await prisma.pharmacistCredential.deleteMany({
        where: { userId: { startsWith: 'syn_cat_' } },
      });
      await prisma.userRoleAssignment.deleteMany({
        where: { userId: { startsWith: 'syn_cat_' } },
      });
      await prisma.user.deleteMany({
        where: { id: { startsWith: 'syn_cat_' } },
      });

      // Assert residual counts
      const resReleases = await prisma.catalogueRelease.count({
        where: { version: { in: ['v999.1.0', 'v999.2.0'] } },
      });
      const resGenerics = await prisma.medicineGeneric.count({
        where: { genericName: { startsWith: 'syn_cat_' } },
      });
      const resBrands = await prisma.medicineBrand.count({
        where: { brandName: { startsWith: 'syn_cat_' } },
      });
      const resBatches = await prisma.catalogueStagingBatch.count({
        where: { filename: { startsWith: 'syn_cat_' } },
      });
      const resAntibiotics = await prisma.antibiotic.count({
        where: { genericName: { startsWith: 'syn_cat_' } },
      });
      const resUsers = await prisma.user.count({
        where: { id: { startsWith: 'syn_cat_' } },
      });
      const resClinicians = await prisma.clinicianCredential.count({
        where: { userId: { startsWith: 'syn_cat_' } },
      });
      const resPharmacists = await prisma.pharmacistCredential.count({
        where: { userId: { startsWith: 'syn_cat_' } },
      });

      assert(resReleases === 0, 'Residual synthetic releases in PostgreSQL: 0');
      assert(resGenerics === 0, 'Residual synthetic generics in PostgreSQL: 0');
      assert(resBrands === 0, 'Residual synthetic brands in PostgreSQL: 0');
      assert(resBatches === 0, 'Residual synthetic batches in PostgreSQL: 0');
      assert(resAntibiotics === 0, 'Residual synthetic antibiotic projections in PostgreSQL: 0');
      assert(resUsers === 0, 'Residual synthetic users in PostgreSQL: 0');
      assert(resClinicians === 0, 'Residual synthetic clinician credentials in PostgreSQL: 0');
      assert(resPharmacists === 0, 'Residual synthetic pharmacist credentials in PostgreSQL: 0');


      console.log('\n================================================================');
      console.log(`  PROMPT E TEST SUITE SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
      console.log('================================================================\n');
    } catch (cleanupErr) {
      console.error('Error during cleanup:', cleanupErr);
    } finally {
      await prisma.$disconnect();
    }
  }

  if (failedCount > 0) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
