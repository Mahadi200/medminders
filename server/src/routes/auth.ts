import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth/authService.js';
import { requireAuth } from '../middleware/authGuard.js';

const router = Router();

/**
 * POST /api/auth/login
 * Authenticates user credentials and issues access JWT + refresh token.
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Invalid email or password' });
  }
});

/**
 * POST /api/auth/refresh
 * Rotates refresh token, detecting replay attacks and issuing a new token pair.
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const newTokens = await AuthService.refreshTokens(refreshToken);
    res.json(newTokens);
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Invalid or revoked refresh token' });
  }
});

/**
 * POST /api/auth/logout
 * Revokes refresh token and terminates the session family.
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await AuthService.logout(refreshToken);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Logout failed' });
  }
});

/**
 * GET /api/auth/me
 * Retrieves the currently authenticated user and verified credentials.
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const profile = await AuthService.getCurrentUser(req.user.id);
    if (!profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve profile' });
  }
});

export const authRouter = router;
