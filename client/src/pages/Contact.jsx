import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaEnvelope, FaMapMarkerAlt, FaPhone } from 'react-icons/fa';
import Navbar from '../components/home/Navbar';
import Footer from '../components/home/Footer';

const Contact = () => {
  const [sent, setSent] = useState(false);
  return <div className="min-h-screen bg-[#F4F8FA]"><Navbar /><main className="max-w-6xl mx-auto px-4 py-16"><motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12"><h1 className="text-4xl font-extrabold text-[#0A2342]">Contact MedMinders</h1><p className="text-[#627D98] mt-3">Questions about the platform? Our support team is ready to help.</p></motion.div><div className="grid md:grid-cols-2 gap-8"><div className="bg-[#0A2342] text-white rounded-2xl p-8"><h2 className="text-2xl font-bold">Get in touch</h2><div className="space-y-5 mt-8 text-slate-200"><p className="flex gap-3 items-center"><FaPhone className="text-[#00A896]" /> Emergency: 999</p><p className="flex gap-3 items-center"><FaEnvelope className="text-[#00A896]" /> support@medminders.local</p><p className="flex gap-3 items-center"><FaMapMarkerAlt className="text-[#00A896]" /> Dhaka, Bangladesh</p></div></div><form onSubmit={(event) => { event.preventDefault(); setSent(true); }} className="bg-white rounded-2xl p-8 border border-[#D1E3EB] shadow-sm space-y-4"><input required className="w-full rounded-lg border border-[#D1E3EB] p-3" placeholder="Your name" /><input required type="email" className="w-full rounded-lg border border-[#D1E3EB] p-3" placeholder="Email address" /><textarea required className="w-full rounded-lg border border-[#D1E3EB] p-3" rows="5" placeholder="How can we help?" /><button className="w-full rounded-lg bg-[#028090] text-white font-bold py-3 hover:bg-[#00A896]">{sent ? 'Message sent' : 'Send message'}</button></form></div></main><Footer /></div>;
};

export default Contact;
