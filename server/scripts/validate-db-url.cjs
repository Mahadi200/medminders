const fs = require('fs');
const path = require('path');

function loadEnvSafely() {
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return null;
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
      if (key === 'DATABASE_URL') return val;
    }
  }
  return null;
}

function validate() {
  const rawUrl = loadEnvSafely();
  if (!rawUrl) {
    return {
      postgres_uri: 'FAIL',
      no_placeholder: 'FAIL',
      session_pooler_host: 'FAIL',
      port_5432: 'FAIL',
      database_name_postgres: 'FAIL',
      reason: 'DATABASE_URL is not set in server/.env'
    };
  }

  const lower = rawUrl.toLowerCase();
  const hasPlaceholder = lower.includes('your-password') || lower.includes('[your-password]');

  let parsed = null;
  try {
    parsed = new URL(rawUrl);
  } catch (e) {
    return {
      postgres_uri: 'FAIL',
      no_placeholder: !hasPlaceholder ? 'PASS' : 'FAIL',
      session_pooler_host: 'FAIL',
      port_5432: 'FAIL',
      database_name_postgres: 'FAIL',
      reason: 'URI failed to parse'
    };
  }

  const isPostgresProto = parsed.protocol === 'postgresql:' || parsed.protocol === 'postgres:';
  const isPoolerHost = parsed.hostname.endsWith('.pooler.supabase.com') || parsed.hostname === 'pooler.supabase.com';
  const isPort5432 = (parsed.port || '5432') === '5432';
  const isDbPostgres = parsed.pathname === '/postgres';

  return {
    postgres_uri: isPostgresProto ? 'PASS' : 'FAIL',
    no_placeholder: !hasPlaceholder ? 'PASS' : 'FAIL',
    session_pooler_host: isPoolerHost ? 'PASS' : 'FAIL',
    port_5432: isPort5432 ? 'PASS' : 'FAIL',
    database_name_postgres: isDbPostgres ? 'PASS' : 'FAIL'
  };
}

const res = validate();
console.log(JSON.stringify(res, null, 2));
