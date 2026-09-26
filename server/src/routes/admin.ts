import { Router, Request, Response } from 'express';
import multer from 'multer';
import { importAntibioticsFromXlsx } from '../services/antibiotics/xlsxImport.js';
import { requireAdmin } from '../middleware/authGuard.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

/**
 * Surface 4: Admin XLSX import.
 * FAIL-CLOSED: Strictly requires verified admin authorization.
 * Anonymous or non-admin requests are denied with 401/403.
 */
router.post('/antibiotics/import-xlsx', requireAdmin, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!req.file.originalname.endsWith('.xlsx')) return res.status(400).json({ error: 'Only .xlsx allowed' });

    const result = await importAntibioticsFromXlsx(req.file.buffer);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Import failed' });
  }
});

export const adminRouter = router;
