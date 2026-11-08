import { useEffect, useRef, useState } from 'react';
import { FaBars, FaGlobe, FaMoon, FaSun, FaTimes, FaUserInjured, FaUserMd, FaHospital, FaPills } from 'react-icons/fa';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppPreferences } from '../../context/AppPreferences';
import logo from '../../Polished MedMinders Healthcare Logo.png';

const navItems = [['Home', '/'], ['About', '/about'], ['Services', '/service'], ['Information', '/amr-awareness'], ['Team', '/team'], ['Contact', '/contact']];
const roleItems = [['Patient', '/patient-login', FaUserInjured], ['Doctor', '/doctor-login', FaUserMd], ['Pharmacy', '/pharmacy-login', FaPills], ['Hospital', '/hospital-login', FaHospital]];
const bn = { Home: 'হোম', About: 'আমাদের সম্পর্কে', Services: 'সেবাসমূহ', Information: 'তথ্য', Team: 'দল', Contact: 'যোগাযোগ', Patient: 'রোগী', Doctor: 'চিকিৎসক', Pharmacy: 'ফার্মেসি', Hospital: 'হাসপাতাল' };

export default function Navbar() {
  const { isBangla, isDark, toggleLanguage, toggleTheme } = useAppPreferences();
  const [open, setOpen] = useState(false);
  const [portal, setPortal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const triggerRef = useRef(null);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [location.pathname]);
  const label = value => isBangla ? (bn[value] || value) : value;
  const closePortal = () => { setPortal(false); requestAnimationFrame(() => triggerRef.current?.focus()); };
  const openPortal = () => { setOpen(false); setPortal(true); };
  return <>
    <header className="sticky top-0 z-40 border-b border-[var(--mm-border)] bg-[var(--mm-surface)]/95 shadow-sm backdrop-blur">
      <div className="border-b border-white/10 bg-[#071526] px-4 py-2 text-xs text-slate-200"><div className="mx-auto flex max-w-7xl justify-between"><span>{isBangla ? 'রোগী-নিয়ন্ত্রিত সংযুক্ত স্বাস্থ্যসেবা' : 'Patient-controlled connected care'}</span><span className="hidden sm:inline">Emergency: 999 · Health hotline: 16263</span></div></div>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3 text-xl font-black tracking-tight text-[var(--mm-text)]"><span className="mm-logo-lockup py-1"><img src={logo} alt="MedMinders" className="h-9 w-auto max-w-[170px] object-contain" /></span></Link>
        <nav className="hidden items-center gap-5 lg:flex">{navItems.map(([text, path]) => <Link className={`text-sm font-bold transition ${location.pathname === path ? 'text-[var(--mm-primary)]' : 'text-[var(--mm-text-muted)] hover:text-[var(--mm-primary)]'}`} key={path} to={path}>{label(text)}</Link>)}<button className="mm-focus rounded-lg border border-[var(--mm-border)] p-2 text-[var(--mm-text-muted)]" onClick={toggleLanguage} aria-label="Switch language"><FaGlobe /></button><button className="mm-focus rounded-lg border border-[var(--mm-border)] p-2 text-[var(--mm-text-muted)]" onClick={toggleTheme} aria-label="Toggle theme">{isDark ? <FaSun /> : <FaMoon />}</button><button ref={triggerRef} className="mm-button mm-button-primary" onClick={openPortal}>{isBangla ? 'পোর্টাল' : 'Access portal'}</button></nav>
        <div className="flex items-center gap-2 lg:hidden"><button className="mm-focus rounded-lg border border-[var(--mm-border)] p-2" onClick={toggleLanguage} aria-label="Switch language"><FaGlobe /></button><button className="mm-focus rounded-lg border border-[var(--mm-border)] p-2" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Toggle navigation">{open ? <FaTimes /> : <FaBars />}</button></div>
      </div>
      {open && <div className="border-t border-[var(--mm-border)] bg-[var(--mm-surface)] p-4 lg:hidden"><div className="grid gap-1">{navItems.map(([text, path]) => <Link className="rounded-lg p-3 font-bold text-[var(--mm-text)] hover:bg-[var(--mm-surface-elevated)]" key={path} to={path} onClick={() => setOpen(false)}>{label(text)}</Link>)}</div><button className="mm-button mm-button-primary mt-3 w-full" onClick={openPortal}>{isBangla ? 'পোর্টাল অ্যাক্সেস' : 'Access portal'}</button></div>}
    </header>
    {portal && <div className="fixed inset-0 z-50 grid place-items-center bg-[#071526]/70 p-4" role="dialog" aria-modal="true" aria-label="Access portal" onClick={closePortal}><div className="mm-surface w-full max-w-lg p-6" onClick={event => event.stopPropagation()}><div className="flex items-center justify-between"><div><p className="mm-eyebrow">Portal access</p><h2 className="mt-1 text-2xl font-black">Choose your role</h2></div><button className="mm-focus rounded-lg p-2" onClick={closePortal} aria-label="Close"><FaTimes /></button></div><div className="mt-6 grid gap-3 sm:grid-cols-2">{roleItems.map(([text, path, Icon]) => <button key={path} className="mm-focus flex items-center gap-3 rounded-xl border border-[var(--mm-border)] bg-[var(--mm-surface-elevated)] p-4 text-left font-bold hover:border-[var(--mm-primary)]" onClick={() => { closePortal(); navigate(path); }}><Icon className="text-2xl text-[var(--mm-primary)]" />{label(text)}</button>)}</div></div></div>}
  </>;
}
