import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { importAntibioticsFromXlsx } from '../services/antibiotics/xlsxImport.js';
import { requireAdmin } from '../middleware/authGuard.js';
import { AuditService } from '../services/audit/auditService.js';
import { ValidationError } from '../utils/errors.js';
import { ProfessionalVerificationService } from '../services/verification/professionalVerificationService.js';
import { CatalogueImportService } from '../services/catalogue/catalogueImportService.js';
import { catalogueAdminRateLimiter } from '../middleware/rateLimiter.js';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();
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

// =============================================================
// Versioned Medicine & Antibiotic Catalogue Curation Endpoints
// =============================================================

/**
 * POST /api/v1/admin/catalogue/import/stage
 * Uploads, parses, validates, and stages spreadsheet.
 * Computes diff and detects brand conflicts without touching published catalogue.
 */
router.post(
  '/catalogue/import/stage',
  requireAdmin,
  catalogueAdminRateLimiter.middleware(),
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return next(new ValidationError('Spreadsheet file is required'));
      }
      if (!req.file.originalname.endsWith('.xlsx')) {
        return next(new ValidationError('Only .xlsx spreadsheet format is supported'));
      }

      const stagingResult = await CatalogueImportService.stageXlsx({
        buffer: req.file.buffer,
        filename: req.file.originalname,
        uploadedByUserId: req.user!.id,
        defaultSource: req.body?.source,
      });

      res.status(202).json({
        success: true,
        message: 'Spreadsheet staged for review. Approval required before publication.',
        ...stagingResult,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/catalogue/import/stage/:batchId
 * Review staged batch, diff, and row validation errors.
 */
router.get(
  '/catalogue/import/stage/:batchId',
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const batch = await CatalogueImportService.getStagingBatch(req.params.batchId);
      res.json(batch);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/catalogue/import/stage/:batchId/approve
 * Approves staged batch, supersedes previous active version, and publishes new catalogue version.
 */
router.post(
  '/catalogue/import/stage/:batchId/approve',
  requireAdmin,
  catalogueAdminRateLimiter.middleware(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { version, curatorNotes, effectiveDate } = req.body;
      if (!version) {
        return next(new ValidationError('version is required (e.g. v1.0.0, 1.1.0)'));
      }

      const release = await CatalogueImportService.approveAndPublish({
        batchId: req.params.batchId,
        curatorUserId: req.user!.id,
        version,
        curatorNotes,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
      });

      res.json({
        success: true,
        message: `Catalogue version ${release.version} successfully published.`,
        release,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/catalogue/import/stage/:batchId/reject
 * Rejects staged batch with curator rationale.
 */
router.post(
  '/catalogue/import/stage/:batchId/reject',
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rejectionReason } = req.body;
      const rejected = await CatalogueImportService.rejectStagingBatch(
        req.params.batchId,
        req.user!.id,
        rejectionReason
      );

      res.json({
        success: true,
        message: 'Staging batch rejected.',
        batch: rejected,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/catalogue/releases
 * List all catalogue releases (published, superseded, draft) with audit metadata.
 */
router.get(
  '/catalogue/releases',
  requireAdmin,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const releases = await prisma.catalogueRelease.findMany({
        orderBy: { effectiveDate: 'desc' },
        include: {
          curator: { select: { id: true, email: true } },
          _count: { select: { generics: true } },
        },
      });

      res.json({
        total: releases.length,
        releases: releases.map(r => ({
          id: r.id,
          version: r.version,
          status: r.status,
          source: r.source,
          curator: r.curator?.email || r.curatorUserId,
          curatorNotes: r.curatorNotes,
          effectiveDate: r.effectiveDate,
          publishedAt: r.publishedAt,
          supersededAt: r.supersededAt,
          genericsCount: r._count.generics,
          createdAt: r.createdAt,
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/catalogue/releases/:releaseId/rollback
 * Roll back to a previous catalogue release version without erasing history.
 */
router.post(
  '/catalogue/releases/:releaseId/rollback',
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reason } = req.body;
      const restored = await CatalogueImportService.rollbackToVersion(
        req.params.releaseId,
        req.user!.id,
        reason
      );

      res.json({
        success: true,
        message: `Catalogue successfully rolled back to active version ${restored.version}.`,
        release: restored,
      });
    } catch (err) {
      next(err);
    }
  }
);

export const adminRouter = router;
