import express from 'express';
import cors from 'cors';
import { requestIdMiddleware } from './middleware/requestId.js';
import { requestLogger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { legacyDeprecationMiddleware } from './middleware/deprecation.js';
import { prescriptionsRouter } from './routes/prescriptions.js';
import { antibioticsRouter } from './routes/antibiotics.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { filesRouter } from './routes/files.js';
import { healthRouter } from './routes/health.js';
import { docsRouter } from './routes/docs.js';

export const app = express();

// 1. Foundational Request Infrastructure
app.use(requestIdMiddleware);
app.use(requestLogger);
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

/**
 * Surface 1: Direct /uploads exposure.
 * FAIL-CLOSED: Direct public static file access is disabled to prevent PHI exposure.
 * Medical files are served exclusively through the authenticated, object-authorized /api/v1/files/:id endpoint.
 */
app.use('/uploads', (_req, res) => {
  res.status(401).json({
    error: 'Unauthorized: Direct public access to uploads is disabled. Use authenticated medical file access endpoints at /api/v1/files/:id.',
  });
});

// 2. Health & Diagnostic Probes
app.use('/health', healthRouter);
app.use('/api/v1/health', healthRouter);
app.get('/api/health', (_req, res) => res.json({ ok: true, status: 'UP' }));

// 3. API Documentation
app.use('/api-docs', docsRouter);
app.use('/api/v1/docs', docsRouter);

// 4. Canonical /api/v1 Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/files', filesRouter);
app.use('/api/v1/prescriptions', prescriptionsRouter);
app.use('/api/v1/antibiotics', antibioticsRouter);
app.use('/api/v1/admin', adminRouter);

// 5. Deprecated Legacy /api/* Aliases (Preserved with strict RFC 8594 Sunset & Deprecation headers)
app.use('/api/auth', legacyDeprecationMiddleware('/api/v1'), authRouter);
app.use('/api/files', legacyDeprecationMiddleware('/api/v1'), filesRouter);
app.use('/api/prescriptions', legacyDeprecationMiddleware('/api/v1'), prescriptionsRouter);
app.use('/api/antibiotics', legacyDeprecationMiddleware('/api/v1'), antibioticsRouter);
app.use('/api/admin', legacyDeprecationMiddleware('/api/v1'), adminRouter);

// 6. Centralized Error Handler (Envelope + RFC 7807 problem details)
app.use(errorHandler);
