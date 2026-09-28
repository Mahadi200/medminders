import { FaShieldAlt } from 'react-icons/fa';

const MediMindersLoader = () => {
  return (
    <div className="fixed inset-0 bg-[#F4F8FA] flex flex-col items-center justify-center z-50 p-4">
      <div className="bg-white p-8 rounded-2xl border border-[#D1E3EB] shadow-lg max-w-sm w-full text-center">
        {/* Authoritative Badge Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[#E0F2F1] text-[#028090] flex items-center justify-center mx-auto mb-4 border border-[#00A896]/30">
          <FaShieldAlt className="text-3xl animate-pulse" />
        </div>

        {/* Brand Title */}
        <h2 className="text-xl font-bold text-[#102A43]">
          Med<span className="text-[#028090]">Minders</span>
        </h2>
        <p className="text-xs font-semibold text-[#0F3A66] mt-0.5">
          বাংলাদেশ জাতীয় এএমআর ও প্রেসক্রিপশন প্ল্যাটফর্ম
        </p>

        {/* Status Message */}
        <p className="text-xs text-[#627D98] mt-4 mb-4">
          ক্লিনিকাল ডেটা ও ক্যাটালগ সিঙ্ক্রোনাইজ হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন।
        </p>

        {/* Minimal Accessible Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div className="bg-[#028090] h-full w-2/3 rounded-full animate-pulse"></div>
        </div>

        <span className="text-[11px] text-slate-400 mt-3 block">
          DGDA / WHO AWaRe 2024 কমপ্লায়েন্ট
        </span>
      </div>
    </div>
  );
};

export default MediMindersLoader;