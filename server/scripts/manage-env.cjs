const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.join(__dirname, '../.env');

/**
 * Reads server/.env into a Map of key -> value.
 * Preserves comments and structure while preventing duplicate keys.
 */
function readEnvMap() {
  if (!fs.existsSync(envPath)) {
    return { map: new Map(), order: [], comments: [] };
  }

  const raw = fs.readFileSync(envPath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const map = new Map();
  const order = [];
  const comments = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      comments.push(line);
      continue;
    }
    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!map.has(key)) {
        order.push(key);
      }
      map.set(key, val);
    }
  }

  return { map, order, comments };
}

/**
 * Writes the map back to server/.env without duplicates.
 */
function writeEnvMap(map, order) {
  const lines = [];
  lines.push('# MedMinders Server Local Environment (Auto-managed, git-ignored)');
  lines.push('# Updated at: ' + new Date().toISOString());
  lines.push('');

  for (const key of order) {
    const val = map.get(key);
    lines.push(`${key}="${val}"`);
  }
  lines.push('');

  fs.writeFileSync(envPath, lines.join('\n'), { encoding: 'utf8', mode: 0o600 });
}

/**
 * Inspect server/.env keys safely without displaying any values.
 */
function inspectKeys() {
  if (!fs.existsSync(envPath)) {
    console.log('STATUS: server/.env does not exist yet.');
    return;
  }
  const { map, order } = readEnvMap();
  console.log('STATUS: server/.env found.');
  console.log('Configured Variable Keys:');
  for (const k of order) {
    const val = map.get(k);
    const masked = val ? `[Set: ${val.length} chars, masked]` : '[Empty]';
    console.log(` - ${k}: ${masked}`);
  }
}

/**
 * Ensure a high-entropy 256-bit JWT_SECRET exists in server/.env.
 * If missing, generates a unique secret locally without printing it.
 */
function ensureJwtSecret() {
  const { map, order } = readEnvMap();
  const existing = map.get('JWT_SECRET');

  if (!existing || existing.length < 32 || existing.includes('medminders-clinical-security-jwt-secret')) {
    // Generate unique 256-bit cryptographic secret (64 hex characters)
    const newSecret = crypto.randomBytes(32).toString('hex');
    map.set('JWT_SECRET', newSecret);
    if (!order.includes('JWT_SECRET')) {
      order.push('JWT_SECRET');
    }
    writeEnvMap(map, order);
    console.log('SUCCESS: Unique 256-bit high-entropy JWT_SECRET generated and saved to server/.env.');
  } else {
    console.log('INFO: High-entropy JWT_SECRET already configured in server/.env (masked).');
  }
}

/**
 * Update or set a key in server/.env safely.
 */
function setKey(key, value) {
  if (!key || !value) {
    console.error('ERROR: Key and value required.');
    process.exit(1);
  }
  const { map, order } = readEnvMap();
  map.set(key, value);
  if (!order.includes(key)) {
    order.push(key);
  }
  writeEnvMap(map, order);
  console.log(`SUCCESS: Key '${key}' safely set/replaced in server/.env without duplicates.`);
}

// CLI handler
const args = process.argv.slice(2);
const command = args[0];

if (command === '--inspect') {
  inspectKeys();
} else if (command === '--init-secret') {
  ensureJwtSecret();
} else if (command === '--set' && args[1] && args[2]) {
  setKey(args[1], args[2]);
} else {
  console.log('Usage: node manage-env.cjs [--inspect | --init-secret | --set KEY VALUE]');
}
