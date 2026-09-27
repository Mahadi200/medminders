import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { CatalogueMatcher } from '../services/catalogue/catalogueMatcher.js';
import { extractPagination, formatPaginatedResponse } from '../utils/pagination.js';
import { NotFoundError } from '../utils/errors.js';

const router = Router();
const prisma = new PrismaClient();

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
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/catalogue/antibiotics
 * Paginated list of antibiotics and medicines from the current published release.
 */
router.get('/antibiotics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, offset } = extractPagination(req);

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
      res.setHeader('Cache-Control', 'public, max-age=120');

      const paginated = formatPaginatedResponse(
        generics.map(g => ({
          id: g.id,
          genericName: g.genericName,
          antibioticClass: g.antibioticClass,
          awareGroup: g.awareGroup,
          clinicalSource: g.clinicalSource,
          referenceDosingGuidance: g.referenceDosingGuidance,
          ageConsiderations: g.ageConsiderations,
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
        disclaimer: 'Adult reference guidance only; patient dosing must be individualized by prescriber.',
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

    res.json(formatPaginatedResponse(list, total, { page, limit, offset }));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/catalogue/search
 * Fuzzy search across generic and brand names with candidate ranking and ambiguity detection.
 */
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      return res.json({
        query: '',
        candidates: [],
        confidence: 0,
        isAmbiguous: false,
      });
    }

    const result = await CatalogueMatcher.match(q, prisma);
    if (result.catalogueVersion) {
      res.setHeader('X-Catalogue-Version', result.catalogueVersion);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/catalogue/generics/:id
 * Retrieve specific generic detail with brands and clinical reference guidance.
 */
router.get('/generics/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
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
      referenceDosingGuidance: generic.referenceDosingGuidance,
      clinicalDisclaimer:
        'General adult reference information only. Patient-specific dosing and duration must be confirmed by a licensed prescriber based on patient clinical assessment, age, weight, and renal/hepatic function.',
      ageConsiderations: generic.ageConsiderations,
      sideEffects: generic.sideEffects,
      catalogueVersion: generic.catalogueRelease.version,
      brands: generic.brands,
    });
  } catch (err) {
    next(err);
  }
});

export const catalogueRouter = router;
