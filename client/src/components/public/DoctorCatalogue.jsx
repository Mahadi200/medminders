import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaCheckCircle, FaSearch } from 'react-icons/fa';
import { ApiImage, careApi } from '../../services/careApi';
import { useAppPreferences } from '../../context/AppPreferences';

const TZ = 'Asia/Dhaka';
const DAYS = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'];
const field = 'w-full rounded-xl border border-[var(--mm-border)] bg-[var(--mm-surface)] px-3 py-2.5 text-[var(--mm-text)]';
const initials = name => name.replace(/^Dr\.?\s*/, '').replace(/^Sample\s+/, '').split(' ').map(p => p[0]).slice(0, 2).join('');

export function useCatalogue(params = '') {
  const [data, setData] = useState({ doctors: [], specialties: [], hospitals: [], loaded: false, error: false });
  useEffect(() => {
    careApi('/public/doctors' + params).then(d => setData({ ...d, loaded: true, error: false }))
      .catch(e => { console.warn('[MedMinders] catalogue unavailable', e); setData(x => ({ ...x, loaded: true, error: true })); });
  }, [params]);
  return data;
}

export function SampleBadge() {
  return <span className="rounded-full border border-amber-400/60 bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-900">Sample profile</span>;
}

export function DoctorCard({ doctor, onBook }) {
  const next = doctor.next_available;
  const aff = doctor.affiliations?.[0];
  return <article className="mm-surface flex flex-col gap-3 p-5 transition hover:-translate-y-0.5">
    <div className="flex items-start gap-3">
      <ApiImage path={doctor.has_photo ? `/doctors/${doctor.id}/photo` : null} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-[var(--mm-primary)]/40"
        fallback={<span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-teal-100 text-lg font-bold text-teal-900">{initials(doctor.name)}</span>} />
      <div className="min-w-0">
        <h3 className="font-bold leading-tight">{doctor.name}</h3>
        <p className="text-sm font-semibold text-[var(--mm-primary-strong)]">{doctor.specialty}</p>
        <p className="mm-muted text-xs">{doctor.qualifications}</p>
        <div className="mt-1 flex flex-wrap gap-1"><span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-900"><FaCheckCircle aria-hidden="true" /> BMDC verified</span>{doctor.is_sample && <SampleBadge />}</div>
      </div>
    </div>
    <div className="text-sm"><p>{aff?.organization_name}{aff?.area ? ` · ${aff.area}` : ''}{doctor.affiliations.length > 1 ? ` +${doctor.affiliations.length - 1}` : ''}</p>
      <p className="mm-muted">Fee ৳{Number(doctor.fee_bdt || aff?.fee_bdt || 0).toFixed(0)} · {doctor.experience_years ?? '—'} yrs{doctor.languages ? ` · ${doctor.languages}` : ''}</p>
      <p className="font-semibold">{next ? `Next: ${new Date(next.starts_at).toLocaleString('en-GB', { timeZone: TZ, weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'No open slot in the next 2 weeks'}</p></div>
    <div className="mt-auto flex gap-2"><button className="mm-button mm-button-primary flex-1" onClick={() => onBook(doctor)} disabled={!next}>Book appointment</button><Link className="mm-button mm-button-secondary" to={`/doctors/${doctor.id}`}>Details</Link></div>
  </article>;
}

export default function DoctorCatalogue({ limit, compact = false, title = 'Find a doctor', initialSpecialty = '' }) {
  const { isBangla } = useAppPreferences();
  const cat = useCatalogue();
  const [q, setQ] = useState('');
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [hospital, setHospital] = useState('');
  const [area, setArea] = useState('');
  const [day, setDay] = useState('');
  const [today, setToday] = useState(false);
  const [booking, setBooking] = useState(null);
  const areas = useMemo(() => [...new Set(cat.hospitals.map(h => h.area).filter(Boolean))], [cat.hospitals]);
  const todayCode = new Date().toLocaleDateString('en-GB', { timeZone: TZ, weekday: 'short' }).toUpperCase().slice(0, 3);
  const list = cat.doctors.filter(d => (!q || `${d.name} ${d.specialty} ${d.qualifications} ${d.affiliations.map(a => a.organization_name).join(' ')}`.toLowerCase().includes(q.toLowerCase()))
    && (!specialty || d.specialty === specialty) && (!hospital || d.affiliations.some(a => a.organization_id === hospital)) && (!area || d.affiliations.some(a => a.area === area))
    && (!day || d.affiliations.some(a => a.visiting_days.includes(day))) && (!today || d.affiliations.some(a => a.visiting_days.includes(todayCode))));
  if (cat.loaded && (cat.error || !cat.doctors.length)) return null; // hide the section when the catalogue is unavailable or empty
  const shown = limit ? list.slice(0, limit) : list;
  return <section id="doctors" className="px-5 py-14" aria-label={title}><div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="mm-eyebrow">{isBangla ? 'চিকিৎসক খুঁজুন' : 'Doctor catalogue'}</p><h2 className="mt-1 text-3xl font-black">{title}</h2></div>
      {compact && <Link to="/doctors" className="font-bold text-[var(--mm-primary-strong)] underline">See all doctors →</Link>}</div>
    <div className={`mt-5 grid gap-2 ${compact ? 'md:grid-cols-[2fr_1fr_1fr]' : 'md:grid-cols-3 lg:grid-cols-6'}`}>
      <label className="relative md:col-span-1 lg:col-span-2"><span className="sr-only">Search by name, specialty or hospital</span><FaSearch className="mm-muted absolute left-3 top-3.5" aria-hidden="true" /><input className={`${field} pl-9`} placeholder="Name, specialty or hospital" value={q} onChange={e => setQ(e.target.value)} /></label>
      <label><span className="sr-only">Specialty</span><select className={field} value={specialty} onChange={e => setSpecialty(e.target.value)}><option value="">All specialties</option>{cat.specialties.map(s => <option key={s}>{s}</option>)}</select></label>
      <label><span className="sr-only">Hospital</span><select className={field} value={hospital} onChange={e => setHospital(e.target.value)}><option value="">All hospitals</option>{cat.hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
      {!compact && <><label><span className="sr-only">Area</span><select className={field} value={area} onChange={e => setArea(e.target.value)}><option value="">All areas</option>{areas.map(a => <option key={a}>{a}</option>)}</select></label>
        <div className="flex gap-2"><label className="flex-1"><span className="sr-only">Visiting day</span><select className={field} value={day} onChange={e => setDay(e.target.value)}><option value="">Any day</option>{DAYS.map(d => <option key={d}>{d}</option>)}</select></label>
          <label className="flex items-center gap-1 whitespace-nowrap text-sm"><input type="checkbox" checked={today} onChange={e => setToday(e.target.checked)} /> Today</label></div></>}
    </div>
    {!cat.loaded && <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map(i => <div key={i} className="mm-surface h-56 animate-pulse" />)}</div>}
    {cat.loaded && !shown.length && <p className="mm-muted mt-6">No doctor matches these filters. Try another specialty or day.</p>}
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{shown.map(d => <DoctorCard key={d.id} doctor={d} onBook={setBooking} />)}</div>
    {booking && <BookingDialog doctor={booking} onClose={() => setBooking(null)} />}
  </div></section>;
}

/** Booking with mandatory phone OTP. Creates or links the patient profile; signs the patient in on success. */
export function BookingDialog({ doctor, onClose }) {
  const [affId, setAffId] = useState(doctor.affiliations[0]?.id || '');
  const [date, setDate] = useState(doctor.next_available?.date || new Date().toLocaleDateString('en-CA', { timeZone: TZ }));
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState({ name: '', date_of_birth: '', phone: '', sex: '', scheduled_at: '', visit_reason: '' });
  const [otp, setOtp] = useState({ challenge: '', code: '', verification: '', dev: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(null);
  const phoneOk = /^(?:\+?88)?01[3-9]\d{8}$/.test(form.phone.replace(/[\s-]/g, ''));
  useEffect(() => { if (!affId || !date) return; careApi(`/affiliations/${affId}/slots?date=${date}`).then(r => setSlots(r.slots)).catch(() => setSlots([])); }, [affId, date]);
  const run = async fn => { setBusy(true); setMsg(''); try { await fn(); } catch (e) { setMsg(e.message); } finally { setBusy(false); } };
  const send = () => run(async () => { const r = await careApi('/public/otp', { method: 'POST', body: { phone: form.phone } }); setOtp({ challenge: r.challenge_id, code: '', verification: '', dev: r.dev_code || '' }); setMsg('Code sent. It expires in 5 minutes.'); });
  const verify = () => run(async () => { const r = await careApi('/public/otp/verify', { method: 'POST', body: { challenge_id: otp.challenge, code: otp.code } }); setOtp(o => ({ ...o, verification: r.verification_id })); setMsg('Phone verified.'); });
  const book = e => { e.preventDefault(); run(async () => {
    const r = await careApi('/public/bookings', { method: 'POST', body: { verification_id: otp.verification, affiliation_id: affId, name: form.name, date_of_birth: form.date_of_birth, sex: form.sex || undefined, scheduled_at: form.scheduled_at, visit_reason: form.visit_reason || undefined } });
    sessionStorage.setItem('medminders_token', r.token); setDone(r.booking);
  }); };
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="book-title">
    <div className="max-h-[94vh] w-full max-w-xl overflow-auto rounded-t-3xl bg-[var(--mm-surface)] p-6 text-[var(--mm-text)] shadow-2xl sm:rounded-3xl">
      <div className="flex items-start justify-between gap-3"><div><p className="mm-eyebrow">Book appointment</p><h2 id="book-title" className="text-xl font-bold">{doctor.name}</h2><p className="mm-muted text-sm">{doctor.specialty}</p></div><button onClick={onClose} className="mm-button mm-button-secondary" aria-label="Close">✕</button></div>
      {done ? <div className="mt-5 space-y-3"><p className="text-2xl">✅</p><h3 className="text-lg font-bold">Booking received</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm"><dt className="mm-muted">Booking ID</dt><dd className="font-mono">{done.id.slice(-8)}</dd><dt className="mm-muted">Hospital</dt><dd>{done.organization_name}</dd><dt className="mm-muted">Doctor</dt><dd>{done.doctor_name}</dd><dt className="mm-muted">Requested time</dt><dd>{new Date(done.scheduled_at.replace(' ', 'T') + 'Z').toLocaleString('en-GB', { timeZone: TZ })}</dd><dt className="mm-muted">Status</dt><dd className="font-semibold text-amber-700">Waiting for hospital confirmation</dd></dl>
        <Link to="/patient-login" className="mm-button mm-button-primary w-full">Open my dashboard</Link></div>
      : <form onSubmit={book} className="mt-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Hospital / chamber<select className={field} value={affId} onChange={e => setAffId(e.target.value)}>{doctor.affiliations.map(a => <option key={a.id} value={a.id}>{a.organization_name}</option>)}</select></label>
          <label className="text-sm">Date<input type="date" className={field} value={date} min={new Date().toLocaleDateString('en-CA', { timeZone: TZ })} onChange={e => setDate(e.target.value)} /></label>
        </div>
        <fieldset><legend className="text-sm">Time slot</legend>{slots.length ? <div className="mt-1 flex max-h-36 flex-wrap gap-2 overflow-auto">{slots.map(s => <button type="button" key={s.starts_at} disabled={!s.available} onClick={() => setForm({ ...form, scheduled_at: s.starts_at })} className={`min-h-[44px] rounded-lg border px-3 text-sm ${form.scheduled_at === s.starts_at ? 'bg-teal-700 text-white' : 'border-[var(--mm-border)]'} disabled:opacity-40 disabled:line-through`}>{s.label}</button>)}</div> : <p className="mm-muted text-sm">No open slots on this day.</p>}</fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Full name<input className={field} required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoComplete="name" /></label>
          <label className="text-sm">Date of birth<input type="date" className={field} required value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} /></label>
          <label className="text-sm">Sex (optional)<select className={field} value={form.sex} onChange={e => setForm({ ...form, sex: e.target.value })}><option value="">Prefer not to say</option><option value="FEMALE">Female</option><option value="MALE">Male</option><option value="OTHER">Other</option></select></label>
          <label className="text-sm">Reason / symptoms<input className={field} value={form.visit_reason} onChange={e => setForm({ ...form, visit_reason: e.target.value })} /></label>
        </div>
        <div className="rounded-2xl border border-[var(--mm-border)] p-3 space-y-2">
          <label className="text-sm block">Mobile number<input className={field} type="tel" inputMode="tel" placeholder="01XXXXXXXXX" value={form.phone} disabled={!!otp.verification} onChange={e => setForm({ ...form, phone: e.target.value })} autoComplete="tel" /></label>
          {form.phone && !phoneOk && <p className="text-xs text-red-700">Enter a Bangladeshi mobile number like 01712345678.</p>}
          {!otp.verification && <button type="button" className="mm-button mm-button-secondary" disabled={!phoneOk || busy} onClick={send}>{otp.challenge ? 'Resend code' : 'Send verification code'}</button>}
          {otp.dev && !otp.verification && <p className="rounded-lg border-2 border-dashed border-amber-500 bg-amber-50 p-2 text-sm text-amber-900"><strong>DEVELOPMENT ONLY</strong> — no SMS was sent. Code: <span className="font-mono text-lg">{otp.dev}</span></p>}
          {otp.challenge && !otp.verification && <div className="flex gap-2"><input className={field} inputMode="numeric" maxLength={6} placeholder="6-digit code" value={otp.code} onChange={e => setOtp({ ...otp, code: e.target.value.replace(/\D/g, '') })} aria-label="Verification code" /><button type="button" className="mm-button mm-button-primary" disabled={otp.code.length !== 6 || busy} onClick={verify}>Verify</button></div>}
          {otp.verification && <p className="text-sm font-semibold text-emerald-700">✓ Phone verified</p>}
        </div>
        {msg && <p role="status" className="text-sm">{msg}</p>}
        <button className="mm-button mm-button-primary w-full" disabled={!otp.verification || !form.scheduled_at || busy}>Confirm booking</button>
        <p className="mm-muted text-xs">If this number already has a MedMinders profile, your name and date of birth must match it.</p>
      </form>}
    </div>
  </div>;
}
