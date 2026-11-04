import { Link } from 'react-router-dom';
import { FaShieldAlt } from 'react-icons/fa';
import { useAppPreferences } from '../../context/AppPreferences';

const Footer = () => {
  const { isBangla } = useAppPreferences();
  const copy = isBangla ? {
    description: 'বাংলাদেশের জাতীয় AMR অ্যান্টিবায়োটিক সচেতনতা ও ইলেকট্রনিক প্রেসক্রিপশন যাচাই প্ল্যাটফর্ম।',
    badge: 'WHO AWaRe 2024 গাইডলাইনভিত্তিক নিয়ন্ত্রিত ক্যাটালগ', quick: 'গুরুত্বপূর্ণ লিংক', portals: 'ক্লিনিকাল পোর্টাল', emergency: 'জরুরি হটলাইন ও গভর্ন্যান্স',
    home: 'হোম', about: 'আমাদের লক্ষ্য ও উদ্দেশ্য', services: 'সেবাসমূহ', contact: 'যোগাযোগ ও সহায়তা', doctor: 'চিকিৎসক লগইন', patient: 'রোগী ড্যাশবোর্ড', pharmacy: 'ফার্মেসি ডিসপেন্সিং', hospital: 'হাসপাতাল নজরদারি',
    emergencyText: 'তীব্র অ্যালার্জি, শ্বাসকষ্ট বা অ্যানাফাইল্যাক্সিসের উপসর্গে অবিলম্বে জরুরি বিভাগে যান।', rights: 'সর্বস্বত্ব সংরক্ষিত।', notice: 'ক্লিনিকাল নোটিশ: MedMinders জরুরি প্রেসক্রিপশন প্রদানকারী সংস্থা নয়। সকল ওষুধ চিকিৎসকের পরামর্শ অনুযায়ী গ্রহণ করুন।'
  } : {
    description: 'Bangladesh national platform for AMR awareness and electronic prescription verification.',
    badge: 'Controlled catalogue based on WHO AWaRe 2024 guidance', quick: 'Important links', portals: 'Clinical portals', emergency: 'Emergency & governance',
    home: 'Home', about: 'About us', services: 'Services', contact: 'Contact & help desk', doctor: 'Doctor login', patient: 'Patient dashboard', pharmacy: 'Pharmacy dispensing', hospital: 'Hospital monitoring',
    emergencyText: 'Seek emergency care immediately for severe allergy, breathing difficulty, or anaphylaxis symptoms.', rights: 'All rights reserved.', notice: 'Clinical notice: MedMinders is not an emergency prescription provider. Take all medicines only as directed by a doctor.'
  };
  return <footer className="bg-[#0A2342] text-slate-300 pt-12 pb-8 border-t border-[#0F3A66]
  "><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
    <div><div className="text-xl font-extrabold text-white mb-3">Med<span className="text-[#00A896]">Minders</span></div><p className="text-xs leading-relaxed mb-4">{copy.description}</p><div className="flex items-center gap-2 text-xs text-[#00A896] bg-[#0F3A66]/60 p-2.5 rounded-lg border border-[#028090]/40"><FaShieldAlt /><span>{copy.badge}</span></div></div>
    <FooterLinks title={copy.quick} links={[[copy.home, '/'], [copy.about, '/about'], [copy.services, '/service'], [copy.contact, '/contact']]} />
    <FooterLinks title={copy.portals} links={[[copy.doctor, '/DoctorAuth'], [copy.patient, '/patient-login'], [copy.pharmacy, '/pharmacy-login'], [copy.hospital, '/hospital-login']]} />
    <div><h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-slate-700 pb-1.5">{copy.emergency}</h4><div className="p-3 rounded-lg bg-red-900/30 border border-red-700/50 text-xs"><span className="font-bold text-red-300 block mb-1">National emergency: 999</span><p className="text-[11px]">{copy.emergencyText}</p></div><p className="text-[11px] text-slate-400 mt-3">Health hotline: <strong>16263</strong> | IEDCR: <strong>10655</strong></p></div>
  </div><div className="pt-6 border-t border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4"><p>© {new Date().getFullYear()} MedMinders Bangladesh. {copy.rights}</p><p className="text-[11px] text-center sm:text-right">{copy.notice}</p></div></div></footer>;
};

const FooterLinks = ({ title, links }) => <div><h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-slate-700 pb-1.5">{title}</h4><ul className="space-y-2 text-xs">{links.map(([label, path]) => <li key={path}><Link to={path} className="hover:text-white transition">{label}</Link></li>)}</ul></div>;

export default Footer;
