import express from 'express';
import cors from 'cors';
import { prescriptionsRouter } from './routes/prescriptions.js';
import { antibioticsRouter } from './routes/antibiotics.js';
import { adminRouter } from './routes/admin.js';

export const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

/**
 * Surface 1: Direct /uploads exposure.
 * FAIL-CLOSED: Direct public static file access is disabled to prevent PHI exposure.
 * Existing stored files on disk are preserved and will be served via authenticated streaming in Slice 4.
 */
app.use('/uploads', (_req, res) => {
  res.status(401).json({
    error: 'Unauthorized: Direct public access to uploads is disabled. Use authenticated medical file access endpoints.',
  });
});

// Mounted API routes
app.use('/api/prescriptions', prescriptionsRouter);
app.use('/api/antibiotics', antibioticsRouter);
app.use('/api/admin', adminRouter);

// Public health check
app.get('/api/health', (_, res) => res.json({ ok: true }));
