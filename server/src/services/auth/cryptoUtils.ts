import crypto from 'crypto';

const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'test') {
      const g = global as any;
      if (!g.__ephemeral_test_jwt_secret) {
        g.__ephemeral_test_jwt_secret = crypto.randomBytes(32).toString('hex');
      }
      return g.__ephemeral_test_jwt_secret;
    }
    throw new Error('FATAL: JWT_SECRET environment variable is missing. Configure a secure secret in server/.env.');
  }
  if (secret.length < 32) {
    throw new Error('FATAL: JWT_SECRET must be at least 32 characters in length for cryptographic security.');
  }
  return secret;
}

export const DEFAULT_JWT_ISSUER = 'medminders-api';
export const DEFAULT_JWT_AUDIENCE = 'medminders-client';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  roles: Array<{
    role: string;
    isVerified: boolean;
    organizationId?: string | null;
  }>;
  clinicianCredential?: {
    bmdcNumber: string;
    isVerified: boolean;
  };
  iss?: string; // Issuer
  aud?: string; // Audience
  jti: string; // Unique token ID
  iat: number;
  exp: number;
}

/**
 * Hash password with scrypt and a cryptographic salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
  });
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verify password against stored scrypt hash using constant-time comparison.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 3 || parts[0] !== 'scrypt') {
      return false;
    }
    const [, salt, originalKeyHex] = parts;
    const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, {
      N: SCRYPT_COST,
      r: SCRYPT_BLOCK_SIZE,
      p: SCRYPT_PARALLELIZATION,
    });
    const keyBuffer = Buffer.from(originalKeyHex, 'hex');
    if (derivedKey.length !== keyBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(derivedKey, keyBuffer);
  } catch {
    return false;
  }
}

/**
 * Encode an object to base64url string.
 */
function base64UrlEncode(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Decode a base64url string to Buffer.
 */
function base64UrlDecode(input: string): string {
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Sign a JWT using HMAC-SHA256 with issuer and audience claims.
 */
export function signJwt(
  payload: Omit<JwtPayload, 'iat' | 'exp' | 'jti' | 'iss' | 'aud'>,
  expiresInSeconds = 900,
  issuer = process.env.JWT_ISSUER || DEFAULT_JWT_ISSUER,
  audience = process.env.JWT_AUDIENCE || DEFAULT_JWT_AUDIENCE
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iss: issuer,
    aud: audience,
    jti: crypto.randomBytes(16).toString('hex'),
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto.createHmac('sha256', getJwtSecret()).update(dataToSign).digest();
  const encodedSignature = base64UrlEncode(signature);

  return `${dataToSign}.${encodedSignature}`;
}

/**
 * Verify a JWT using HMAC-SHA256 and validate expiration, issuer, and audience.
 */
export function verifyJwt(
  token: string,
  options?: {
    expectedIssuer?: string;
    expectedAudience?: string;
    clockToleranceSeconds?: number;
  }
): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed token structure');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = crypto.createHmac('sha256', getJwtSecret()).update(dataToSign).digest();
  const expectedEncoded = base64UrlEncode(expectedSignature);

  // Constant-time signature comparison
  const sigA = Buffer.from(encodedSignature);
  const sigB = Buffer.from(expectedEncoded);
  if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
    throw new Error('Invalid token signature');
  }

  const payload: JwtPayload = JSON.parse(base64UrlDecode(encodedPayload));
  const now = Math.floor(Date.now() / 1000);
  const clockSkew = options?.clockToleranceSeconds || 10;

  if (payload.exp && payload.exp < (now - clockSkew)) {
    throw new Error('Token expired');
  }

  const expectedIssuer = options?.expectedIssuer || process.env.JWT_ISSUER || DEFAULT_JWT_ISSUER;
  if (payload.iss && payload.iss !== expectedIssuer) {
    throw new Error(`Invalid token issuer: expected ${expectedIssuer}`);
  }

  const expectedAudience = options?.expectedAudience || process.env.JWT_AUDIENCE || DEFAULT_JWT_AUDIENCE;
  if (payload.aud && payload.aud !== expectedAudience) {
    throw new Error(`Invalid token audience: expected ${expectedAudience}`);
  }

  return payload;
}

/**
 * Generate a cryptographically random token string.
 */
export function generateRandomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Compute SHA-256 hash of a string (e.g. for refresh tokens or verification tokens).
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
