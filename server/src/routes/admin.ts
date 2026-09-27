import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { importAntibioticsFromXlsx } from '../services/antibiotics/xlsxImport.js';
import { requireAdmin } from '../middleware/authGuard.js';
import { AuditService } from '../services/audit/auditService.js';
import { ValidationError } from '../utils/errors.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

/**
 * Surface 4: Admin XLSX import.
 * FAIL-CLOSED: Strictly requires verified admin authorization.
 * Anonymous or non-admin requests are denied with 401/403.
 * Logs administrative stewardship audit events.
 */
router.post(
  '/antibiotics/import-xlsx',
  requireAdmin,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return next(new ValidationError('No file uploaded', [{ field: 'file', message: 'File is required' }]));
      }
      if (!req.file.originalname.endsWith('.xlsx')) {
        return next(new ValidationError('Only .xlsx allowed', [{ field: 'file', message: 'File extension must be .xlsx' }]));
      }

      const result = await importAntibioticsFromXlsx(req.file.buffer);

      await AuditService.logEvent({
        actorUserId: req.user?.id,
        action: 'ADMIN_XLSX_STEWARDSHIP_IMPORT',
        entityType: 'AntibioticCatalog',
        entityId: 'import',
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
        metadata: {
          created: result.created,
          updated: result.updated,
          rows_read: result.rows_read,
          fileName: req.file.originalname,
        },
      });

      res.json(result);
    } catch (e: any) {
      next(e);
    }
  }
);

export const adminRouter = router;
