import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { RateLimitError } from '../utils/errors.js';

/**
 * ARCHITECTURAL LIMITATION & RELEASE BLOCKER NOTICE:
 * 
 * [RL-001: Distributed Shared Rate Limiter Required for Multi-Instance Production]
 * InMemoryRateLimiter tracks hits within a single Node.js process memory map.
 * When horizontally scaling across multiple container instances or behind an AWS/GCP
 * application load balancer, attackers can multiply their request budget across instances.
 * 
 * In production multi-instance clusters, PostgresRateLimiter (or Redis) MUST be enabled.
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export interface RateLimitOptions {
  windowMs: number; // e.g., 15 * 60 * 1000 (15 min)
  max: number;      // e.g., 10 requests
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export class InMemoryRateLimiter {
  private hits = new Map<string, RateLimitRecord>();

  constructor(private opts: RateLimitOptions) {}

  public middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (process.env.RATE_LIMIT_DISABLED === 'true') {
        return next();
      }

      const key = this.opts.keyGenerator
        ? this.opts.keyGenerator(req)
        : (req.ip || req.socket.remoteAddress || 'unknown_ip');

      const now = Date.now();
      let record = this.hits.get(key);

      if (!record || now >= record.resetTime) {
        record = {
          count: 1,
          resetTime: now + this.opts.windowMs,
        };
        this.hits.set(key, record);
      } else {
        record.count++;
      }

      const remaining = Math.max(0, this.opts.max - record.count);
      const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

      res.setHeader('X-RateLimit-Limit', this.opts.max);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

      if (record.count > this.opts.max) {
        res.setHeader('Retry-After', resetSeconds);
        const errMsg = this.opts.message || `Too many requests. Please try again in ${resetSeconds} seconds.`;
        return next(new RateLimitError(errMsg, resetSeconds));
      }

      next();
    };
  }

  public reset(): void {
    this.hits.clear();
  }
}

/**
 * Shared PostgreSQL-Backed Rate Limiter for multi-instance production environments.
 * Uses the durable IdempotencyRecord table with lockedUntil for automatic TTL expiry.
 */
export class PostgresRateLimiter {
  private prisma = new PrismaClient();

  constructor(private opts: RateLimitOptions, private namespace = 'RATE_LIMIT') {}

  public middleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (process.env.RATE_LIMIT_DISABLED === 'true') {
        return next();
      }

      const clientKey = this.opts.keyGenerator
        ? this.opts.keyGenerator(req)
        : (req.ip || req.socket.remoteAddress || 'unknown_ip');

      const compositeKey = `${this.namespace}:${clientKey}`;
      const now = new Date();
      const resetTime = new Date(now.getTime() + this.opts.windowMs);

      try {
        const existing = await this.prisma.idempotencyRecord.findUnique({
          where: {
            idempotencyKey_endpoint: {
              idempotencyKey: compositeKey,
              endpoint: 'RATE_LIMIT',
            },
          },
        });

        let currentCount = 1;

        if (!existing || now > existing.lockedUntil) {
          // New window
          await this.prisma.idempotencyRecord.upsert({
            where: {
              idempotencyKey_endpoint: {
                idempotencyKey: compositeKey,
                endpoint: 'RATE_LIMIT',
              },
            },
            update: {
              responseStatus: 1,
              lockedUntil: resetTime,
            },
            create: {
              idempotencyKey: compositeKey,
              endpoint: 'RATE_LIMIT',
              requestHash: 'rate_limit',
              responseStatus: 1,
              lockedUntil: resetTime,
            },
          });
        } else {
          // Increment in existing window
          currentCount = (existing.responseStatus || 0) + 1;
          await this.prisma.idempotencyRecord.update({
            where: { id: existing.id },
            data: { responseStatus: currentCount },
          });
        }

        const remaining = Math.max(0, this.opts.max - currentCount);
        const resetSeconds = Math.max(1, Math.ceil((resetTime.getTime() - now.getTime()) / 1000));

        res.setHeader('X-RateLimit-Limit', this.opts.max);
        res.setHeader('X-RateLimit-Remaining', remaining);
        res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime.getTime() / 1000));

        if (currentCount > this.opts.max) {
          res.setHeader('Retry-After', resetSeconds);
          const errMsg = this.opts.message || `Too many requests. Please try again in ${resetSeconds} seconds.`;
          return next(new RateLimitError(errMsg, resetSeconds));
        }

        next();
      } catch (err) {
        // Fallback to allow request if rate-limiter table experiences transient network hiccup
        next();
      }
    };
  }
}

// Preset Limiters
export const authRateLimiter = new InMemoryRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts. Please wait 15 minutes before retrying.',
});

export const uploadRateLimiter = new InMemoryRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Upload rate limit reached. Please wait before uploading more files.',
});

export const scanRateLimiter = new InMemoryRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Prescription scan rate limit exceeded.',
});
