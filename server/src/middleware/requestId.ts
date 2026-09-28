import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

/**
 * Middleware ensuring every incoming request has an immutable request ID.
 * Uses client-provided X-Request-ID if valid UUID / alphanumeric token (max 64 chars),
 * otherwise generates a cryptographically random RFC 4122 v4 UUID.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existingId = req.headers['x-request-id'];

  let id: string;
  if (typeof existingId === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(existingId)) {
    id = existingId;
  } else {
    id = crypto.randomUUID();
  }

  req.id = id;
  res.setHeader('x-request-id', id);
  next();
}
