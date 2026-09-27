import crypto from 'crypto';
import * as XLSX from 'xlsx';
import { PrismaClient, AwareCategory } from '@prisma/client';
import { AuditService } from '../audit/auditService.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';

const prisma = new PrismaClient();

const BENGALI_HEADERS: Record<string, string> = {
  'জেনেরিক নাম': 'genericName',
  'গ্রুপ (শ্রেণিবিভাগ)': 'group',
  'কমার্শিয়াল নাম (উদাহরণ)': 'brandNames',
  'কোম্পানি (উদাহরণ)': 'companies',
  'ব্যবহারের ক্ষেত্রে প্রধান বয়সসীমা ও বিবেচনা': 'ageConsiderations',
  'Dose & Duration (ডোজ ও সময়কাল)': 'doseDuration',
  'Dose & Duration (ডোজ ও সময়কাল)': 'doseDuration',
  'Side Effects (সাইড ইফেক্ট)': 'sideEffects',
};

const ALTERNATE_HEADERS: Record<string, string> = {
  'generic': 'genericName',
  'generic name': 'genericName',
  'group': 'group',
  'class': 'group',
  'brand': 'brandNames',
  'brand name': 'brandNames',
  'brands': 'brandNames',
  'company': 'companies',
  'manufacturer': 'companies',
  'age': 'ageConsiderations',
  'dose': 'doseDuration',
  'duration': 'doseDuration',
  'side effects': 'sideEffects',
  'aware': 'awareCategory',
  'aware group': 'awareCategory',
};

// Known WHO AWaRe Classifications
const KNOWN_AWARE_MAP: Record<string, AwareCategory> = {
  'amoxicillin': AwareCategory.ACCESS,
  'amoxicillin + clavulanic acid': AwareCategory.ACCESS,
  'ampicillin': AwareCategory.ACCESS,
  'doxycycline': AwareCategory.ACCESS,
  'cephalexin': AwareCategory.ACCESS,
  'ceftriaxone': AwareCategory.WATCH,
  'cefixime': AwareCategory.WATCH,
  'cefuroxime': AwareCategory.WATCH,
  'azithromycin': AwareCategory.WATCH,
  'ciprofloxacin': AwareCategory.WATCH,
  'levofloxacin': AwareCategory.WATCH,
  'moxifloxacin': AwareCategory.WATCH,
  'cefepime': AwareCategory.WATCH,
  'piperacillin + tazobactam': AwareCategory.WATCH,
  'meropenem': AwareCategory.WATCH,
  'imipenem + cilastatin': AwareCategory.WATCH,
  'vancomycin': AwareCategory.WATCH,
  'linezolid': AwareCategory.RESERVE,
  'colistin (polymyxin e)': AwareCategory.RESERVE,
  'colistin': AwareCategory.RESERVE,
  'polymyxin b': AwareCategory.RESERVE,
};

export interface StagedGenericRow {
  genericName: string;
  antibioticClass?: string;
  awareGroup: AwareCategory;
  clinicalSource: string;
  referenceDosingGuidance?: string;
  ageConsiderations?: string;
  sideEffects?: string;
  brands: Array<{
    brandName: string;
    normalizedBrandName: string;
    manufacturer?: string;
    strength: string;
    dosageForm: string;
  }>;
}

export interface StagingDiffSummary {
  newGenericsCount: number;
  newGenerics: string[];
  existingGenericsCount: number;
  newBrandsCount: number;
  totalStagedGenerics: number;
  totalStagedBrands: number;
  conflictingBrands: Array<{
    brandName: string;
    existingGeneric: string;
    stagedGeneric: string;
  }>;
}

export interface StagingResult {
  batchId: string;
  filename: string;
  fileSha256: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  diffSummary: StagingDiffSummary;
  errors: string[];
  requiresCuratorApproval: boolean;
}

function parseValue(val: unknown): string {
  if (val == null || val === '') return '';
  return String(val).trim();
}

function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^\w\s\u0980-\u09FF]/g, '').replace(/\s+/g, ' ').trim();
}

