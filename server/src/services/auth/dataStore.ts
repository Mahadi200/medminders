import { PrismaClient } from '@prisma/client';
import { hashPassword, hashToken } from './cryptoUtils.js';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string | null;
  legacyRole: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface UserRoleAssignmentRecord {
  id: string;
  userId: string;
  role: string; // 'PATIENT' | 'DOCTOR' | 'PHARMACY_STAFF' | 'HOSPITAL_STAFF' | 'REPRESENTATIVE' | 'ADMIN'
  organizationId: string | null;
  isVerified: boolean;
  verifiedAt: Date | null;
}

export interface ClinicianCredentialRecord {
  id: string;
  userId: string;
  bmdcNumber: string;
  specialty: string | null;
  degrees: string | null;
  signingPublicKey: string | null;
  signingKeyId: string | null;
  verificationStatus: string; // 'PENDING' | 'VERIFIED' | 'REJECTED' | 'REVOKED'
}

export interface CareRelationshipRecord {
  id: string;
  patientId: string;
  clinicianId: string;
  organizationId: string | null;
  relationshipType: string;
  isActive: boolean;
  startedAt: Date;
  endedAt: Date | null;
}

export interface ConsentGrantRecord {
  id: string;
  patientId: string;
  granteeUserId: string | null;
  granteeOrganizationId: string | null;
  purpose: string; // 'CLINICAL_CARE' | 'DISPENSING' | 'DIAGNOSTIC_REVIEW'
  status: string; // 'ACTIVE' | 'REVOKED' | 'EXPIRED'
  grantedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revocationReason: string | null;
}

export interface PrescriptionRecord {
  id: string;
  patientId: string;
  prescriberId: string;
  organizationId: string | null;
  status: string; // 'DRAFT_UNREVIEWED' | 'CLINICIAN_REVIEWED' | 'SIGNED' | 'DISPENSED' | 'CANCELLED'
  version: number;
  isLatestVersion: boolean;
  diagnosis: string | null;
  clinicalNotes: string | null;
  verificationTokenHash: string | null;
  tokenExpiresAt: Date | null;
  tokenScope: string | null;
  isTokenRevoked: boolean;
  tokenRevokedAt: Date | null;
  signaturePayloadHash: string | null;
  signatureBytes: string | null;
  signingKeyId: string | null;
  signatureAlgorithm: string | null;
  signedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items?: PrescriptionItemRecord[];
}

export interface PrescriptionItemRecord {
  id: string;
  prescriptionId: string;
  medicineName: string;
  prescribedQuantity: number;
  dispensedQuantity: number;
  frequency: string | null;
  duration: string | null;
  form?: string | null;
  strength?: string | null;
}

export interface PrescriptionScanRecord {
  id: string;
  uploadId: string;
  userId: string;
  ocrText: string;
  ocrConfidence: number | null;
  medicinesJson: string;
  antibioticsJson: string;
  alertsJson: string | null;
  scanStatus: string; // Always defaults to 'DRAFT_UNREVIEWED'
  createdAt: Date;
}

export interface PrescriptionUploadRecord {
  id: string;
  userId: string;
  fileType: string;
  fileUrl: string;
  createdAt: Date;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
  rotatedAt: Date | null;
}

export interface IClinicalDataStore {
  // Users
  getUserById(id: string): Promise<UserRecord | null>;
  getUserByEmail(email: string): Promise<UserRecord | null>;
  createUser(user: { id: string; email: string; passwordHash: string; role?: string }): Promise<UserRecord>;

  // Roles & Credentials
  getUserRoles(userId: string): Promise<UserRoleAssignmentRecord[]>;
  assignRole(role: Omit<UserRoleAssignmentRecord, 'id'>): Promise<UserRoleAssignmentRecord>;
  getClinicianCredential(userId: string): Promise<ClinicianCredentialRecord | null>;

  // Relationships & Consents
  getCareRelationship(clinicianId: string, patientId: string): Promise<CareRelationshipRecord | null>;
  getActiveConsent(patientId: string, granteeUserId: string, purpose: string): Promise<ConsentGrantRecord | null>;
  getAllConsents(patientId: string, granteeUserId: string): Promise<ConsentGrantRecord[]>;

  // Prescriptions & Scans
  getPrescription(id: string): Promise<PrescriptionRecord | null>;
  getPrescriptionByTokenHash(tokenHash: string): Promise<PrescriptionRecord | null>;
  createPrescription(data: Omit<PrescriptionRecord, 'createdAt' | 'updatedAt'>): Promise<PrescriptionRecord>;
  getPrescriptionScan(id: string): Promise<PrescriptionScanRecord | null>;
  createPrescriptionScan(data: Omit<PrescriptionScanRecord, 'id' | 'createdAt'>): Promise<PrescriptionScanRecord>;
  getPrescriptionUpload(id: string): Promise<PrescriptionUploadRecord | null>;
  createPrescriptionUpload(data: Omit<PrescriptionUploadRecord, 'id' | 'createdAt'>): Promise<PrescriptionUploadRecord>;

