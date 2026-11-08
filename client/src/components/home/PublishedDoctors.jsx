import { useEffect, useState } from 'react';
import { careApi } from '../../services/careApi';
import { useAppPreferences } from '../../context/AppPreferences';

export default function PublishedDoctors() {
  const { isBangla } = useAppPreferences();
  const [doctors, setDoctors] = useState([]);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  useEffect(() => { careApi('/doctors').then(setDoctors).catch(e => setError(e.message)); }, []);
  return <section className="bg-slate-50 px-5 py-12" aria-label="Published doctors">
    <div className="mx-auto max-w-6xl"><h2 className="text-3xl font-bold text-slate-900">{isBangla ? 'যাচাইকৃত চিকিৎসক' : 'Published doctors'}</h2>
      <p className="mt-2 text-slate-600">{isBangla ? 'শুধু যাচাইকৃত এবং প্রকাশিত প্রোফাইল দেখানো হয়।' : 'Only verified, published profiles appear here.'}</p>
      {error && <p className="mt-4 text-red-700">Doctor catalogue is unavailable: {error}</p>}
      {!error && !doctors.length && <p className="mt-6 text-slate-600">No published doctor profiles yet.</p>}
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{doctors.map(doctor => <article className="rounded-2xl border bg-white p-5 shadow-sm" key={doctor.id}>
        {doctor.has_photo && <img className="mb-4 h-40 w-40 rounded-xl object-cover" src={`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/v1/doctors/${doctor.id}/photo`} alt={doctor.user?.name || 'Doctor'} />}
        <h3 className="text-xl font-semibold">{doctor.user?.name}</h3><p className="text-teal-700">{doctor.specialty || 'Doctor'}</p>
        <p className="text-sm text-slate-600">{doctor.hospital_clinic}</p><p className="text-sm">{doctor.chamber}</p>
        <button className="mt-4 text-sm font-semibold text-teal-800 underline" onClick={() => setSelected(doctor)}>View details</button>
      </article>)}</div>
      {selected && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-6 space-y-3">
        <button className="float-right" onClick={() => setSelected(null)} aria-label="Close">✕</button><h3 className="text-2xl font-bold">{selected.user?.name}</h3>
        <p>{selected.specialty}</p><p>{selected.qualifications}</p><p>{selected.biography}</p><p>Chamber: {selected.chamber}</p>
        <p>Experience: {selected.experience_years ?? 'Not listed'} years</p><p>Schedule: {selected.schedule?.notes || 'Contact clinic'}</p>
        <p>Fee: {selected.fee_bdt ? `৳${selected.fee_bdt}` : 'Contact clinic'}</p><p>Appointments: {selected.appointment_contact || 'Contact clinic'}</p>
      </div></div>}
    </div>
  </section>;
}
