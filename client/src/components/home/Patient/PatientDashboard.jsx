import { useState } from 'react';
import {
  FaPills, FaFileMedical, FaHeartbeat, FaCalendarAlt, FaUserMd,
  FaPrint, FaFileUpload, FaFileImage, FaShieldAlt, FaCheckCircle
} from 'react-icons/fa';
import { MdBloodtype } from 'react-icons/md';
import { GiHealthNormal } from 'react-icons/gi';
import { motion as Motion } from 'framer-motion';
import Navbar from '../Navbar';
import Footer from '../Footer';
import PrescriptionUploadModal from './PrescriptionUploadModal';
import PrescriptionResults from './PrescriptionResults';

const PatientDashboard = () => {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const handleScanSuccess = (data) => {
    setScanResult(data);
  };

  // Synthetic demo patient data
  const patientInfo = {
    name: "মোহাম্মদ রহমান (Mohammad Rahman)",
    age: 42,
    gender: "পুরুষ (Male)",
    bloodGroup: "B+",
    height: "5'8\"",
    weight: "78 kg",
    lastVisit: "2026-06-15",
    photo: "https://randomuser.me/api/portraits/men/32.jpg"
  };

  // Synthetic demo prescriptions with explicit SIGNED vs DRAFT states
  const prescriptions = [
    {
      id: 1,
      medicine: "Ciprofloxacin 500mg",
      dosage: "১টি ট্যাবলেট দিনে ২ বার (1 tab BD)",
      duration: "৭ দিন (7 days)",
      purpose: "ইউরিনারি ট্র্যাক্ট ইনফেকশন (UTI)",
      prescribedBy: "ডাঃ ফাতিমা বেগম (BMDC: A-42190)",
      date: "2026-06-10",
      status: "SIGNED", // Doctor signed
      awareGroup: "WATCH",
    },
    {
      id: 2,
      medicine: "Metformin 850mg",
      dosage: "১টি ট্যাবলেট সকালে নাস্তার সাথে",
      duration: "নিয়মিত (Ongoing)",
      purpose: "টাইপ ২ ডায়াবেটিস",
      prescribedBy: "ডাঃ আব্দুল্লাহ খান (BMDC: A-31204)",
      date: "2026-03-15",
      status: "SIGNED",
      awareGroup: null,
    },
    {
      id: 3,
      medicine: "Azithromycin 500mg (স্ক্যানকৃত খসড়া)",
      dosage: "১টি ট্যাবলেট প্রতিদিন (খসড়া যাচাই আবশ্যক)",
      duration: "৩ দিন",
      purpose: "শ্বাসনালীর সংক্রমণ",
      prescribedBy: "স্বয়ংক্রিয় ওসিআর এক্সট্রাকশন (অস্বাক্ষরিত)",
      date: "2026-09-27",
      status: "DRAFT_UNREVIEWED", // Unreviewed draft
      awareGroup: "WATCH",
    }
  ];

  // Test reports
  const testReports = [
    {
      id: 1,
      testName: "Complete Blood Count (CBC)",
      date: "2026-06-12",
      lab: "Popular Diagnostic Center",
      status: "Completed",
      results: {
        "WBC": "6.5 x10³/μL",
        "Hemoglobin": "14.2 g/dL",
        "Platelets": "250 x10³/μL"
      }
    },
    {
      id: 2,
      testName: "Urine Culture & Sensitivity",
      date: "2026-06-12",
      lab: "Labaid Diagnostics",
      status: "Completed",
      results: {
        "Organism": "E. coli",
        "Sensitivity": "Sensitive to Ciprofloxacin (WATCH)",
      }
    }
  ];

  // Patient record files (synthetic demo placeholder)
  const patientRecordFiles = [
    {
      id: 1,
      title: "প্রেসক্রিপশন কপি - ডাঃ ফাতিমা বেগম",
      date: "2026-06-10",
      type: "Prescription (Verified)"
    }
  ];

  const fadeIn = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  if (scanResult) {
    return (
      <PrescriptionResults
        scanData={scanResult}
        onBack={() => setScanResult(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F8FA]">
      <Navbar />

      {/* Header Bar */}
      <header className="bg-[#0A2342] text-white px-4 py-4 shadow-sm border-b border-[#0F3A66]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#028090] flex items-center justify-center text-white">
              <GiHealthNormal className="text-xl" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold">রোগী ড্যাশবোর্ড (Patient Portal)</h1>
              <p className="text-xs text-slate-300">মেডিক্যাল রেকর্ড ও প্রেসক্রিপশন ভেরিফিকেশন</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex-1 sm:flex-initial bg-[#028090] hover:bg-[#00A896] px-4 py-2.5 rounded-xl text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
              aria-label="Upload prescription"
            >
              <FaFileUpload />
              প্রেসক্রিপশন আপলোড (Upload)
            </button>

            <button
              onClick={() => window.print()}
              className="bg-[#0F3A66] hover:bg-[#13315C] text-slate-200 px-3 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border border-slate-700"
            >
              <FaPrint /> প্রিন্ট
            </button>
          </div>
        </div>
      </header>

      {/* Synthetic Demo Notification */}
      <div className="bg-[#EEF2FF] border-b border-[#C7D2FE] px-4 py-2.5 text-center text-xs text-[#3730A3] font-semibold flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#4F46E5] animate-pulse"></span>
        <span>🧪 ডেমো সিমুলেশন (DEMO SIMULATION) — এটি একটি টেস্ট ড্যাশবোর্ড। প্রদর্শিত রেকর্ড ও পরিসংখ্যান কাল্পনিক এবং বাস্তব কোনো রোগীর তথ্য নয়।</span>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Profile Card */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-[#D1E3EB] shadow-xs overflow-hidden h-fit">
          <div className="bg-[#0F3A66] p-6 text-center text-white">
            <img
              src={patientInfo.photo}
              alt="Patient"
              className="w-20 h-20 rounded-full border-3 border-[#00A896] mx-auto mb-3 object-cover shadow-sm"
            />
            <h2 className="text-lg font-bold">{patientInfo.name}</h2>
            <p className="text-xs text-slate-300 mt-0.5">{patientInfo.age} বছর • {patientInfo.gender}</p>
            <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#028090]/40 text-teal-200 border border-teal-400/40">
              নমুনা প্রোফাইল (DEMO SIMULATION)
            </span>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-[#F4F8FA] p-3 rounded-xl border border-[#D1E3EB]">
                <p className="text-[11px] text-[#627D98] font-medium">রক্তের গ্রুপ (ডেমো)</p>
                <p className="font-bold text-[#102A43] text-sm flex items-center mt-0.5">
                  <MdBloodtype className="text-red-600 mr-1.5 text-base" />
                  {patientInfo.bloodGroup}
                </p>
              </div>
              <div className="bg-[#F4F8FA] p-3 rounded-xl border border-[#D1E3EB]">
                <p className="text-[11px] text-[#627D98] font-medium">উচ্চতা / ওজন (ডেমো)</p>
                <p className="font-bold text-[#102A43] text-sm mt-0.5">{patientInfo.height} / {patientInfo.weight}</p>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-[#D1E3EB] text-xs">
              <div className="flex items-center text-[#334E68]">
                <FaCalendarAlt className="text-[#028090] mr-2.5 text-sm" />
                <div>
                  <p className="text-[11px] text-[#627D98]">সর্বশেষ ভিজিট (সিমুলেটেড):</p>
                  <p className="font-semibold text-[#102A43]">{patientInfo.lastVisit}</p>
                </div>
              </div>
              <div className="flex items-center text-[#334E68]">
                <FaUserMd className="text-[#028090] mr-2.5 text-sm" />
                <div>
                  <p className="text-[11px] text-[#627D98]">প্রধান চিকিৎসক (নমুনা তথ্য):</p>
                  <p className="font-semibold text-[#102A43]">ডাঃ ফাতিমা বেগম (BMDC: A-42190)</p>
                </div>
              </div>
            </div>

            <div className="mt-5 p-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[11px] text-[#065F46] flex items-center gap-2">
              <FaShieldAlt className="text-base shrink-0" />
              <span>কনসেন্ট স্ট্যাটাস: ক্লিনিকাল সেবায় ডাটা শেয়ারিং সক্রিয় (ডেমো সিমুলেশন)</span>
            </div>
          </div>
        </div>

        {/* Main Dashboard Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Prescriptions Section */}
          <div className="bg-white rounded-2xl border border-[#D1E3EB] shadow-xs overflow-hidden">
            <div className="bg-[#F4F8FA] p-4 border-b border-[#D1E3EB] flex justify-between items-center">
              <h2 className="text-base font-bold text-[#102A43] flex items-center">
                <FaPills className="mr-2 text-[#028090]" />
                বর্তমান প্রেসক্রিপশন ও ওষুধ তালিকা (সিমুলেটেড ডেমো)
              </h2>
              <span className="bg-[#E0F2F1] text-[#004D40] font-bold px-2.5 py-0.5 rounded-full text-xs">
                {prescriptions.length}টি নমুনা রেকর্ড (DEMO SIMULATION)
              </span>
            </div>

            <div className="divide-y divide-[#D1E3EB]">
              {prescriptions.map(prescription => (
                <div key={prescription.id} className="p-4 hover:bg-[#F4F8FA]/60 transition">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-[#102A43] text-sm sm:text-base">
                          {prescription.medicine}
                        </h3>
                        {prescription.awareGroup && (
                          <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                            prescription.awareGroup === 'WATCH' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            WHO {prescription.awareGroup}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#627D98] mt-0.5">{prescription.purpose} • <span className="font-semibold text-slate-500">নমুনা ডেমো রেকর্ড</span></p>
                    </div>

                    {/* Security Invariant: Synthetic signed orders must never be displayed as real patient records */}
                    {prescription.status === 'SIGNED' ? (
                      <span className="px-2.5 py-1 text-xs rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold flex items-center gap-1 shadow-xs">
                        <FaCheckCircle className="text-[10px]" /> নমুনা রেকর্ড (DEMO - SIMULATED SIGNED)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-xs rounded-full bg-slate-100 text-slate-800 border border-slate-300 font-bold flex items-center gap-1 shadow-xs">
                        📝 খসড়া (DEMO - DRAFT UNREVIEWED)
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-[#F4F8FA] p-3 rounded-xl border border-[#D1E3EB]">
                    <div>
                      <p className="text-[#627D98] font-medium">সেবনবিধি (Dosage - ডেমো)</p>
                      <p className="font-semibold text-[#102A43] mt-0.5">{prescription.dosage}</p>
                    </div>
                    <div>
                      <p className="text-[#627D98] font-medium">সময়কাল (Duration - ডেমো)</p>
                      <p className="font-semibold text-[#102A43] mt-0.5">{prescription.duration}</p>
                    </div>
                    <div>
                      <p className="text-[#627D98] font-medium">প্রেসক্রাইবার (নমুনা প্রেসক্রিপশন)</p>
                      <p className="font-semibold text-[#102A43] mt-0.5">{prescription.prescribedBy}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Test Reports Section */}
          <div className="bg-white rounded-2xl border border-[#D1E3EB] shadow-xs overflow-hidden">
            <div className="bg-[#F4F8FA] p-4 border-b border-[#D1E3EB] flex justify-between items-center">
              <h2 className="text-base font-bold text-[#102A43] flex items-center">
                <FaFileMedical className="mr-2 text-[#028090]" />
                ল্যাব রিপোর্ট ও অ্যান্টিবায়োটিক সংবেদনশীলতা (সিমুলেটেড ডেমো)
              </h2>
              <span className="bg-[#E0F2F1] text-[#004D40] font-bold px-2.5 py-0.5 rounded-full text-xs">
                {testReports.length}টি নমুনা রিপোর্ট (DEMO SIMULATION)
              </span>
            </div>

            <div className="divide-y divide-[#D1E3EB]">
              {testReports.map(report => (
                <div key={report.id} className="p-4 hover:bg-[#F4F8FA]/60 transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-sm text-[#102A43]">{report.testName}</h3>
                      <p className="text-xs text-[#627D98] mt-0.5">{report.lab} • {report.date} (সিমুলেটেড টেস্ট ডাটা)</p>
                    </div>
                    <span className="px-2.5 py-0.5 text-xs rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-semibold">
                      {report.status} (DEMO SIMULATION)
                    </span>
                  </div>


                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(report.results).map(([key, value]) => (
                      <div key={key} className="bg-[#F4F8FA] p-2.5 rounded-lg border border-[#D1E3EB] text-xs">
                        <span className="text-[#627D98] block">{key}</span>
                        <span className="font-bold text-[#102A43]">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Upload Modal */}
      <PrescriptionUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={handleScanSuccess}
      />

      <Footer />
    </div>
  );
};

export default PatientDashboard;