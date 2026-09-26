-- Reversible Down Migration: Rollback 20260926100000_clinical_schema_evolution
-- Drops newly added tables in reverse topological order, preserving legacy data

DROP TABLE IF EXISTS "DispenseItem" CASCADE;
DROP TABLE IF EXISTS "DispenseRecord" CASCADE;
DROP TABLE IF EXISTS "IdempotencyRecord" CASCADE;
DROP TABLE IF EXISTS "ClinicalAlert" CASCADE;
DROP TABLE IF EXISTS "PrescriptionItem" CASCADE;
DROP TABLE IF EXISTS "Prescription" CASCADE;
DROP TABLE IF EXISTS "Consultation" CASCADE;
DROP TABLE IF EXISTS "ConsentGrant" CASCADE;
DROP TABLE IF EXISTS "CareRelationship" CASCADE;
DROP TABLE IF EXISTS "CaregiverAuthorization" CASCADE;
DROP TABLE IF EXISTS "PatientProfile" CASCADE;
DROP TABLE IF EXISTS "ClinicianCredential" CASCADE;
DROP TABLE IF EXISTS "PharmacistCredential" CASCADE;
DROP TABLE IF EXISTS "UserRoleAssignment" CASCADE;
DROP TABLE IF EXISTS "AuditEvent" CASCADE;
DROP TABLE IF EXISTS "Organization" CASCADE;

-- Revert columns on legacy tables
ALTER TABLE "PrescriptionScan" DROP COLUMN IF EXISTS "scanStatus";
ALTER TABLE "Antibiotic" DROP COLUMN IF EXISTS "awareCategory", DROP COLUMN IF EXISTS "whoListingUrl";
ALTER TABLE "User" DROP COLUMN IF EXISTS "phoneNumber",
                   DROP COLUMN IF EXISTS "passwordHash",
                   DROP COLUMN IF EXISTS "legacyRole",
                   DROP COLUMN IF EXISTS "isActive",
                   ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'patient';

-- Drop Enums
DROP TYPE IF EXISTS "AwareCategory" CASCADE;
DROP TYPE IF EXISTS "DispenseStatus" CASCADE;
DROP TYPE IF EXISTS "AlertType" CASCADE;
DROP TYPE IF EXISTS "AlertSeverity" CASCADE;
DROP TYPE IF EXISTS "PrescriptionStatus" CASCADE;
DROP TYPE IF EXISTS "ConsultationStatus" CASCADE;
DROP TYPE IF EXISTS "ConsentPurpose" CASCADE;
DROP TYPE IF EXISTS "ConsentStatus" CASCADE;
DROP TYPE IF EXISTS "CaregiverRelation" CASCADE;
DROP TYPE IF EXISTS "RelationshipType" CASCADE;
DROP TYPE IF EXISTS "VerificationStatus" CASCADE;
DROP TYPE IF EXISTS "OrganizationType" CASCADE;
DROP TYPE IF EXISTS "SystemRole" CASCADE;
