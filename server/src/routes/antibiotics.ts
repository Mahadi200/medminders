import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../services/database/prisma.js';
import { matchAntibiotic } from '../services/antibiotics/matcher.js';
import { extractPagination, formatPaginatedResponse } from '../utils/pagination.js';
import { validateRequest, paginationValidator } from '../middleware/validate.js';
import { resolveVerifiedClinicianAudience } from '../middleware/authGuard.js';

const router = Router();

/**
 * Helper to sanitize antibiotic records according to caller privilege.
 * Non-clinicians must NEVER receive doseDuration or clinical age considerations.
 */
function sanitizeAntibiotic(a: any, isClinician: boolean) {
  if (!a) return a;
  return {
    ...a,
    doseDuration: isClinician ? a.doseDuration : null,
    ageConsiderations: isClinician ? a.ageConsiderations : null,
    audience: isClinician ? 'CLINICIAN' : 'PATIENT_PUBLIC',
  };
}

/**
 * GET /api/v1/antibiotics (and /api/antibiotics)
 * Returns a bounded, paginated list of stewardship antibiotics from PostgreSQL.
 * Phase 1 Invariant (SEC-INV-005): Dosing guidance withheld for non-verified callers.
 */
router.get(
  '/',
  validateRequest({ query: paginationValidator }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, offset } = extractPagination(req);
      const isClinician = await resolveVerifiedClinicianAudience(req);

      res.setHeader('Vary', 'Authorization, Accept-Encoding');
      if (isClinician) {
        res.setHeader('Cache-Control', 'private, no-transform, max-age=60');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=60');
      }

      const [total, antibiotics] = await Promise.all([
        prisma.antibiotic.count(),
        prisma.antibiotic.findMany({
          skip: offset,
          take: limit,
          orderBy: { genericName: 'asc' },
        }),
      ]);

      const sanitized = antibiotics.map(a => sanitizeAntibiotic(a, isClinician));

      res.json(formatPaginatedResponse(sanitized, total, { page, limit, offset }));
    } catch (err: any) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/antibiotics/search (and /api/antibiotics/search)
 * Search antibiotics with bounded query results and fuzzy matching.
 * Security Invariant (SEC-INV-005): Suppresses doseDuration for non-verified audience.
 */
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isClinician = await resolveVerifiedClinicianAudience(req);

    res.setHeader('Vary', 'Authorization, Accept-Encoding');
    if (isClinician) {
      res.setHeader('Cache-Control', 'private, no-transform, max-age=60');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=60');
    }

    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ results: [] });

    const result = await matchAntibiotic(q);
    if (result.match) {
      return res.json({
        results: [
          {
            antibiotic: sanitizeAntibiotic(result.match, isClinician),
            confidence: result.confidence,
            matched_on: result.matched_on,
          },
        ],
      });
    }

    const all = await prisma.antibiotic.findMany({
      take: 10,
      where: {
        OR: [
          { genericName: { contains: q, mode: 'insensitive' } },
          { brandNames: { has: q } },
        ],
      },
    });

    res.json({
      results: all.map(a => ({
        antibiotic: sanitizeAntibiotic(a, isClinician),
        confidence: 0.8,
        matched_on: 'search' as const,
      })),
    });
  } catch (err: any) {
    next(err);
  }
});

export const antibioticsRouter = router;

