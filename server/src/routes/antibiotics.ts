import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { matchAntibiotic } from '../services/antibiotics/matcher.js';
import { extractPagination, formatPaginatedResponse } from '../utils/pagination.js';
import { validateRequest, paginationValidator } from '../middleware/validate.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/v1/antibiotics (and /api/antibiotics)
 * Returns a bounded, paginated list of stewardship antibiotics from PostgreSQL.
 */
router.get(
  '/',
  validateRequest({ query: paginationValidator }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, offset } = extractPagination(req);

      const [total, antibiotics] = await Promise.all([
        prisma.antibiotic.count(),
        prisma.antibiotic.findMany({
          skip: offset,
          take: limit,
          orderBy: { genericName: 'asc' },
        }),
      ]);

      res.json(formatPaginatedResponse(antibiotics, total, { page, limit, offset }));
    } catch (err: any) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/antibiotics/search (and /api/antibiotics/search)
 * Search antibiotics with bounded query results and fuzzy matching.
 */
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ results: [] });

    const result = await matchAntibiotic(q);
    if (result.match) {
      return res.json({
        results: [
          {
            antibiotic: result.match,
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
        antibiotic: a,
        confidence: 0.8,
        matched_on: 'search' as const,
      })),
    });
  } catch (err: any) {
    next(err);
  }
});

export const antibioticsRouter = router;
