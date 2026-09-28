import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaUser, FaBars, FaTimes, FaHeartbeat,
  FaShieldAlt, FaUserMd, FaUserInjured, FaHospital, FaPills, FaPhoneAlt
} from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import logo from '/public/image/logo.png';

const MedicalPortalModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const handleOptionClick = (option) => {
    switch (option) {
      case 'Doctor': navigate('/DoctorAuth'); break;
      case 'Patient': navigate('/patient-login'); break;
      case 'Hospital': navigate('/hospital-login'); break;
      case 'Pharmacy': navigate('/pharmacy-login'); break;
      default: break;
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A2342]/60 backdrop-blur-sm p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="portal-modal-title"
        >
          <motion.div
            initial={{ scale: 0.95, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 15 }}
            className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-lg shadow-2xl border border-[#D1E3EB]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#D1E3EB]">
              <div>
                <h2 id="portal-modal-title" className="text-xl font-bold text-[#102A43]">
                  ক্লিনিকাল ও রোগী পোর্টাল প্রবেশাধিকার
                </h2>
                <p className="text-xs text-[#627D98] mt-0.5">
                  Select your role to access verified clinical records
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-[#627D98] hover:text-[#102A43] p-1.5 rounded-lg hover:bg-slate-100 transition"
                aria-label="Close modal"
              >
                <FaTimes className="text-lg" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
              {[
                {
                  icon: <FaUserMd className="text-[#028090] text-2xl" />,
                  label: 'চিকিৎসক (Doctor)',
                  role: 'Doctor',
                  desc: 'BMDC নিবন্ধিত চিকিৎসক পোর্টাল',
                  badge: 'Doctor Sign-off',
                },
                {
                  icon: <FaUserInjured className="text-[#00A896] text-2xl" />,
                  label: 'রোগী (Patient)',
                  role: 'Patient',
                  desc: 'প্রেসক্রিপশন ও খসড়া যাচাই',
                  badge: 'Self Access',
                },
                {
                  icon: <FaHospital className="text-[#0F3A66] text-2xl" />,
                  label: 'হাসপাতাল (Hospital)',
                  role: 'Hospital',
                  desc: 'ইনপেশেন্ট এএমআর নজরদারি',
                  badge: 'Facility View',
                },
                {
                  icon: <FaPills className="text-[#028090] text-2xl" />,
                  label: 'ফার্মেসি (Pharmacy)',
                  role: 'Pharmacy',
                  desc: 'টোকেন ভেরিফাইড ডিসপেন্সিং',
                  badge: 'Scoped Dispense',
                },
              ].map((item) => (
                <button
                  key={item.role}
                  className="flex flex-col text-left p-4 bg-[#F4F8FA] hover:bg-[#E0F2F1]/50 border border-[#D1E3EB] hover:border-[#028090] rounded-xl transition group"
                  onClick={() => handleOptionClick(item.role)}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    {item.icon}
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-[#334E68] border border-[#D1E3EB]">
                      {item.badge}
                    </span>
                  </div>
                  <span className="font-bold text-[#102A43] text-sm group-hover:text-[#028090] transition">
                    {item.label}
                  </span>
                  <span className="text-xs text-[#627D98] mt-1 leading-snug">
                    {item.desc}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-[#D1E3EB] flex items-center justify-between text-xs text-[#627D98]">
              <span className="flex items-center gap-1.5">
                <FaShieldAlt className="text-[#028090]" /> রোল ভিত্তিক অথেনটিকেশন সক্রিয়
              </span>
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-[#334E68] hover:text-[#102A43] font-medium rounded-lg hover:bg-slate-100"
              >
                বাতিল করুন
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const Navbar = () => {
  const [isPortalOpen, setIsPortalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'হোম (Home)', path: '/' },
    { name: 'আমাদের লক্ষ্য (About)', path: '/about' },
    { name: 'সেবাসমূহ (Services)', path: '/service' },
    { name: 'যোগাযোগ (Contact)', path: '/contact' },
  ];

  return (
    <>
      <header className="bg-white border-b border-[#D1E3EB] sticky top-0 z-30 shadow-xs">
        {/* Top Emergency & Stewardship Bar */}
        <div className="bg-[#0A2342] text-white px-4 py-1.5 text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-[#00A896]"></span>
              <span className="font-medium">
                গণপ্রজাতন্ত্রী বাংলাদেশ সরকারের DGDA ও WHO AWaRe অ্যান্টিবায়োটিক সচেতনতা নির্দেশিকা
              </span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="tel:999"
                className="flex items-center gap-1.5 font-bold text-red-300 hover:text-red-200 transition"
              >
                <FaPhoneAlt className="text-[10px]" /> জরুরি সেবা: ৯৯৯
              </a>
              <span className="hidden sm:inline text-slate-400">|</span>
              <span className="hidden sm:inline text-slate-300">স্বাস্থ্য বাতায়ন: ১৬২৬৩</span>
            </div>
          </div>
        </div>

        {/* Main Navbar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Name */}
            <Link to="/" className="flex items-center gap-3">
              <img
                src={logo}
                alt="MedMinders Logo"
                className="h-9 w-auto rounded-lg"
              />
              <div>
                <span className="text-xl font-extrabold text-[#0A2342] tracking-tight">
                  Med<span className="text-[#028090]">Minders</span>
                </span>
                <span className="hidden md:inline-block ml-2 text-xs font-semibold text-[#627D98] border-l border-slate-300 pl-2">
                  মেডমাইন্ডার্স বাংলাদেশ
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-6">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className="text-sm font-semibold text-[#334E68] hover:text-[#028090] transition-colors py-2"
                >
                  {item.name}
                </Link>
              ))}

              {/* Portal CTA */}
              <button
                onClick={() => setIsPortalOpen(true)}
                className="inline-flex items-center gap-2 bg-[#028090] hover:bg-[#00A896] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-xs transition"
              >
                <FaUser className="text-xs" />
                পোর্টাল লগইন (Portal)
              </button>
            </nav>

            {/* Mobile Menu & Quick Portal Buttons */}
            <div className="flex md:hidden items-center space-x-2">
              <button
                onClick={() => setIsPortalOpen(true)}
                className="p-2 text-[#028090] font-bold text-xs bg-[#E0F2F1] rounded-lg border border-[#D1E3EB] flex items-center gap-1"
                aria-label="Open portal modal"
              >
                <FaUser /> পোর্টাল
              </button>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-[#334E68] hover:text-[#0A2342] rounded-lg focus:outline-none"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? <FaTimes className="h-5 w-5" /> : <FaBars className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Nav */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-[#D1E3EB] bg-white px-4 py-3 space-y-2"
            >
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className="block py-2 text-sm font-medium text-[#334E68] hover:text-[#028090]"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-[#627D98]">
                <span>জাতীয় স্বাস্থ্য হেল্পলাইন: ১৬২৬৩</span>
                <a href="tel:999" className="text-red-600 font-bold">জরুরি: ৯৯৯</a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Role Portal Modal */}
      <MedicalPortalModal
        isOpen={isPortalOpen}
        onClose={() => setIsPortalOpen(false)}
      />
    </>
  );
};

export default Navbar;