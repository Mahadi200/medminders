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
    // Setup: Seed Synthetic Users for Staging and Curation
    // -------------------------------------------------------------
    const curatorUserId = `${SYN_PREFIX}curator_1`;
    const patientUserId = `${SYN_PREFIX}patient_1`;
    const defaultPasswordHash = hashPassword('TestPassword123!');

    // Clean prior runs if any
    await prisma.userRoleAssignment.deleteMany({ where: { userId: { in: [curatorUserId, patientUserId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [curatorUserId, patientUserId] } } });

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

    assert(true, 'Seeded synthetic curator (SUPERADMIN) and patient users in PostgreSQL');

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
    // PART 6: Express HTTP API & RFC 8594 / 9213 Deprecation Headers
    // -------------------------------------------------------------
    console.log('\n--- PART 6: Express HTTP API & Deprecation Headers ---');

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

    // 2. GET /api/v1/catalogue/antibiotics
    const antibioticsRes = await httpRequest({
      hostname: '127.0.0.1',
      port: serverPort,
      path: '/api/v1/catalogue/antibiotics',
      method: 'GET',
    });
    assert(antibioticsRes.statusCode === 200, 'GET /api/v1/catalogue/antibiotics returned HTTP 200');
    const antibioticItems = antibioticsRes.json.data || antibioticsRes.json.items || [];
    assert(antibioticItems.length >= 2, `Returned ${antibioticItems.length} catalogue generic items`);
    assert(
      (antibioticsRes.json.disclaimer || '').includes('Adult reference guidance only'),
      'Returned mandatory clinical reference guidance disclaimer'
    );

    // 3. GET /api/v1/catalogue/search?q=amox
    const searchRes = await httpRequest({
      hostname: '127.0.0.1',
      port: serverPort,
      path: '/api/v1/catalogue/search?q=amox',
      method: 'GET',
    });
    assert(searchRes.statusCode === 200, 'GET /api/v1/catalogue/search returned HTTP 200');
    const searchCandidates = searchRes.json.candidates || searchRes.json.items || [];
    assert(
      searchCandidates.some(c => (c.genericName || '').toLowerCase().includes('amoxicillin')),
      'Search returned matching amoxicillin generic'
    );

    // 4. Admin route access control: POST /api/v1/admin/catalogue/import/stage
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

    // 5. Deprecated legacy alias: GET /api/catalogue/version
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

      // 5. Delete synthetic users
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

      assert(resReleases === 0, 'Residual synthetic releases in PostgreSQL: 0');
      assert(resGenerics === 0, 'Residual synthetic generics in PostgreSQL: 0');
      assert(resBrands === 0, 'Residual synthetic brands in PostgreSQL: 0');
      assert(resBatches === 0, 'Residual synthetic batches in PostgreSQL: 0');
      assert(resAntibiotics === 0, 'Residual synthetic antibiotic projections in PostgreSQL: 0');
      assert(resUsers === 0, 'Residual synthetic users in PostgreSQL: 0');

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
