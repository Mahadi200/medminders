import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCloudUploadAlt, FaTimes, FaFilePdf, FaPaste } from 'react-icons/fa';
import { createWorker } from 'tesseract.js';
import { parseMedicineText } from '../../../utils/medicineParser';
import { matchAntibiotic } from '../../../utils/antibioticMatcher';
import { getStewardshipWarnings, detectRedFlags, checkInteractions } from '../../../utils/safetyAlerts';
import antibioticsData from '../../../data/antibiotics.json';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 10;

export function processPrescription(ocrText, antibiotics, medicinesOverride = null) {
  const medicines = medicinesOverride || parseMedicineText(ocrText);
  const textForRedFlags = ocrText || (medicines.map((m) => m.raw_line || `${m.medicine_name} ${m.strength || ''}`).join('\n'));
  const antibioticMatches = medicines.map((m) => ({
    medicine: m,
    match: matchAntibiotic(m.medicine_name, antibiotics),
  }));
  const antibioticsDetected = antibioticMatches
    .filter((a) => a.match?.match)
    .map((a) => ({
      medicine: a.medicine,
      antibiotic: a.match.match,
      confidence: a.match.confidence,
      matched_on: a.match.matched_on,
    }));
  const interactions = checkInteractions(medicines.map((m) => ({ name: m.medicine_name, strength: m.strength })));
  const redFlags = detectRedFlags(textForRedFlags, medicines, antibioticMatches);
  const stewardship = getStewardshipWarnings(
    antibioticsDetected.length > 0,
    medicines.some((m) => !m.duration) && antibioticsDetected.length > 0
  );
  return {
    ocrText,
    ocrConfidence: 0.9,
    medicines,
    antibiotics: antibioticsDetected,
    alerts: {
      interactions,
      redFlags,
      stewardship,
      disclaimer: 'Educational info only. Follow your doctor. For urgent symptoms seek medical help.',
    },
  };
}

export default function PrescriptionUploadModal({ isOpen, onClose, onScanSuccess }) {
  const [mode, setMode] = useState('upload'); // 'upload' | 'paste'
  const [file, setFile] = useState(null);
  const [pasteText, setPasteText] = useState('');
  const [preview, setPreview] = useState(null);
  const antibiotics = antibioticsData;
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const validateFile = (f) => {
    if (!ALLOWED_IMAGE_TYPES.includes(f.type)) {
      setError('Invalid type. Use JPG, PNG or WebP. For PDF, paste the text instead.');
      return false;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Max ${MAX_SIZE_MB}MB.`);
      return false;
    }
    return true;
  };

  const handleFile = useCallback((f) => {
    setError('');
    if (!f) return;
    if (!validateFile(f)) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const onDragOver = (e) => e.preventDefault();

  const runOcrAndProcess = async () => {
    if (!file || antibiotics.length === 0) return;
    setProcessing(true);
    setError('');
    setProgress(10);
    try {
      const worker = await createWorker('eng', {
        logger: (m) => {
          if (m.status === 'recognizing text' && m.progress) setProgress(10 + Math.round(m.progress * 80));
        },
      });
      setProgress(20);
      const { data } = await worker.recognize(file);
      await worker.terminate();
      setProgress(95);
      const scanData = processPrescription(data.text, antibiotics);
      setProgress(100);
      onScanSuccess?.(scanData);
      onClose();
    } catch (err) {
      setError(err.message || 'OCR failed. Try pasting the text instead.');
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const handlePasteAndProcess = () => {
    if (!pasteText.trim()) {
      setError('Please paste prescription text.');
      return;
    }
    setError('');
    const scanData = processPrescription(pasteText.trim(), antibiotics);
    onScanSuccess?.(scanData);
    onClose();
  };

  const reset = () => {
    setFile(null);
    setPasteText('');
    setPreview(null);
    setError('');
    setProgress(0);
    if (preview) URL.revokeObjectURL(preview);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={handleClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-modal-title"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between border-b p-4">
            <h2 id="upload-modal-title" className="text-xl font-bold text-gray-800">
              Upload or Paste Prescription
            </h2>
            <button
              onClick={handleClose}
              className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>

          <div className="p-4 flex gap-2 border-b">
            <button
              onClick={() => { setMode('upload'); setError(''); setFile(null); setPasteText(''); }}
              className={`flex-1 py-2 rounded-lg font-medium ${mode === 'upload' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Upload Image
            </button>
            <button
              onClick={() => { setMode('paste'); setError(''); setFile(null); setPasteText(''); }}
              className={`flex-1 py-2 rounded-lg font-medium flex items-center justify-center gap-2 ${mode === 'paste' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              <FaPaste /> Paste Text
            </button>
          </div>

          <div className="p-6 space-y-4">
            {mode === 'upload' ? (
              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onClick={() => inputRef.current?.click()}
                className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 hover:border-teal-400 p-8 text-center transition"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
                aria-label="Drop prescription image or click to browse"
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                  className="hidden"
                />
                {file ? (
                  <div className="space-y-3">
                    <img src={preview} alt="Preview" className="mx-auto max-h-40 rounded-lg object-contain" />
                    <p className="text-sm text-gray-600">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
                    <p className="text-xs text-amber-600">PDF not supported in browser. Use Paste Text for PDFs.</p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null); if (preview) URL.revokeObjectURL(preview); setPreview(null); }}
                      className="text-teal-600 hover:underline"
                    >
                      Choose different file
                    </button>
                  </div>
                ) : (
                  <>
                    <FaCloudUploadAlt className="mx-auto text-5xl text-teal-500" />
                    <p className="mt-2 font-medium text-gray-700">Drag & drop or click to browse</p>
                    <p className="text-sm text-gray-500">JPG, PNG, WebP • Max {MAX_SIZE_MB}MB</p>
                  </>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Paste prescription text</label>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="e.g.&#10;Ciprofloxacin 500mg 1+0+1 x 5 days&#10;Metformin 850mg BD"
                  className="w-full h-40 rounded-lg border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  aria-label="Prescription text"
                />
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
                {error}
              </div>
            )}

            {processing && (
              <div>
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                  <motion.div
                    className="h-full bg-teal-500"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-600">Scanning prescription...</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t p-4">
            <button
              onClick={handleClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            {mode === 'upload' ? (
              <button
                onClick={runOcrAndProcess}
                disabled={!file || antibiotics.length === 0 || processing}
                className="rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Processing...' : 'Scan & Analyze'}
              </button>
            ) : (
              <button
                onClick={handlePasteAndProcess}
                disabled={!pasteText.trim() || antibiotics.length === 0}
                className="rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Analyze
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
