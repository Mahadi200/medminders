import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { matchAntibiotic } from '../services/antibiotics/matcher.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/search', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ results: [] });

    const result = await matchAntibiotic(q);
    if (result.match) {
      return res.json({
        results: [{
          antibiotic: result.match,
          confidence: result.confidence,
          matched_on: result.matched_on,
        }],
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
    res.json({ results: all.map(a => ({ antibiotic: a, confidence: 0.8, matched_on: 'search' as const })) });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Search failed' });
  }
});

export const antibioticsRouter = router;
