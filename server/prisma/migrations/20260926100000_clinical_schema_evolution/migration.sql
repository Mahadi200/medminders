-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('PATIENT', 'CAREGIVER', 'DOCTOR', 'PHARMACIST', 'HOSPITAL_ADMIN', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('HOSPITAL', 'CLINIC', 'PHARMACY', 'DIAGNOSTIC');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('ATTENDING', 'CONSULTING', 'EMERGENCY_REFERRAL');

-- CreateEnum
CREATE TYPE "CaregiverRelation" AS ENUM ('PARENT', 'SPOUSE', 'CHILD', 'LEGAL_GUARDIAN');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ConsentPurpose" AS ENUM ('CLINICAL_CARE', 'DISPENSING', 'DIAGNOSTIC_REVIEW');

-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('DRAFT_UNREVIEWED', 'CLINICIAN_REVIEWED', 'SIGNED', 'DISPENSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('STEWARDSHIP', 'RED_FLAG', 'INTERACTION', 'ALLERGY');

-- CreateEnum
CREATE TYPE "DispenseStatus" AS ENUM ('PARTIAL', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AwareCategory" AS ENUM ('ACCESS', 'WATCH', 'RESERVE', 'UNCLASSIFIED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "regNumber" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "passwordHash" TEXT,
    "legacyRole" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRoleAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "role" "SystemRole" NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicianCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bmdcNumber" TEXT NOT NULL,
    "specialty" TEXT,
    "degrees" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicianCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmacistCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "pharmacyReg" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmacistCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "bloodGroup" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "allergiesJson" TEXT NOT NULL DEFAULT '[]',
    "chronicConditionsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareRelationship" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "organizationId" TEXT,
    "relationshipType" "RelationshipType" NOT NULL DEFAULT 'ATTENDING',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaregiverAuthorization" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "relationshipToPatient" "CaregiverRelation" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaregiverAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentGrant" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "granteeUserId" TEXT,
    "granteeOrganizationId" TEXT,
    "purpose" "ConsentPurpose" NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'ACTIVE',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revocationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consultation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "patientId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "chiefComplaint" TEXT,
    "diagnosisNotes" TEXT,
    "status" "ConsultationStatus" NOT NULL DEFAULT 'COMPLETED',
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consultation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionUpload" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrescriptionUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionScan" (
    "id" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ocrText" TEXT NOT NULL,
    "ocrConfidence" DOUBLE PRECISION,
    "medicinesJson" TEXT NOT NULL,
    "antibioticsJson" TEXT NOT NULL,
    "alertsJson" TEXT,
    "scanStatus" TEXT NOT NULL DEFAULT 'DRAFT_UNREVIEWED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrescriptionScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "consultationId" TEXT,
    "patientId" TEXT NOT NULL,
    "prescriberId" TEXT NOT NULL,
    "scanId" TEXT,
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'DRAFT_UNREVIEWED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousVersionId" TEXT,
    "isLatestVersion" BOOLEAN NOT NULL DEFAULT true,
    "signatureHash" TEXT,
    "signedAt" TIMESTAMP(3),
    "diagnosis" TEXT,
    "clinicalNotes" TEXT,
    "verificationToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionItem" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "medicineName" TEXT NOT NULL,
    "genericName" TEXT,
    "form" TEXT,
    "strength" TEXT,
    "frequency" TEXT,
    "duration" TEXT,
    "instructions" TEXT,
    "prescribedQuantity" INTEGER NOT NULL DEFAULT 1,
    "dispensedQuantity" INTEGER NOT NULL DEFAULT 0,
    "isAntibiotic" BOOLEAN NOT NULL DEFAULT false,
    "antibioticId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrescriptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalAlert" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT,
    "prescriptionScanId" TEXT,
    "alertType" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "messageBn" TEXT NOT NULL,
    "messageEn" TEXT NOT NULL,
    "sourceCitation" TEXT,
    "versionCode" TEXT,
    "isAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedByUserId" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispenseRecord" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "pharmacistId" TEXT NOT NULL,
    "dispenseStatus" "DispenseStatus" NOT NULL DEFAULT 'COMPLETED',
    "idempotencyKey" TEXT NOT NULL,
    "dispensedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispenseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispenseItem" (
    "id" TEXT NOT NULL,
    "dispenseRecordId" TEXT NOT NULL,
    "prescriptionItemId" TEXT NOT NULL,
    "quantityDispensed" INTEGER NOT NULL,
    "batchNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DispenseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "responseStatus" INTEGER,
    "responseBodyJson" TEXT,
    "lockedUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Antibiotic" (
    "id" TEXT NOT NULL,
    "genericName" TEXT NOT NULL,
    "group" TEXT,
    "brandNames" TEXT[],
    "companies" TEXT[],
    "ageConsiderations" TEXT,
    "doseDuration" TEXT,
    "sideEffects" TEXT,
    "awareCategory" "AwareCategory" NOT NULL DEFAULT 'UNCLASSIFIED',
    "whoListingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Antibiotic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "targetUserId" TEXT,
    "organizationId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadataJson" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_regNumber_key" ON "Organization"("regNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- CreateIndex
CREATE INDEX "UserRoleAssignment_userId_role_idx" ON "UserRoleAssignment"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "UserRoleAssignment_userId_role_organizationId_key" ON "UserRoleAssignment"("userId", "role", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicianCredential_userId_key" ON "ClinicianCredential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicianCredential_bmdcNumber_key" ON "ClinicianCredential"("bmdcNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacistCredential_userId_key" ON "PharmacistCredential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacistCredential_licenseNumber_key" ON "PharmacistCredential"("licenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PatientProfile_userId_key" ON "PatientProfile"("userId");

-- CreateIndex
CREATE INDEX "CareRelationship_patientId_isActive_idx" ON "CareRelationship"("patientId", "isActive");

-- CreateIndex
CREATE INDEX "CareRelationship_clinicianId_isActive_idx" ON "CareRelationship"("clinicianId", "isActive");

-- CreateIndex
CREATE INDEX "CaregiverAuthorization_caregiverId_isActive_idx" ON "CaregiverAuthorization"("caregiverId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CaregiverAuthorization_patientId_caregiverId_key" ON "CaregiverAuthorization"("patientId", "caregiverId");

-- CreateIndex
CREATE INDEX "ConsentGrant_patientId_status_expiresAt_idx" ON "ConsentGrant"("patientId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "ConsentGrant_granteeUserId_status_idx" ON "ConsentGrant"("granteeUserId", "status");

-- CreateIndex
CREATE INDEX "PrescriptionScan_userId_idx" ON "PrescriptionScan"("userId");

-- CreateIndex
CREATE INDEX "PrescriptionScan_uploadId_idx" ON "PrescriptionScan"("uploadId");

-- CreateIndex
CREATE UNIQUE INDEX "Prescription_verificationToken_key" ON "Prescription"("verificationToken");

-- CreateIndex
CREATE INDEX "Prescription_patientId_isLatestVersion_idx" ON "Prescription"("patientId", "isLatestVersion");

-- CreateIndex
CREATE INDEX "Prescription_verificationToken_idx" ON "Prescription"("verificationToken");

-- CreateIndex
CREATE INDEX "Prescription_organizationId_status_idx" ON "Prescription"("organizationId", "status");

-- CreateIndex
CREATE INDEX "PrescriptionItem_prescriptionId_idx" ON "PrescriptionItem"("prescriptionId");

-- CreateIndex
CREATE INDEX "ClinicalAlert_prescriptionId_idx" ON "ClinicalAlert"("prescriptionId");

-- CreateIndex
CREATE INDEX "ClinicalAlert_prescriptionScanId_idx" ON "ClinicalAlert"("prescriptionScanId");

-- CreateIndex
CREATE UNIQUE INDEX "DispenseRecord_idempotencyKey_key" ON "DispenseRecord"("idempotencyKey");

-- CreateIndex
CREATE INDEX "DispenseRecord_prescriptionId_idx" ON "DispenseRecord"("prescriptionId");

-- CreateIndex
CREATE INDEX "DispenseRecord_organizationId_idx" ON "DispenseRecord"("organizationId");

-- CreateIndex
CREATE INDEX "DispenseRecord_pharmacistId_idx" ON "DispenseRecord"("pharmacistId");

-- CreateIndex
CREATE INDEX "DispenseItem_dispenseRecordId_idx" ON "DispenseItem"("dispenseRecordId");

-- CreateIndex
CREATE INDEX "DispenseItem_prescriptionItemId_idx" ON "DispenseItem"("prescriptionItemId");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_lockedUntil_idx" ON "IdempotencyRecord"("lockedUntil");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_idempotencyKey_endpoint_key" ON "IdempotencyRecord"("idempotencyKey", "endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "Antibiotic_genericName_key" ON "Antibiotic"("genericName");

-- CreateIndex
CREATE INDEX "Antibiotic_genericName_idx" ON "Antibiotic"("genericName");

-- CreateIndex
CREATE INDEX "AuditEvent_occurredAt_idx" ON "AuditEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_actorUserId_idx" ON "AuditEvent"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditEvent_targetUserId_idx" ON "AuditEvent"("targetUserId");

-- CreateIndex
CREATE INDEX "AuditEvent_organizationId_occurredAt_idx" ON "AuditEvent"("organizationId", "occurredAt");

-- AddForeignKey
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicianCredential" ADD CONSTRAINT "ClinicianCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacistCredential" ADD CONSTRAINT "PharmacistCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientProfile" ADD CONSTRAINT "PatientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareRelationship" ADD CONSTRAINT "CareRelationship_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareRelationship" ADD CONSTRAINT "CareRelationship_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareRelationship" ADD CONSTRAINT "CareRelationship_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaregiverAuthorization" ADD CONSTRAINT "CaregiverAuthorization_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaregiverAuthorization" ADD CONSTRAINT "CaregiverAuthorization_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentGrant" ADD CONSTRAINT "ConsentGrant_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentGrant" ADD CONSTRAINT "ConsentGrant_granteeUserId_fkey" FOREIGN KEY ("granteeUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentGrant" ADD CONSTRAINT "ConsentGrant_granteeOrganizationId_fkey" FOREIGN KEY ("granteeOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionUpload" ADD CONSTRAINT "PrescriptionUpload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionScan" ADD CONSTRAINT "PrescriptionScan_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "PrescriptionUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionScan" ADD CONSTRAINT "PrescriptionScan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_prescriberId_fkey" FOREIGN KEY ("prescriberId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "PrescriptionScan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "Prescription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_antibioticId_fkey" FOREIGN KEY ("antibioticId") REFERENCES "Antibiotic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAlert" ADD CONSTRAINT "ClinicalAlert_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAlert" ADD CONSTRAINT "ClinicalAlert_prescriptionScanId_fkey" FOREIGN KEY ("prescriptionScanId") REFERENCES "PrescriptionScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispenseRecord" ADD CONSTRAINT "DispenseRecord_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispenseRecord" ADD CONSTRAINT "DispenseRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispenseRecord" ADD CONSTRAINT "DispenseRecord_pharmacistId_fkey" FOREIGN KEY ("pharmacistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispenseItem" ADD CONSTRAINT "DispenseItem_dispenseRecordId_fkey" FOREIGN KEY ("dispenseRecordId") REFERENCES "DispenseRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispenseItem" ADD CONSTRAINT "DispenseItem_prescriptionItemId_fkey" FOREIGN KEY ("prescriptionItemId") REFERENCES "PrescriptionItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Custom Database-Level Clinical Safety & Integrity Constraints
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT chk_prescribed_qty CHECK ("prescribedQuantity" > 0);
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT chk_dispensed_qty CHECK ("dispensedQuantity" >= 0 AND "dispensedQuantity" <= "prescribedQuantity");
ALTER TABLE "ConsentGrant" ADD CONSTRAINT chk_consent_revocation CHECK ("revokedAt" IS NULL OR "revokedAt" >= "grantedAt");
ALTER TABLE "Prescription" ADD CONSTRAINT chk_token_expiry CHECK ("tokenExpiresAt" IS NULL OR "tokenExpiresAt" >= "createdAt");
ALTER TABLE "DispenseItem" ADD CONSTRAINT chk_dispense_item_qty CHECK ("quantityDispensed" > 0);
