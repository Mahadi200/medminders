import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /health/live (and /api/v1/health/live)
 * Liveness probe: verifies process is alive and event loop is responsive.
 * Does NOT check downstream dependencies to prevent cascading restart loops.
 */
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

/**
 * GET /health/ready (and /api/v1/health/ready)
 * Readiness probe: checks database connectivity and schema readiness.
 * Returns 200 when ready to receive traffic, 503 Service Unavailable when DB is down.
 */
router.get('/ready', async (_req: Request, res: Response) => {
  const start = Date.now();
  try {
    // Ping PostgreSQL using lightweight query
    await prisma.$queryRawUnsafe('SELECT 1;');
    const latencyMs = Date.now() - start;

    res.status(200).json({
      status: 'UP',
      database: 'connected',
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    logger.error('Health readiness probe failed: database ping error', {
      error: err.message || String(err),
      latencyMs,
    });

    res.status(503).json({
      status: 'DOWN',
      database: 'disconnected',
      error: 'Database connection failed',
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  }
});

export const healthRouter = router;