  // Tokens & Sessions
  saveRefreshToken(token: Omit<RefreshTokenRecord, 'id' | 'createdAt'>): Promise<RefreshTokenRecord>;
  getRefreshTokenByHash(hash: string): Promise<RefreshTokenRecord | null>;
  revokeRefreshToken(hash: string): Promise<void>;
  revokeTokenFamily(familyId: string): Promise<void>;
}

// -------------------------------------------------------------
// Production Implementation: Fails Closed If Database Offline
// -------------------------------------------------------------
export class PrismaClinicalDataStore implements IClinicalDataStore {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async getUserById(id: string): Promise<UserRecord | null> {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) return null;
    return {
      id: u.id,
      email: u.email,
      passwordHash: u.passwordHash,
      legacyRole: u.legacyRole,
      isActive: u.isActive,
      createdAt: u.createdAt,
    };
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const u = await this.prisma.user.findUnique({ where: { email } });
    if (!u) return null;
    return {
      id: u.id,
      email: u.email,
      passwordHash: u.passwordHash,
      legacyRole: u.legacyRole,
      isActive: u.isActive,
      createdAt: u.createdAt,
    };
  }

  async createUser(user: { id: string; email: string; passwordHash: string; role?: string }): Promise<UserRecord> {
    const created = await this.prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        legacyRole: user.role || 'patient',
      },
    });
    return {
      id: created.id,
      email: created.email,
      passwordHash: created.passwordHash,
      legacyRole: created.legacyRole,
      isActive: created.isActive,
      createdAt: created.createdAt,
    };
  }

  async getUserRoles(userId: string): Promise<UserRoleAssignmentRecord[]> {
    const roles = await this.prisma.userRoleAssignment.findMany({ where: { userId } });
    return roles.map(r => ({
      id: r.id,
      userId: r.userId,
      role: r.role,
      organizationId: r.organizationId,
      isVerified: r.isVerified,
      verifiedAt: r.verifiedAt,
    }));
  }

  async assignRole(role: Omit<UserRoleAssignmentRecord, 'id'>): Promise<UserRoleAssignmentRecord> {
    const r = await this.prisma.userRoleAssignment.create({
      data: {
        userId: role.userId,
        role: role.role as any,
        organizationId: role.organizationId,
        isVerified: role.isVerified,
        verifiedAt: role.verifiedAt,
      },
    });
    return {
      id: r.id,
      userId: r.userId,
      role: r.role,
      organizationId: r.organizationId,
      isVerified: r.isVerified,
      verifiedAt: r.verifiedAt,
    };
  }

  async getClinicianCredential(userId: string): Promise<ClinicianCredentialRecord | null> {
    const c = await this.prisma.clinicianCredential.findUnique({ where: { userId } });
    if (!c) return null;
    return {
      id: c.id,
      userId: c.userId,
      bmdcNumber: c.bmdcNumber,
      specialty: c.specialty,
      degrees: c.degrees,
      signingPublicKey: c.signingPublicKey,
      signingKeyId: c.signingKeyId,
      verificationStatus: c.verificationStatus,
    };
  }

  async getCareRelationship(clinicianId: string, patientId: string): Promise<CareRelationshipRecord | null> {
    const rel = await this.prisma.careRelationship.findFirst({
      where: { clinicianId, patientId, isActive: true },
    });
    if (!rel) return null;
    return {
      id: rel.id,
      patientId: rel.patientId,
      clinicianId: rel.clinicianId,
      organizationId: rel.organizationId,
      relationshipType: rel.relationshipType,
      isActive: rel.isActive,
      startedAt: rel.startedAt,
      endedAt: rel.endedAt,
    };
  }

  async getActiveConsent(patientId: string, granteeUserId: string, purpose: string): Promise<ConsentGrantRecord | null> {
    const now = new Date();
    const consent = await this.prisma.consentGrant.findFirst({
      where: {
        patientId,
        granteeUserId,
        purpose: purpose as any,
        status: 'ACTIVE',
        expiresAt: { gt: now },
        revokedAt: null,
      },
    });
    if (!consent) return null;
    return {
      id: consent.id,
      patientId: consent.patientId,
      granteeUserId: consent.granteeUserId,
      granteeOrganizationId: consent.granteeOrganizationId,
      purpose: consent.purpose,
      status: consent.status,
      grantedAt: consent.grantedAt,
      expiresAt: consent.expiresAt,
      revokedAt: consent.revokedAt,
      revocationReason: consent.revocationReason,
    };
  }

  async getAllConsents(patientId: string, granteeUserId: string): Promise<ConsentGrantRecord[]> {
    const consents = await this.prisma.consentGrant.findMany({
      where: { patientId, granteeUserId },
      orderBy: { grantedAt: 'desc' },
    });
    return consents.map(c => ({
      id: c.id,
      patientId: c.patientId,
      granteeUserId: c.granteeUserId,
      granteeOrganizationId: c.granteeOrganizationId,
      purpose: c.purpose,
      status: c.status,
      grantedAt: c.grantedAt,
      expiresAt: c.expiresAt,
      revokedAt: c.revokedAt,
      revocationReason: c.revocationReason,
    }));
  }

  async getPrescription(id: string): Promise<PrescriptionRecord | null> {
    const rx = await this.prisma.prescription.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!rx) return null;
    return {
      id: rx.id,
      patientId: rx.patientId,
      prescriberId: rx.prescriberId,
      organizationId: rx.organizationId,
      status: rx.status,
      version: rx.version,
      isLatestVersion: rx.isLatestVersion,
      diagnosis: rx.diagnosis,
      clinicalNotes: rx.clinicalNotes,
      verificationTokenHash: rx.verificationTokenHash,
      tokenExpiresAt: rx.tokenExpiresAt,
      tokenScope: rx.tokenScope,
      isTokenRevoked: rx.isTokenRevoked,
      tokenRevokedAt: rx.tokenRevokedAt,
      signaturePayloadHash: rx.signaturePayloadHash,
      signatureBytes: rx.signatureBytes,
      signingKeyId: rx.signingKeyId,
      signatureAlgorithm: rx.signatureAlgorithm,
      signedAt: rx.signedAt,
      createdAt: rx.createdAt,
      updatedAt: rx.updatedAt,
      items: rx.items.map(i => ({
        id: i.id,
        prescriptionId: i.prescriptionId,
        medicineName: i.medicineName,
        prescribedQuantity: i.prescribedQuantity,
        dispensedQuantity: i.dispensedQuantity,
        frequency: i.frequency,
        duration: i.duration,
        form: i.form,
        strength: i.strength,
      })),
    };
  }

  async getPrescriptionByTokenHash(tokenHash: string): Promise<PrescriptionRecord | null> {
    const rx = await this.prisma.prescription.findUnique({
      where: { verificationTokenHash: tokenHash },
      include: { items: true },
    });
    if (!rx) return null;
    return {
      id: rx.id,
      patientId: rx.patientId,
      prescriberId: rx.prescriberId,
      organizationId: rx.organizationId,
      status: rx.status,
      version: rx.version,
      isLatestVersion: rx.isLatestVersion,
      diagnosis: rx.diagnosis,
      clinicalNotes: rx.clinicalNotes,
      verificationTokenHash: rx.verificationTokenHash,
      tokenExpiresAt: rx.tokenExpiresAt,
      tokenScope: rx.tokenScope,
      isTokenRevoked: rx.isTokenRevoked,
      tokenRevokedAt: rx.tokenRevokedAt,
      signaturePayloadHash: rx.signaturePayloadHash,
      signatureBytes: rx.signatureBytes,
      signingKeyId: rx.signingKeyId,
      signatureAlgorithm: rx.signatureAlgorithm,
      signedAt: rx.signedAt,
      createdAt: rx.createdAt,
      updatedAt: rx.updatedAt,
      items: rx.items.map(i => ({
        id: i.id,
        prescriptionId: i.prescriptionId,
        medicineName: i.medicineName,
        prescribedQuantity: i.prescribedQuantity,
        dispensedQuantity: i.dispensedQuantity,
        frequency: i.frequency,
        duration: i.duration,
        form: i.form,
        strength: i.strength,
      })),
    };
  }

  async createPrescription(data: Omit<PrescriptionRecord, 'createdAt' | 'updatedAt'>): Promise<PrescriptionRecord> {
    const rx = await this.prisma.prescription.create({
      data: {
        id: data.id,
        patientId: data.patientId,
        prescriberId: data.prescriberId,
        organizationId: data.organizationId,
        status: data.status as any,
        version: data.version,
        isLatestVersion: data.isLatestVersion,
        diagnosis: data.diagnosis,
        clinicalNotes: data.clinicalNotes,
        verificationTokenHash: data.verificationTokenHash,
        tokenExpiresAt: data.tokenExpiresAt,
        tokenScope: data.tokenScope,
        isTokenRevoked: data.isTokenRevoked,
        tokenRevokedAt: data.tokenRevokedAt,
        signaturePayloadHash: data.signaturePayloadHash,
        signatureBytes: data.signatureBytes,
        signingKeyId: data.signingKeyId,
        signatureAlgorithm: data.signatureAlgorithm,
        signedAt: data.signedAt,
      },
    });
    return {
      ...data,
      createdAt: rx.createdAt,
      updatedAt: rx.updatedAt,
    };
  }

  async getPrescriptionScan(id: string): Promise<PrescriptionScanRecord | null> {
    const scan = await this.prisma.prescriptionScan.findUnique({ where: { id } });
    if (!scan) return null;
    return {
      id: scan.id,
      uploadId: scan.uploadId,
      userId: scan.userId,
      ocrText: scan.ocrText,
      ocrConfidence: scan.ocrConfidence,
      medicinesJson: scan.medicinesJson,
      antibioticsJson: scan.antibioticsJson,
      alertsJson: scan.alertsJson,
      scanStatus: scan.scanStatus || 'DRAFT_UNREVIEWED',
      createdAt: scan.createdAt,
    };
  }

  async createPrescriptionScan(data: Omit<PrescriptionScanRecord, 'id' | 'createdAt'>): Promise<PrescriptionScanRecord> {
    const scan = await this.prisma.prescriptionScan.create({
      data: {
        uploadId: data.uploadId,
        userId: data.userId,
        ocrText: data.ocrText,
        ocrConfidence: data.ocrConfidence,
        medicinesJson: data.medicinesJson,
        antibioticsJson: data.antibioticsJson,
        alertsJson: data.alertsJson,
        scanStatus: 'DRAFT_UNREVIEWED', // Guaranteed default
      },
    });
    return {
      id: scan.id,
      uploadId: scan.uploadId,
      userId: scan.userId,
      ocrText: scan.ocrText,
      ocrConfidence: scan.ocrConfidence,
      medicinesJson: scan.medicinesJson,
      antibioticsJson: scan.antibioticsJson,
      alertsJson: scan.alertsJson,
      scanStatus: scan.scanStatus,
      createdAt: scan.createdAt,
    };
  }

  async getPrescriptionUpload(id: string): Promise<PrescriptionUploadRecord | null> {
    const up = await this.prisma.prescriptionUpload.findUnique({ where: { id } });
    if (!up) return null;
    return {
      id: up.id,
      userId: up.userId,
      fileType: up.fileType,
      fileUrl: up.fileUrl,
      createdAt: up.createdAt,
    };
  }

  async createPrescriptionUpload(data: Omit<PrescriptionUploadRecord, 'id' | 'createdAt'>): Promise<PrescriptionUploadRecord> {
    const up = await this.prisma.prescriptionUpload.create({
      data: {
        userId: data.userId,
        fileType: data.fileType,
        fileUrl: data.fileUrl,
      },
    });
    return {
      id: up.id,
      userId: up.userId,
      fileType: up.fileType,
      fileUrl: up.fileUrl,
      createdAt: up.createdAt,
    };
  }

  async saveRefreshToken(token: Omit<RefreshTokenRecord, 'id' | 'createdAt'>): Promise<RefreshTokenRecord> {
    const payload = {
      userId: token.userId,
      familyId: token.familyId,
      isRevoked: token.isRevoked,
      expiresAt: token.expiresAt.toISOString(),
      rotatedAt: token.rotatedAt ? token.rotatedAt.toISOString() : null,
    };

    const record = await this.prisma.idempotencyRecord.upsert({
      where: {
        idempotencyKey_endpoint: {
          idempotencyKey: token.tokenHash,
          endpoint: 'AUTH_SESSION',
        },
      },
      update: {
        requestHash: token.familyId,
        responseStatus: token.isRevoked ? 1 : 0,
        responseBodyJson: JSON.stringify(payload),
        lockedUntil: token.expiresAt,
      },
      create: {
        idempotencyKey: token.tokenHash,
        endpoint: 'AUTH_SESSION',
        requestHash: token.familyId,
        responseStatus: token.isRevoked ? 1 : 0,
        responseBodyJson: JSON.stringify(payload),
        lockedUntil: token.expiresAt,
      },
    });

    return {
      id: record.id,
      userId: token.userId,
      tokenHash: token.tokenHash,
      familyId: token.familyId,
      isRevoked: token.isRevoked,
      expiresAt: token.expiresAt,
      createdAt: record.createdAt,
      rotatedAt: token.rotatedAt,
    };
  }

  async getRefreshTokenByHash(hash: string): Promise<RefreshTokenRecord | null> {
    const record = await this.prisma.idempotencyRecord.findUnique({
      where: {
        idempotencyKey_endpoint: {
          idempotencyKey: hash,
          endpoint: 'AUTH_SESSION',
        },
      },
    });

    if (!record || !record.responseBodyJson) return null;

    try {
      const data = JSON.parse(record.responseBodyJson);
      return {
        id: record.id,
        userId: data.userId,
        tokenHash: record.idempotencyKey,
        familyId: record.requestHash || data.familyId,
        isRevoked: record.responseStatus === 1 || data.isRevoked === true,
        expiresAt: new Date(record.lockedUntil),
        createdAt: record.createdAt,
        rotatedAt: data.rotatedAt ? new Date(data.rotatedAt) : null,
      };
    } catch {
      return null;
    }
  }

  async revokeRefreshToken(hash: string): Promise<void> {
    const record = await this.prisma.idempotencyRecord.findUnique({
      where: {
        idempotencyKey_endpoint: {
          idempotencyKey: hash,
          endpoint: 'AUTH_SESSION',
        },
      },
    });

    if (record && record.responseBodyJson) {
      let data: any = {};
      try { data = JSON.parse(record.responseBodyJson); } catch {}
      data.isRevoked = true;
      data.rotatedAt = new Date().toISOString();

      await this.prisma.idempotencyRecord.update({
        where: { id: record.id },
        data: {
          responseStatus: 1, // Revoked
          responseBodyJson: JSON.stringify(data),
        },
      });
    }
  }

  async revokeTokenFamily(familyId: string): Promise<void> {
    const records = await this.prisma.idempotencyRecord.findMany({
      where: {
        endpoint: 'AUTH_SESSION',
        requestHash: familyId,
      },
    });

    for (const rec of records) {
      let data: any = {};
      try { data = JSON.parse(rec.responseBodyJson || '{}'); } catch {}
      data.isRevoked = true;
      data.rotatedAt = new Date().toISOString();

      await this.prisma.idempotencyRecord.update({
        where: { id: rec.id },
        data: {
          responseStatus: 1,
          responseBodyJson: JSON.stringify(data),
        },
      });
    }
  }
}

