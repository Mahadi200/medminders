import { Link } from 'react-router-dom';
import { FaEnvelope } from 'react-icons/fa';
import logo from '../../Polished MedMinders Healthcare Logo.png';

const groups = [
  ['Explore', [['Home', '/'], ['About', '/about'], ['Services', '/service'], ['Information', '/amr-awareness'], ['Team', '/team'], ['Contact', '/contact']]],
  ['Portals', [['Patient', '/patient-login'], ['Doctor', '/doctor-login'], ['Pharmacy', '/pharmacy-login'], ['Hospital', '/hospital-login']]],
];

export default function Footer() {
  return <footer className="mm-depth-panel border-t border-[#173654] px-5 py-14 text-slate-300">
    <div className="relative z-10 mx-auto max-w-6xl">
      <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="mm-logo-lockup"><img src={logo} alt="MedMinders" className="h-12 w-auto max-w-[220px] object-contain" /></div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed">A patient-controlled platform for connected prescription workflows, consent-based sharing, pharmacy supply records, diagnostics, and antibiotic awareness.</p>
          <p className="mt-5 flex items-center gap-2 text-sm text-cyan-200"><FaEnvelope /> support@medminders.local</p>
        </div>
        {groups.map(([title, links]) => <div key={title}><h2 className="font-bold text-white">{title}</h2><ul className="mt-4 space-y-3 text-sm">{links.map(([label, path]) => <li key={path}><Link className="hover:text-white" to={path}>{label}</Link></li>)}</ul></div>)}
        <div><h2 className="font-bold text-white">Safety</h2><p className="mt-4 text-sm leading-relaxed">MedMinders is not an emergency service. For severe allergy or breathing difficulty, seek emergency care and call 999 in Bangladesh.</p><Link className="mt-4 inline-block text-sm font-bold text-cyan-200 underline" to="/amr-awareness">Read AMR information</Link></div>
      </div>
      <div className="mt-12 flex flex-col justify-between gap-3 border-t border-[#2d526d] pt-6 text-xs text-slate-400 sm:flex-row"><p>© {new Date().getFullYear()} MedMinders. All rights reserved.</p><p>Education is not individualized medical advice.</p></div>
    </div>
  </footer>;
}
