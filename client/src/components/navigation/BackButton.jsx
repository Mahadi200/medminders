import { FaArrowLeft } from 'react-icons/fa';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';

const fallbackFor = pathname => {
  if (pathname.startsWith('/patient')) return '/patient-login';
  if (pathname.startsWith('/doctor') || pathname === '/DoctorAuth' || pathname === '/doctor-layout') return '/doctor-login';
  if (pathname.startsWith('/pharmacy')) return '/pharmacy-login';
  if (pathname.startsWith('/hospital')) return '/hospital-login';
  return '/';
};

export default function BackButton({ fallback, dirty = false, onBeforeBack, className = '' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();
  const target = fallback || fallbackFor(location.pathname);
  const goBack = () => {
    if (dirty && !window.confirm('You have unsaved changes. Discard them and go back?')) return;
    if (onBeforeBack && onBeforeBack() === false) return;
    const index = window.history.state?.idx;
    if (navigationType !== 'POP' && Number.isInteger(index) && index > 0) return navigate(-1);
    if (Number.isInteger(index) && index > 0) return navigate(-1);
    if (target !== location.pathname) navigate(target, { replace: true });
  };
  return <button type="button" onClick={goBack} className={`mm-button mm-button-secondary inline-flex items-center gap-2 ${className}`} aria-label="Back / ফিরে যান">
    <FaArrowLeft aria-hidden="true" /> <span>Back / ফিরে যান</span>
  </button>;
}
