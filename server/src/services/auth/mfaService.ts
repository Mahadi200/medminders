import crypto from 'crypto';
import { logger } from '../../utils/logger.js';

export interface IMfaProvider {
  name: string;
  sendOtp(userId: string, destination: string): Promise<{ challengeId: string; expiresAt: Date }>;
  verifyOtp(challengeId: string, code: string): Promise<boolean>;
}

export interface MfaChallenge {
  challengeId: string;
  userId: string;
  code: string;
  expiresAt: Date;
  isUsed: boolean;
  attempts: number;
}

/**
 * Development & Testing Mock MFA Provider.
 * Simulates SMS/Email OTP delivery without claiming or connecting to a production SMS gateway.
 */
export class DevelopmentMockMfaProvider implements IMfaProvider {
  public name = 'development-mock';
  private challenges = new Map<string, MfaChallenge>();

  async sendOtp(userId: string, destination: string): Promise<{ challengeId: string; expiresAt: Date }> {
    const challengeId = `mfa_${crypto.randomBytes(16).toString('hex')}`;
    
    // In automated tests or dev, fixed or deterministic 6-digit OTP
    const code = process.env.NODE_ENV === 'test' ? '654321' : Math.floor(100000 + Math.random() * 900000).toString();

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

    this.challenges.set(challengeId, {
      challengeId,
      userId,
      code,
      expiresAt,
      isUsed: false,
      attempts: 0,
    });

    logger.info('[DEV_MOCK_MFA] OTP challenge created (Simulation only - zero production SMS claim)', {
      challengeId,
      userId,
      destination: destination.replace(/.(?=.{4})/g, '*'),
      // In development mode, display code to allow local login
      mockCode: process.env.NODE_ENV !== 'production' ? code : '[HIDDEN]',
    });

    return { challengeId, expiresAt };
  }

  async verifyOtp(challengeId: string, code: string): Promise<boolean> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return false;
    if (challenge.isUsed) return false;
    if (Date.now() > challenge.expiresAt.getTime()) return false;

    challenge.attempts++;
    if (challenge.attempts > 5) {
      challenge.isUsed = true; // Lock after 5 failed attempts
      return false;
    }

    if (challenge.code === code.trim()) {
      challenge.isUsed = true;
      return true;
    }

    return false;
  }

  // Helper for test assertions
  getChallenge(challengeId: string): MfaChallenge | undefined {
    return this.challenges.get(challengeId);
  }
}

export class MfaService {
  private static provider: IMfaProvider = new DevelopmentMockMfaProvider();

  static setProvider(newProvider: IMfaProvider): void {
    this.provider = newProvider;
  }

  static isPrivilegedRole(roles: Array<{ role: string }>): boolean {
    const privilegedRoles = ['DOCTOR', 'PHARMACIST', 'PHARMACY_STAFF', 'HOSPITAL_ADMIN', 'SUPERADMIN'];
    return roles.some(r => privilegedRoles.includes(r.role));
  }

  static async initiateMfa(userId: string, destination: string): Promise<{ challengeId: string; expiresAt: Date; providerName: string }> {
    const result = await this.provider.sendOtp(userId, destination);
    return {
      challengeId: result.challengeId,
      expiresAt: result.expiresAt,
      providerName: this.provider.name,
    };
  }

  static async verifyMfa(challengeId: string, code: string): Promise<boolean> {
    return await this.provider.verifyOtp(challengeId, code);
  }
}
