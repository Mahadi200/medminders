import { useEffect, useRef, useState } from 'react';
import { FaCommentMedical, FaTimes } from 'react-icons/fa';
import { careApi } from '../../services/careApi';
import { useAppPreferences } from '../../context/AppPreferences';
import { BookingDialog, SampleBadge } from './DoctorCatalogue';

/** MedMinders Assistant: finds the right specialist and nearby hospital from real catalogue data. Never diagnoses or names medicines. */
export default function AssistantWidget() {
  const { isBangla } = useAppPreferences();
  const t = (en, bn) => (isBangla ? bn : en);
  const [open, setOpen] = useState(false);
  const [conditions, setConditions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [location, setLocation] = useState(null); // {lat,lng} | {area}
  const [pending, setPending] = useState(null);
  const [book, setBook] = useState(null);
  const end = useRef(null);
  useEffect(() => { if (open && !conditions.length) careApi('/assistant/conditions').then(setConditions).catch(() => setConditions([])); }, [open]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  async function ask(body, label) {
    setMessages(m => [...m, { from: 'me', text: label }]);
    setTyping(true);
    try {
      const r = await careApi('/assistant/ask', { method: 'POST', body: { ...body, ...(location || {}) } });
      setMessages(m => [...m, { from: 'bot', data: r }]);
      if (r.condition && !location) setPending(body);
    } catch (e) { setMessages(m => [...m, { from: 'bot', text: e.message }]); }
    finally { setTyping(false); }
  }
  const useMyLocation = () => navigator.geolocation?.getCurrentPosition(
    p => { const loc = { lat: p.coords.latitude, lng: p.coords.longitude }; setLocation(loc); if (pending) { setPending(null); askWith(loc); } },
    () => setMessages(m => [...m, { from: 'bot', text: t('Location not shared. Choose your area instead.', 'অবস্থান শেয়ার করা হয়নি। আপনার এলাকা বেছে নিন।'), areas: true }]));
  const askWith = loc => pending && careApi('/assistant/ask', { method: 'POST', body: { ...pending, ...loc } }).then(r => setMessages(m => [...m, { from: 'bot', data: r }]));
  const chooseArea = area => { const loc = { area }; setLocation(loc); askWith(loc); setPending(null); };

  return <>
    <button onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={t('Open MedMinders Assistant', 'MedMinders সহকারী খুলুন')}
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-400 text-2xl text-white shadow-[0_0_30px_rgba(45,212,191,.55)] transition hover:scale-105 focus-visible:outline focus-visible:outline-4 focus-visible:outline-cyan-300">
      {open ? <FaTimes /> : <FaCommentMedical />}</button>
    {open && <section role="dialog" aria-label="MedMinders Assistant" className="fixed bottom-24 right-3 z-40 flex max-h-[75vh] w-[min(25rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#0B1D35]/95 text-white shadow-2xl backdrop-blur-xl">
      <header className="border-b border-white/10 p-4"><p className="font-bold">MedMinders Assistant</p><p className="text-xs text-cyan-100/80">{t('This assistant helps you find the right doctor; it does not give medical advice.', 'এই সহকারী সঠিক চিকিৎসক খুঁজে পেতে সাহায্য করে; এটি চিকিৎসা পরামর্শ দেয় না।')}</p></header>
      <div className="flex-1 space-y-3 overflow-auto p-4 text-sm">
        <p className="rounded-2xl bg-white/10 p-3">{t('What problem do you need help with? Pick one or type it.', 'কোন সমস্যার জন্য সাহায্য চান? বেছে নিন বা লিখুন।')}</p>
        {!messages.length && <div className="flex flex-wrap gap-1.5">{conditions.map(c => <button key={c.key} onClick={() => ask({ condition_key: c.key }, isBangla ? c.name_bn : c.name_en)} className="rounded-full border border-cyan-300/40 px-3 py-1.5 text-xs hover:bg-cyan-300/15">{isBangla ? c.name_bn : c.name_en}</button>)}</div>}
        {messages.map((m, i) => m.from === 'me' ? <p key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl bg-teal-600 px-3 py-2">{m.text}</p> : <BotReply key={i} m={m} t={t} isBangla={isBangla} onBook={setBook} onArea={chooseArea} onLocate={useMyLocation} hasLocation={!!location} />)}
        {typing && <p className="w-fit rounded-2xl bg-white/10 px-3 py-2" aria-live="polite"><span className="animate-pulse">●●●</span></p>}
        <div ref={end} />
      </div>
      <form className="flex gap-2 border-t border-white/10 p-3" onSubmit={e => { e.preventDefault(); if (text.trim()) { ask({ message: text.trim() }, text.trim()); setText(''); } }}>
        <input className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-2 placeholder:text-white/50" placeholder={t('e.g. fever and cough', 'যেমন: জ্বর ও কাশি')} value={text} onChange={e => setText(e.target.value)} aria-label="Message" maxLength={300} />
        <button className="rounded-xl bg-teal-500 px-4 font-bold">{t('Send', 'পাঠান')}</button>
      </form>
    </section>}
    {book && <BookingDialog doctor={book} onClose={() => setBook(null)} />}
  </>;
}

function BotReply({ m, t, isBangla, onBook, onArea, onLocate, hasLocation }) {
  if (!m.data) return <div className="w-fit max-w-[90%] rounded-2xl bg-white/10 p-3"><p>{m.text}</p>{m.areas && <AreaPicker onArea={onArea} />}</div>;
  const r = m.data;
  return <div className="space-y-2">
    {r.urgent && <div role="alert" className="rounded-2xl border-2 border-red-400 bg-red-600/90 p-3 font-semibold">🚨 {isBangla ? r.urgent.bn : r.urgent.en} <a href="tel:999" className="underline">999</a></div>}
    {r.condition ? <p className="rounded-2xl bg-white/10 p-3">{isBangla ? r.condition.bn : r.condition.en} → <strong>{r.specialty}</strong>{(isBangla ? r.condition.note_bn : r.condition.note_en) ? ` · ${isBangla ? r.condition.note_bn : r.condition.note_en}` : ''}{r.message ? ` ${isBangla ? r.message.bn : r.message.en}` : ''}</p>
      : <p className="rounded-2xl bg-white/10 p-3">{isBangla ? r.message?.bn : r.message?.en}</p>}
    {r.doctors?.map(d => <div key={d.id} className="rounded-2xl bg-white p-3 text-slate-900"><p className="font-bold">{d.name} {d.is_sample && <SampleBadge />}</p><p className="text-xs">{d.specialty} · ৳{Number(d.fee_bdt || 0).toFixed(0)} · {d.affiliations.map(a => a.organization_name).join(', ')}</p>
      <p className="text-xs">{d.next_available ? `${t('Next', 'পরবর্তী')}: ${new Date(d.next_available.starts_at).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', weekday: 'short', hour: '2-digit', minute: '2-digit' })}` : t('No open slot soon', 'শীঘ্রই খালি সময় নেই')}</p>
      <button className="mt-2 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-bold text-white" onClick={() => onBook(d)}>{t('Book', 'বুক করুন')}</button></div>)}
    {r.condition && !r.doctors?.length && <p className="rounded-2xl bg-white/10 p-3">{t('No doctor for this specialty is on MedMinders yet.', 'এই বিষয়ের চিকিৎসক এখনো MedMinders-এ নেই।')}</p>}
    {r.nearest_hospital && <div className="rounded-2xl border border-cyan-300/40 p-3"><p className="text-xs uppercase tracking-wide text-cyan-200">{t('Nearest hospital with this specialist', 'এই বিশেষজ্ঞসহ নিকটতম হাসপাতাল')}</p><p className="font-bold">{r.nearest_hospital.name}</p>
      <p className="text-xs">{r.nearest_hospital.area}{r.nearest_hospital.distance_km != null ? ` · ${r.nearest_hospital.distance_km} km` : ''}</p><a className="text-xs text-cyan-200 underline" href={r.nearest_hospital.directions_url} target="_blank" rel="noreferrer">{t('Directions', 'দিকনির্দেশ')}</a></div>}
    {r.condition && !hasLocation && <div className="rounded-2xl bg-white/10 p-3"><p>{t('Sort hospitals by distance?', 'দূরত্ব অনুযায়ী হাসপাতাল সাজাবো?')}</p><button className="mt-1 rounded-lg bg-teal-500 px-3 py-1 text-xs font-bold" onClick={onLocate}>{t('Use my location', 'আমার অবস্থান ব্যবহার করুন')}</button><AreaPicker onArea={onArea} areas={r.areas} /></div>}
    <p className="text-[11px] text-white/60">{isBangla ? r.disclaimer.bn : r.disclaimer.en}</p>
  </div>;
}

function AreaPicker({ onArea, areas = ['Sonadanga', 'Boyra', 'KDA Avenue', 'Khalishpur', 'Daulatpur', 'Khulna Sadar', 'Gollamari', 'Nirala'] }) {
  return <div className="mt-2 flex flex-wrap gap-1">{areas.map(a => <button key={a} onClick={() => onArea(a)} className="rounded-full border border-white/30 px-2 py-0.5 text-xs">{a}</button>)}</div>;
}
