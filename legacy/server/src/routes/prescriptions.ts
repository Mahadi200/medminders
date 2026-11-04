import { Router } from 'express';
import {
  uploadMiddleware,
  uploadPrescription,
  scanPrescription,
  getScanResult,
  verifyPharmacyPrescriptionToken,
  signPrescription,
} from '../controllers/prescriptionsController.js';
import { requireAuth, requireVerifiedRole } from '../middleware/authGuard.js';
import { authorizePrescriptionRecordAccess } from '../middleware/objectAuthorization.js';
import { uploadRateLimiter, scanRateLimiter } from '../middleware/rateLimiter.js';
import { validateRequest, prescriptionValidators } from '../middleware/validate.js';

const router = Router();

/**
 * Surface 2 & 3: Prescription Upload, Scan, and Retrieval with Object-Level Authorization,
 * rate limiting, and centralized validation.
 */
// Upload route
router.post('/upload', requireAuth, uploadRateLimiter.middleware(), uploadMiddleware, uploadPrescription);

// Scan route (strict invariant: creates DRAFT_UNREVIEWED)
router.post('/scan', requireAuth, scanRateLimiter.middleware(), validateRequest({ body: prescriptionValidators.scan }), scanPrescription);

// Scoped Pharmacy Verification (Data Minimization: returns only items and prescriber credentials)
router.get('/verify/:token', requireAuth, requireVerifiedRole(['PHARMACY_STAFF', 'PHARMACIST', 'DOCTOR']), verifyPharmacyPrescriptionToken);

// Clinician Digital Signature
router.post('/:id/sign', requireAuth, requireVerifiedRole(['DOCTOR']), validateRequest({ body: prescriptionValidators.sign }), signPrescription);

// Object-authorized retrieval (Patient self-access, clinician with relationship/consent)
router.get('/:id', requireAuth, authorizePrescriptionRecordAccess, getScanResult);

export const prescriptionsRouter = router;
