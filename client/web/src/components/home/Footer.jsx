import { Link } from 'react-router-dom';
import {
  FaHeartbeat, FaPhoneAlt, FaShieldAlt, FaExternalLinkAlt
} from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="bg-[#0A2342] text-slate-300 pt-12 pb-8 border-t border-[#0F3A66]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand & Purpose */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl font-extrabold text-white">
                Med<span className="text-[#00A896]">Minders</span>
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              বাংলাদেশ স্বাস্থ্য অধিদপ্তরের (DGDA) ন্যাশনাল এএমআর অ্যান্টিবায়োটিক সচেতনতা ও ইলেকট্রনিক প্রেসক্রিপশন ভেরিফিকেশন প্ল্যাটফর্ম।
            </p>
            <div className="flex items-center gap-2 text-xs text-[#00A896] bg-[#0F3A66]/60 p-2.5 rounded-lg border border-[#028090]/40">
              <FaShieldAlt className="text-sm shrink-0" />
              <span>WHO AWaRe 2024 গাইডলাইন ভিত্তিক নিয়ন্ত্রিত ক্যাটালগ</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-slate-700 pb-1.5">
              গুরুত্বপূর্ণ লিঙ্ক
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="hover:text-white transition">হোম পেইজ (Home)</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition">আমাদের লক্ষ্য ও উদ্দেশ্য (About)</Link>
              </li>
              <li>
                <Link to="/service" className="hover:text-white transition">সেবাসমূহ (Clinical Services)</Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition">যোগাযোগ ও সহায়তা (Help Desk)</Link>
              </li>
            </ul>
          </div>

          {/* Clinical Portals */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-slate-700 pb-1.5">
              ক্লিনিকাল পোর্টাল
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/DoctorAuth" className="hover:text-white transition">চিকিৎসক লগইন (Doctor Portal)</Link>
              </li>
              <li>
                <Link to="/patient-login" className="hover:text-white transition">রোগী ড্যাশবোর্ড (Patient Portal)</Link>
              </li>
              <li>
                <Link to="/pharmacy-login" className="hover:text-white transition">ফার্মেসি ডিসপেন্সিং (Pharmacy)</Link>
              </li>
              <li>
                <Link to="/hospital-login" className="hover:text-white transition">হাসপাতাল নজরদারি (Hospital AMR)</Link>
              </li>
            </ul>
          </div>

          {/* Emergency & Governance */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-slate-700 pb-1.5">
              জরুরি হটলাইন ও গভর্ন্যান্স
            </h4>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-red-900/30 border border-red-700/50">
                <span className="font-bold text-red-300 block mb-1">জাতীয় জরুরি সেবা: ৯৯৯</span>
                <p className="text-[11px] text-slate-300">
                  তীব্র অ্যালার্জি, শ্বাসকষ্ট বা অ্যানাফিল্যাক্সিস উপসর্গে অবিলম্বে জরুরি বিভাগে যান।
                </p>
              </div>
              <div className="text-[11px] text-slate-400">
                <span>স্বাস্থ্য বাতায়ন: <strong>১৬২৬৩</strong> | আইইডিসিআর: <strong>১০৬৫৫</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Disclaimer & Copyright */}
        <div className="pt-6 border-t border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} MedMinders Bangladesh. সার্বিক অধিকার সংরক্ষিত।</p>
          <p className="text-[11px] text-slate-400 text-center sm:text-right">
            ক্লিনিকাল নোটিশ: মেডমাইন্ডার্স কোনো জরুরি প্রেসক্রিপশন প্রদানকারী সংস্থা নয়। সকল ওষুধ চিকিৎসকের পরামর্শ অনুযায়ী গ্রহণ করুন।
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;