export class CatalogueImportService {
  /**
   * Stage an uploaded XLSX spreadsheet for curation and review.
   * Forward-fills only within contiguous group blocks.
   * Validates rows, checks brand conflicts, and generates diff without modifying published data.
   */
  static async stageXlsx(opts: {
    buffer: Buffer;
    filename: string;
    uploadedByUserId: string;
    defaultSource?: string;
  }): Promise<StagingResult> {
    const { buffer, filename, uploadedByUserId } = opts;
    const fileSha256 = crypto.createHash('sha256').update(buffer).digest('hex');

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    if (!workbook.SheetNames.length) {
      throw new ValidationError('Uploaded workbook contains no sheets');
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    if (!rawRows.length) {
      throw new ValidationError('Spreadsheet sheet is empty');
    }

    const errors: string[] = [];
    const genericsMap = new Map<string, StagedGenericRow>();
    const brandToGenericMap = new Map<string, string>(); // Staged brand collision detection
    const conflictingBrands: StagingDiffSummary['conflictingBrands'] = [];

    // Fetch published brands from active release to detect cross-version brand collisions
    const activeRelease = await prisma.catalogueRelease.findFirst({
      where: { status: 'PUBLISHED' },
      include: {
        generics: {
          include: { brands: true },
        },
      },
      orderBy: { effectiveDate: 'desc' },
    });

    const publishedBrandMap = new Map<string, string>(); // normalizedBrand -> genericName
    if (activeRelease) {
      for (const g of activeRelease.generics) {
        for (const b of g.brands) {
          publishedBrandMap.set(b.normalizedBrandName, g.genericName);
        }
      }
    }

    let lastGeneric = '';
    let lastGroup = '';
    let lastAge = '';
    let lastDose = '';
    let lastSide = '';
    let validRowCount = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const headers = Object.keys(row);
      const mapped: Record<string, string> = {};

      for (const h of headers) {
        const norm = h.trim().toLowerCase();
        const val = parseValue(row[h]);
        if (BENGALI_HEADERS[h]) {
          mapped[BENGALI_HEADERS[h]] = val;
        } else if (ALTERNATE_HEADERS[norm]) {
          mapped[ALTERNATE_HEADERS[norm]] = val;
        }
      }

      // Detect empty spacer rows
      const hasAnyValue = Object.values(mapped).some(v => v.length > 0);
      if (!hasAnyValue) {
        // Reset forward fill context on empty blank line
        lastGeneric = '';
        lastGroup = '';
        lastAge = '';
        lastDose = '';
        lastSide = '';
        continue;
      }

      // Permitted forward-fill logic: only fill if brand exists under preceding generic
      let genericName = mapped.genericName;
      if (!genericName && mapped.brandNames && lastGeneric) {
        genericName = lastGeneric;
      }

      if (!genericName) {
        errors.push(`Row ${i + 2}: Missing generic medicine name`);
        continue;
      }

      // Update forward fill memory if a generic was explicitly given
      if (mapped.genericName) {
        lastGeneric = mapped.genericName;
        lastGroup = mapped.group || '';
        lastAge = mapped.ageConsiderations || '';
        lastDose = mapped.doseDuration || '';
        lastSide = mapped.sideEffects || '';
      }

      const antibioticClass = mapped.group || lastGroup || 'UNCLASSIFIED';
      const ageConsiderations = mapped.ageConsiderations || lastAge || undefined;
      const rawDoseDuration = mapped.doseDuration || lastDose || undefined;
      const sideEffects = mapped.sideEffects || lastSide || undefined;

      // Determine WHO AWaRe classification
      const normGen = normalizeKey(genericName);
      let awareGroup: AwareCategory = AwareCategory.UNCLASSIFIED;
      if (mapped.awareCategory) {
        const up = mapped.awareCategory.toUpperCase();
        if (Object.values(AwareCategory).includes(up as AwareCategory)) {
          awareGroup = up as AwareCategory;
        } else {
          awareGroup = AwareCategory.UNKNOWN;
        }
      } else if (KNOWN_AWARE_MAP[normGen]) {
        awareGroup = KNOWN_AWARE_MAP[normGen];
      }

      // Ensure reference guidance is explicitly NOT clinical prescription instruction
      let referenceDosingGuidance = rawDoseDuration;
      if (referenceDosingGuidance && !referenceDosingGuidance.includes('General adult reference')) {
        referenceDosingGuidance = `${referenceDosingGuidance} [General adult reference only; patient dosing must be individualized by prescriber]`;
      }

      // Parse brand names and manufacturers
      const rawBrands = mapped.brandNames ? mapped.brandNames.split(/[,;\/\|]+/).map(s => s.trim()).filter(Boolean) : [];
      const rawCompanies = mapped.companies ? mapped.companies.split(/[,;\/\|]+/).map(s => s.trim()).filter(Boolean) : [];

      if (!genericsMap.has(genericName)) {
        genericsMap.set(genericName, {
          genericName,
          antibioticClass,
          awareGroup,
          clinicalSource: opts.defaultSource || 'WHO AWaRe 2023 / antibiotic_dose.xlsx',
          referenceDosingGuidance,
          ageConsiderations,
          sideEffects,
          brands: [],
        });
      }

      const genericRecord = genericsMap.get(genericName)!;

      // Extract brands with manufacturer association
      for (let bIdx = 0; bIdx < rawBrands.length; bIdx++) {
        const brandName = rawBrands[bIdx];
        const manufacturer = rawCompanies[bIdx] || rawCompanies[0] || undefined;
        const normBrand = normalizeKey(brandName);

        // Check 1: Conflict within current staging batch
        const priorGeneric = brandToGenericMap.get(normBrand);
        if (priorGeneric && priorGeneric !== genericName) {
          errors.push(`Row ${i + 2}: Conflicting brand '${brandName}' assigned to both '${priorGeneric}' and '${genericName}'`);
          conflictingBrands.push({
            brandName,
            existingGeneric: priorGeneric,
            stagedGeneric: genericName,
          });
        } else {
          brandToGenericMap.set(normBrand, genericName);
        }

        // Check 2: Conflict against published catalogue
        const publishedGeneric = publishedBrandMap.get(normBrand);
        if (publishedGeneric && publishedGeneric !== genericName) {
          conflictingBrands.push({
            brandName,
            existingGeneric: publishedGeneric,
            stagedGeneric: genericName,
          });
        }

        // Prevent duplicate brand entries within the same generic
        if (!genericRecord.brands.some(b => b.normalizedBrandName === normBrand)) {
          genericRecord.brands.push({
            brandName,
            normalizedBrandName: normBrand,
            manufacturer,
            strength: 'UNKNOWN', // Spreadsheet does not specify discrete brand strength
            dosageForm: 'UNKNOWN',
          });
        }
      }

      validRowCount++;
    }

    // Compute diff against active published release
    const stagedGenerics = Array.from(genericsMap.values());
    const publishedGenericNames = new Set(activeRelease?.generics.map(g => g.genericName) || []);

    const newGenerics = stagedGenerics
      .filter(g => !publishedGenericNames.has(g.genericName))
      .map(g => g.genericName);

    const totalStagedBrands = stagedGenerics.reduce((acc, g) => acc + g.brands.length, 0);

    const diffSummary: StagingDiffSummary = {
      newGenericsCount: newGenerics.length,
      newGenerics,
      existingGenericsCount: stagedGenerics.length - newGenerics.length,
      newBrandsCount: stagedGenerics.reduce((acc, g) => {
        return acc + g.brands.filter(b => !publishedBrandMap.has(b.normalizedBrandName)).length;
      }, 0),
      totalStagedGenerics: stagedGenerics.length,
      totalStagedBrands,
      conflictingBrands,
    };

    // Save Staging Batch record in PostgreSQL
    const stagingBatch = await prisma.catalogueStagingBatch.create({
      data: {
        uploadedByUserId,
        filename,
        fileSha256,
        status: 'DIFF_READY',
        totalRows: rawRows.length,
        validRows: validRowCount,
        errorRows: errors.length,
        diffSummaryJson: JSON.stringify(diffSummary),
        validationErrorsJson: JSON.stringify(errors),
        stagedDataJson: JSON.stringify(stagedGenerics),
      },
    });

    await AuditService.logEvent({
      actorUserId: uploadedByUserId,
      action: 'CATALOGUE_IMPORT_STAGED',
      entityType: 'CatalogueStagingBatch',
      entityId: stagingBatch.id,
      metadata: {
        filename,
        totalRows: rawRows.length,
        validRows: validRowCount,
        errorRows: errors.length,
        newGenericsCount: diffSummary.newGenericsCount,
      },
    });

    return {
      batchId: stagingBatch.id,
      filename,
      fileSha256,
      totalRows: rawRows.length,
      validRows: validRowCount,
      errorRows: errors.length,
      diffSummary,
      errors,
      requiresCuratorApproval: true,
    };
  }

