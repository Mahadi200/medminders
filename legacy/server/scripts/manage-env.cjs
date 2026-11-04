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
  lines.push('# Last updated: ' + new Date().toISOString());
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
 * Interactive prompt that reads input with hidden typing (no echoing to terminal/history).
 */
function promptHidden(query) {
  return new Promise((resolve) => {
    process.stdout.write(query);

    // Non-interactive / piped input handling
    if (!process.stdin.isTTY) {
      let data = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (chunk) => {
        data += chunk;
      });
      process.stdin.on('end', () => {
        resolve(data.trim());
      });
      return;
    }

    // Interactive TTY raw mode: suppress echo
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    let input = '';
    const onData = (char) => {
      // Ctrl+C / Ctrl+D: exit safely
      if (char === '\u0003' || char === '\u0004') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', onData);
        process.stdout.write('\nCancelled by user.\n');
        process.exit(1);
      }

      // Enter / Return (\r or \n)
      if (char === '\r' || char === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(input.trim());
        return;
      }

      // Backspace (\b or \x7f)
      if (char === '\u0008' || char === '\x7f') {
        if (input.length > 0) {
          input = input.slice(0, -1);
        }
        return;
      }

      // Append characters without echoing to screen
      input += char;
    };

    process.stdin.on('data', onData);
  });
}

/**
 * Interactive prompt for setting DATABASE_URL safely without command-line argument exposure.
 */
async function promptDatabaseUrl() {
  console.log('=== Secure Local Database URI Entry ===');
  console.log('Input will be read directly into memory without command-line argument exposure.');
  
  ensureJwtSecret();

  const url = await promptHidden('Enter Supabase Session Pooler DATABASE_URL (typing hidden): ');

  if (!url) {
    console.error('ERROR: No connection string entered. server/.env was not modified.');
    process.exit(1);
  }

  if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
    console.error('ERROR: Invalid URI format. Must start with postgresql:// or postgres://');
    process.exit(1);
  }

  const { map, order } = readEnvMap();
  map.set('DATABASE_URL', url);
  if (!order.includes('DATABASE_URL')) {
    order.push('DATABASE_URL');
  }
  writeEnvMap(map, order);

  console.log('\nSUCCESS: DATABASE_URL successfully configured in server/.env (replaced any prior entry without duplicates).');
  console.log('\n--- Current Local Environment Summary ---');
  inspectKeys();
}

// CLI entry point
const command = process.argv[2];

if (command === '--prompt-db') {
  promptDatabaseUrl();
} else if (command === '--inspect') {
  inspectKeys();
} else if (command === '--init-secret') {
  ensureJwtSecret();
} else {
  console.log('Usage:');
  console.log('  node server/scripts/manage-env.cjs --prompt-db    (Securely prompt for DATABASE_URL with hidden typing)');
  console.log('  node server/scripts/manage-env.cjs --inspect      (Safely list configured keys without values)');
  console.log('  node server/scripts/manage-env.cjs --init-secret  (Generate unique high-entropy JWT_SECRET)');
}
