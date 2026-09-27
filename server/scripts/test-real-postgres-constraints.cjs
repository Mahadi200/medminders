const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

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
const prisma = new PrismaClient();

async function runConstraintTests() {
  console.log('=== REAL POSTGRESQL CONSTRAINT TEST SUITE (ROLLED-BACK TRANSACTIONS) ===\n');
  const results = [];

  async function testConstraint(name, testFn) {
    let captured = null;
    try {
      await prisma.$transaction(async (tx) => {
        try {
          await testFn(tx);
        } catch (err) {
          captured = err;
        }
        // Always throw to force transaction rollback
        throw new Error('ROLLBACK_INTENTIONAL');
      });
    } catch (outerErr) {
      if (outerErr.message !== 'ROLLBACK_INTENTIONAL') {
        captured = captured || outerErr;
      }
    }

    if (!captured) {
      results.push({ name, passed: false, error: 'Expected constraint violation, but write succeeded.' });
      console.log(`FAIL: ${name} - Write unexpectedly succeeded!\n`);
      return;
    }

    const msg = captured.message || String(captured);
    const codeMatch = msg.match(/Code: `([0-9A-Z]{5})`/i) || 
                      msg.match(/code: "([0-9A-Z]{5})"/i) || 
                      msg.match(/SQLSTATE ([0-9A-Z]{5})/i);
    
    const sqlState = codeMatch ? codeMatch[1] : 'UNKNOWN';

    // Find the primary constraint error line
    const errLine = msg.split('\n').find(l => l.includes('Message:')) || msg.split('\n')[0];

    const isExpected = (sqlState === '23514' || sqlState === '23505' || sqlState === '23503');

    results.push({
      name,
      passed: isExpected,
      sqlState,
      message: errLine
    });

    console.log(`${isExpected ? 'PASS' : 'FAIL'}: ${name}`);
    console.log(`  SQLSTATE: ${sqlState}`);
    console.log(`  Detail: ${errLine}\n`);
  }

  // 1. chk_prescribed_qty (prescribedQuantity > 0)
  await testConstraint('PrescriptionItem.chk_prescribed_qty (prescribedQuantity = 0)', async (tx) => {
    await tx.$executeRawUnsafe(`INSERT INTO "User" (id, email, "updatedAt") VALUES ('syn_u1', 'syn_u1@test.local', NOW());`);
    await tx.$executeRawUnsafe(`INSERT INTO "Prescription" (id, "patientId", "prescriberId", "updatedAt") VALUES ('syn_rx1', 'syn_u1', 'syn_u1', NOW());`);
    // Invalid write: prescribedQuantity = 0
    await tx.$executeRawUnsafe(`INSERT INTO "PrescriptionItem" (id, "prescriptionId", "medicineName", "prescribedQuantity", "dispensedQuantity", "updatedAt") VALUES ('syn_pi1', 'syn_rx1', 'Amoxicillin', 0, 0, NOW());`);
  });

  // 2. chk_dispensed_qty (dispensedQuantity <= prescribedQuantity)
  await testConstraint('PrescriptionItem.chk_dispensed_qty (dispensedQuantity > prescribedQuantity)', async (tx) => {
    await tx.$executeRawUnsafe(`INSERT INTO "User" (id, email, "updatedAt") VALUES ('syn_u2', 'syn_u2@test.local', NOW());`);
    await tx.$executeRawUnsafe(`INSERT INTO "Prescription" (id, "patientId", "prescriberId", "updatedAt") VALUES ('syn_rx2', 'syn_u2', 'syn_u2', NOW());`);
    // Invalid write: dispensedQuantity (5) > prescribedQuantity (2)
    await tx.$executeRawUnsafe(`INSERT INTO "PrescriptionItem" (id, "prescriptionId", "medicineName", "prescribedQuantity", "dispensedQuantity", "updatedAt") VALUES ('syn_pi2', 'syn_rx2', 'Ciprofloxacin', 2, 5, NOW());`);
  });

  // 3. chk_consent_revocation (revokedAt >= grantedAt)
  await testConstraint('ConsentGrant.chk_consent_revocation (revokedAt < grantedAt)', async (tx) => {
    await tx.$executeRawUnsafe(`INSERT INTO "User" (id, email, "updatedAt") VALUES ('syn_u3', 'syn_u3@test.local', NOW());`);
    // Invalid write: revokedAt is before grantedAt
    await tx.$executeRawUnsafe(`INSERT INTO "ConsentGrant" (id, "patientId", purpose, "expiresAt", "grantedAt", "revokedAt", "updatedAt") VALUES ('syn_cg3', 'syn_u3', 'CLINICAL_CARE', NOW() + INTERVAL '1 day', NOW(), NOW() - INTERVAL '1 hour', NOW());`);
  });

  // 4. chk_token_expiry (tokenExpiresAt >= createdAt)
  await testConstraint('Prescription.chk_token_expiry (tokenExpiresAt < createdAt)', async (tx) => {
    await tx.$executeRawUnsafe(`INSERT INTO "User" (id, email, "updatedAt") VALUES ('syn_u4', 'syn_u4@test.local', NOW());`);
    // Invalid write: tokenExpiresAt is before createdAt
    await tx.$executeRawUnsafe(`INSERT INTO "Prescription" (id, "patientId", "prescriberId", "createdAt", "tokenExpiresAt", "updatedAt") VALUES ('syn_rx4', 'syn_u4', 'syn_u4', NOW(), NOW() - INTERVAL '1 hour', NOW());`);
  });

  // 5. chk_dispense_item_qty (quantityDispensed > 0)
  await testConstraint('DispenseItem.chk_dispense_item_qty (quantityDispensed = 0)', async (tx) => {
    await tx.$executeRawUnsafe(`INSERT INTO "User" (id, email, "updatedAt") VALUES ('syn_u5', 'syn_u5@test.local', NOW());`);
    await tx.$executeRawUnsafe(`INSERT INTO "Organization" (id, name, type, "regNumber", "updatedAt") VALUES ('syn_org5', 'Org 5', 'HOSPITAL', 'REG_SYN_5', NOW());`);
    await tx.$executeRawUnsafe(`INSERT INTO "Prescription" (id, "patientId", "prescriberId", "updatedAt") VALUES ('syn_rx5', 'syn_u5', 'syn_u5', NOW());`);
    await tx.$executeRawUnsafe(`INSERT INTO "PrescriptionItem" (id, "prescriptionId", "medicineName", "prescribedQuantity", "dispensedQuantity", "updatedAt") VALUES ('syn_pi5', 'syn_rx5', 'Azithromycin', 10, 0, NOW());`);
    await tx.$executeRawUnsafe(`INSERT INTO "DispenseRecord" (id, "prescriptionId", "organizationId", "pharmacistId", "idempotencyKey", "updatedAt") VALUES ('syn_dr5', 'syn_rx5', 'syn_org5', 'syn_u5', 'syn_idem_5', NOW());`);
    // Invalid write: quantityDispensed = 0
    await tx.$executeRawUnsafe(`INSERT INTO "DispenseItem" (id, "dispenseRecordId", "prescriptionItemId", "quantityDispensed") VALUES ('syn_di5', 'syn_dr5', 'syn_pi5', 0);`);
  });

  // 6. Foreign Key Violation (Prescription referencing non-existent User)
  await testConstraint('ForeignKey.Prescription_patientId_fkey (non-existent User)', async (tx) => {
    // Invalid write: non_existent_user
    await tx.$executeRawUnsafe(`INSERT INTO "Prescription" (id, "patientId", "prescriberId", "updatedAt") VALUES ('syn_rx_fk', 'non_existent_user', 'non_existent_user', NOW());`);
  });

  // 7. Unique Constraint Violation (duplicate User email)
  await testConstraint('UniqueConstraint.User_email_key (duplicate email)', async (tx) => {
    await tx.$executeRawUnsafe(`INSERT INTO "User" (id, email, "updatedAt") VALUES ('syn_u_uniq1', 'dup@test.local', NOW());`);
    // Invalid write: duplicate email
    await tx.$executeRawUnsafe(`INSERT INTO "User" (id, email, "updatedAt") VALUES ('syn_u_uniq2', 'dup@test.local', NOW());`);
  });

  // Verify Zero Residual Data
  const countRes = await prisma.$queryRawUnsafe(`SELECT count(*)::text as cnt FROM "User" WHERE id LIKE 'syn_%';`);
  console.log('--- Post-Test Residual Data Check ---');
  console.log(`Synthetic rows remaining in User table after rollback: ${countRes[0].cnt} (MUST BE 0)`);

  const allPassed = results.every(r => r.passed);
  console.log(`\nOverall Result: ${allPassed ? 'ALL CONSTRAINTS PASSED' : 'SOME TESTS FAILED'}`);

  await prisma.$disconnect();
}

runConstraintTests();
