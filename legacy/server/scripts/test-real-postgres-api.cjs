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

async function runRealPostgresApiIntegration() {
  console.log('=== REAL POSTGRESQL API DATA STORE & AUDIT INTEGRATION CHECK ===\n');

  const testUserId = 'syn_user_real_pg_1';
  const testRxId = 'syn_rx_real_pg_1';
  const testAuditId = 'syn_audit_real_pg_1';

  try {
    // 1. Verify Clean Baseline
    console.log('1. Checking connection to PostgreSQL engine...');
    const dbVer = await prisma.$queryRawUnsafe('SELECT version();');
    console.log('  Connected to:', dbVer[0]?.version?.split('on')[0]?.trim());

    // 2. Execute Real Database Operations in a Transaction (Guaranteed Rollback)
    console.log('\n2. Testing Real Database CRUD & Audit Recording inside rolled-back transaction...');

    await prisma.$transaction(async (tx) => {
      // A. Create User
      const user = await tx.user.create({
        data: {
          id: testUserId,
          email: 'syn_user_real@test.local',
          legacyRole: 'patient',
          isActive: true,
        },
      });
      console.log('  [PASS] Created synthetic User in PostgreSQL:', user.id);

      // B. Create Prescription
      const rx = await tx.prescription.create({
        data: {
          id: testRxId,
          patientId: user.id,
          prescriberId: user.id,
          status: 'DRAFT_UNREVIEWED',
          version: 1,
          isLatestVersion: true,
          diagnosis: 'Synthetic Respiratory Evaluation',
          clinicalNotes: 'Synthetic notes for database constraint check',
          items: {
            create: [
              {
                id: 'syn_item_real_1',
                medicineName: 'Amoxicillin 500mg',
                prescribedQuantity: 10,
                dispensedQuantity: 0,
              },
            ],
          },
        },
        include: { items: true },
      });
      console.log('  [PASS] Created synthetic Prescription with Items:', rx.id, 'Item count:', rx.items.length);

      // C. Record Audit Event
      const audit = await tx.auditEvent.create({
        data: {
          id: testAuditId,
          actorUserId: user.id,
          targetUserId: user.id,
          action: 'PHI_PRESCRIPTION_CREATED',
          entityType: 'Prescription',
          entityId: rx.id,
          ipAddress: '127.0.0.1',
          userAgent: 'VitestIntegration/1.0',
          metadataJson: JSON.stringify({ test: true, status: rx.status }),
        },
      });
      console.log('  [PASS] Recorded AuditEvent in real PostgreSQL:', audit.id, 'Action:', audit.action);

      // D. Verify Referential Querying
      const retrieved = await tx.prescription.findUnique({
        where: { id: testRxId },
        include: { items: true, patient: true },
      });
      if (!retrieved || retrieved.items.length !== 1 || retrieved.patient.id !== user.id) {
        throw new Error('Verification query returned incomplete or inconsistent data');
      }
      console.log('  [PASS] Verified relational queries and foreign key associations');

      // Intentional rollback so no test data persists on Supabase
      throw new Error('INTENTIONAL_ROLLBACK_POSTGRES_API_TEST');
    });

  } catch (err) {
    if (err.message === 'INTENTIONAL_ROLLBACK_POSTGRES_API_TEST') {
      console.log('\n3. Transaction successfully rolled back (Zero Data Pollution).');
    } else {
      console.error('Real PostgreSQL API Integration Failed:', err);
      process.exit(1);
    }
  }

  // 3. Confirm 0 residual rows
  const [residualUsers, residualAudits] = await Promise.all([
    prisma.$queryRawUnsafe(`SELECT count(*)::text as cnt FROM "User" WHERE id LIKE 'syn_%';`),
    prisma.$queryRawUnsafe(`SELECT count(*)::text as cnt FROM "AuditEvent" WHERE id LIKE 'syn_%';`),
  ]);

  console.log('  Residual Users:', residualUsers[0].cnt, '(MUST BE 0)');
  console.log('  Residual AuditEvents:', residualAudits[0].cnt, '(MUST BE 0)');

  if (residualUsers[0].cnt !== '0' || residualAudits[0].cnt !== '0') {
    console.error('FAIL: Residual rows found!');
    process.exit(1);
  }

  console.log('\n[ALL REAL POSTGRESQL API INTEGRATION CHECKS PASSED]');
  await prisma.$disconnect();
}

runRealPostgresApiIntegration();
