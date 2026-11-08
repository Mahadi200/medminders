import { FaHeartbeat, FaShieldAlt } from 'react-icons/fa';
import logo from '../../assets/brand/medminders-logo.png';

const MediMindersLoader = () => (
  <div className="mm-loader fixed inset-0 z-[9999] flex items-center justify-center p-4">
    <div className="mm-loader-card w-full max-w-sm text-center">
      <div className="mm-loader-orbit mx-auto mb-5" aria-hidden="true"><span className="mm-loader-cross">+</span><FaHeartbeat className="mm-loader-heartbeat" /></div>
      <div className="mm-logo-lockup mx-auto mb-4 w-fit"><img src={logo} alt="MedMinders" className="h-12 w-auto object-contain" /></div>
      <div className="flex items-center justify-center gap-2 text-[var(--mm-primary)]"><FaShieldAlt className="text-sm" /><span className="text-xs font-bold uppercase tracking-[.18em]">Connected care</span></div>
      <p className="mt-3 text-sm text-[var(--mm-text-muted)]">Preparing your secure medical workspace…</p>
      <div className="mm-loader-progress mt-5" role="progressbar" aria-label="Loading MedMinders"><span /></div>
      <span className="mt-3 block text-[11px] text-[var(--mm-text-muted)]">Prescription and care data stay protected.</span>
    </div>
  </div>
);

export default MediMindersLoader;
