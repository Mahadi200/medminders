import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaBars, FaTimes, FaMoon, FaSun, FaLanguage, FaUserMd, FaUserInjured, FaHospital, FaPills } from 'react-icons/fa';
import { useAppPreferences } from '../../context/AppPreferences';
const logo = '/image/logo.png';

const Navbar = () => {
  const [portalOpen, setPortalOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { isBangla, isDark, toggleLanguage, toggleTheme } = useAppPreferences();
  const text = isBangla ? {
    guide: 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকারের DGDA ও WHO AWaRe অ্যান্টিবায়োটিক সচেতনতা নির্দেশিকা', emergency: 'জরুরি সেবা: ৯৯৯', hotline: 'স্বাস্থ্য বাতায়ন: ১৬২৬৩', about: 'আমাদের লক্ষ্য', services: 'সেবাসমূহ', contact: 'যোগাযোগ', portal: 'পোর্টাল লগইন', title: 'ক্লিনিকাল ও রোগী পোর্টাল', subtitle: 'ভূমিকা নির্বাচন করে যাচাইকৃত রেকর্ডে প্রবেশ করুন', close: 'বন্ধ করুন'
  } : {
    guide: 'Government of Bangladesh DGDA and WHO AWaRe antibiotic awareness guidance', emergency: 'Emergency: 999', hotline: 'Health hotline: 16263', about: 'About', services: 'Services', contact: 'Contact', portal: 'Portal login', title: 'Clinical and patient portal', subtitle: 'Select your role to access verified clinical records', close: 'Close'
  };
  const items = [{ label: isBangla ? 'হোম' : 'Home', path: '/' }, { label: text.about, path: '/about' }, { label: text.services, path: '/service' }, { label: text.contact, path: '/contact' }];
  const roles = isBangla ? [['চিকিৎসক', 'Doctor', FaUserMd], ['রোগী', 'Patient', FaUserInjured], ['হাসপাতাল', 'Hospital', FaHospital], ['ফার্মেসি', 'Pharmacy', FaPills]] : [['Doctor', 'Doctor', FaUserMd], ['Patient', 'Patient', FaUserInjured], ['Hospital', 'Hospital', FaHospital], ['Pharmacy', 'Pharmacy', FaPills]];
  const chooseRole = (role) => { navigate({ Doctor: '/DoctorAuth', Patient: '/patient-login', Hospital: '/hospital-login', Pharmacy: '/pharmacy-login' }[role]); setPortalOpen(false); };
  return <>
    <header className="bg-white border-b border-[#D1E3EB] sticky top-0 z-30 shadow-xs">
      <div className="bg-[#0A2342] text-white px-4 py-1.5 text-xs"><div className="max-w-7xl mx-auto flex items-center justify-between"><span>{text.guide}</span><span className="hidden sm:inline">{text.emergency} | {text.hotline}</span></div></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-3"><img src={logo} alt="MedMinders Logo" className="h-9 w-auto rounded-lg" /><span className="text-xl font-extrabold text-[#0A2342]">Med<span className="text-[#028090]">Minders</span></span></Link>
        <nav className="hidden md:flex items-center gap-5">{items.map((item) => <Link key={item.path} to={item.path} className="text-sm font-semibold text-[#334E68] hover:text-[#028090]">{item.label}</Link>)}<button onClick={toggleLanguage} className="inline-flex items-center gap-1.5 rounded-lg border border-[#D1E3EB] px-3 py-2 text-xs font-bold text-[#334E68]" aria-label={isBangla ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}><FaLanguage /> {isBangla ? 'EN' : 'বাংলা'}</button><button onClick={toggleTheme} className="rounded-lg border border-[#D1E3EB] p-2 text-[#334E68]" aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>{isDark ? <FaSun /> : <FaMoon />}</button><button onClick={() => setPortalOpen(true)} className="inline-flex items-center gap-2 bg-[#028090] text-white px-4 py-2 rounded-lg text-sm font-bold"><FaUser /> {text.portal}</button></nav>
        <div className="flex md:hidden items-center gap-2"><button onClick={() => setPortalOpen(true)} className="p-2 text-[#028090] font-bold text-xs bg-[#E0F2F1] rounded-lg"><FaUser /></button><button onClick={toggleLanguage} className="p-2 text-[#334E68] font-bold text-xs border border-[#D1E3EB] rounded-lg">{isBangla ? 'EN' : 'বাংলা'}</button><button onClick={toggleTheme} className="p-2 text-[#334E68] border border-[#D1E3EB] rounded-lg">{isDark ? <FaSun /> : <FaMoon />}</button><button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-[#334E68]" aria-label="Toggle navigation menu">{mobileOpen ? <FaTimes /> : <FaBars />}</button></div>
      </div></div>
      {mobileOpen && <div className="md:hidden border-t border-[#D1E3EB] bg-white px-4 py-3 space-y-2">{items.map((item) => <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-[#334E68]">{item.label}</Link>)}</div>}
    </header>
    {portalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A2342]/60 p-4" onClick={() => setPortalOpen(false)}><div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b border-[#D1E3EB] pb-4"><div><h2 className="text-xl font-bold text-[#102A43]">{text.title}</h2><p className="text-xs text-[#627D98] mt-1">{text.subtitle}</p></div><button onClick={() => setPortalOpen(false)} aria-label={text.close}><FaTimes /></button></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">{roles.map(([label, role, Icon]) => <button key={role} onClick={() => chooseRole(role)} className="flex items-center gap-3 text-left p-4 bg-[#F4F8FA] hover:bg-[#E0F2F1] border border-[#D1E3EB] rounded-xl"><Icon className="text-[#028090] text-2xl" /><span className="font-bold text-[#102A43]">{label}</span></button>)}</div><button onClick={() => setPortalOpen(false)} className="mt-5 text-xs text-[#627D98]">{text.close}</button></div></div>}
  </>;
};

export default Navbar;
