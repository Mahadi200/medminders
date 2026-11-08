import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PublicLayout from '../components/public/PublicLayout';
import DoctorCatalogue, { BookingDialog, SampleBadge, useCatalogue } from '../components/public/DoctorCatalogue';
import { ApiImage } from '../services/careApi';

export default function DoctorsPage() {
  return <PublicLayout><DoctorCatalogue title="All doctors" /></PublicLayout>;
}

export function DoctorDetailPage() {
  const { id } = useParams();
  const cat = useCatalogue();
  const [book, setBook] = useState(false);
  const d = cat.doctors.find(x => x.id === id);
  return <PublicLayout><section className="mx-auto max-w-4xl px-5 py-10">
    {!cat.loaded && <div className="mm-surface h-64 animate-pulse" />}
    {cat.loaded && !d && <div className="mm-surface p-6"><p>This doctor profile is not available right now.</p><Link to="/doctors" className="mm-button mm-button-secondary mt-4">Back to all doctors</Link></div>}
    {d && <article className="mm-surface space-y-5 p-6">
      <div className="flex flex-wrap items-center gap-4">
        <ApiImage path={d.has_photo ? `/doctors/${d.id}/photo` : null} alt="" className="h-24 w-24 rounded-full object-cover ring-4 ring-[var(--mm-primary)]/40" fallback={<span className="flex h-24 w-24 items-center justify-center rounded-full bg-teal-100 text-2xl font-bold text-teal-900">Dr</span>} />
        <div><h1 className="text-2xl font-black">{d.name}</h1><p className="font-semibold text-[var(--mm-primary-strong)]">{d.specialty}</p><p className="mm-muted">{d.qualifications} · {d.experience_years} years · {d.languages}</p>
          <div className="mt-1 flex gap-2"><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-900">BMDC verified</span>{d.is_sample && <SampleBadge />}</div></div>
      </div>
      {d.biography && <p>{d.biography}</p>}
      <div><h2 className="text-lg font-bold">Weekly schedule</h2><div className="mt-2 grid gap-3 sm:grid-cols-2">{d.affiliations.map(a => <div key={a.id} className="rounded-xl border border-[var(--mm-border)] p-3 text-sm">
        <p className="font-semibold">{a.organization_name}{a.organization_is_sample && <span className="ml-2"><SampleBadge /></span>}</p><p className="mm-muted">{a.area} · {a.branch_label}</p>
        <p>{a.visiting_days.join(', ')} · {a.start_time}–{a.end_time}</p><p>Fee ৳{Number(a.fee_bdt || 0).toFixed(0)}</p>
        {a.latitude && <a className="text-[var(--mm-primary-strong)] underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${a.latitude},${a.longitude}`}>Directions</a>}</div>)}</div></div>
      <button className="mm-button mm-button-primary" onClick={() => setBook(true)} disabled={!d.next_available}>Book appointment</button>
      {book && <BookingDialog doctor={d} onClose={() => setBook(false)} />}
    </article>}
  </section></PublicLayout>;
}
