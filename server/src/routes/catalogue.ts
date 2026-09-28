import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../services/database/prisma.js';
import { CatalogueMatcher } from '../services/catalogue/catalogueMatcher.js';
import { extractPagination, formatPaginatedResponse } from '../utils/pagination.js';
import { NotFoundError } from '../utils/errors.js';
import { resolveVerifiedClinicianAudience } from '../middleware/authGuard.js';

const router = Router();

/**
 * GET /api/v1/catalogue/version
 * Returns the current active published catalogue release version and freshness metadata.
 */
router.get('/version', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const activeRelease = await prisma.catalogueRelease.findFirst({
      where: { status: 'PUBLISHED' },
      include: {
        _count: {
          select: { generics: true },
        },
      },
      orderBy: { effectiveDate: 'desc' },
    });

    if (!activeRelease) {
      // Fallback if initial migration applied but no formal release published yet
      const totalFallback = await prisma.antibiotic.count();
      return res.json({
        version: 'v0.0.0-unversioned',
        status: 'UNVERSIONED_INITIAL',
        effectiveDate: new Date(),
        publishedAt: null,
        totalGenerics: totalFallback,
        freshnessTimestamp: new Date().toISOString(),
        isPublished: false,
      });
    }

    const totalBrands = await prisma.medicineBrand.count({
      where: {
        generic: { catalogueReleaseId: activeRelease.id },
      },
    });

    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes cache
    res.setHeader('X-Catalogue-Version', activeRelease.version);

    res.json({
      id: activeRelease.id,
      version: activeRelease.version,
      status: activeRelease.status,
      source: activeRelease.source,
      sourceSha256: activeRelease.sourceSha256,
      effectiveDate: activeRelease.effectiveDate,
      publishedAt: activeRelease.publishedAt,
      totalGenerics: activeRelease._count.generics,
      totalBrands,
      freshnessTimestamp: activeRelease.publishedAt || activeRelease.updatedAt,
      isPublished: true,
      // Phase 1: Explicitly distinguish technical curator approval from independent clinical governance review
      curatorApproval: {
        curatorUserId: activeRelease.curatorUserId,
        approvedAt: activeRelease.publishedAt,
        isTechnicalApproved: true,
        scope: 'TECHNICAL_STAGING_VALIDATION',
      },
      clinicalReview: {
        status: 'PENDING_INDEPENDENT_CLINICAL_GOVERNANCE_REVIEW',
        isClinicallyApproved: false, // Invariant: Content is NOT clinically approved until independent qualified clinicians sign off
        qualifiedReviewer: null,
        clinicalGovernanceNotice: 'Technical catalogue structure approved by curator. Independent clinical sign-off pending governance review committee.',
        prescriberDisclaimer: 'Dosing values are general adult reference only and must never be treated as patient-specific orders.',
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/catalogue/antibiotics
 * Paginated list of antibiotics and medicines from the current published release.
 * 
 * Security & Clinical Safety Invariants (SEC-INV-005):
 * 1. Ignores client-supplied ?audience parameter completely.
 * 2. Audience is derived strictly from authenticated user's verified role in PostgreSQL.
 * 3. Anonymous users, patients, representatives, and unverified/suspended clinicians
 *    strictly receive null for referenceDosingGuidance and ageConsiderations.
 * 4. Cache isolation: Sets Vary: Authorization, Accept-Encoding.
 *    - Clinicians: Cache-Control: private, no-transform, max-age=60
 *    - Public/Patients: Cache-Control: public, max-age=120, stale-while-revalidate=60
 */
router.get('/antibiotics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, offset } = extractPagination(req);
    const isClinicianAudience = await resolveVerifiedClinicianAudience(req);

    // Cache Isolation: public and clinician responses must never share cache
    res.setHeader('Vary', 'Authorization, Accept-Encoding');
    if (isClinicianAudience) {
      res.setHeader('Cache-Control', 'private, no-transform, max-age=60');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=60');
    }

    const activeRelease = await prisma.catalogueRelease.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { effectiveDate: 'desc' },
    });

    if (activeRelease) {
      const [total, generics] = await Promise.all([
        prisma.medicineGeneric.count({
          where: { catalogueReleaseId: activeRelease.id },
        }),
        prisma.medicineGeneric.findMany({
          where: { catalogueReleaseId: activeRelease.id },
          include: { brands: true },
          skip: offset,
          take: limit,
          orderBy: { genericName: 'asc' },
        }),
      ]);

      res.setHeader('X-Catalogue-Version', activeRelease.version);

      const paginated = formatPaginatedResponse(
        generics.map(g => ({
          id: g.id,
          genericName: g.genericName,
          antibioticClass: g.antibioticClass,
          awareGroup: g.awareGroup,
          clinicalSource: g.clinicalSource,
          // SEC-INV-005: Clinical dosing strictly withheld from non-verified audience
          referenceDosingGuidance: isClinicianAudience ? g.referenceDosingGuidance : null,
          patientNotice: isClinicianAudience
            ? undefined
            : 'ডোজ ও সেবনবিধি শুধুমাত্র আপনার চিকিৎসকের প্রেসক্রিপশন অনুযায়ী গ্রহণ করুন। ক্যাটালগের কোনো তথ্য প্রেসক্রিপশনের বিকল্প নয়।',
          ageConsiderations: isClinicianAudience ? g.ageConsiderations : null,
          sideEffects: g.sideEffects,
          catalogueVersion: activeRelease.version,
          brands: g.brands.map(b => ({
            id: b.id,
            brandName: b.brandName,
            manufacturer: b.manufacturer,
            strength: b.strength,
            dosageForm: b.dosageForm,
          })),
        })),
        total,
        { page, limit, offset }
      );

      return res.json({
        ...paginated,
        version: activeRelease.version,
        audience: isClinicianAudience ? 'CLINICIAN' : 'PATIENT_PUBLIC',
        disclaimer: isClinicianAudience
          ? 'Adult reference guidance only; patient dosing must be individualized by prescriber.'
          : 'Adult reference guidance only; not for patient self-administration. রোগীর জন্য সতর্কতা: ওষুধের সঠিক মাত্রা ও সেবনকাল প্রেসক্রিপশনে চিকিৎসকের নির্দেশ অনুযায়ী গ্রহণ করুন।',
      });
    }

    // Fallback projection table
    const [total, list] = await Promise.all([
      prisma.antibiotic.count(),
      prisma.antibiotic.findMany({
        skip: offset,
        take: limit,
        orderBy: { genericName: 'asc' },
      }),
    ]);

    const sanitizedList = list.map(a => ({
      ...a,
      doseDuration: isClinicianAudience ? a.doseDuration : null,
      ageConsiderations: isClinicianAudience ? a.ageConsiderations : null,
    }));

    res.json(formatPaginatedResponse(sanitizedList, total, { page, limit, offset }));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/catalogue/search
 * Fuzzy search across generic and brand names with candidate ranking and ambiguity detection.
 * Phase 1 Invariant: Excludes patient-specific dosing guidance from search candidate output.
 */
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.setHeader('Vary', 'Authorization, Accept-Encoding');
    res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=60');

    const q = String(req.query.q || '').trim();
    if (!q) {
      return res.json({
        query: '',
        candidates: [],
        confidence: 0,
        isAmbiguous: false,
        clinicalDisclaimer: 'Search candidates are for catalogue lookup only. Patient-specific dosing must be determined by a licensed prescriber.',
      });
    }

    const result = await CatalogueMatcher.match(q, prisma);
    if (result.catalogueVersion) {
      res.setHeader('X-Catalogue-Version', result.catalogueVersion);
    }

    res.json({
      ...result,
      clinicalDisclaimer: 'Search candidates are for catalogue lookup only. Patient-specific dosing must be determined by a licensed prescriber.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/catalogue/generics/:id
 * Retrieve specific generic detail with brands and clinical reference guidance.
 * 
 * Security Invariant (SEC-INV-005):
 * referenceDosingGuidance and ageConsiderations are strictly withheld unless the user
 * has a verified clinician or pharmacist role in PostgreSQL.
 */
router.get('/generics/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const isClinicianAudience = await resolveVerifiedClinicianAudience(req);

    // Cache Isolation
    res.setHeader('Vary', 'Authorization, Accept-Encoding');
    if (isClinicianAudience) {
      res.setHeader('Cache-Control', 'private, no-transform, max-age=60');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=60');
    }

    const generic = await prisma.medicineGeneric.findUnique({
      where: { id },
      include: {
        brands: true,
        catalogueRelease: true,
      },
    });

    if (!generic) {
      throw new NotFoundError('Generic medicine record not found in catalogue');
    }

    res.json({
      id: generic.id,
      genericName: generic.genericName,
      antibioticClass: generic.antibioticClass,
      awareGroup: generic.awareGroup,
      clinicalSource: generic.clinicalSource,
      referenceDosingGuidance: isClinicianAudience ? generic.referenceDosingGuidance : null,
      patientNotice: isClinicianAudience
        ? undefined
        : 'ডোজ ও সেবনবিধি শুধুমাত্র আপনার চিকিৎসকের প্রেসক্রিপশন অনুযায়ী গ্রহণ করুন। ক্যাটালগের কোনো তথ্য প্রেসক্রিপশনের বিকল্প নয়।',
      clinicalDisclaimer: isClinicianAudience
        ? 'General adult reference information only. Patient-specific dosing and duration must be confirmed by a licensed prescriber based on patient clinical assessment, age, weight, and renal/hepatic function.'
        : 'Adult reference guidance only; not for patient self-administration. রোগীর জন্য সতর্কতা: ওষুধের সঠিক মাত্রা ও সেবনকাল প্রেসক্রিপশনে চিকিৎসকের নির্দেশ অনুযায়ী গ্রহণ করুন।',
      ageConsiderations: isClinicianAudience ? generic.ageConsiderations : null,
      sideEffects: generic.sideEffects,
      catalogueVersion: generic.catalogueRelease.version,
      brands: generic.brands,
      audience: isClinicianAudience ? 'CLINICIAN' : 'PATIENT_PUBLIC',
    });
  } catch (err) {
    next(err);
  }
});

export const catalogueRouter = router;

