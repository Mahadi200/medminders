import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { performOcr } from '../services/ocr/index.js';
import { parseMedicineText } from '../services/parser/medicineParser.js';
import { matchAntibiotic } from '../services/antibiotics/matcher.js';
import { checkInteractions } from '../services/safety/interactions.js';
import { detectRedFlags } from '../services/safety/redFlags.js';
import { getStewardshipWarnings } from '../services/safety/stewardship.js';
import { saveFile, getFileUrl, readFileFromStorage } from '../services/storage.js';

const prisma = new PrismaClient();

const ALLOWED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/webp',
  'application/pdf'
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

export async function uploadPrescription(req: Request, res: Response) {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const userId = req.user?.id;
    if (!userId || userId === 'demo-patient' || req.body.userId === 'demo-patient') {
      return res.status(401).json({ error: 'Unauthorized: Valid authenticated patient session required. Demo patient access is disabled.' });
    }
    const ext = file.originalname.split('.').pop() || 'bin';
    const { relativeUrl } = saveFile(file.buffer, ext);
    const fullUrl = getFileUrl(relativeUrl);

    const uploadRecord = await prisma.prescriptionUpload.create({
      data: {
        userId,
        fileType: file.mimetype.startsWith('image/') ? 'image' : 'pdf',
        fileUrl: fullUrl,
      },
    });

    res.json({
      id: uploadRecord.id,
      fileUrl: fullUrl,
      fileType: uploadRecord.fileType,
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Upload failed' });
  }
}

export async function scanPrescription(req: Request, res: Response) {
  try {
    const { uploadId, ocrText: manualOcrText, medicines: manualMedicines } = req.body;
    const userId = req.user?.id;
    if (!userId || userId === 'demo-patient' || req.body.userId === 'demo-patient') {
      return res.status(401).json({ error: 'Unauthorized: Valid authenticated patient session required. Demo patient access is disabled.' });
    }

    if (!uploadId) return res.status(400).json({ error: 'uploadId required' });

    const upload = await prisma.prescriptionUpload.findUnique({ where: { id: uploadId } });
    if (!upload) return res.status(404).json({ error: 'Upload not found' });

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
      .filter(a => a.match?.match)
      .map(a => ({
        medicine: a.medicine,
        antibiotic: a.match!.match,
        confidence: a.match!.confidence,
        matched_on: a.match!.matched_on,
      }));

    const interactions = checkInteractions(
      medicines.map(m => ({ name: m.medicine_name, strength: m.strength }))
    );
    const redFlags = detectRedFlags(ocrText, medicines, antibioticMatches);
    const stewardship = getStewardshipWarnings(
      antibiotics.length > 0,
      medicines.some(m => !m.duration) && antibiotics.length > 0
    );

    const scan = await prisma.prescriptionScan.create({
      data: {
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
      },
    });

    res.json({
      id: scan.id,
      uploadId,
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

export async function getScanResult(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId || userId === 'demo-patient') {
      return res.status(401).json({ error: 'Unauthorized: Authentication required to access prescription records' });
    }
    const { id } = req.params;
    const scan = await prisma.prescriptionScan.findUnique({ where: { id } });
    if (!scan) return res.status(404).json({ error: 'Scan not found' });

    res.json({
      id: scan.id,
      uploadId: scan.uploadId,
      ocrText: scan.ocrText,
      ocrConfidence: scan.ocrConfidence,
      medicines: JSON.parse(scan.medicinesJson),
      antibiotics: JSON.parse(scan.antibioticsJson),
      alerts: scan.alertsJson ? JSON.parse(scan.alertsJson) : null,
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to fetch' });
  }
}
