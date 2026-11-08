import Navbar from '../home/Navbar';
import Footer from '../home/Footer';
import BackButton from '../navigation/BackButton';
import { useLocation } from 'react-router-dom';
import AssistantWidget from '../public/AssistantWidget';

export default function PublicLayout({ children, className = '' }) {
  const location = useLocation();
  return <div className={`mm-page flex min-h-screen flex-col ${className}`}><Navbar /><main className="flex-1">{location.pathname !== '/' && <div className="mx-auto max-w-7xl px-5 pt-5"><BackButton fallback="/" /></div>}{children}</main><Footer /><AssistantWidget /></div>;
}
