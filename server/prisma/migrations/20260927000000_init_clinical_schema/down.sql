-- Reversible Down Migration: Rollback 20260927000000_init_clinical_schema
-- Confined exclusively to MedMinders objects in public schema.
-- NEVER modifies or drops auth, storage, realtime, vault, extensions, or the public schema itself.

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
DROP TABLE IF EXISTS "PrescriptionScan" CASCADE;
DROP TABLE IF EXISTS "PrescriptionUpload" CASCADE;
DROP TABLE IF EXISTS "Antibiotic" CASCADE;
DROP TABLE IF EXISTS "AuditEvent" CASCADE;
DROP TABLE IF EXISTS "Organization" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

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
