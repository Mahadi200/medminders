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

async function verifyCatalog() {
  loadEnvSafely();
  const prisma = new PrismaClient();

  try {
    console.log('=== REAL POSTGRESQL CATALOG VERIFICATION ===\n');

    // 1. Prisma Migrations Table
    const migs = await prisma.$queryRawUnsafe(`
      SELECT migration_name, finished_at, rolled_back_at, applied_steps_count
      FROM "public"."_prisma_migrations"
      ORDER BY started_at ASC;
    `);
    console.log('--- 1. Prisma Migration Records ---');
    console.log(JSON.stringify(migs, null, 2));

    // 2. Tables in public schema
    const tables = await prisma.$queryRawUnsafe(`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    console.log(`\n--- 2. Public Tables (${tables.length} tables) ---`);
    console.log(tables.map(t => t.table_name).join(', '));

    // 3. CHECK Constraints in public
    const checks = await prisma.$queryRawUnsafe(`
      SELECT tc.table_name, tc.constraint_name, cc.check_clause
      FROM information_schema.table_constraints tc
      JOIN information_schema.check_constraints cc
        ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_schema = 'public' 
        AND tc.constraint_type = 'CHECK'
        AND tc.constraint_name NOT LIKE '%_not_null'
      ORDER BY tc.table_name, tc.constraint_name;
    `);
    console.log(`\n--- 3. CHECK Constraints (${checks.length} custom constraints) ---`);
    for (const c of checks) {
      console.log(`- ${c.table_name}.${c.constraint_name}: ${c.check_clause}`);
    }

    // 4. Foreign Keys count & sample
    const fks = await prisma.$queryRawUnsafe(`
      SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_col
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name;
    `);
    console.log(`\n--- 4. Foreign Key Constraints (${fks.length} FK constraints) ---`);
    for (const fk of fks) {
      console.log(`- ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table}.${fk.foreign_col}`);
    }

    // 5. Indexes count
    const indexes = await prisma.$queryRawUnsafe(`
      SELECT tablename, indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `);
    console.log(`\n--- 5. Indexes in public (${indexes.length} total indexes) ---`);
    console.log(indexes.map(i => `${i.tablename}.${i.indexname}`).join('\n'));

  } catch (err) {
    console.error('Catalog verification error:', err.message || err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyCatalog();
