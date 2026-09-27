import { PrismaClient } from '@prisma/client';
import { logger, sanitizeLogData } from '../../utils/logger.js';

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
}

export class AuditService {
  private static prisma: PrismaClient = new PrismaClient();

  /**
   * Logs a security or clinical audit event to the PostgreSQL database AuditEvent table.
   * Ensures metadata is automatically sanitized of raw passwords, tokens, or plaintext PHI.
   */
  static async logEvent(opts: AuditLogOptions): Promise<void> {
    try {
      const sanitizedMeta = opts.metadata ? JSON.stringify(sanitizeLogData(opts.metadata)) : null;

      // In production and testing with live DB, persist to AuditEvent table
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
      // Non-blocking log write: audit failure should be alerted without destroying the primary user transaction
      logger.error('Failed to persist AuditEvent record', {
        error: err.message || String(err),
        action: opts.action,
        entityType: opts.entityType,
        entityId: opts.entityId,
      });
    }
  }
}
