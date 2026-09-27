import {
  signJwt,
  verifyJwt,
  generateRandomToken,
  hashToken,
  JwtPayload,
} from './cryptoUtils.js';
import { getDataStore, UserRecord } from './dataStore.js';

const ACCESS_TOKEN_EXPIRY_SECONDS = 900; // 15 minutes
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // in seconds
  tokenType: 'Bearer';
}

export class TokenService {
  /**
   * Issue a new access token and refresh token pair.
   * If familyId is not supplied, a new session family is started.
   */
  static async issueTokenPair(userId: string, familyId?: string): Promise<TokenPair> {
    const store = getDataStore();
    const user = await store.getUserById(userId);
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    const roles = await store.getUserRoles(userId);
    const clinicianCred = await store.getClinicianCredential(userId);

    // 1. Generate Access Token (JWT)
    const accessPayload: Omit<JwtPayload, 'iat' | 'exp' | 'jti'> = {
      sub: user.id,
      email: user.email,
      roles: roles.map(r => ({
        role: r.role,
        isVerified: r.isVerified,
        organizationId: r.organizationId,
      })),
      clinicianCredential: clinicianCred
        ? {
            bmdcNumber: clinicianCred.bmdcNumber,
            isVerified: clinicianCred.verificationStatus === 'VERIFIED',
          }
        : undefined,
    };

    const accessToken = signJwt(accessPayload, ACCESS_TOKEN_EXPIRY_SECONDS);

    // 2. Generate Refresh Token with Family Tracking
    const rawRefreshToken = `rft_${generateRandomToken(32)}`;
    const tokenHash = hashToken(rawRefreshToken);
    const resolvedFamilyId = familyId || `fam_${generateRandomToken(16)}`;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await store.saveRefreshToken({
      userId: user.id,
      tokenHash,
      familyId: resolvedFamilyId,
      isRevoked: false,
      expiresAt,
      rotatedAt: null,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
      tokenType: 'Bearer',
    };
  }

  /**
   * Rotate a refresh token with automatic token-reuse detection.
   * If a revoked or already rotated token is replayed, the entire token family is revoked immediately.
   */
  static async rotateRefreshToken(rawRefreshToken: string): Promise<TokenPair> {
    if (!rawRefreshToken || !rawRefreshToken.startsWith('rft_')) {
      throw new Error('Invalid refresh token format');
    }

    const store = getDataStore();
    const tokenHash = hashToken(rawRefreshToken);
    const record = await store.getRefreshTokenByHash(tokenHash);

    if (!record) {
      throw new Error('Refresh token not found');
    }

    // Security Check 1: Token Expiration
    if (new Date() > new Date(record.expiresAt)) {
      await store.revokeRefreshToken(tokenHash);
      throw new Error('Refresh token expired');
    }

    // Security Check 2: Token Reuse Detection
    // If the token is already marked as revoked or rotated, an attacker has stolen an old token!
    if (record.isRevoked) {
      // Immediate counter-measure: Revoke ALL tokens in this family (invalidate the whole session)
      await store.revokeTokenFamily(record.familyId);
      throw new Error('Refresh token reuse detected. All sessions in this family have been terminated.');
    }

    // Normal Rotation:
    // Mark the current refresh token as revoked/rotated
    await store.revokeRefreshToken(tokenHash);

    // Issue a new token pair within the same session family
    return await this.issueTokenPair(record.userId, record.familyId);
  }

  /**
   * Revoke a refresh token and its session family on logout.
   */
  static async revokeSession(rawRefreshToken: string): Promise<void> {
    if (!rawRefreshToken) return;
    const store = getDataStore();
    const tokenHash = hashToken(rawRefreshToken);
    const record = await store.getRefreshTokenByHash(tokenHash);
    if (record) {
      await store.revokeTokenFamily(record.familyId);
    }
  }

  /**
   * Revoke a specific device session family.
   */
  static async revokeDeviceSession(familyId: string): Promise<void> {
    const store = getDataStore();
    await store.revokeTokenFamily(familyId);
  }

  /**
   * Verify an incoming access token.
   */
  static verifyAccessToken(token: string): JwtPayload {
    return verifyJwt(token);
  }
}
