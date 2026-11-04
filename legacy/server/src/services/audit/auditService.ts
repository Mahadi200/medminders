import { PrismaClient } from '@prisma/client';
import { logger, sanitizeLogData } from '../../utils/logger.js';
import { AuditPersistenceError } from '../../utils/errors.js';

export interface AuditLogOptions {
  actorUserId?: string | null;
  targetUserId?: string | null;
  organizationId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any>;
  failClosed?: boolean; // When true, database failure aborts the operation
}

// Sensitive operations that strictly mandate fail-closed audit trails
const FAIL_CLOSED_ACTIONS = [
  'PHI_FILE_STREAMED',
  'PHI_PRESCRIPTION_READ',
  'PRESCRIPTION_SIGN',
  'AUTH_LOGIN_SUCCESS',
  'CLINICIAN_CREDENTIAL_VERIFIED',
  'PHARMACIST_CREDENTIAL_VERIFIED',
];

export class AuditService {
  private static prisma: PrismaClient = new PrismaClient();

  /**
   * For testing audit failure policies
   */
  static setPrismaInstance(customPrisma: PrismaClient): void {
    this.prisma = customPrisma;
  }

  /**
   * Logs a security or clinical audit event to the PostgreSQL database AuditEvent table.
   * If failClosed is true or the action is a sensitive PHI/security operation, any database write
   * failure halts the operation with AuditPersistenceError (HTTP 503).
   */
  static async logEvent(opts: AuditLogOptions): Promise<void> {
    const isSensitive = opts.failClosed || FAIL_CLOSED_ACTIONS.includes(opts.action);

    try {
      const sanitizedMeta = opts.metadata ? JSON.stringify(sanitizeLogData(opts.metadata)) : null;

      if (process.env.DATABASE_URL) {
        await this.prisma.auditEvent.create({
          data: {
            actorUserId: opts.actorUserId || null,
            targetUserId: opts.targetUserId || null,
            organizationId: opts.organizationId || null,
            action: opts.action,
            entityType: opts.entityType,
            entityId: opts.entityId,
            ipAddress: opts.ipAddress || null,
            userAgent: opts.userAgent || null,
            metadataJson: sanitizedMeta,
          },
        });
      }

      logger.info(`Audit: ${opts.action} on ${opts.entityType}:${opts.entityId}`, {
        actorUserId: opts.actorUserId,
        targetUserId: opts.targetUserId,
        action: opts.action,
        entityType: opts.entityType,
        entityId: opts.entityId,
      });
    } catch (err: any) {
      logger.error('CRITICAL: AuditEvent persistence failure', {
        error: err.message || String(err),
        action: opts.action,
        entityType: opts.entityType,
        entityId: opts.entityId,
        isSensitive,
      });

      if (isSensitive) {
        throw new AuditPersistenceError(
          `Audit write failed for sensitive action '${opts.action}'. Operation aborted under HIPAA/GDPR clinical safety fail-closed policy.`
        );
      }
    }
  }
}
