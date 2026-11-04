-- ====================================================================
-- Migration: 20260927120000_add_versioned_medicine_catalogue
-- Description: Normalized, versioned medicine and antibiotic catalogue
--              with staging imports, provenance tracking, and WHO AWaRe.
-- ====================================================================

-- 1. Add UNKNOWN to AwareCategory enum if not already present
ALTER TYPE "AwareCategory" ADD VALUE IF NOT EXISTS 'UNKNOWN';

-- 2. Create CatalogueReleaseStatus & StagingStatus enums
CREATE TYPE "CatalogueReleaseStatus" AS ENUM (
    'DRAFT_STAGING',
    'PENDING_REVIEW',
    'PUBLISHED',
    'SUPERSEDED',
    'REJECTED',
    'ARCHIVED'
);

CREATE TYPE "StagingStatus" AS ENUM (
    'PARSED',
    'VALIDATED',
    'DIFF_READY',
    'APPROVED',
    'REJECTED'
);

-- 3. Create CatalogueRelease table
CREATE TABLE "CatalogueRelease" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" "CatalogueReleaseStatus" NOT NULL DEFAULT 'DRAFT_STAGING',
    "description" TEXT,
    "source" TEXT NOT NULL,
    "sourceSha256" TEXT,
    "curatorUserId" TEXT,
    "curatorNotes" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogueRelease_pkey" PRIMARY KEY ("id")
);

-- 4. Create MedicineGeneric table
CREATE TABLE "MedicineGeneric" (
    "id" TEXT NOT NULL,
    "catalogueReleaseId" TEXT NOT NULL,
    "genericName" TEXT NOT NULL,
    "antibioticClass" TEXT,
    "isAntibiotic" BOOLEAN NOT NULL DEFAULT true,
    "awareGroup" "AwareCategory" NOT NULL DEFAULT 'UNCLASSIFIED',
    "clinicalSource" TEXT NOT NULL,
    "referenceDosingGuidance" TEXT,
    "ageConsiderations" TEXT,
    "sideEffects" TEXT,
    "reviewer" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicineGeneric_pkey" PRIMARY KEY ("id")
);

-- 5. Create MedicineBrand table
CREATE TABLE "MedicineBrand" (
    "id" TEXT NOT NULL,
    "genericId" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "normalizedBrandName" TEXT NOT NULL,
    "manufacturer" TEXT,
    "strength" TEXT DEFAULT 'UNKNOWN',
    "dosageForm" TEXT DEFAULT 'UNKNOWN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicineBrand_pkey" PRIMARY KEY ("id")
);

-- 6. Create CatalogueStagingBatch table
CREATE TABLE "CatalogueStagingBatch" (
    "id" TEXT NOT NULL,
    "catalogueReleaseId" TEXT,
    "uploadedByUserId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileSha256" TEXT NOT NULL,
    "status" "StagingStatus" NOT NULL DEFAULT 'PARSED',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "diffSummaryJson" TEXT,
    "validationErrorsJson" TEXT,
    "stagedDataJson" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogueStagingBatch_pkey" PRIMARY KEY ("id")
);

-- 7. Add catalogueVersion column to existing Antibiotic projection table
ALTER TABLE "Antibiotic" ADD COLUMN IF NOT EXISTS "catalogueVersion" TEXT DEFAULT 'unversioned_initial';

-- 8. Unique Constraints & Indexes
CREATE UNIQUE INDEX "CatalogueRelease_version_key" ON "CatalogueRelease"("version");
CREATE INDEX "CatalogueRelease_status_effectiveDate_idx" ON "CatalogueRelease"("status", "effectiveDate");

CREATE UNIQUE INDEX "MedicineGeneric_catalogueReleaseId_genericName_key" ON "MedicineGeneric"("catalogueReleaseId", "genericName");
CREATE INDEX "MedicineGeneric_genericName_idx" ON "MedicineGeneric"("genericName");
CREATE INDEX "MedicineGeneric_awareGroup_idx" ON "MedicineGeneric"("awareGroup");
CREATE INDEX "MedicineGeneric_catalogueReleaseId_idx" ON "MedicineGeneric"("catalogueReleaseId");

CREATE INDEX "MedicineBrand_brandName_idx" ON "MedicineBrand"("brandName");
CREATE INDEX "MedicineBrand_normalizedBrandName_idx" ON "MedicineBrand"("normalizedBrandName");
CREATE INDEX "MedicineBrand_genericId_idx" ON "MedicineBrand"("genericId");

CREATE INDEX "CatalogueStagingBatch_status_createdAt_idx" ON "CatalogueStagingBatch"("status", "createdAt");
CREATE INDEX "CatalogueStagingBatch_uploadedByUserId_idx" ON "CatalogueStagingBatch"("uploadedByUserId");

-- 9. Foreign Key Constraints
ALTER TABLE "CatalogueRelease" ADD CONSTRAINT "CatalogueRelease_curatorUserId_fkey" FOREIGN KEY ("curatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MedicineGeneric" ADD CONSTRAINT "MedicineGeneric_catalogueReleaseId_fkey" FOREIGN KEY ("catalogueReleaseId") REFERENCES "CatalogueRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MedicineBrand" ADD CONSTRAINT "MedicineBrand_genericId_fkey" FOREIGN KEY ("genericId") REFERENCES "MedicineGeneric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CatalogueStagingBatch" ADD CONSTRAINT "CatalogueStagingBatch_catalogueReleaseId_fkey" FOREIGN KEY ("catalogueReleaseId") REFERENCES "CatalogueRelease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CatalogueStagingBatch" ADD CONSTRAINT "CatalogueStagingBatch_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CatalogueStagingBatch" ADD CONSTRAINT "CatalogueStagingBatch_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
