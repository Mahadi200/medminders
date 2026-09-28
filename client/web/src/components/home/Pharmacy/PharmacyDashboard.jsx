import { useState } from 'react';
import {
  FaPrescriptionBottle, FaPills, FaSearch,
  FaShieldAlt, FaBoxOpen, FaExclamationTriangle,
  FaCheckCircle, FaQrcode, FaLock
} from 'react-icons/fa';
import { MdLocalPharmacy, MdInventory } from 'react-icons/md';
import { motion } from 'framer-motion';
import Navbar from '../Navbar';
import Footer from '../Footer';

const PharmacyDashboard = () => {
  const [tokenSearch, setTokenSearch] = useState('');
  const [verifiedRx, setVerifiedRx] = useState(null);
  const [verifyMessage, setVerifyMessage] = useState('');

  // Synthetic demo pharmacy prescriptions
  const [prescriptions, setPrescriptions] = useState([
    {
      id: 'rx_token_demo_001',
      patient: 'মোহাম্মদ রহমান (Mohammad Rahman)',
      doctor: 'ডাঃ ফাতিমা বেগম (BMDC: A-42190)',
      date: '2026-09-27',
      items: [
        { name: 'Ciprofloxacin 500mg', quantity: 14, awareGroup: 'WATCH' },
        { name: 'Paracetamol 500mg', quantity: 20, awareGroup: null }
      ],
      status: 'VERIFIED_PENDING_DISPENSE',
    },
    {
      id: 'rx_token_demo_002',
      patient: 'আয়েশা সিদ্দিকা (Ayesha Siddiqua)',
      doctor: 'ডাঃ আব্দুল্লাহ খান (BMDC: A-31204)',
      date: '2026-09-26',
      items: [
        { name: 'Amoxicillin 500mg', quantity: 21, awareGroup: 'ACCESS' },
        { name: 'Omeprazole 20mg', quantity: 14, awareGroup: null }
      ],
      status: 'DISPENSED',
    }
  ]);

  const handleVerifyToken = (e) => {
    e.preventDefault();
    if (!tokenSearch.trim()) return;

    const found = prescriptions.find(p => p.id.toLowerCase().includes(tokenSearch.toLowerCase().trim()));
    if (found) {
      setVerifiedRx(found);
      setVerifyMessage('✅ প্রেসক্রিপশন টোকেন সফলভাবে যাচাই হয়েছে। ডেটা মিনিমাইজেশন প্রোটোকল অনুযায়ী রোগ নির্ণয় বিবরণ গোপন রাখা হয়েছে।');
    } else {
      setVerifiedRx(null);
      setVerifyMessage('❌ অবৈধ বা মেয়াদোত্তীর্ণ প্রেসক্রিপশন টোকেন। অনুগ্রহ করে রোগীর কিউআর কোড বা প্রেসক্রিপশন টোকেন পুনরায় পরীক্ষা করুন।');
    }
  };

  const handleDispense = (id) => {
    setPrescriptions(prev => prev.map(p => p.id === id ? { ...p, status: 'DISPENSED' } : p));
    if (verifiedRx && verifiedRx.id === id) {
      setVerifiedRx(prev => ({ ...prev, status: 'DISPENSED' }));
    }
  };

  const fadeIn = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <div className="min-h-screen bg-[#F4F8FA]">
      <Navbar />

      {/* Header Bar */}
      <header className="bg-[#0A2342] text-white px-4 py-4 shadow-sm border-b border-[#0F3A66]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#028090] flex items-center justify-center text-white">
              <MdLocalPharmacy className="text-2xl" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold">ফার্মেসি ডিসপেন্সিং পোর্টাল (Pharmacy Portal)</h1>
              <p className="text-xs text-slate-300">টোকেন ভিত্তিক নিয়ন্ত্রিত অ্যান্টিবায়োটিক বিতরণ</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs bg-[#0F3A66] px-3 py-2 rounded-xl border border-slate-700">
            <FaShieldAlt className="text-[#00A896]" />
            <span>DGDA লাইসেন্সকৃত ফার্মেসি ডিসপেন্সার</span>
          </div>
        </div>
      </header>

      {/* Synthetic Demo Banner */}
      <div className="bg-[#EEF2FF] border-b border-[#C7D2FE] px-4 py-2.5 text-center text-xs text-[#3730A3] font-semibold flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#4F46E5] animate-pulse"></span>
        <span>🧪 ডেমো সিমুলেশন (DEMO SIMULATION) — বাস্তব কোনো প্রেসক্রিপশন বা রোগীর তথ্য নয়। প্রদর্শিত টোকেন ও ওষুধ কেবল টেস্ট প্রদর্শনের জন্য।</span>
      </div>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Token Verification Card */}
        <div className="bg-white rounded-2xl border border-[#D1E3EB] shadow-xs p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FaQrcode className="text-[#028090] text-lg" />
              <h2 className="text-base font-bold text-[#102A43]">
                প্রেসক্রিপশন কিউআর / টোকেন যাচাই (Scoped QR Verification)
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-[#065F46] bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-[#A7F3D0] flex items-center gap-1">
              <FaLock className="text-[9px]" /> ডেটা মিনিমাইজেশন প্রোটোকল
            </span>
          </div>

          <p className="text-xs text-[#334E68] mb-4">
            রোগীর প্রেসক্রিপশনের গোপন টোকেন বা কিউআর কোড দিন। ফার্মেসি শুধুমাত্র অনুমোদিত ওষুধের নাম ও বিতরণ মাত্রা দেখতে পাবে।
          </p>

          <form onSubmit={handleVerifyToken} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3.5 top-3.5 text-[#627D98] text-xs" />
              <input
                type="text"
                value={tokenSearch}
                onChange={(e) => setTokenSearch(e.target.value)}
                placeholder="প্রেসক্রিপশন টোকেন লিখুন (উদাঃ rx_token_demo_001)"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#D1E3EB] text-xs focus:ring-2 focus:ring-[#028090] outline-none"
              />
            </div>
            <button
              type="submit"
              className="bg-[#028090] hover:bg-[#00A896] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              যাচাই করুন (Verify)
            </button>
          </form>

          {verifyMessage && (
            <div className="mt-3 p-3 rounded-xl bg-[#F4F8FA] border border-[#D1E3EB] text-xs font-semibold text-[#334E68]">
              {verifyMessage}
            </div>
          )}

          {/* Verified Prescription Detail */}
          {verifiedRx && (
            <div className="mt-4 p-4 rounded-xl bg-[#E0F2F1]/40 border border-[#80CBC4] space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="font-bold text-sm text-[#102A43]">রোগী: {verifiedRx.patient}</h3>
                  <p className="text-xs text-[#627D98]">চিকিৎসক: {verifiedRx.doctor} • তারিখ: {verifiedRx.date}</p>
                </div>
                {verifiedRx.status === 'DISPENSED' ? (
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                    ✅ ওষুধ বিতরণ সম্পন্ন (DISPENSED)
                  </span>
                ) : (
                  <button
                    onClick={() => handleDispense(verifiedRx.id)}
                    className="bg-[#028090] hover:bg-[#00A896] text-white px-4 py-1.5 rounded-lg text-xs font-bold transition"
                  >
                    ওষুধ বিতরণ নিশ্চিত করুন (Confirm Dispense)
                  </button>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-[#80CBC4]/40">
                <p className="text-xs font-bold text-[#102A43]">অনুমোদিত ওষুধ তালিকা:</p>
                {verifiedRx.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs bg-white p-2.5 rounded-lg border border-[#D1E3EB]">
                    <span className="font-semibold text-[#102A43]">{it.name}</span>
                    <div className="flex items-center gap-2">
                      {it.awareGroup && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          it.awareGroup === 'WATCH' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          WHO {it.awareGroup}
                        </span>
                      )}
                      <span className="text-[#627D98] font-bold">পরিমাণ: {it.quantity}টি</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Prescription Queue */}
        <div className="bg-white rounded-2xl border border-[#D1E3EB] shadow-xs overflow-hidden">
          <div className="bg-[#F4F8FA] p-4 border-b border-[#D1E3EB] flex justify-between items-center">
            <h2 className="text-base font-bold text-[#102A43] flex items-center">
              <FaPrescriptionBottle className="mr-2 text-[#028090]" />
              ফার্মেসি প্রেসক্রিপশন কিউ (নমুনা ডেমো / Demo Simulation)
            </h2>
            <span className="bg-[#E0F2F1] text-[#004D40] font-bold px-2.5 py-0.5 rounded-full text-xs">
              {prescriptions.length}টি নমুনা প্রেসক্রিপশন (Simulated)
            </span>
          </div>

          <div className="divide-y divide-[#D1E3EB]">
            {prescriptions.map(p => (
              <div key={p.id} className="p-4 hover:bg-[#F4F8FA]/60 transition">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                  <div>
                    <h3 className="font-bold text-sm text-[#102A43]">{p.patient}</h3>
                    <p className="text-xs text-[#627D98]">{p.doctor} • টোকেন: {p.id}</p>
                  </div>
                  {p.status === 'DISPENSED' ? (
                    <span className="px-2.5 py-1 text-xs rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                      ✅ বিতরণ সম্পন্ন
                    </span>
                  ) : (
                    <button
                      onClick={() => handleDispense(p.id)}
                      className="bg-[#028090] hover:bg-[#00A896] text-white px-3 py-1 rounded-lg text-xs font-bold transition"
                    >
                      ডিসপেন্স করুন
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  {p.items.map((it, i) => (
                    <div key={i} className="flex justify-between text-xs text-[#334E68]">
                      <span>• {it.name}</span>
                      <span className="font-semibold text-slate-500">পরিমাণ: {it.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PharmacyDashboard;