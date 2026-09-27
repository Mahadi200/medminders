import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaChevronDown,
  FaChevronRight,
  FaPills,
  FaExclamationTriangle,
  FaShieldAlt,
  FaEdit,
} from 'react-icons/fa';
import Navbar from '../Navbar';
import Footer from '../Footer';
import { processPrescription } from './PrescriptionUploadModal';
import antibioticsData from '../../../data/antibiotics.json';
import { fetchAntibioticsCatalogue } from '../../../services/catalogueService';

function CollapsibleSection({ title, icon: Icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 font-semibold text-gray-800">
          <Icon className="text-teal-500" />
          {title}
        </span>
        {open ? <FaChevronDown /> : <FaChevronRight />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100"
          >
            <div className="p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AntibioticCard({ item }) {
  const isAmbiguous = Boolean(item.isAmbiguous);
  const ab = item.antibiotic;
  const med = item.medicine;

  if (isAmbiguous || !ab) {
    const candidates = item.candidates || [];
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-900">
                ⚠️ Ambiguous Match
              </span>
              <span className="text-xs text-amber-800 font-medium">Uncertain OCR / Brand Spelling</span>
            </div>
            <h3 className="font-bold text-gray-800 mt-1">Prescribed: &quot;{med?.medicine_name || 'Unknown'}&quot;</h3>
            <p className="text-xs text-gray-600 mt-0.5">
              {item.ambiguityReason || 'Multiple close catalogue entries matched. Automatic selection withheld for clinical safety.'}
            </p>
          </div>
        </div>

        {candidates.length > 0 && (
          <div className="mt-3 border-t border-amber-200 pt-2">
            <p className="text-xs font-semibold text-gray-700 mb-1">Potential Candidates (Clinician Must Review):</p>
            <div className="space-y-1.5">
              {candidates.slice(0, 3).map((c, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-white/80 rounded px-2 py-1 border border-amber-100">
                  <span className="font-medium text-gray-800">
                    {c.genericName} {c.brandName ? `(${c.brandName})` : ''}
                  </span>
                  <div className="flex items-center gap-2">
                    {c.awareGroup && (
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        c.awareGroup === 'ACCESS' ? 'bg-green-100 text-green-800' :
                        c.awareGroup === 'WATCH' ? 'bg-amber-100 text-amber-800' :
                        c.awareGroup === 'RESERVE' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'
                      }`}>
                        WHO {c.awareGroup}
                      </span>
                    )}
                    <span className="text-gray-500">{((c.confidence || 0) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const genericName = ab.generic_name || ab.genericName;
  const brandNames = ab.brand_names || ab.brandNames || [];
  const doseDuration = ab.dose_duration || ab.doseDuration;
  const sideEffects = ab.side_effects || ab.sideEffects;
  const ageConsiderations = ab.age_considerations || ab.ageConsiderations;
  const awareCategory = ab.awareCategory || ab.aware_category || 'UNCLASSIFIED';

  return (
    <div className="rounded-xl border border-teal-100 bg-gradient-to-br from-teal-50/50 to-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-teal-800">{genericName}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              awareCategory === 'ACCESS' ? 'bg-green-100 text-green-800' :
              awareCategory === 'WATCH' ? 'bg-amber-100 text-amber-800' :
              awareCategory === 'RESERVE' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'
            }`}>
              WHO {awareCategory}
            </span>
          </div>
          {brandNames.length > 0 && (
            <p className="text-sm text-gray-600">Brands: {brandNames.slice(0, 3).join(', ')}</p>
          )}
        </div>
        <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
          {item.matched_on} • {((item.confidence || 0) * 100).toFixed(0)}%
        </span>
      </div>
      <div className="mt-3 space-y-2 text-sm">
        <p className="text-gray-700"><strong>Your dose:</strong> {med?.strength || '—'} {med?.frequency || ''} {med?.duration ? `× ${med.duration}` : ''}</p>
        {doseDuration && (
          <p className="text-gray-600"><strong>Standard guidance:</strong> {doseDuration}</p>
        )}
        {sideEffects && (
          <p className="text-gray-600"><strong>Side effects:</strong> {sideEffects}</p>
        )}
        {ageConsiderations && (
          <p className="text-gray-600"><strong>Age considerations:</strong> {ageConsiderations}</p>
        )}
      </div>
    </div>
  );
}

function AlertCard({ alert, type }) {
  const severityColors = { low: 'bg-blue-50 text-blue-800', medium: 'bg-amber-50 text-amber-800', high: 'bg-red-50 text-red-800' };
  const c = severityColors[alert.severity] || severityColors.medium;
  return (
    <div className={`rounded-lg p-3 ${c}`}>
      <p className="text-sm font-medium">{alert.message}</p>
      {alert.involved_medicines?.length > 0 && (
        <p className="mt-1 text-xs opacity-90">{alert.involved_medicines.join(', ')}</p>
      )}
    </div>
  );
}

export default function PrescriptionResults({ scanData, onBack }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedMedicines, setEditedMedicines] = useState(scanData?.medicines || []);
  const [editForm, setEditForm] = useState({});
  const [catalogueMeta, setCatalogueMeta] = useState(null);
  const [activeCatalogue, setActiveCatalogue] = useState([]);
  const [displayData, setDisplayData] = useState(scanData);

  useEffect(() => {
    fetchAntibioticsCatalogue().then(({ items, metadata }) => {
      setActiveCatalogue(items);
      setCatalogueMeta(metadata);
    });
  }, []);

  useEffect(() => {
    setDisplayData(scanData);
    setEditedMedicines(scanData?.medicines || []);
  }, [scanData]);

  const handleEdit = (i) => {
    setEditingIndex(i);
    setEditForm({ ...editedMedicines[i] });
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null) {
      const next = [...editedMedicines];
      next[editingIndex] = { ...next[editingIndex], ...editForm };
      setEditedMedicines(next);
      setEditingIndex(null);
      setEditForm({});
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditForm({});
  };

  const handleReRun = () => {
    const catalogueToUse = activeCatalogue.length > 0 ? activeCatalogue : antibioticsData;
    if (catalogueToUse.length === 0) return;
    const result = processPrescription(scanData?.ocrText || '', catalogueToUse, editedMedicines);
    setDisplayData(result);
  };

  if (!scanData && !displayData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto p-6 text-center">
          <p className="text-gray-600">No scan results. Upload a prescription first.</p>
          <button onClick={onBack} className="mt-4 text-teal-600 hover:underline">Go back</button>
        </div>
        <Footer />
      </div>
    );
  }

  const { ocrText, ocrConfidence, medicines, antibiotics: antibioticsDetected, alerts } = displayData || scanData;
  const interactions = alerts?.interactions || [];
  const redFlags = alerts?.redFlags || [];
  const stewardship = alerts?.stewardship || [];
  const disclaimer = alerts?.disclaimer || '';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <button onClick={onBack} className="text-teal-600 hover:underline flex items-center gap-1">
            ← Back to Patient Portal
          </button>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-4">Prescription Scan Results</h1>

        {/* Catalogue Version & Synchronization Banner */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-teal-200 bg-teal-50/70 px-4 py-2.5 text-xs text-teal-900 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold">📚 Catalogue Version:</span>
            <code className="rounded bg-teal-100 px-2 py-0.5 font-mono font-bold text-teal-800">
              {catalogueMeta?.version || 'Synchronizing...'}
            </code>
            {catalogueMeta?.isOfflineFallback ? (
              <span className="rounded bg-amber-200 px-1.5 py-0.5 font-bold text-amber-900">
                Offline Fallback
              </span>
            ) : (
              <span className="rounded bg-green-100 px-1.5 py-0.5 font-semibold text-green-800">
                Live Server API
              </span>
            )}
          </div>
          <div className="text-gray-600 flex items-center gap-3">
            <span>
              <strong>Reviewer:</strong> {catalogueMeta?.reviewer || 'WHO AWaRe Panel'}
            </span>
            <span>
              <strong>Synced:</strong>{' '}
              {catalogueMeta?.freshness
                ? new Date(catalogueMeta.freshness).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : 'Pending'}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <CollapsibleSection title="Raw OCR Text" icon={FaPills} defaultOpen={false}>
            <pre className="whitespace-pre-wrap rounded-lg bg-gray-100 p-4 text-sm text-gray-700">
              {ocrText || 'No text extracted'}
            </pre>
            <p className="mt-2 text-xs text-gray-500">Confidence: {((ocrConfidence || 0) * 100).toFixed(0)}%</p>
          </CollapsibleSection>

          <CollapsibleSection title="Extracted Medicines" icon={FaPills} defaultOpen={true}>
            <div className="space-y-3">
              {(editedMedicines || medicines || []).map((m, i) => (
                <div key={i} className="flex items-start justify-between gap-2 rounded-lg border border-gray-200 bg-white p-3">
                  {editingIndex === i ? (
                    <div className="flex-1 space-y-2">
                      <input
                        value={editForm.medicine_name || ''}
                        onChange={(e) => setEditForm({ ...editForm, medicine_name: e.target.value })}
                        className="w-full rounded border px-2 py-1"
                        placeholder="Medicine name"
                      />
                      <input
                        value={editForm.strength || ''}
                        onChange={(e) => setEditForm({ ...editForm, strength: e.target.value })}
                        className="w-full rounded border px-2 py-1"
                        placeholder="Strength"
                      />
                      <input
                        value={editForm.frequency || ''}
                        onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value })}
                        className="w-full rounded border px-2 py-1"
                        placeholder="Frequency"
                      />
                      <input
                        value={editForm.duration || ''}
                        onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                        className="w-full rounded border px-2 py-1"
                        placeholder="Duration"
                      />
                      <div className="flex gap-2">
                        <button onClick={handleSaveEdit} className="rounded bg-teal-600 px-3 py-1 text-white text-sm">Save</button>
                        <button onClick={handleCancelEdit} className="rounded border px-3 py-1 text-sm">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="font-medium">{m.medicine_name} {m.strength && `• ${m.strength}`}</p>
                        <p className="text-sm text-gray-600">{m.frequency} {m.duration && `• ${m.duration}`}</p>
                      </div>
                      <button
                        onClick={() => handleEdit(i)}
                        className="rounded p-1 text-gray-500 hover:bg-gray-100"
                        aria-label="Edit"
                      >
                        <FaEdit className="text-sm" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={handleReRun}
              className="mt-3 rounded-lg bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700"
            >
              Re-run matching after edits
            </button>
          </CollapsibleSection>

          <CollapsibleSection title="Antibiotics Detected" icon={FaPills} defaultOpen={true}>
            {antibioticsDetected?.length > 0 ? (
              <div className="space-y-3">
                {antibioticsDetected.map((item, i) => (
                  <AntibioticCard key={i} item={item} />
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No antibiotics detected in this prescription.</p>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Safety & Alerts" icon={FaExclamationTriangle} defaultOpen={true}>
            <div className="space-y-4">
              {disclaimer && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                  <strong>Disclaimer:</strong> {disclaimer}
                </div>
              )}
              {stewardship.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                    <FaShieldAlt className="text-teal-500" /> Antibiotic Stewardship
                  </h4>
                  <ul className="space-y-2">
                    {stewardship.map((s) => (
                      <li key={s.id} className="text-sm text-gray-700">• {s.message}</li>
                    ))}
                  </ul>
                </div>
              )}
              {redFlags.length > 0 && (
                <div>
                  <h4 className="font-semibold text-amber-800 mb-2">Red Flags</h4>
                  <div className="space-y-2">
                    {redFlags.map((r, i) => (
                      <AlertCard key={i} alert={r} type="redFlag" />
                    ))}
                  </div>
                </div>
              )}
              {interactions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Possible Drug Interactions</h4>
                  <div className="space-y-2">
                    {interactions.map((a, i) => (
                      <AlertCard key={i} alert={a} type="interaction" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>
        </div>
      </main>
      <Footer />
    </div>
  );
}