  /**
   * Retrieve details and diff for a staged batch.
   */
  static async getStagingBatch(batchId: string) {
    const batch = await prisma.catalogueStagingBatch.findUnique({
      where: { id: batchId },
      include: { uploadedBy: true, reviewedBy: true },
    });
    if (!batch) throw new NotFoundError('Staging batch not found');

    return {
      ...batch,
      diffSummary: batch.diffSummaryJson ? JSON.parse(batch.diffSummaryJson) : null,
      validationErrors: batch.validationErrorsJson ? JSON.parse(batch.validationErrorsJson) : [],
      stagedData: batch.stagedDataJson ? JSON.parse(batch.stagedDataJson) : [],
    };
  }

  /**
   * Approve a staged batch and publish a new immutable versioned catalogue.
   * Supersedes previous active release without erasing history.
   */
  static async approveAndPublish(opts: {
    batchId: string;
    curatorUserId: string;
    version: string;
    curatorNotes?: string;
    effectiveDate?: Date;
  }) {
    const { batchId, curatorUserId, version, curatorNotes, effectiveDate = new Date() } = opts;

    if (!version || !/^v?\d+\.\d+\.\d+$/i.test(version.trim())) {
      throw new ValidationError('Valid semantic version code is required (e.g. v1.0.0, 1.2.0)');
    }
    const cleanVersion = version.trim().startsWith('v') ? version.trim() : `v${version.trim()}`;

    const batch = await prisma.catalogueStagingBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new NotFoundError('Staging batch not found');
    if (batch.status === 'APPROVED') {
      throw new ValidationError('Staging batch has already been approved and published');
    }
    if (batch.status === 'REJECTED') {
      throw new ValidationError('Cannot publish a rejected staging batch');
    }
    if (!batch.stagedDataJson) {
      throw new ValidationError('Staging batch contains no staged data');
    }

    const stagedGenerics: StagedGenericRow[] = JSON.parse(batch.stagedDataJson);

    // Execute publication in transaction
    const release = await prisma.$transaction(async (tx) => {
      // 1. Mark existing published release as SUPERSEDED
      await tx.catalogueRelease.updateMany({
        where: { status: 'PUBLISHED' },
        data: {
          status: 'SUPERSEDED',
          supersededAt: new Date(),
        },
      });

      // 2. Create new PUBLISHED CatalogueRelease
      const newRelease = await tx.catalogueRelease.create({
        data: {
          version: cleanVersion,
          status: 'PUBLISHED',
          source: `Import from ${batch.filename} (SHA256: ${batch.fileSha256.slice(0, 12)})`,
          sourceSha256: batch.fileSha256,
          curatorUserId,
          curatorNotes: curatorNotes || 'Reviewed and approved by authorized medical curator.',
          effectiveDate,
          publishedAt: new Date(),
        },
      });

      // 3. Create normalized MedicineGeneric & MedicineBrand rows
      for (const gen of stagedGenerics) {
        const createdGeneric = await tx.medicineGeneric.create({
          data: {
            catalogueReleaseId: newRelease.id,
            genericName: gen.genericName,
            antibioticClass: gen.antibioticClass,
            isAntibiotic: true,
            awareGroup: gen.awareGroup,
            clinicalSource: gen.clinicalSource,
            referenceDosingGuidance: gen.referenceDosingGuidance,
            ageConsiderations: gen.ageConsiderations,
            sideEffects: gen.sideEffects,
            reviewer: curatorUserId,
            effectiveDate,
            brands: {
              create: gen.brands.map(b => ({
                brandName: b.brandName,
                normalizedBrandName: b.normalizedBrandName,
                manufacturer: b.manufacturer,
                strength: b.strength,
                dosageForm: b.dosageForm,
              })),
            },
          },
        });

        // 4. Synchronize projection to Antibiotic table for backwards compatibility
        const brandNames = gen.brands.map(b => b.brandName);
        const companies = Array.from(new Set(gen.brands.map(b => b.manufacturer).filter(Boolean))) as string[];

        await tx.antibiotic.upsert({
          where: { genericName: gen.genericName },
          update: {
            group: gen.antibioticClass,
            brandNames,
            companies,
            ageConsiderations: gen.ageConsiderations,
            doseDuration: gen.referenceDosingGuidance,
            sideEffects: gen.sideEffects,
            awareCategory: gen.awareGroup,
            catalogueVersion: cleanVersion,
          },
          create: {
            genericName: gen.genericName,
            group: gen.antibioticClass,
            brandNames,
            companies,
            ageConsiderations: gen.ageConsiderations,
            doseDuration: gen.referenceDosingGuidance,
            sideEffects: gen.sideEffects,
            awareCategory: gen.awareGroup,
            catalogueVersion: cleanVersion,
          },
        });
      }

      // 5. Update batch status to APPROVED
      await tx.catalogueStagingBatch.update({
        where: { id: batchId },
        data: {
          status: 'APPROVED',
          catalogueReleaseId: newRelease.id,
          reviewedByUserId: curatorUserId,
          reviewedAt: new Date(),
          reviewNotes: curatorNotes,
        },
      });

      return newRelease;
    }, { maxWait: 15000, timeout: 60000 });

    await AuditService.logEvent({
      actorUserId: curatorUserId,
      action: 'CATALOGUE_VERSION_PUBLISHED',
      entityType: 'CatalogueRelease',
      entityId: release.id,
      metadata: {
        version: release.version,
        genericsCount: stagedGenerics.length,
        curatorNotes,
      },
      failClosed: true,
    });

    return release;
  }

