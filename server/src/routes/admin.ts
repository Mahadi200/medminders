import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { importAntibioticsFromXlsx } from '../services/antibiotics/xlsxImport.js';
import { requireAdmin } from '../middleware/authGuard.js';
import { AuditService } from '../services/audit/auditService.js';
import { ValidationError } from '../utils/errors.js';
import { ProfessionalVerificationService } from '../services/verification/professionalVerificationService.js';

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

/**
 * POST /api/v1/admin/verification/clinician
 * Admin manual review of Doctor BMDC credentials with required evidence.
 */
router.post('/verification/clinician', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clinicianUserId, decision, evidenceNotes, evidenceDocumentUrl, expiresAt } = req.body;
    if (!clinicianUserId || !decision) {
      return next(new ValidationError('clinicianUserId and decision are required'));
    }

    const updated = await ProfessionalVerificationService.reviewClinicianCredential({
      adminUserId: req.user!.id,
      clinicianUserId,
      decision,
      evidenceNotes,
      evidenceDocumentUrl,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    res.json({ success: true, credential: updated });
  } catch (err: any) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/verification/pharmacist
 * Admin manual review of Pharmacist Council credentials with required evidence.
 */
router.post('/verification/pharmacist', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pharmacistUserId, decision, evidenceNotes, evidenceDocumentUrl, expiresAt } = req.body;
    if (!pharmacistUserId || !decision) {
      return next(new ValidationError('pharmacistUserId and decision are required'));
    }

    const updated = await ProfessionalVerificationService.reviewPharmacistCredential({
      adminUserId: req.user!.id,
      pharmacistUserId,
      decision,
      evidenceNotes,
      evidenceDocumentUrl,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    res.json({ success: true, credential: updated });
  } catch (err: any) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/verification/organization
 * Register a healthcare or pharmacy organization.
 */
router.post('/verification/organization', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, type, regNumber, address, phone, licenseEvidenceUrl } = req.body;
    if (!name || !type || !regNumber) {
      return next(new ValidationError('name, type, and regNumber are required'));
    }

    const org = await ProfessionalVerificationService.registerOrganization({
      adminUserId: req.user!.id,
      name,
      type,
      regNumber,
      address,
      phone,
      licenseEvidenceUrl,
    });

    res.json({ success: true, organization: org });
  } catch (err: any) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/verification/affiliate
 * Affiliate staff member with hospital or pharmacy.
 */
router.post('/verification/affiliate', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, organizationId, role, isVerified, notes } = req.body;
    if (!userId || !organizationId || !role) {
      return next(new ValidationError('userId, organizationId, and role are required'));
    }

    const assignment = await ProfessionalVerificationService.affiliateStaffMember({
      adminUserId: req.user!.id,
      userId,
      organizationId,
      role,
      isVerified: Boolean(isVerified),
      notes,
    });

    res.json({ success: true, assignment });
  } catch (err: any) {
    next(err);
  }
});

export const adminRouter = router;
