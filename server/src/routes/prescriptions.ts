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

const router = Router();

/**
 * Surface 2 & 3: Prescription Upload, Scan, and Retrieval with Object-Level Authorization.
 */
// Upload route
router.post('/upload', requireAuth, uploadMiddleware, uploadPrescription);

// Scan route (strict invariant: creates DRAFT_UNREVIEWED)
router.post('/scan', requireAuth, scanPrescription);

// Scoped Pharmacy Verification (Data Minimization: returns only items and prescriber credentials)
router.get('/verify/:token', requireAuth, requireVerifiedRole(['PHARMACY_STAFF', 'DOCTOR']), verifyPharmacyPrescriptionToken);

// Clinician Digital Signature
router.post('/:id/sign', requireAuth, requireVerifiedRole(['DOCTOR']), signPrescription);

// Object-authorized retrieval (Patient self-access, clinician with relationship/consent)
router.get('/:id', requireAuth, authorizePrescriptionRecordAccess, getScanResult);

export const prescriptionsRouter = router;
