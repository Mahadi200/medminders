import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaShieldAlt, FaCamera, FaBookMedical, FaQuestionCircle, FaCheckCircle, FaUserMd, FaPrescriptionBottleAlt } from 'react-icons/fa';
import HelpDesk from './HelpDesk';
import { useAppPreferences } from '../../context/AppPreferences';

const Hero = () => {
  const [showHelpDesk, setShowHelpDesk] = useState(false);
  const { isBangla } = useAppPreferences();
  const copy = isBangla ? {
    badge: 'WHO AWaRe 2024 ও DGDA নির্দেশিকা সমর্থিত জাতীয় AMR প্ল্যাটফর্ম',
    title: 'নিরাপদ প্রেসক্রিপশন ও অ্যান্টিবায়োটিক প্রতিরোধের বিশ্বস্ত মাধ্যম',
    description: 'মেডমাইন্ডার্স প্রেসক্রিপশনের সঠিক পাঠোদ্ধার, AMR অ্যান্টিবায়োটিক শ্রেণিবিন্যাস এবং রোগীর নিরাপদ ওষুধ ব্যবস্থাপনা নিশ্চিত করে।',
    scan: 'প্রেসক্রিপশন স্ক্যান ও যাচাই', guide: 'AMR নির্দেশিকা', help: 'AI হেল্প ডেস্ক',
    protocol: 'WHO AWaRe প্রোটোকল', protocolText: 'অ্যান্টিবায়োটিকের অযাচিত ব্যবহার রোধে Access, Watch এবং Reserve শ্রেণি ম্যাপিং।',
    doctors: 'BMDC চিকিৎসকের যাচাই', doctorsText: 'স্বয়ংক্রিয় OCR শুধুমাত্র যাচাইযোগ্য খসড়া। নিবন্ধিত চিকিৎসকের স্বাক্ষর বাধ্যতামূলক।',
    dispensing: 'নিরাপদ ডিসপেন্সিং', dispensingText: 'ফার্মেসি QR যাচাইয়ের মাধ্যমে রোগীর সংবেদনশীল তথ্য গোপন রেখে নিয়ন্ত্রিত বিতরণ.',
  } : {
    badge: 'WHO AWaRe 2024 and DGDA-guided national AMR platform',
    title: 'Trusted care for safer prescriptions and antibiotic stewardship',
    description: 'MedMinders helps read prescriptions accurately, classify antibiotics for AMR stewardship, and support safer medication management.',
    scan: 'Scan and verify prescription', guide: 'AMR guidance', help: 'AI Help Desk',
    protocol: 'WHO AWaRe protocol', protocolText: 'Map antibiotics into Access, Watch, and Reserve categories to reduce inappropriate use.',
    doctors: 'BMDC doctor verification', doctorsText: 'Automated OCR creates a reviewable draft. A registered doctor sign-off is required.',
    dispensing: 'Safe dispensing', dispensingText: 'Controlled pharmacy distribution protects sensitive patient information through QR verification.',
  };

  return <section className="bg-gradient-to-b from-[#F4F8FA] via-white to-[#F4F8FA] py-14 sm:py-20 border-b border-[#D1E3EB]">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="text-center max-w-3xl mx-auto">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E0F2F1] border border-[#028090]/30 text-[#028090] text-xs font-bold mb-6"><FaShieldAlt /><span>{copy.badge}</span></div>
      <h1 className="text-3xl sm:text-5xl font-extrabold text-[#0A2342] tracking-tight leading-tight sm:leading-snug mb-5">{copy.title}</h1>
      <p className="text-base sm:text-lg text-[#334E68] leading-relaxed mb-8">{copy.description}</p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-12">
        <Link to="/patient-login" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#028090] hover:bg-[#00A896] text-white px-6 py-3.5 rounded-xl font-bold text-base shadow-sm transition"><FaCamera /> {copy.scan}</Link>
        <Link to="/service" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-[#F4F8FA] text-[#0A2342] border border-[#D1E3EB] px-6 py-3.5 rounded-xl font-bold text-base transition"><FaBookMedical className="text-[#028090]" /> {copy.guide}</Link>
        <button onClick={() => setShowHelpDesk(true)} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334E68] px-5 py-3.5 rounded-xl font-semibold text-sm transition"><FaQuestionCircle /> {copy.help}</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left pt-8 border-t border-[#D1E3EB]">
        <div className="bg-white p-4 rounded-xl border border-[#D1E3EB] shadow-xs"><div className="flex items-center gap-2 text-[#059669] text-sm font-bold mb-1"><FaCheckCircle /> {copy.protocol}</div><p className="text-xs text-[#627D98] leading-relaxed">{copy.protocolText}</p></div>
        <div className="bg-white p-4 rounded-xl border border-[#D1E3EB] shadow-xs"><div className="flex items-center gap-2 text-[#028090] text-sm font-bold mb-1"><FaUserMd /> {copy.doctors}</div><p className="text-xs text-[#627D98] leading-relaxed">{copy.doctorsText}</p></div>
        <div className="bg-white p-4 rounded-xl border border-[#D1E3EB] shadow-xs"><div className="flex items-center gap-2 text-[#0F3A66] text-sm font-bold mb-1"><FaPrescriptionBottleAlt /> {copy.dispensing}</div><p className="text-xs text-[#627D98] leading-relaxed">{copy.dispensingText}</p></div>
      </div>
    </div></div>
    <HelpDesk isOpen={showHelpDesk} onClose={() => setShowHelpDesk(false)} />
  </section>;
};

export default Hero;
