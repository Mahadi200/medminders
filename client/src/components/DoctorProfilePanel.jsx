export default function DoctorProfilePanel({ profile, setProfile, save }) {
  const field = 'mt-1 w-full rounded-lg border border-slate-300 p-2';
  const update = (key, value) => setProfile(current => ({ ...current, [key]: value }));
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
    <h2 className="text-lg font-bold">Doctor profile</h2><p className="text-sm">BMDC review: {profile?.verification_status || 'Pending'}</p>
    {profile && <><div className="grid gap-3 sm:grid-cols-2">{[
      ['hospital_clinic','Hospital or clinic'],['specialty','Specialty'],['qualifications','Qualifications'],
      ['experience_years','Years of experience'],['chamber','Chamber'],['fee_bdt','Fee (BDT)'],
      ['appointment_contact','Public appointment contact'],
    ].map(([key,label]) => <label key={key} className="text-sm">{label}<input className={field} type={['experience_years','fee_bdt'].includes(key) ? 'number' : 'text'} value={profile[key] ?? ''} onChange={e => update(key, ['experience_years','fee_bdt'].includes(key) ? e.target.value === '' ? null : Number(e.target.value) : e.target.value)} /></label>)}</div>
      <label className="block text-sm">Biography<textarea className={field} value={profile.biography || ''} onChange={e => update('biography', e.target.value)} /></label>
      <fieldset className="rounded-xl border p-3 space-y-2"><legend className="text-sm font-semibold">Public appointment schedule</legend><div className="grid gap-2 sm:grid-cols-2"><label className="text-sm">Visiting days<input className={field} value={profile.schedule?.days || ''} onChange={e => update('schedule', { ...profile.schedule, days: e.target.value })} placeholder="Sun–Thu" /></label><label className="text-sm">Branch/chamber address<input className={field} value={profile.schedule?.address || profile.chamber || ''} onChange={e => update('schedule', { ...profile.schedule, address: e.target.value })} /></label><label className="text-sm">Start time<input className={field} type="time" value={profile.schedule?.start || ''} onChange={e => update('schedule', { ...profile.schedule, start: e.target.value })} /></label><label className="text-sm">End time<input className={field} type="time" value={profile.schedule?.end || ''} onChange={e => update('schedule', { ...profile.schedule, end: e.target.value })} /></label><label className="text-sm">Slot duration (minutes)<input className={field} type="number" min="5" value={profile.schedule?.slot_minutes || ''} onChange={e => update('schedule', { ...profile.schedule, slot_minutes: e.target.value === '' ? null : Number(e.target.value) })} /></label><label className="text-sm">Appointment capacity<input className={field} type="number" min="1" value={profile.schedule?.capacity || ''} onChange={e => update('schedule', { ...profile.schedule, capacity: e.target.value === '' ? null : Number(e.target.value) })} /></label></div></fieldset>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={!!profile.is_published} onChange={e => update('is_published', e.target.checked)} /> Publish profile after BMDC review</label>
      <button className="rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white" onClick={() => save({
        hospital_clinic: profile.hospital_clinic, specialty: profile.specialty, qualifications: profile.qualifications,
        experience_years: profile.experience_years, biography: profile.biography, chamber: profile.chamber,
        fee_bdt: profile.fee_bdt, appointment_contact: profile.appointment_contact, schedule: profile.schedule,
        is_published: profile.is_published,
      })}>Save profile</button>
    </>}
  </section>;
}
