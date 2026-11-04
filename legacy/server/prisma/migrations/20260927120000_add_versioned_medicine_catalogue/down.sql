-- ====================================================================
-- Down Migration: 20260927120000_add_versioned_medicine_catalogue
-- WARNING: DESTRUCTIVE TEARDOWN - Drops versioned catalogue tables and data.
-- ====================================================================

DROP TABLE IF EXISTS "MedicineBrand" CASCADE;
DROP TABLE IF EXISTS "MedicineGeneric" CASCADE;
DROP TABLE IF EXISTS "CatalogueStagingBatch" CASCADE;
DROP TABLE IF EXISTS "CatalogueRelease" CASCADE;

ALTER TABLE "Antibiotic" DROP COLUMN IF EXISTS "catalogueVersion";

DROP TYPE IF EXISTS "StagingStatus";
DROP TYPE IF EXISTS "CatalogueReleaseStatus";
