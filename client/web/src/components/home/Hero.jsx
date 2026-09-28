import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  FaShieldAlt, FaCamera, FaBookMedical, FaQuestionCircle,
  FaCheckCircle, FaUserMd, FaPrescriptionBottleAlt
} from 'react-icons/fa';
import HelpDesk from './HelpDesk';

const Hero = () => {
  const [showHelpDesk, setShowHelpDesk] = useState(false);

  return (
    <section className="bg-gradient-to-b from-[#F4F8FA] via-white to-[#F4F8FA] py-14 sm:py-20 border-b border-[#D1E3EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E0F2F1] border border-[#028090]/30 text-[#028090] text-xs font-bold mb-6">
            <FaShieldAlt />
            <span>WHO AWaRe 2024 ও DGDA নির্দেশিকা সমর্থিত ন্যাশনাল এএমআর প্ল্যাটফর্ম</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#0A2342] tracking-tight leading-tight sm:leading-snug mb-5">
            নিরাপদ প্রেসক্রিপশন ও অ্যান্টিবায়োটিক প্রতিরোধের বিশ্বস্ত মাধ্যম
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-[#334E68] leading-relaxed mb-8">
            মেডমাইন্ডার্স প্রেসক্রিপশনের সঠিক পাঠোদ্ধার, এএমআর (AMR) অ্যান্টিবায়োটিক শ্রেণিবিন্যাস এবং রোগীর নিরাপদ ওষুধ ব্যবস্থাপনা নিশ্চিত করে।
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-12">
            <Link
              to="/patient-login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#028090] hover:bg-[#00A896] text-white px-6 py-3.5 rounded-xl font-bold text-base shadow-sm transition"
            >
              <FaCamera /> প্রেসক্রিপশন স্ক্যান ও যাচাই (Scan)
            </Link>

            <Link
              to="/service"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-[#F4F8FA] text-[#0A2342] border border-[#D1E3EB] px-6 py-3.5 rounded-xl font-bold text-base transition"
            >
              <FaBookMedical className="text-[#028090]" /> এএমআর নির্দেশিকা (AWaRe Guide)
            </Link>

            <button
              onClick={() => setShowHelpDesk(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334E68] px-5 py-3.5 rounded-xl font-semibold text-sm transition"
            >
              <FaQuestionCircle /> এআই হেল্প ডেস্ক
            </button>
          </div>

          {/* Clinical Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left pt-8 border-t border-[#D1E3EB]">
            <div className="bg-white p-4 rounded-xl border border-[#D1E3EB] shadow-xs">
              <div className="flex items-center gap-2 text-[#059669] text-sm font-bold mb-1">
                <FaCheckCircle /> WHO AWaRe প্রোটোকল
              </div>
              <p className="text-xs text-[#627D98] leading-relaxed">
                অ্যান্টিবায়োটিকের অযাচিত ব্যবহার রোধে Access, Watch এবং Reserve ক্যাটাগরি ম্যাপিং।
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#D1E3EB] shadow-xs">
              <div className="flex items-center gap-2 text-[#028090] text-sm font-bold mb-1">
                <FaUserMd /> BMDC চিকিৎসকের যাচাই
              </div>
              <p className="text-xs text-[#627D98] leading-relaxed">
                স্বয়ংক্রিয় ওসিআর শুধুমাত্র যাচাইযোগ্য খসড়া। নিবন্ধিত ডাক্তারের স্বাক্ষর বাধ্যতামূলক।
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#D1E3EB] shadow-xs">
              <div className="flex items-center gap-2 text-[#0F3A66] text-sm font-bold mb-1">
                <FaPrescriptionBottleAlt /> নিরাপদ ডিসপেন্সিং
              </div>
              <p className="text-xs text-[#627D98] leading-relaxed">
                ফার্মেসি কিউআর ভেরিফিকেশনে রোগীর সংবেদনশীল তথ্য গোপন রেখে নিয়ন্ত্রিত বিতরণ।
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Help Desk Modal */}
      <HelpDesk isOpen={showHelpDesk} onClose={() => setShowHelpDesk(false)} />
    </section>
  );
};

export default Hero;
