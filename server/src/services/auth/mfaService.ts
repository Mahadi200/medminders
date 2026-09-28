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

export class TotpMfaProvider implements IMfaProvider {
  public name = 'totp-authenticator';
  private challenges = new Map<string, { challengeId: string; userId: string; expiresAt: Date; isUsed: boolean; attempts: number }>();
  private stepSeconds = 30;

  /**
   * Derives a deterministic cryptographic secret for a user using HMAC-SHA256.
   */
  private getUserSecret(userId: string): Buffer {
    const masterKey = process.env.MFA_TOTP_KEY || process.env.JWT_SECRET || 'medminders-totp-production-key-fallback';
    return crypto.createHmac('sha256', masterKey).update(userId).digest();
  }

  /**
   * Generates standard RFC 6238 TOTP 6-digit code for a given timestamp.
   */
  public generateTotp(userId: string, timestampMs = Date.now()): string {
    const secret = this.getUserSecret(userId);
    const counter = Math.floor(timestampMs / 1000 / this.stepSeconds);
    const counterBuf = Buffer.alloc(8);
    counterBuf.writeBigInt64BE(BigInt(counter));

    const hmac = crypto.createHmac('sha1', secret).update(counterBuf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
    return binary.toString().padStart(6, '0');
  }

  async sendOtp(userId: string, destination: string): Promise<{ challengeId: string; expiresAt: Date }> {
    const challengeId = `mfa_totp_${crypto.randomBytes(24).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min challenge expiry

    this.challenges.set(challengeId, {
      challengeId,
      userId,
      expiresAt,
      isUsed: false,
      attempts: 0,
    });

    logger.info('[TOTP_MFA] TOTP challenge issued for privileged role', {
      challengeId,
      userId,
      destination: destination.replace(/.(?=.{4})/g, '*'),
      provider: this.name,
    });

    return { challengeId, expiresAt };
  }

  async verifyOtp(challengeId: string, code: string): Promise<boolean> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return false;
    if (challenge.isUsed) return false;
    if (Date.now() > challenge.expiresAt.getTime()) return false;

    challenge.attempts++;
    if (challenge.attempts > 3) {
      challenge.isUsed = true; // Lock after 3 failed attempts
      return false;
    }

    const trimmed = (code || '').trim();
    if (!/^\d{6}$/.test(trimmed)) return false;

    const now = Date.now();
    const candBuf = Buffer.from(trimmed, 'utf8');

    // RFC 6238 window: current, step - 1, step + 1 (±30s tolerance)
    for (const offsetStep of [0, -1, 1]) {
      const targetTime = now + offsetStep * this.stepSeconds * 1000;
      const expectedCode = this.generateTotp(challenge.userId, targetTime);
      const expectedBuf = Buffer.from(expectedCode, 'utf8');

      if (crypto.timingSafeEqual(candBuf, expectedBuf)) {
        challenge.isUsed = true; // Replay attack protection: single-use
        return true;
      }
    }

    return false;
  }

  getChallenge(challengeId: string) {
    return this.challenges.get(challengeId);
  }
}

export class ProductionSmsMfaProvider implements IMfaProvider {
  public name = 'production-sms-gateway';
  private challenges = new Map<string, { challengeId: string; userId: string; salt: string; codeHash: string; expiresAt: Date; isUsed: boolean; attempts: number }>();

  async sendOtp(userId: string, destination: string): Promise<{ challengeId: string; expiresAt: Date }> {
    const challengeId = `mfa_sms_${crypto.randomBytes(24).toString('hex')}`;
    const code = crypto.randomInt(100000, 1000000).toString();
    const salt = crypto.randomBytes(16).toString('hex');
    const codeHash = crypto.createHash('sha256').update(salt + code).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    this.challenges.set(challengeId, {
      challengeId,
      userId,
      salt,
      codeHash,
      expiresAt,
      isUsed: false,
      attempts: 0,
    });

    const gatewayUrl = process.env.MFA_SMS_GATEWAY_URL;
    if (gatewayUrl) {
      try {
        await fetch(gatewayUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.MFA_SMS_API_KEY ? { Authorization: `Bearer ${process.env.MFA_SMS_API_KEY}` } : {}),
          },
          body: JSON.stringify({
            destination,
            message: `Your MedMinders verification code is: ${code}. Valid for 5 minutes.`,
          }),
        });
      } catch (err: any) {
        logger.error('[SMS_MFA] Failed to dispatch SMS via gateway', { error: err.message });
      }
    }

    logger.info('[SMS_MFA] SMS OTP challenge issued', {
      challengeId,
      userId,
      destination: destination.replace(/.(?=.{4})/g, '*'),
      gatewayConfigured: Boolean(gatewayUrl),
      provider: this.name,
    });

    return { challengeId, expiresAt };
  }

  async verifyOtp(challengeId: string, code: string): Promise<boolean> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return false;
    if (challenge.isUsed) return false;
    if (Date.now() > challenge.expiresAt.getTime()) return false;

    challenge.attempts++;
    if (challenge.attempts > 3) {
      challenge.isUsed = true;
      return false;
    }

    const trimmed = (code || '').trim();
    if (!/^\d{6}$/.test(trimmed)) return false;

    const candHash = crypto.createHash('sha256').update(challenge.salt + trimmed).digest('hex');
    if (crypto.timingSafeEqual(Buffer.from(candHash), Buffer.from(challenge.codeHash))) {
      challenge.isUsed = true;
      return true;
    }

    return false;
  }
}

export class MfaService {
  private static provider: IMfaProvider = new DevelopmentMockMfaProvider();

  static getProviderName(): string {
    return this.provider.name;
  }

  static getProvider(): IMfaProvider {
    return this.provider;
  }

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

/**
 * Initializes MFA provider according to environment configuration.
 * In production mode (NODE_ENV === 'production'):
 * - Refuses development-mock or mock.
 * - Activates TotpMfaProvider when MFA_PROVIDER=totp (or default production-safe).
 * - Activates ProductionSmsMfaProvider when MFA_PROVIDER=sms.
 * - Leaves as DevelopmentMockMfaProvider if unset, so assertMfaProductionSafety() fails closed.
 */
export function initializeMfaProvider(): void {
  const providerType = (process.env.MFA_PROVIDER || '').trim().toLowerCase();

  if (process.env.NODE_ENV === 'production') {
    if (providerType === 'totp') {
      MfaService.setProvider(new TotpMfaProvider());
      logger.info('[MFA] Production RFC 6238 TOTP Authenticator Provider initialized');
    } else if (providerType === 'sms') {
      MfaService.setProvider(new ProductionSmsMfaProvider());
      logger.info('[MFA] Production SMS Gateway Provider initialized');
    } else if (providerType === 'development-mock' || providerType === 'mock') {
      throw new Error(
        '[FATAL_SECURITY_BLOCKER] SEC-INV-004: Cannot configure development-mock MFA provider in production mode. ' +
        'Set MFA_PROVIDER=totp or MFA_PROVIDER=sms.'
      );
    }
  } else {
    // Non-production modes (dev, test)
    if (providerType === 'totp') {
      MfaService.setProvider(new TotpMfaProvider());
    } else if (providerType === 'sms') {
      MfaService.setProvider(new ProductionSmsMfaProvider());
    } else {
      MfaService.setProvider(new DevelopmentMockMfaProvider());
    }
  }
}

/**
 * Fail-Closed Production Invariant (SEC-INV-004):
 * In production environment (NODE_ENV === 'production'), the API unconditionally
 * refuses to start with DevelopmentMockMfaProvider. No bypass flags are permitted.
 * A real production MFA provider (e.g. SMS, TOTP, Hardware Token) must be registered
 * via MfaService.setProvider() before starting the server.
 */
export function assertMfaProductionSafety(): void {
  if (process.env.NODE_ENV === 'production') {
    if (MfaService.getProviderName() === 'development-mock') {
      throw new Error(
        '[FATAL_SECURITY_BLOCKER] SEC-INV-004: Cannot start MedMinders API in production with DevelopmentMockMfaProvider. ' +
        'A production-grade MFA provider (e.g. SMS, TOTP, Hardware Token) must be registered via MfaService.setProvider(). ' +
        'Development mock MFA is strictly prohibited in production mode without exception. Set MFA_PROVIDER=totp or MFA_PROVIDER=sms.'
      );
    }
  }
}