  /**
   * Reject a staged batch.
   */
  static async rejectStagingBatch(batchId: string, reviewerUserId: string, rejectionReason: string) {
    if (!rejectionReason || rejectionReason.trim().length < 5) {
      throw new ValidationError('A detailed rejection reason is required');
    }

    const batch = await prisma.catalogueStagingBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new NotFoundError('Staging batch not found');

    const updated = await prisma.catalogueStagingBatch.update({
      where: { id: batchId },
      data: {
        status: 'REJECTED',
        reviewedByUserId: reviewerUserId,
        reviewedAt: new Date(),
        reviewNotes: rejectionReason,
      },
    });

    await AuditService.logEvent({
      actorUserId: reviewerUserId,
      action: 'CATALOGUE_IMPORT_REJECTED',
      entityType: 'CatalogueStagingBatch',
      entityId: batchId,
      metadata: { rejectionReason },
    });

    return updated;
  }

  /**
   * Roll back to an earlier catalogue release version without erasing history.
   */
  static async rollbackToVersion(targetReleaseId: string, curatorUserId: string, reason: string) {
    if (!reason || reason.trim().length < 5) {
      throw new ValidationError('Reason for version rollback is required');
    }

    const targetRelease = await prisma.catalogueRelease.findUnique({
      where: { id: targetReleaseId },
      include: {
        generics: {
          include: { brands: true },
        },
      },
    });

    if (!targetRelease) throw new NotFoundError('Target catalogue release not found');

    const updatedRelease = await prisma.$transaction(async (tx) => {
      // 1. Mark current active published as SUPERSEDED
      await tx.catalogueRelease.updateMany({
        where: { status: 'PUBLISHED' },
        data: {
          status: 'SUPERSEDED',
          supersededAt: new Date(),
        },
      });

      // 2. Set target release to PUBLISHED
      const updated = await tx.catalogueRelease.update({
        where: { id: targetRelease.id },
        data: {
          status: 'PUBLISHED',
          curatorNotes: `Rolled back to this version by ${curatorUserId}. Reason: ${reason}`,
          updatedAt: new Date(),
        },
      });

      // 3. Resync projection table
      for (const gen of targetRelease.generics) {
        const brandNames = gen.brands.map(b => b.brandName);
        const companies = Array.from(new Set(gen.brands.map(b => b.manufacturer).filter(Boolean))) as string[];

        await tx.antibiotic.upsert({
          where: { genericName: gen.genericName },
          update: {
            group: gen.antibioticClass,
            brandNames,
            companies,
            ageConsiderations: gen.ageConsiderations,
            doseDuration: gen.referenceDosingGuidance,
            sideEffects: gen.sideEffects,
            awareCategory: gen.awareGroup,
            catalogueVersion: targetRelease.version,
          },
          create: {
            genericName: gen.genericName,
            group: gen.antibioticClass,
            brandNames,
            companies,
            ageConsiderations: gen.ageConsiderations,
            doseDuration: gen.referenceDosingGuidance,
            sideEffects: gen.sideEffects,
            awareCategory: gen.awareGroup,
            catalogueVersion: targetRelease.version,
          },
        });
      }

      return updated;
    }, { maxWait: 15000, timeout: 60000 });

    await AuditService.logEvent({
      actorUserId: curatorUserId,
      action: 'CATALOGUE_VERSION_ROLLED_BACK',
      entityType: 'CatalogueRelease',
      entityId: targetRelease.id,
      metadata: {
        targetVersion: targetRelease.version,
        reason,
      },
      failClosed: true,
    });

    return updatedRelease;
  }
}
