import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaChevronDown,
  FaChevronRight,
  FaPills,
  FaExclamationTriangle,
  FaShieldAlt,
  FaEdit,
  FaCheckCircle,
  FaPhoneAlt,
  FaFileAlt
} from 'react-icons/fa';
import Navbar from '../Navbar';
import Footer from '../Footer';
import { processPrescription } from './PrescriptionUploadModal';
import antibioticsData from '../../../data/antibiotics.json';
import { fetchAntibioticsCatalogue } from '../../../services/catalogueService';

function CollapsibleSection({ title, icon: Icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-[#D1E3EB] bg-white shadow-xs overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-[#F4F8FA] transition"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2.5 font-bold text-[#102A43] text-sm sm:text-base">
          <Icon className="text-[#028090]" />
          {title}
        </span>
        {open ? <FaChevronDown className="text-[#627D98]" /> : <FaChevronRight className="text-[#627D98]" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-[#D1E3EB]"
          >
            <div className="p-4 sm:p-5">{children}</div>
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
      <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 shadow-xs">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-900 flex items-center gap-1">
                ⚠️ অস্পষ্ট বা দ্ব্যর্থক ফলাফল (Ambiguous)
              </span>
              <span className="text-xs text-amber-800 font-medium">হাতে লেখা ওসিআর যাচাই প্রয়োজন</span>
            </div>
            <h3 className="font-bold text-[#102A43] mt-2 text-sm sm:text-base">
              প্রেসক্রিপশন লেখা: &quot;{med?.medicine_name || 'Unknown'}&quot;
            </h3>
            <p className="text-xs text-[#334E68] mt-1 leading-relaxed">
              {item.ambiguityReason || 'একাধিক কাছাকাছি নামযুক্ত ওষুধ ক্যাটালগে পাওয়া গেছে। ক্লিনিকাল নিরাপত্তার স্বার্থে স্বয়ংক্রিয় নির্বাচন স্থগিত রাখা হয়েছে।'}
            </p>
          </div>
        </div>

        {candidates.length > 0 && (
          <div className="mt-3.5 border-t border-amber-200 pt-3">
            <p className="text-xs font-bold text-[#102A43] mb-2">সম্ভাব্য ওষুধের তালিকা (চিকিৎসক বা ফার্মাসিস্ট কর্তৃক নিশ্চিত করতে হবে):</p>
            <div className="space-y-2">
              {candidates.slice(0, 3).map((c, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-white/90 rounded-lg p-2.5 border border-amber-200">
                  <span className="font-semibold text-[#102A43]">
                    {c.genericName} {c.brandName ? `(${c.brandName})` : ''}
                  </span>
                  <div className="flex items-center gap-2">
                    {c.awareGroup && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.awareGroup === 'ACCESS' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        c.awareGroup === 'WATCH' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        c.awareGroup === 'RESERVE' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-slate-100 text-slate-700'
                      }`}>
                        WHO {c.awareGroup}
                      </span>
                    )}
                    <span className="text-slate-500 font-medium">{((c.confidence || 0) * 100).toFixed(0)}% মিল</span>
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
  const sideEffects = ab.side_effects || ab.sideEffects;
  const awareCategory = ab.awareCategory || ab.aware_category || 'UNCLASSIFIED';

  return (
    <div className="rounded-xl border border-[#D1E3EB] bg-white p-4 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-[#102A43] text-base">{genericName}</h3>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              awareCategory === 'ACCESS' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
              awareCategory === 'WATCH' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
              awareCategory === 'RESERVE' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-slate-100 text-slate-700'
            }`}>
              WHO {awareCategory}
            </span>
          </div>
          {brandNames.length > 0 && (
            <p className="text-xs text-[#627D98] mt-1">প্রচলিত ব্র্যান্ড নাম: {brandNames.slice(0, 3).join(', ')}</p>
          )}
        </div>
        <span className="rounded-full bg-[#E0F2F1] px-2.5 py-0.5 text-xs font-semibold text-[#028090]">
          {item.matched_on} • {((item.confidence || 0) * 100).toFixed(0)}%
        </span>
      </div>

      <div className="mt-3.5 space-y-2.5 text-xs text-[#334E68]">
        <div className="bg-[#F4F8FA] p-3 rounded-lg border border-[#D1E3EB]">
          <p className="font-semibold text-[#102A43] mb-1">
            📋 প্রেসক্রিপশন অনুযায়ী আপনার সেবন মাত্রা (Prescribed Dose):
          </p>
          <p className="text-sm font-bold text-[#0F3A66]">
            {med?.strength || '—'} {med?.frequency || ''} {med?.duration ? `× ${med.duration}` : ''}
          </p>
          {/* Phase 1 Invariant: Omit raw spreadsheet adult guidance from patient order instructions */}
          <p className="text-[11px] text-[#627D98] mt-1">
            *রোগীর জন্য সতর্কতা: ওষুধের সঠিক মাত্রা ও সেবনকাল প্রেসক্রিপশনে চিকিৎসকের নির্দেশ অনুযায়ী গ্রহণ করুন।
          </p>
        </div>

        {sideEffects && (
          <p className="text-xs text-[#627D98]">
            <strong className="text-[#334E68]">সম্ভাব্য সাধারণ পার্শ্বপ্রতিক্রিয়া:</strong> {sideEffects}
          </p>
        )}
      </div>
    </div>
  );
}

function AlertCard({ alert, type }) {
  const isRedFlag = type === 'redFlag' || alert.severity === 'high';
  return (
    <div className={`rounded-xl p-4 border text-xs ${
      isRedFlag
        ? 'bg-red-50 border-red-300 text-red-950'
        : 'bg-amber-50 border-amber-300 text-amber-950'
    }`}>
      <div className="flex items-start gap-2.5">
        <span className="text-base">{isRedFlag ? '🚨' : '⚠️'}</span>
        <div className="flex-1">
          <p className="font-bold text-sm mb-1">{alert.message}</p>
          {alert.involved_medicines?.length > 0 && (
            <p className="text-[11px] opacity-90">সংশ্লিষ্ট ওষুধ: {alert.involved_medicines.join(', ')}</p>
          )}
          {isRedFlag && (
            <div className="mt-2 pt-2 border-t border-red-200 flex items-center justify-between">
              <span className="font-semibold">তীব্র প্রতিক্রিয়া দেখা দিলে জরুরি বিভাগে যোগাযোগ করুন:</span>
              <a href="tel:999" className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded text-xs font-bold">
                <FaPhoneAlt className="text-[10px]" /> ৯৯৯ এ কল
              </a>
            </div>
          )}
        </div>
      </div>
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
  const [isConfirmedByPatient, setIsConfirmedByPatient] = useState(false);

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
      <div className="min-h-screen bg-[#F4F8FA]">
        <Navbar />
        <div className="container mx-auto p-6 text-center max-w-md">
          <div className="bg-white p-8 rounded-2xl border border-[#D1E3EB] shadow-xs">
            <p className="text-[#334E68] text-sm">কোনো প্রেসক্রিপশন স্ক্যান ফলাফল নেই। প্রথমে প্রেসক্রিপশন আপলোড করুন।</p>
            <button onClick={onBack} className="mt-4 inline-flex items-center gap-1.5 bg-[#028090] text-white px-4 py-2 rounded-lg text-xs font-bold">
              ← রোগী পোর্টালে ফিরে যান
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const { ocrText, ocrConfidence, medicines, antibiotics: antibioticsDetected, alerts } = displayData || scanData;
  const interactions = alerts?.interactions || [];
  const redFlags = alerts?.redFlags || [];
  const stewardship = alerts?.stewardship || [];

  return (
    <div className="min-h-screen bg-[#F4F8FA]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-5 flex items-center justify-between">
          <button onClick={onBack} className="text-[#028090] hover:text-[#0A2342] text-xs font-bold flex items-center gap-1.5 transition">
            ← রোগী পোর্টালে ফিরে যান (Back to Portal)
          </button>
          <span className="text-[11px] font-semibold text-[#627D98] bg-white px-2.5 py-1 rounded-full border border-[#D1E3EB]">
            আইডি: {scanData?.id || 'scan_draft_demo'}
          </span>
        </div>

        {/* Phase 1 & 2 Invariant: Mandatory DRAFT_UNREVIEWED Quarantine Banner */}
        <div className="mb-6 rounded-2xl border-2 border-slate-300 bg-white p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-800">
                📝 খসড়া (DRAFT_UNREVIEWED)
              </span>
              <span className="text-xs text-amber-800 font-bold bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                স্বাক্ষরহীন এক্সট্রাকশন (Unsigned)
              </span>
            </div>
            <span className="text-xs text-[#627D98]">
              ওসিআর স্পষ্টতা: <strong>{((ocrConfidence || 0) * 100).toFixed(0)}%</strong>
            </span>
          </div>

          <p className="text-xs text-[#334E68] mt-3 leading-relaxed">
            ⚠️ <strong>ক্লিনিকাল নিরাপত্তা নোটিশ:</strong> এটি একটি স্বয়ংক্রিয় ওসিআর খসড়া এক্সট্রাকশন। নিবন্ধিত চিকিৎসকের পর্যালোচনা ও স্বাক্ষর ব্যতীত এটি কোনো চূড়ান্ত বৈধ প্রেসক্রিপশন বা ওষুধ সেবনের নির্দেশিকা হিসেবে গণ্য হবে না।
          </p>

          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-[#627D98]">
              {isConfirmedByPatient
                ? '✅ আপনি এই খসড়াটি চিকিৎসকের নিকট প্রদর্শনের জন্য সংরক্ষণ করেছেন।'
                : 'ওষুধ সেবনের পূর্বে আপনার চিকিৎসকের সাথে তালিকাটি নিশ্চিত করুন।'}
            </span>
            <button
              onClick={() => setIsConfirmedByPatient(!isConfirmedByPatient)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                isConfirmedByPatient
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#028090] hover:bg-[#00A896] text-white'
              }`}
            >
              <FaCheckCircle /> {isConfirmedByPatient ? 'যাচাইকৃত চিহ্নিত' : 'খসড়া নিশ্চিত করুন (Patient Confirmation)'}
            </button>
          </div>
        </div>

        {/* Phase 1 Invariant: Offline Outdated Reference Warning Banner */}
        {catalogueMeta?.isOfflineFallback ? (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <div>
                <span className="font-bold">অফলাইন রেফারেন্স (পুরোনো তথ্য — স্ন্যাপশট v2024.11): </span>
                <span>লাইভ সার্ভার সংযোগ বিচ্ছিন্ন। বর্তমান সক্রিয় ক্যাটালগ হিসেবে গণ্য করবেন না।</span>
              </div>
            </div>
            <span className="bg-amber-200 px-2 py-0.5 rounded text-[11px] font-bold text-amber-900 shrink-0">
              অফলাইন ক্যাশ
            </span>
          </div>
        ) : (
          <div className="mb-6 rounded-xl border border-[#D1E3EB] bg-white px-4 py-2.5 text-xs text-[#334E68] flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00A896]"></span>
              <span>লাইভ ক্যাটালগ সিঙ্ক: <strong className="text-[#102A43]">{catalogueMeta?.version || 'v1.0.0'}</strong></span>
            </div>
            <span className="text-[#627D98] text-[11px]">
              উৎস: {catalogueMeta?.source || 'WHO AWaRe 2024'}
            </span>
          </div>
        )}

        {/* Sections Accordion */}
        <div className="space-y-4">
          {/* Extracted Medicines List */}
          <CollapsibleSection title="প্রেসক্রিপশন থেকে সনাক্তকৃত ওষুধ (Extracted Medicines)" icon={FaPills} defaultOpen={true}>
            <div className="space-y-3">
              {(editedMedicines || medicines || []).map((m, i) => (
                <div key={i} className="flex items-start justify-between gap-2 rounded-xl border border-[#D1E3EB] bg-[#F4F8FA] p-3.5">
                  {editingIndex === i ? (
                    <div className="flex-1 space-y-2">
                      <input
                        value={editForm.medicine_name || ''}
                        onChange={(e) => setEditForm({ ...editForm, medicine_name: e.target.value })}
                        className="w-full rounded-lg border border-[#D1E3EB] px-3 py-1.5 text-xs"
                        placeholder="ওষুধের নাম"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          value={editForm.strength || ''}
                          onChange={(e) => setEditForm({ ...editForm, strength: e.target.value })}
                          className="rounded-lg border border-[#D1E3EB] px-3 py-1.5 text-xs"
                          placeholder="মাত্রা (Strength)"
                        />
                        <input
                          value={editForm.frequency || ''}
                          onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value })}
                          className="rounded-lg border border-[#D1E3EB] px-3 py-1.5 text-xs"
                          placeholder="সেবনবিধি (Frequency)"
                        />
                        <input
                          value={editForm.duration || ''}
                          onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                          className="rounded-lg border border-[#D1E3EB] px-3 py-1.5 text-xs"
                          placeholder="সময়কাল (Duration)"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={handleSaveEdit} className="rounded-lg bg-[#028090] px-3 py-1 text-white text-xs font-bold">
                          সংরক্ষণ (Save)
                        </button>
                        <button onClick={handleCancelEdit} className="rounded-lg border border-slate-300 px-3 py-1 text-xs">
                          বাতিল
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="font-bold text-[#102A43] text-sm">
                          {m.medicine_name} {m.strength && `• ${m.strength}`}
                        </p>
                        <p className="text-xs text-[#627D98] mt-0.5">
                          {m.frequency} {m.duration && `• ${m.duration}`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleEdit(i)}
                        className="p-1.5 text-[#028090] hover:bg-white rounded-lg border border-transparent hover:border-[#D1E3EB] transition"
                        title="সম্পাদনা করুন"
                      >
                        <FaEdit />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleReRun}
              className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg bg-[#0F3A66] px-4 py-2 text-xs font-bold text-white hover:bg-[#0A2342] transition"
            >
              🔄 সম্পাদনা পরবর্তী ক্যাটালগ পুনর্মিলন (Re-run Match)
            </button>
          </CollapsibleSection>

          {/* Antibiotics Detected */}
          <CollapsibleSection title="সনাক্তকৃত অ্যান্টিবায়োটিক ও AWaRe গ্রুপ" icon={FaShieldAlt} defaultOpen={true}>
            {antibioticsDetected?.length > 0 ? (
              <div className="space-y-3">
                {antibioticsDetected.map((item, i) => (
                  <AntibioticCard key={i} item={item} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#627D98]">এই প্রেসক্রিপশনে কোনো অ্যান্টিবায়োটিক সনাক্ত হয়নি।</p>
            )}
          </CollapsibleSection>

          {/* Safety & Alerts */}
          <CollapsibleSection title="নিরাপত্তা সতর্কতা ও এএমআর পরামর্শ" icon={FaExclamationTriangle} defaultOpen={true}>
            <div className="space-y-3.5">
              {stewardship.length > 0 && (
                <div>
                  <h4 className="font-bold text-xs text-[#102A43] mb-2 flex items-center gap-1.5">
                    <FaShieldAlt className="text-[#028090]" /> অ্যান্টিবায়োটিক সচেতনতা পরামর্শ:
                  </h4>
                  <ul className="space-y-1.5 text-xs text-[#334E68] bg-[#F4F8FA] p-3 rounded-xl border border-[#D1E3EB]">
                    {stewardship.map((s) => (
                      <li key={s.id}>• {s.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {redFlags.length > 0 && (
                <div>
                  <h4 className="font-bold text-xs text-red-900 mb-2">জরুরি রেড-ফ্ল্যাগ অ্যালার্ট:</h4>
                  <div className="space-y-2">
                    {redFlags.map((r, i) => (
                      <AlertCard key={i} alert={r} type="redFlag" />
                    ))}
                  </div>
                </div>
              )}

              {interactions.length > 0 && (
                <div>
                  <h4 className="font-bold text-xs text-amber-900 mb-2">সম্ভাব্য ওষুধের মিথস্ক্রিয়া (Interactions):</h4>
                  <div className="space-y-2">
                    {interactions.map((a, i) => (
                      <AlertCard key={i} alert={a} type="interaction" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Raw OCR Text Section */}
          <CollapsibleSection title="ওসিআর এক্সট্রাকশন লগ (Raw OCR)" icon={FaFileAlt} defaultOpen={false}>
            <pre className="whitespace-pre-wrap rounded-xl bg-slate-100 p-4 text-xs font-mono text-[#334E68] border border-slate-200">
              {ocrText || 'কোনো টেক্সট এক্সট্রাক্ট করা যায়নি'}
            </pre>
          </CollapsibleSection>
        </div>
      </main>
      <Footer />
    </div>
  );
}
