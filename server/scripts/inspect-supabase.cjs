const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// 1. Safe .env loader (never prints values)
function loadEnvSafely() {
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    return false;
  }
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

async function inspect() {
  if (!loadEnvSafely()) {
    console.error('ERROR: DATABASE_URL not found in server/.env.');
    process.exit(1);
  }

  console.log('Connecting to PostgreSQL using DATABASE_URL from server/.env (read-only mode)...');

  const prisma = new PrismaClient();

  try {
    // 1. Inspect PostgreSQL Version
    const versionRes = await prisma.$queryRawUnsafe('SELECT version();');
    console.log('\n--- PostgreSQL Server Information ---');
    console.log(versionRes[0]?.version || 'Unknown version');

    // 2. Inspect Existing Schemas
    const schemas = await prisma.$queryRawUnsafe(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('pg_toast', 'pg_temp_1', 'pg_toast_temp_1')
      ORDER BY schema_name;
    `);
    console.log('\n--- Existing Schemas ---');
    console.log(schemas.map(s => s.schema_name).join(', '));

    // 3. Inspect User & Custom Tables
    const tables = await prisma.$queryRawUnsafe(`
      SELECT table_schema, table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name;
    `);
    console.log('\n--- Existing Tables ---');
    if (tables.length === 0) {
      console.log('No user or application tables found (Database is clean).');
    } else {
      for (const t of tables) {
        let count = 'N/A';
        try {
          const countRes = await prisma.$queryRawUnsafe(
            `SELECT count(*)::text as cnt FROM "${t.table_schema}"."${t.table_name}";`
          );
          count = countRes[0]?.cnt || '0';
        } catch {}
        console.log(`- ${t.table_schema}.${t.table_name} (${t.table_type}) - Row Count: ${count}`);
      }
    }

    // 4. Check for existing Prisma Migration Table
    const migrationTable = tables.find(t => t.table_name === '_prisma_migrations');
    if (migrationTable) {
      console.log('\n--- Existing Prisma Migrations ---');
      const migs = await prisma.$queryRawUnsafe(`
        SELECT migration_name, finished_at, rolled_back_at 
        FROM "${migrationTable.table_schema}"."_prisma_migrations"
        ORDER BY started_at ASC;
      `);
      console.log(migs);
    } else {
      console.log('\nNo _prisma_migrations table found in user schemas.');
    }

    console.log('\nInspection complete. Database state verified.');
  } catch (err) {
    console.error('\nDatabase inspection failed:');
    console.error(err.message || err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

inspect();
