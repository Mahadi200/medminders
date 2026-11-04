import { PrismaClient } from '@prisma/client';
import { AuditService } from '../audit/auditService.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../../utils/errors.js';

export interface ClinicianReviewOptions {
  adminUserId: string;
  clinicianUserId: string;
  decision: 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
  evidenceNotes: string;
  evidenceDocumentUrl?: string;
  expiresAt?: Date;
}

export interface PharmacistReviewOptions {
  adminUserId: string;
  pharmacistUserId: string;
  decision: 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
  evidenceNotes: string;
  evidenceDocumentUrl?: string;
  expiresAt?: Date;
}

export interface OrganizationRegistrationOptions {
  adminUserId: string;
  name: string;
  type: 'HOSPITAL' | 'CLINIC' | 'PHARMACY' | 'DIAGNOSTIC';
  regNumber: string;
  address?: string;
  phone?: string;
  licenseEvidenceUrl?: string;
}

export interface StaffAffiliationOptions {
  adminUserId: string;
  userId: string;
  organizationId: string;
  role: 'DOCTOR' | 'PHARMACIST' | 'HOSPITAL_ADMIN' | 'SUPERADMIN' | 'CAREGIVER' | 'PATIENT';
  isVerified: boolean;
  notes?: string;
}

export class ProfessionalVerificationService {
  private static prisma = new PrismaClient();

  /**
   * Admin manual review and verification of Doctor BMDC credentials.
   * Invariant: Never auto-verify upon registration. Requires explicit human review with evidence.
   */
  static async reviewClinicianCredential(opts: ClinicianReviewOptions) {
    if (!opts.evidenceNotes || opts.evidenceNotes.trim().length < 5) {
      throw new ValidationError('Detailed evidence notes are required for professional verification review');
    }

    const cred = await this.prisma.clinicianCredential.findUnique({
      where: { userId: opts.clinicianUserId },
    });
    if (!cred) {
      throw new NotFoundError('Clinician credential record not found');
    }

    const now = new Date();
    const updated = await this.prisma.clinicianCredential.update({
      where: { userId: opts.clinicianUserId },
      data: {
        verificationStatus: opts.decision as any,
        verifiedAt: opts.decision === 'VERIFIED' ? now : null,
        verifiedBy: opts.adminUserId,
      },
    });

    // Also synchronize verified flag on the DOCTOR UserRoleAssignment
    await this.prisma.userRoleAssignment.updateMany({
      where: { userId: opts.clinicianUserId, role: 'DOCTOR' },
      data: {
        isVerified: opts.decision === 'VERIFIED',
        verifiedAt: opts.decision === 'VERIFIED' ? now : null,
        verifiedByUserId: opts.adminUserId,
      },
    });

    await AuditService.logEvent({
      actorUserId: opts.adminUserId,
      targetUserId: opts.clinicianUserId,
      action: `CLINICIAN_CREDENTIAL_${opts.decision}`,
      entityType: 'ClinicianCredential',
      entityId: cred.id,
      metadata: {
        bmdcNumber: cred.bmdcNumber,
        evidenceNotes: opts.evidenceNotes,
        evidenceDocumentUrl: opts.evidenceDocumentUrl,
        expiresAt: opts.expiresAt,
        reviewerId: opts.adminUserId,
      },
    });

    return updated;
  }

  /**
   * Admin manual review and verification of Pharmacist Council credentials.
   */
  static async reviewPharmacistCredential(opts: PharmacistReviewOptions) {
    if (!opts.evidenceNotes || opts.evidenceNotes.trim().length < 5) {
      throw new ValidationError('Detailed evidence notes are required for pharmacist verification review');
    }

    const cred = await this.prisma.pharmacistCredential.findUnique({
      where: { userId: opts.pharmacistUserId },
    });
    if (!cred) {
      throw new NotFoundError('Pharmacist credential record not found');
    }

    const now = new Date();
    const updated = await this.prisma.pharmacistCredential.update({
      where: { userId: opts.pharmacistUserId },
      data: {
        verificationStatus: opts.decision as any,
        verifiedAt: opts.decision === 'VERIFIED' ? now : null,
        verifiedBy: opts.adminUserId,
      },
    });

    await this.prisma.userRoleAssignment.updateMany({
      where: { userId: opts.pharmacistUserId, role: 'PHARMACIST' },
      data: {
        isVerified: opts.decision === 'VERIFIED',
        verifiedAt: opts.decision === 'VERIFIED' ? now : null,
        verifiedByUserId: opts.adminUserId,
      },
    });

    await AuditService.logEvent({
      actorUserId: opts.adminUserId,
      targetUserId: opts.pharmacistUserId,
      action: `PHARMACIST_CREDENTIAL_${opts.decision}`,
      entityType: 'PharmacistCredential',
      entityId: cred.id,
      metadata: {
        licenseNumber: cred.licenseNumber,
        evidenceNotes: opts.evidenceNotes,
        evidenceDocumentUrl: opts.evidenceDocumentUrl,
        expiresAt: opts.expiresAt,
        reviewerId: opts.adminUserId,
      },
    });

    return updated;
  }

  /**
   * Register a verified healthcare or pharmacy organization.
   */
  static async registerOrganization(opts: OrganizationRegistrationOptions) {
    const org = await this.prisma.organization.create({
      data: {
        name: opts.name,
        type: opts.type as any,
        regNumber: opts.regNumber,
        address: opts.address,
        phone: opts.phone,
        isActive: true,
      },
    });

    await AuditService.logEvent({
      actorUserId: opts.adminUserId,
      action: 'ORGANIZATION_REGISTERED',
      entityType: 'Organization',
      entityId: org.id,
      metadata: {
        name: org.name,
        type: org.type,
        regNumber: org.regNumber,
      },
    });

    return org;
  }

  /**
   * Associate staff member with hospital or pharmacy and assign verified role.
   */
  static async affiliateStaffMember(opts: StaffAffiliationOptions) {
    const org = await this.prisma.organization.findUnique({ where: { id: opts.organizationId } });
    if (!org) throw new NotFoundError('Target organization not found');

    const user = await this.prisma.user.findUnique({ where: { id: opts.userId } });
    if (!user) throw new NotFoundError('Target user not found');

    // Strict rule: REPRESENTATIVE role gets no clinical access
    const assignment = await this.prisma.userRoleAssignment.upsert({
      where: {
        userId_role_organizationId: {
          userId: opts.userId,
          role: opts.role as any,
          organizationId: opts.organizationId,
        },
      },
      update: {
        isVerified: opts.isVerified,
        verifiedAt: opts.isVerified ? new Date() : null,
        verifiedByUserId: opts.adminUserId,
      },
      create: {
        userId: opts.userId,
        organizationId: opts.organizationId,
        role: opts.role as any,
        isVerified: opts.isVerified,
        verifiedAt: opts.isVerified ? new Date() : null,
        verifiedByUserId: opts.adminUserId,
      },
    });

    await AuditService.logEvent({
      actorUserId: opts.adminUserId,
      targetUserId: opts.userId,
      organizationId: opts.organizationId,
      action: 'STAFF_AFFILIATION_CONFIGURED',
      entityType: 'UserRoleAssignment',
      entityId: assignment.id,
      metadata: {
        role: opts.role,
        isVerified: opts.isVerified,
        notes: opts.notes,
      },
    });

    return assignment;
  }
}
