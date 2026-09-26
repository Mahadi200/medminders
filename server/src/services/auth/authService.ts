import { verifyPassword } from './cryptoUtils.js';
import { TokenService, TokenPair } from './tokenService.js';
import { getDataStore } from './dataStore.js';

export interface LoginResult {
  tokens: TokenPair;
  user: {
    id: string;
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
  };
}

export class AuthService {
  /**
   * Authenticate a user with email and password.
   */
  static async login(email: string, password: string): Promise<LoginResult> {
    if (!email || !password) {
      throw new Error('Email and password required');
    }

    const store = getDataStore();
    const user = await store.getUserByEmail(email);

    if (!user || !user.passwordHash || !user.isActive) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    const tokens = await TokenService.issueTokenPair(user.id);
    const roles = await store.getUserRoles(user.id);
    const clinicianCred = await store.getClinicianCredential(user.id);

    return {
      tokens,
      user: {
        id: user.id,
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
      },
    };
  }

  /**
   * Rotate a refresh token to obtain a fresh token pair.
   */
  static async refreshTokens(refreshToken: string): Promise<TokenPair> {
    return await TokenService.rotateRefreshToken(refreshToken);
  }

  /**
   * Log out user and revoke the token family.
   */
  static async logout(refreshToken: string): Promise<void> {
    await TokenService.revokeSession(refreshToken);
  }

  /**
   * Fetch current user profile.
   */
  static async getCurrentUser(userId: string) {
    const store = getDataStore();
    const user = await store.getUserById(userId);
    if (!user) return null;

    const roles = await store.getUserRoles(userId);
    const clinicianCred = await store.getClinicianCredential(userId);

    return {
      id: user.id,
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
  }
}
