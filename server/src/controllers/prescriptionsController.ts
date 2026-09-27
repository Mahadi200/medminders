import { Request, Response } from 'express';
import multer from 'multer';
import { performOcr } from '../services/ocr/index.js';
import { parseMedicineText } from '../services/parser/medicineParser.js';
import { matchAntibiotic } from '../services/antibiotics/matcher.js';
import { checkInteractions } from '../services/safety/interactions.js';
import { detectRedFlags } from '../services/safety/redFlags.js';
import { getStewardshipWarnings } from '../services/safety/stewardship.js';
import { saveFile, getFileUrl, readFileFromStorage } from '../services/storage.js';
import { getDataStore } from '../services/auth/dataStore.js';
import { hashToken } from '../services/auth/cryptoUtils.js';

const ALLOWED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/webp',
  'application/pdf',
];
const MAX_SIZE = parseInt(process.env.MAX_UPLOAD_MB || '10', 10) * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`));
  },
});

export const uploadMiddleware = upload.single('file');

/**
 * POST /api/prescriptions/upload
 * Requires authenticated session. Sets patientId to authenticated patient ID.
 */
export async function uploadPrescription(req: Request, res: Response) {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const userId = req.user?.id;
    if (!userId || userId === 'demo-patient' || req.body.userId === 'demo-patient') {
      return res.status(401).json({
        error: 'Unauthorized: Valid authenticated patient session required. Demo patient access is disabled.',
      });
    }

    const store = getDataStore();
    const ext = file.originalname.split('.').pop() || 'bin';
    const { relativeUrl } = saveFile(file.buffer, ext);
    const fullUrl = getFileUrl(relativeUrl);

    const uploadRecord = await store.createPrescriptionUpload({
      userId,
      fileType: file.mimetype.startsWith('image/') ? 'image' : 'pdf',
      fileUrl: fullUrl,
    });

    res.json({
      id: uploadRecord.id,
      fileUrl: uploadRecord.fileUrl,
      fileType: uploadRecord.fileType,
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Upload failed' });
  }
}

/**
 * POST /api/prescriptions/scan
 * OCR Pipeline with strict clinical safety: scans are ALWAYS created as DRAFT_UNREVIEWED.
 */
export async function scanPrescription(req: Request, res: Response) {
  try {
    const { uploadId, ocrText: manualOcrText, medicines: manualMedicines } = req.body;
    const userId = req.user?.id;
    if (!userId || userId === 'demo-patient' || req.body.userId === 'demo-patient') {
      return res.status(401).json({
        error: 'Unauthorized: Valid authenticated patient session required. Demo patient access is disabled.',
      });
    }

    if (!uploadId) return res.status(400).json({ error: 'uploadId required' });

    const store = getDataStore();
    const upload = await store.getPrescriptionUpload(uploadId);
    if (!upload) return res.status(404).json({ error: 'Upload not found' });

    // Object authorization: User scanning must own the upload or be authorized clinician
    if (upload.userId !== userId && !req.user?.roles.some(r => r.role === 'DOCTOR')) {
      return res.status(403).json({ error: 'Forbidden: You cannot scan an upload belonging to another user.' });
    }

    let ocrText: string;
    let ocrConfidence: number;
    let medicines: Awaited<ReturnType<typeof parseMedicineText>>;

    if (Array.isArray(manualMedicines) && manualMedicines.length > 0) {
      medicines = manualMedicines;
      ocrText = manualOcrText || medicines.map(m => m.raw_line).join('\n');
      ocrConfidence = 0.95;
    } else if (manualOcrText && typeof manualOcrText === 'string') {
      ocrText = manualOcrText;
      ocrConfidence = 0.95;
      medicines = parseMedicineText(ocrText);
    } else {
      let buffer: Buffer;
      try {
        buffer = readFileFromStorage(upload.fileUrl);
      } catch {
        buffer = Buffer.from(await (await fetch(upload.fileUrl)).arrayBuffer());
      }
      const contentType = upload.fileType === 'pdf' ? 'application/pdf' : 'image/jpeg';
      const result = await performOcr(buffer, contentType);
      ocrText = result.text;
      ocrConfidence = result.confidence;
      medicines = parseMedicineText(ocrText);
    }

    const antibioticMatches = await Promise.all(
      medicines.map(async m => ({
        medicine: m,
        match: await matchAntibiotic(m.medicine_name),
      }))
    );

    const antibiotics = antibioticMatches
      .filter(a => a.match?.match || (a.match?.candidates && a.match.candidates.length > 0))
      .map(a => ({
        medicine: a.medicine,
        antibiotic: a.match?.match || null,
        confidence: a.match?.confidence ?? 0,
        matched_on: a.match?.matched_on || null,
        isAmbiguous: Boolean(a.match?.isAmbiguous),
        ambiguityReason: a.match?.ambiguityReason || null,
        candidates: a.match?.candidates || [],
        catalogueVersion: a.match?.catalogueVersion || null,
      }));

    const interactions = checkInteractions(
      medicines.map(m => ({ name: m.medicine_name, strength: m.strength }))
    );
    const redFlags = detectRedFlags(ocrText, medicines, antibioticMatches);
    const stewardship = getStewardshipWarnings(
      antibiotics.length > 0,
      medicines.some(m => !m.duration) && antibiotics.length > 0
    );

    // Guaranteed clinical invariant: scanStatus is DRAFT_UNREVIEWED
    const scan = await store.createPrescriptionScan({
      uploadId,
      userId,
      ocrText,
      ocrConfidence,
      medicinesJson: JSON.stringify(medicines),
      antibioticsJson: JSON.stringify(antibiotics),
      alertsJson: JSON.stringify({
        interactions,
        redFlags,
        stewardship,
        disclaimer: 'Educational info only. Follow your doctor. For urgent symptoms seek medical help.',
      }),
      scanStatus: 'DRAFT_UNREVIEWED',
    });

    res.json({
      id: scan.id,
      uploadId,
      scanStatus: scan.scanStatus,
      ocrText,
      ocrConfidence,
      medicines,
      antibiotics,
      alerts: {
        interactions,
        redFlags,
        stewardship,
        disclaimer: 'Educational info only. Follow your doctor. For urgent symptoms seek medical help.',
      },
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Scan failed' });
  }
}

/**
 * GET /api/prescriptions/:id
 * Protected by authorizePrescriptionRecordAccess middleware.
 */
export async function getScanResult(req: Request, res: Response) {
  try {
    const scan = (req as any).prescriptionScanRecord;
    const rx = (req as any).prescriptionRecord;

    if (scan) {
      return res.json({
        id: scan.id,
        uploadId: scan.uploadId,
        scanStatus: scan.scanStatus || 'DRAFT_UNREVIEWED',
        ocrText: scan.ocrText,
        ocrConfidence: scan.ocrConfidence,
        medicines: JSON.parse(scan.medicinesJson),
        antibiotics: JSON.parse(scan.antibioticsJson),
        alerts: scan.alertsJson ? JSON.parse(scan.alertsJson) : null,
      });
    }

    if (rx) {
      return res.json({
        id: rx.id,
        patientId: rx.patientId,
        prescriberId: rx.prescriberId,
        status: rx.status,
        version: rx.version,
        diagnosis: rx.diagnosis,
        clinicalNotes: rx.clinicalNotes,
        signedAt: rx.signedAt,
        items: rx.items || [],
      });
    }

    res.status(404).json({ error: 'Record not found' });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to fetch' });
  }
}

/**
 * GET /api/prescriptions/verify/:token
 * Scoped Pharmacy Token Verification Endpoint.
 * Strictly limited to minimum information needed for dispensing:
 * prescriber info, status, and medicine items.
 * Does NOT expose full clinical chart or diagnosis history.
 */
export async function verifyPharmacyPrescriptionToken(req: Request, res: Response) {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ error: 'Verification token required' });
    }

    const tokenHash = hashToken(token);
    const store = getDataStore();
    const rx = await store.getPrescriptionByTokenHash(tokenHash);

    if (!rx) {
      return res.status(404).json({ error: 'Invalid prescription verification token' });
    }

    // Check token expiration and revocation
    if (rx.isTokenRevoked) {
      return res.status(410).json({ error: 'Prescription verification token has been revoked' });
    }

    if (rx.tokenExpiresAt && new Date(rx.tokenExpiresAt) < new Date()) {
      return res.status(410).json({ error: 'Prescription verification token has expired' });
    }

    const prescriber = await store.getUserById(rx.prescriberId);
    const prescriberCred = await store.getClinicianCredential(rx.prescriberId);

    // Minimal Scoped Disclosure (Data Minimization Principle)
    res.json({
      prescriptionId: rx.id,
      status: rx.status,
      prescriberName: prescriber?.email || 'Licensed Clinician',
      prescriberBmdc: prescriberCred?.bmdcNumber || 'Verified',
      prescriberVerified: prescriberCred?.verificationStatus === 'VERIFIED',
      signedAt: rx.signedAt,
      items: (rx.items || []).map(i => ({
        id: i.id,
        medicineName: i.medicineName,
        prescribedQuantity: i.prescribedQuantity,
        dispensedQuantity: i.dispensedQuantity,
        frequency: i.frequency,
        duration: i.duration,
        strength: i.strength,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Verification failed' });
  }
}

/**
 * POST /api/prescriptions/:id/sign
 * Digital signature endpoint for verified clinicians.
 */
export async function signPrescription(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { signatureBytes, signaturePayloadHash, signingKeyId } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }

    const store = getDataStore();
    const rx = await store.getPrescription(id);
    if (!rx) {
      return res.status(404).json({ error: 'Prescription not found.' });
    }

    // Clinician verification gate
    const doctorRole = user.roles.find(r => r.role === 'DOCTOR');
    if (!doctorRole || !doctorRole.isVerified) {
      return res.status(403).json({
        error: 'Forbidden: Unverified clinician cannot sign prescriptions.',
      });
    }

    // Verify active care relationship or consent
    const hasRel = await store.getCareRelationship(user.id, rx.patientId);
    const hasConsent = await store.getActiveConsent(rx.patientId, user.id, 'CLINICAL_CARE');
    if (!hasRel && !hasConsent) {
      return res.status(403).json({
        error: 'Forbidden: No active care relationship or consent to sign prescription for this patient.',
      });
    }

    rx.status = 'SIGNED';
    rx.signatureBytes = signatureBytes;
    rx.signaturePayloadHash = signaturePayloadHash;
    rx.signingKeyId = signingKeyId;
    rx.signedAt = new Date();

    res.json({
      success: true,
      prescriptionId: rx.id,
      status: rx.status,
      signedAt: rx.signedAt,
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Signing failed' });
  }
}