// -------------------------------------------------------------
// Test / Simulation Implementation: Explicitly Marked
// -------------------------------------------------------------
/**
 * SIMULATED TEST STORAGE - NEVER ACTIVE IN PRODUCTION
 * 
 * Provides an in-memory repository for unit and integration testing
 * of authorization rules, token rotations, and role checks when
 * an isolated live PostgreSQL database is pending.
 */
export class InMemoryClinicalDataStore implements IClinicalDataStore {
  public users = new Map<string, UserRecord>();
  public roles = new Map<string, UserRoleAssignmentRecord[]>();
  public credentials = new Map<string, ClinicianCredentialRecord>();
  public relationships = new Map<string, CareRelationshipRecord[]>();
  public consents = new Map<string, ConsentGrantRecord[]>();
  public prescriptions = new Map<string, PrescriptionRecord>();
  public scans = new Map<string, PrescriptionScanRecord>();
  public uploads = new Map<string, PrescriptionUploadRecord>();
  public refreshTokens = new Map<string, RefreshTokenRecord>();

  constructor() {
    this.seedDefaultFixtures();
  }

  public seedDefaultFixtures() {
    // Clear existing
    this.users.clear();
    this.roles.clear();
    this.credentials.clear();
    this.relationships.clear();
    this.consents.clear();
    this.prescriptions.clear();
    this.scans.clear();
    this.uploads.clear();
    this.refreshTokens.clear();

    const testPasswordHash = hashPassword('TestSecurePass!2026');

    // 1. Patient A
    this.users.set('user_patient_a', {
      id: 'user_patient_a',
      email: 'patient_a@test.local',
      passwordHash: testPasswordHash,
      legacyRole: 'patient',
      isActive: true,
      createdAt: new Date(),
    });
    this.roles.set('user_patient_a', [
      {
        id: 'role_pt_a',
        userId: 'user_patient_a',
        role: 'PATIENT',
        organizationId: 'org_dhaka_1',
        isVerified: true,
        verifiedAt: new Date(),
      },
    ]);

    // 2. Patient B
    this.users.set('user_patient_b', {
      id: 'user_patient_b',
      email: 'patient_b@test.local',
      passwordHash: testPasswordHash,
      legacyRole: 'patient',
      isActive: true,
      createdAt: new Date(),
    });
    this.roles.set('user_patient_b', [
      {
        id: 'role_pt_b',
        userId: 'user_patient_b',
        role: 'PATIENT',
        organizationId: 'org_dhaka_1',
        isVerified: true,
        verifiedAt: new Date(),
      },
    ]);

    // 3. Dr. Attending (Verified Doctor with active CareRelationship to Patient A)
    this.users.set('user_doc_verified_rel', {
      id: 'user_doc_verified_rel',
      email: 'dr_attending@test.local',
      passwordHash: testPasswordHash,
      legacyRole: 'doctor',
      isActive: true,
      createdAt: new Date(),
    });
    this.roles.set('user_doc_verified_rel', [
      {
        id: 'role_doc_attending',
        userId: 'user_doc_verified_rel',
        role: 'DOCTOR',
        organizationId: 'org_dhaka_1',
        isVerified: true,
        verifiedAt: new Date(),
      },
    ]);
    this.credentials.set('user_doc_verified_rel', {
      id: 'cred_doc_attending',
      userId: 'user_doc_verified_rel',
      bmdcNumber: 'BMDC-DOC-1001',
      specialty: 'Internal Medicine',
      degrees: 'MBBS, FCPS',
      signingPublicKey: 'TEST_SPKI_KEY_DOC_1',
      signingKeyId: 'key_doc_1',
      verificationStatus: 'VERIFIED',
    });
    this.relationships.set('user_doc_verified_rel:user_patient_a', [
      {
        id: 'rel_doc_pt_a',
        patientId: 'user_patient_a',
        clinicianId: 'user_doc_verified_rel',
        organizationId: 'org_dhaka_1',
        relationshipType: 'ATTENDING',
        isActive: true,
        startedAt: new Date(),
        endedAt: null,
      },
    ]);

    // 4. Dr. Consulting (Verified Doctor with active ConsentGrant from Patient A)
    this.users.set('user_doc_verified_consent', {
      id: 'user_doc_verified_consent',
      email: 'dr_consulting@test.local',
      passwordHash: testPasswordHash,
      legacyRole: 'doctor',
      isActive: true,
      createdAt: new Date(),
    });
    this.roles.set('user_doc_verified_consent', [
      {
        id: 'role_doc_consulting',
        userId: 'user_doc_verified_consent',
        role: 'DOCTOR',
        organizationId: 'org_dhaka_1',
        isVerified: true,
        verifiedAt: new Date(),
      },
    ]);
    this.credentials.set('user_doc_verified_consent', {
      id: 'cred_doc_consulting',
      userId: 'user_doc_verified_consent',
      bmdcNumber: 'BMDC-DOC-1002',
      specialty: 'Pulmonology',
      degrees: 'MBBS, MD',
      signingPublicKey: 'TEST_SPKI_KEY_DOC_2',
      signingKeyId: 'key_doc_2',
      verificationStatus: 'VERIFIED',
    });
    this.consents.set('user_patient_a:user_doc_verified_consent', [
      {
        id: 'consent_active_pt_a_doc_2',
        patientId: 'user_patient_a',
        granteeUserId: 'user_doc_verified_consent',
        granteeOrganizationId: 'org_dhaka_1',
        purpose: 'CLINICAL_CARE',
        status: 'ACTIVE',
        grantedAt: new Date(Date.now() - 3600 * 1000),
        expiresAt: new Date(Date.now() + 86400 * 1000 * 30), // 30 days future
        revokedAt: null,
        revocationReason: null,
      },
    ]);

    // 5. Dr. Unverified (Doctor with pending BMDC verification)
    this.users.set('user_doc_unverified', {
      id: 'user_doc_unverified',
      email: 'dr_unverified@test.local',
      passwordHash: testPasswordHash,
      legacyRole: 'doctor',
      isActive: true,
      createdAt: new Date(),
    });
    this.roles.set('user_doc_unverified', [
      {
        id: 'role_doc_unverified',
        userId: 'user_doc_unverified',
        role: 'DOCTOR',
        organizationId: 'org_dhaka_1',
        isVerified: false, // Unverified!
        verifiedAt: null,
      },
    ]);
    this.credentials.set('user_doc_unverified', {
      id: 'cred_doc_unverified',
      userId: 'user_doc_unverified',
      bmdcNumber: 'BMDC-PENDING-9999',
      specialty: 'General Practice',
      degrees: 'MBBS',
      signingPublicKey: null,
      signingKeyId: null,
      verificationStatus: 'PENDING',
    });

    // 6. Dr. Revoked (Doctor with revoked consent from Patient A)
    this.users.set('user_doc_revoked_consent', {
      id: 'user_doc_revoked_consent',
      email: 'dr_revoked@test.local',
      passwordHash: testPasswordHash,
      legacyRole: 'doctor',
      isActive: true,
      createdAt: new Date(),
    });
    this.roles.set('user_doc_revoked_consent', [
      {
        id: 'role_doc_revoked',
        userId: 'user_doc_revoked_consent',
        role: 'DOCTOR',
        organizationId: 'org_dhaka_1',
        isVerified: true,
        verifiedAt: new Date(),
      },
    ]);
    this.consents.set('user_patient_a:user_doc_revoked_consent', [
      {
        id: 'consent_revoked_doc',
        patientId: 'user_patient_a',
        granteeUserId: 'user_doc_revoked_consent',
        granteeOrganizationId: 'org_dhaka_1',
        purpose: 'CLINICAL_CARE',
        status: 'REVOKED',
        grantedAt: new Date(Date.now() - 7200 * 1000),
        expiresAt: new Date(Date.now() + 86400 * 1000 * 30),
        revokedAt: new Date(Date.now() - 1800 * 1000), // Revoked 30 mins ago
        revocationReason: 'Patient requested revocation',
      },
    ]);

    // 7. Dr. Expired (Doctor with expired consent from Patient A)
    this.users.set('user_doc_expired_consent', {
      id: 'user_doc_expired_consent',
      email: 'dr_expired@test.local',
      passwordHash: testPasswordHash,
      legacyRole: 'doctor',
      isActive: true,
      createdAt: new Date(),
    });
    this.roles.set('user_doc_expired_consent', [
      {
        id: 'role_doc_expired',
        userId: 'user_doc_expired_consent',
        role: 'DOCTOR',
        organizationId: 'org_dhaka_1',
        isVerified: true,
        verifiedAt: new Date(),
      },
    ]);
    this.consents.set('user_patient_a:user_doc_expired_consent', [
      {
        id: 'consent_expired_doc',
        patientId: 'user_patient_a',
        granteeUserId: 'user_doc_expired_consent',
        granteeOrganizationId: 'org_dhaka_1',
        purpose: 'CLINICAL_CARE',
        status: 'EXPIRED',
        grantedAt: new Date(Date.now() - 86400 * 1000 * 60), // 60 days ago
        expiresAt: new Date(Date.now() - 86400 * 1000 * 30), // Expired 30 days ago
        revokedAt: null,
        revocationReason: null,
      },
    ]);

    // 8. Dr. CrossOrg (Doctor from Org Chittagong with NO relationship or consent)
    this.users.set('user_doc_cross_org', {
      id: 'user_doc_cross_org',
      email: 'dr_cross_org@test.local',
      passwordHash: testPasswordHash,
      legacyRole: 'doctor',
      isActive: true,
      createdAt: new Date(),
    });
    this.roles.set('user_doc_cross_org', [
      {
        id: 'role_doc_cross_org',
        userId: 'user_doc_cross_org',
        role: 'DOCTOR',
        organizationId: 'org_chittagong_2',
        isVerified: true,
        verifiedAt: new Date(),
      },
    ]);

    // 9. Pharmacy Staff
    this.users.set('user_pharmacy_staff', {
      id: 'user_pharmacy_staff',
      email: 'pharmacy@test.local',
      passwordHash: testPasswordHash,
      legacyRole: 'pharmacist',
      isActive: true,
      createdAt: new Date(),
    });
    this.roles.set('user_pharmacy_staff', [
      {
        id: 'role_pharmacy',
        userId: 'user_pharmacy_staff',
        role: 'PHARMACY_STAFF',
        organizationId: 'org_dhaka_pharmacy_1',
        isVerified: true,
        verifiedAt: new Date(),
      },
    ]);

    // 10. Representative (Pharmaceutical sales or non-clinical rep - ZERO clinical access)
    this.users.set('user_representative', {
      id: 'user_representative',
      email: 'rep@pharma.local',
      passwordHash: testPasswordHash,
      legacyRole: 'representative',
      isActive: true,
      createdAt: new Date(),
    });
    this.roles.set('user_representative', [
      {
        id: 'role_representative',
        userId: 'user_representative',
        role: 'REPRESENTATIVE',
        organizationId: 'org_pharma_corp',
        isVerified: true,
        verifiedAt: new Date(),
      },
    ]);

    // Prescriptions
    const rawQrToken = 'secret_rx_token_pt_a_001';
    const rxTokenHash = hashToken(rawQrToken);

    this.prescriptions.set('rx_patient_a_1', {
      id: 'rx_patient_a_1',
      patientId: 'user_patient_a',
      prescriberId: 'user_doc_verified_rel',
      organizationId: 'org_dhaka_1',
      status: 'SIGNED',
      version: 1,
      isLatestVersion: true,
      diagnosis: 'Acute bacterial tonsillitis',
      clinicalNotes: 'Sensitive confidential clinical examination note.',
      verificationTokenHash: rxTokenHash,
      tokenExpiresAt: new Date(Date.now() + 86400 * 1000 * 14), // 14 days valid
      tokenScope: 'PHARMACY_DISPENSE',
      isTokenRevoked: false,
      tokenRevokedAt: null,
      signaturePayloadHash: 'hash_payload_123',
      signatureBytes: 'test_ecdsa_sig_base64',
      signingKeyId: 'key_doc_1',
      signatureAlgorithm: 'ES256',
      signedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [
        {
          id: 'item_rx_a_1',
          prescriptionId: 'rx_patient_a_1',
          medicineName: 'Amoxicillin 500mg',
          prescribedQuantity: 15,
          dispensedQuantity: 0,
          frequency: '1+0+1',
          duration: '5 days',
          strength: '500mg',
        },
      ],
    });

    this.prescriptions.set('rx_patient_b_1', {
      id: 'rx_patient_b_1',
      patientId: 'user_patient_b',
      prescriberId: 'user_doc_verified_rel',
      organizationId: 'org_dhaka_1',
      status: 'SIGNED',
      version: 1,
      isLatestVersion: true,
      diagnosis: 'Hypertension Stage 1',
      clinicalNotes: 'Patient B confidential clinical notes.',
      verificationTokenHash: hashToken('secret_rx_token_pt_b_001'),
      tokenExpiresAt: new Date(Date.now() + 86400 * 1000 * 14),
      tokenScope: 'PHARMACY_DISPENSE',
      isTokenRevoked: false,
      tokenRevokedAt: null,
      signaturePayloadHash: 'hash_payload_b_123',
      signatureBytes: 'test_ecdsa_sig_b_base64',
      signingKeyId: 'key_doc_1',
      signatureAlgorithm: 'ES256',
      signedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [
        {
          id: 'item_rx_b_1',
          prescriptionId: 'rx_patient_b_1',
          medicineName: 'Amlodipine 5mg',
          prescribedQuantity: 30,
          dispensedQuantity: 0,
          frequency: '0+0+1',
          duration: '30 days',
          strength: '5mg',
        },
      ],
    });

    // Scans (Ensuring scanStatus is strictly DRAFT_UNREVIEWED)
    this.scans.set('scan_patient_a_1', {
      id: 'scan_patient_a_1',
      uploadId: 'upload_patient_a_1',
      userId: 'user_patient_a',
      ocrText: 'Amoxicillin 500mg 1+0+1 5 days',
      ocrConfidence: 0.94,
      medicinesJson: JSON.stringify([{ medicine_name: 'Amoxicillin', strength: '500mg' }]),
      antibioticsJson: JSON.stringify([{ medicine: 'Amoxicillin', antibiotic: 'Amoxicillin' }]),
      alertsJson: JSON.stringify({ disclaimer: 'Educational info only.' }),
      scanStatus: 'DRAFT_UNREVIEWED',
      createdAt: new Date(),
    });

    this.scans.set('scan_patient_b_1', {
      id: 'scan_patient_b_1',
      uploadId: 'upload_patient_b_1',
      userId: 'user_patient_b',
      ocrText: 'Amlodipine 5mg',
      ocrConfidence: 0.96,
      medicinesJson: JSON.stringify([{ medicine_name: 'Amlodipine', strength: '5mg' }]),
      antibioticsJson: JSON.stringify([]),
      alertsJson: JSON.stringify({ disclaimer: 'Educational info only.' }),
      scanStatus: 'DRAFT_UNREVIEWED',
      createdAt: new Date(),
    });

    // Uploads
    this.uploads.set('upload_patient_a_1', {
      id: 'upload_patient_a_1',
      userId: 'user_patient_a',
      fileType: 'image',
      fileUrl: '/api/files/upload_patient_a_1',
      createdAt: new Date(),
    });

    this.uploads.set('upload_patient_b_1', {
      id: 'upload_patient_b_1',
      userId: 'user_patient_b',
      fileType: 'image',
      fileUrl: '/api/files/upload_patient_b_1',
      createdAt: new Date(),
    });
  }

