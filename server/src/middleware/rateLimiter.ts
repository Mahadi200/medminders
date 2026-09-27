import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from '../utils/errors.js';

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
      // In automated test environments where RATE_LIMIT_DISABLED is set, skip
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

// Preset Limiters for sensitive MedMinders routes
export const authRateLimiter = new InMemoryRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts
  message: 'Too many authentication attempts. Please wait 15 minutes before retrying.',
});

export const uploadRateLimiter = new InMemoryRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,                   // 15 uploads
  message: 'Upload rate limit reached. Please wait before uploading more files.',
});

export const scanRateLimiter = new InMemoryRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,                   // 30 OCR requests
  message: 'Prescription scan rate limit exceeded.',
});
