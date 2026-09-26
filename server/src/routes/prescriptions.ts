import { Router } from 'express';
import {
  uploadMiddleware,
  uploadPrescription,
  scanPrescription,
  getScanResult,
} from '../controllers/prescriptionsController.js';
import { requireAuth } from '../middleware/authGuard.js';

const router = Router();

/**
 * Surface 2 & 3: Prescription Upload, Scan, and Retrieval.
 * FAIL-CLOSED: Authentication required on all prescription routes.
 * Anonymous requests and demo-patient requests are denied with 401 Unauthorized.
 */
router.post('/upload', requireAuth, uploadMiddleware, uploadPrescription);
router.post('/scan', requireAuth, scanPrescription);
router.get('/:id', requireAuth, getScanResult);

export const prescriptionsRouter = router;
