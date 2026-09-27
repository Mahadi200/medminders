import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

/**
 * GET /api/v1/docs
 * Serves the OpenAPI 3.0 specification for MedMinders API.
 */
router.get('/', (_req: Request, res: Response) => {
  try {
    const specPath = path.join(__dirname, '../docs/openapi.json');
    if (!fs.existsSync(specPath)) {
      // Fallback relative to project root in dist vs src
      const altPath = path.join(process.cwd(), 'src/docs/openapi.json');
      if (fs.existsSync(altPath)) {
        return res.sendFile(altPath);
      }
      return res.status(404).json({ error: 'OpenAPI specification file not found' });
    }
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(specPath);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load API documentation' });
  }
});

export const docsRouter = router;
