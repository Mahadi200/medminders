import { verifyPassword } from './cryptoUtils.js';
import { TokenService, TokenPair } from './tokenService.js';
import { getDataStore } from './dataStore.js';
import { MfaService } from './mfaService.js';

export interface LoginResult {
  tokens?: TokenPair;
  mfaRequired?: boolean;
  mfaChallengeId?: string;
  user: {
    id: string;
    email: string;
    roles?: Array<{
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
   * If the user holds privileged roles (DOCTOR, PHARMACIST, ADMIN), an MFA challenge is required.
   */
  static async login(
    email: string,
    password: string,
    opts?: { bypassMfa?: boolean }
  ): Promise<LoginResult> {
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

    const roles = await store.getUserRoles(user.id);
    const isPrivileged = MfaService.isPrivilegedRole(roles);

    // If privileged role and MFA is not bypassed (e.g. in test convenience mode)
    if (isPrivileged && opts?.bypassMfa !== true && process.env.BYPASS_MFA !== 'true') {
      const challenge = await MfaService.initiateMfa(user.id, user.email);
      return {
        mfaRequired: true,
        mfaChallengeId: challenge.challengeId,
        user: {
          id: user.id,
          email: user.email,
        },
      };
    }

    const tokens = await TokenService.issueTokenPair(user.id);
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
   * Complete MFA challenge for privileged roles and issue full session token pair.
   */
  static async verifyMfaLogin(challengeId: string, code: string, userId: string): Promise<LoginResult> {
    const isValid = await MfaService.verifyMfa(challengeId, code);
    if (!isValid) {
      throw new Error('Invalid or expired MFA verification code');
    }

    const store = getDataStore();
    const user = await store.getUserById(userId);
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
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
   * Logout user by revoking refresh token session.
   */
  static async logout(refreshToken: string): Promise<void> {
    await TokenService.revokeSession(refreshToken);
  }

  /**
   * Rotate refresh token pair with replay attack detection.
   */
  static async refreshTokens(refreshToken: string): Promise<TokenPair> {
    return await TokenService.rotateRefreshToken(refreshToken);
  }

  /**
   * Retrieve current user profile and credential state.
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
            specialty: clinicianCred.specialty,
            degrees: clinicianCred.degrees,
          }
        : undefined,
    };
  }
}
