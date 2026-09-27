import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth/authService.js';
import { requireAuth } from '../middleware/authGuard.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { validateRequest, authValidators } from '../middleware/validate.js';
import { AuditService } from '../services/audit/auditService.js';
import { UnauthorizedError, NotFoundError } from '../utils/errors.js';

const router = Router();

/**
 * POST /api/v1/auth/login (and /api/auth/login)
 * Authenticates user credentials, rotates sessions, issues JWTs, and logs audit events.
 */
router.post(
  '/login',
  authRateLimiter.middleware(),
  validateRequest({ body: authValidators.login }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);

      await AuditService.logEvent({
        actorUserId: result.user.id,
        targetUserId: result.user.id,
        action: 'AUTH_LOGIN_SUCCESS',
        entityType: 'User',
        entityId: result.user.id,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
        metadata: { roles: result.user.roles.map(r => r.role) },
      });

      res.json(result);
    } catch (err: any) {
      await AuditService.logEvent({
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'User',
        entityId: req.body?.email ? '[MASKED_USER]' : 'unknown',
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      });

      next(new UnauthorizedError(err.message || 'Invalid email or password'));
    }
  }
);

/**
 * POST /api/v1/auth/refresh (and /api/auth/refresh)
 * Rotates refresh token, detects replay attacks, and issues new token pair.
 */
router.post(
  '/refresh',
  authRateLimiter.middleware(),
  validateRequest({ body: authValidators.refresh }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      const newTokens = await AuthService.refreshTokens(refreshToken);

      await AuditService.logEvent({
        action: 'AUTH_TOKEN_ROTATED',
        entityType: 'RefreshToken',
        entityId: 'rotated',
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      });

      res.json(newTokens);
    } catch (err: any) {
      await AuditService.logEvent({
        action: 'AUTH_TOKEN_REPLAY_DETECTED',
        entityType: 'RefreshToken',
        entityId: 'rejected',
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      });

      next(new UnauthorizedError(err.message || 'Invalid or revoked refresh token'));
    }
  }
);

/**
 * POST /api/v1/auth/logout (and /api/auth/logout)
 * Revokes refresh token and terminates the session family.
 */
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await AuthService.logout(refreshToken);
    }

    await AuditService.logEvent({
      action: 'AUTH_LOGOUT',
      entityType: 'Session',
      entityId: 'terminated',
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err: any) {
    next(err);
  }
});

/**
 * GET /api/v1/auth/me (and /api/auth/me)
 * Retrieves authenticated user profile and roles.
 */
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('Unauthorized'));
    }
    const profile = await AuthService.getCurrentUser(req.user.id);
    if (!profile) {
      return next(new NotFoundError('User profile not found'));
    }
    res.json(profile);
  } catch (err: any) {
    next(err);
  }
});

export const authRouter = router;