  async getUserById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) || null;
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) return u;
    }
    return null;
  }

  async createUser(user: { id: string; email: string; passwordHash: string; role?: string }): Promise<UserRecord> {
    const record: UserRecord = {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      legacyRole: user.role || 'patient',
      isActive: true,
      createdAt: new Date(),
    };
    this.users.set(user.id, record);
    return record;
  }

  async getUserRoles(userId: string): Promise<UserRoleAssignmentRecord[]> {
    return this.roles.get(userId) || [];
  }

  async assignRole(role: Omit<UserRoleAssignmentRecord, 'id'>): Promise<UserRoleAssignmentRecord> {
    const rec: UserRoleAssignmentRecord = {
      ...role,
      id: `role_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    const existing = this.roles.get(role.userId) || [];
    existing.push(rec);
    this.roles.set(role.userId, existing);
    return rec;
  }

  async getClinicianCredential(userId: string): Promise<ClinicianCredentialRecord | null> {
    return this.credentials.get(userId) || null;
  }

  async getCareRelationship(clinicianId: string, patientId: string): Promise<CareRelationshipRecord | null> {
    const key = `${clinicianId}:${patientId}`;
    const rels = this.relationships.get(key) || [];
    const active = rels.find(r => r.isActive);
    return active || null;
  }

  async getActiveConsent(patientId: string, granteeUserId: string, purpose: string): Promise<ConsentGrantRecord | null> {
    const key = `${patientId}:${granteeUserId}`;
    const list = this.consents.get(key) || [];
    const now = new Date();
    const active = list.find(
      c => c.purpose === purpose && c.status === 'ACTIVE' && c.expiresAt > now && !c.revokedAt
    );
    return active || null;
  }

  async getAllConsents(patientId: string, granteeUserId: string): Promise<ConsentGrantRecord[]> {
    const key = `${patientId}:${granteeUserId}`;
    return this.consents.get(key) || [];
  }

  async getPrescription(id: string): Promise<PrescriptionRecord | null> {
    return this.prescriptions.get(id) || null;
  }

  async getPrescriptionByTokenHash(tokenHash: string): Promise<PrescriptionRecord | null> {
    for (const rx of this.prescriptions.values()) {
      if (rx.verificationTokenHash === tokenHash) return rx;
    }
    return null;
  }

  async createPrescription(data: Omit<PrescriptionRecord, 'createdAt' | 'updatedAt'>): Promise<PrescriptionRecord> {
    const rec: PrescriptionRecord = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.prescriptions.set(data.id, rec);
    return rec;
  }

  async getPrescriptionScan(id: string): Promise<PrescriptionScanRecord | null> {
    return this.scans.get(id) || null;
  }

  async createPrescriptionScan(data: Omit<PrescriptionScanRecord, 'id' | 'createdAt'>): Promise<PrescriptionScanRecord> {
    const rec: PrescriptionScanRecord = {
      ...data,
      id: `scan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      scanStatus: 'DRAFT_UNREVIEWED', // Guaranteed default
      createdAt: new Date(),
    };
    this.scans.set(rec.id, rec);
    return rec;
  }

  async getPrescriptionUpload(id: string): Promise<PrescriptionUploadRecord | null> {
    return this.uploads.get(id) || null;
  }

  async createPrescriptionUpload(data: Omit<PrescriptionUploadRecord, 'id' | 'createdAt'>): Promise<PrescriptionUploadRecord> {
    const rec: PrescriptionUploadRecord = {
      ...data,
      id: `upload_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date(),
    };
    this.uploads.set(rec.id, rec);
    return rec;
  }

  async saveRefreshToken(token: Omit<RefreshTokenRecord, 'id' | 'createdAt'>): Promise<RefreshTokenRecord> {
    const rec: RefreshTokenRecord = {
      ...token,
      id: `tok_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date(),
    };
    this.refreshTokens.set(token.tokenHash, rec);
    return rec;
  }

  async getRefreshTokenByHash(hash: string): Promise<RefreshTokenRecord | null> {
    return this.refreshTokens.get(hash) || null;
  }

  async revokeRefreshToken(hash: string): Promise<void> {
    const tok = this.refreshTokens.get(hash);
    if (tok) {
      tok.isRevoked = true;
      tok.rotatedAt = new Date();
    }
  }

  async revokeTokenFamily(familyId: string): Promise<void> {
    for (const tok of this.refreshTokens.values()) {
      if (tok.familyId === familyId) {
        tok.isRevoked = true;
        tok.rotatedAt = new Date();
      }
    }
  }
}

// Global data store singleton
let storeInstance: IClinicalDataStore;

export function getDataStore(): IClinicalDataStore {
  if (!storeInstance) {
    if (
      (process.env.NODE_ENV === 'production' || process.env.USE_REAL_POSTGRES === 'true') &&
      process.env.USE_SIMULATED_STORE !== 'true'
    ) {
      storeInstance = new PrismaClinicalDataStore();
    } else {
      storeInstance = new InMemoryClinicalDataStore();
    }
  }
  return storeInstance;
}

export function setTestDataStore(store: IClinicalDataStore) {
  storeInstance = store;
}

export function resetDataStore(): void {
  storeInstance = undefined as any;
}
