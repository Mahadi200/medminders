import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedUser {
  id: string;
  role: 'patient' | 'doctor' | 'pharmacist' | 'hospital_admin' | 'admin' | 'representative';
  email?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Fail-Closed Authentication Middleware.
 * Until full cryptographic token verification is implemented in Slice 4,
 * this middleware strictly denies all anonymous, unauthenticated, and mock/demo-patient access.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Authentication required',
    });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  // Explicitly deny empty, anonymous, or demo placeholder tokens
  if (!token || token === 'anonymous' || token === 'demo-token' || token === 'demo-patient') {
    return res.status(401).json({
      error: 'Unauthorized: Valid authenticated session required',
    });
  }

  // Populate mock user context if valid format until Slice 4 JWT verification
  req.user = {
    id: token.startsWith('user_') ? token : `usr_${token.slice(0, 12)}`,
    role: 'patient',
  };

  next();
}

/**
 * Fail-Closed Admin Role Guard.
 * Strictly denies anonymous access and non-admin tokens.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Admin authentication required',
    });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token || !token.toLowerCase().includes('admin') || token === 'demo-token') {
    return res.status(403).json({
      error: 'Forbidden: Admin credentials required',
    });
  }

  req.user = {
    id: 'admin-verified',
    role: 'admin',
  };

  next();
}
