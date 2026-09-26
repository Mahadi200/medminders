import { Request, Response, NextFunction } from 'express';
import { getDataStore } from '../services/auth/dataStore.js';

export interface AuthorizationContext {
  userId: string;
  targetPatientId: string;
  userRoles: Array<{
    role: string;
    isVerified: boolean;
    organizationId?: string | null;
  }>;
}

/**
 * Core clinical object-level authorization decision engine.
 */
export async function evaluateClinicalAccess(ctx: AuthorizationContext): Promise<{
  allowed: boolean;
  status: number;
  reason?: string;
}> {
  const { userId, targetPatientId, userRoles } = ctx;
  const store = getDataStore();

  // Rule 1: Representative Denial
  // Representatives (e.g. pharmaceutical sales reps, non-clinical visitors) get ZERO clinical access.
  const isRepresentative = userRoles.some(r => r.role === 'REPRESENTATIVE');
  if (isRepresentative) {
    return {
      allowed: false,
      status: 403,
      reason: 'Forbidden: Representatives are strictly prohibited from accessing clinical records.',
    };
  }

  // Rule 2: Patient Ownership
  // A patient may access their own clinical records.
  if (userId === targetPatientId) {
    return { allowed: true, status: 200 };
  }

  // Rule 3: Pharmacy Staff Scope Limit
  // Pharmacy staff cannot browse or read full patient chart/consultations directly.
  const isPharmacyStaff = userRoles.some(r => r.role === 'PHARMACY_STAFF');
  if (isPharmacyStaff) {
    return {
      allowed: false,
      status: 403,
      reason: 'Forbidden: Pharmacy staff cannot view the full patient chart. Use the scoped verification endpoint /api/prescriptions/verify/:token.',
    };
  }

  // Rule 4: Clinician Access
  const doctorRole = userRoles.find(r => r.role === 'DOCTOR');
  if (doctorRole) {
    // 4a: Verification Gate
    if (!doctorRole.isVerified) {
      return {
        allowed: false,
        status: 403,
        reason: 'Forbidden: Clinician credentials pending verification. Unverified clinicians cannot access clinical records.',
      };
    }

    // 4b: Active Care Relationship
    const relationship = await store.getCareRelationship(userId, targetPatientId);
    if (relationship && relationship.isActive) {
      return { allowed: true, status: 200 };
    }

    // 4c: Explicit Patient Consent Grant
    const activeConsent = await store.getActiveConsent(targetPatientId, userId, 'CLINICAL_CARE');
    if (activeConsent) {
      return { allowed: true, status: 200 };
    }

    // Check if there was previously a consent that has been revoked or expired
    const allConsents = await store.getAllConsents(targetPatientId, userId);
    const revokedConsent = allConsents.find(c => c.status === 'REVOKED' || c.revokedAt !== null);
    if (revokedConsent) {
      return {
        allowed: false,
        status: 403,
        reason: 'Forbidden: Patient consent has been revoked.',
      };
    }

    const expiredConsent = allConsents.find(c => c.status === 'EXPIRED' || new Date(c.expiresAt) <= new Date());
    if (expiredConsent) {
      return {
        allowed: false,
        status: 403,
        reason: 'Forbidden: Patient consent has expired.',
      };
    }

    // No care relationship and no consent
    return {
      allowed: false,
      status: 403,
      reason: 'Forbidden: Access denied. No active care relationship or consent grant exists for this patient.',
    };
  }

  // Rule 5: Fallthrough Denial for Any Other Role
  return {
    allowed: false,
    status: 403,
    reason: 'Forbidden: Unauthorized to access this patient record.',
  };
}

/**
 * Middleware: Authorize access to prescription or scan record by ID.
 */
export async function authorizePrescriptionRecordAccess(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
  }

  const store = getDataStore();

  // Try finding prescription first
  const prescription = await store.getPrescription(id);
  let targetPatientId: string | null = null;

  if (prescription) {
    targetPatientId = prescription.patientId;
    (req as any).prescriptionRecord = prescription;
  } else {
    // Try finding scan
    const scan = await store.getPrescriptionScan(id);
    if (scan) {
      targetPatientId = scan.userId;
      (req as any).prescriptionScanRecord = scan;
    }
  }

  if (!targetPatientId) {
    return res.status(404).json({ error: 'Record not found.' });
  }

  const decision = await evaluateClinicalAccess({
    userId: user.id,
    targetPatientId,
    userRoles: user.roles || [],
  });

  if (!decision.allowed) {
    return res.status(decision.status).json({ error: decision.reason });
  }

  next();
}

/**
 * Middleware: Authorize streaming of uploaded clinical file.
 */
export async function authorizeFileStreamingAccess(req: Request, res: Response, next: NextFunction) {
  const { fileId } = req.params;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required to access file.' });
  }

  const store = getDataStore();
  const upload = await store.getPrescriptionUpload(fileId);

  if (!upload) {
    return res.status(404).json({ error: 'File record not found.' });
  }

  const decision = await evaluateClinicalAccess({
    userId: user.id,
    targetPatientId: upload.userId,
    userRoles: user.roles || [],
  });

  if (!decision.allowed) {
    return res.status(decision.status).json({ error: decision.reason });
  }

  (req as any).uploadRecord = upload;
  next();
}
