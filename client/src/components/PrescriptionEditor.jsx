import { useEffect, useState } from 'react';

const newMedicine = () => ({ generic_name: '', brand_name: '', strength: '', dosage_form: '', dose: '', route: '',
  schedule_type: 'EXPLICIT_TIMES', schedule_details: { times: ['08:00'] }, duration_days: 5, quantity: 1,
  instructions: '', is_antibiotic: false, indication: '' });

export default function PrescriptionEditor({ call, onSaved, onDirty, patients = null }) {
  const [patientId, setPatientId] = useState('');
  const [template, setTemplate] = useState('OUTPATIENT');
  const [diagnosis, setDiagnosis] = useState('');
  const [items, setItems] = useState([newMedicine()]);
  const [tests, setTests] = useState('');
  const [advice, setAdvice] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [allergy, setAllergy] = useState({ allergy_status: '', allergies: '' });
  const selected = patients?.find(p => p.id === patientId);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const field = 'w-full rounded-lg border border-[var(--mm-border)] bg-[var(--mm-surface)] p-2';
  useEffect(() => { onDirty?.(Boolean(patientId || diagnosis || tests || items.some(item => item.generic_name || item.brand_name || item.strength || item.dose || item.instructions))); }, [patientId, diagnosis, tests, items, onDirty]);
  function change(index, patch) { setItems(current => current.map((item, i) => i === index ? { ...item, ...patch } : item)); }
  async function issue(event) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const cleanItems = items.filter(item => item.generic_name.trim());
      if (selected?.allergy_status === 'UNKNOWN' && allergy.allergy_status) await call(`/patients/records/${patientId}`, { method: 'PATCH', body: allergy });
      const result = await call('/clinical-prescriptions', { method: 'POST', body: {
        patient_record_id: patientId, template, diagnosis, clinical_details: { advice: advice || null, follow_up: followUp || null }, items: cleanItems,
        tests: tests.split(',').map(v => v.trim()).filter(Boolean),
      } });
      setMessage('Prescription issued. The patient sees it immediately; antibiotic schedules start when the patient confirms the first dose. This is not a certified digital signature.');
      setItems([newMedicine()]); setDiagnosis(''); setTests(''); setAdvice(''); setFollowUp('');
      onSaved();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <form id="dashboard-prescribe" className="mm-surface scroll-mt-24 p-5 space-y-4 lg:col-span-2" onSubmit={issue}>
    <h2 className="text-lg font-bold">Prescription and investigations</h2>
    <p className="text-sm text-slate-600">Only a verified doctor can issue. Enter the exact authorized regimen; no medicine or dose is suggested.</p>
    <div className="grid gap-3 md:grid-cols-3">{patients ? <label className="text-sm">Patient<select className={field} value={patientId} onChange={e => setPatientId(e.target.value)} required><option value="">{patients.length ? 'Choose a consented patient…' : 'No patient has granted access yet'}</option>{patients.map(p => <option key={p.id} value={p.id}>{p.name} · allergies: {p.allergy_status.replace('_', ' ').toLowerCase()}</option>)}</select></label> : <label className="text-sm">Patient record ID<input className={field} value={patientId} onChange={e => setPatientId(e.target.value)} required /></label>}
      {selected?.allergy_status === 'UNKNOWN' && <div className="md:col-span-3 grid gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 md:grid-cols-2"><p className="md:col-span-2">Allergy history has not been reviewed. Record it before prescribing an antibiotic.</p><label>Allergy review<select className={field} value={allergy.allergy_status} onChange={e => setAllergy({ ...allergy, allergy_status: e.target.value })}><option value="">Not reviewed</option><option value="NONE_KNOWN">No known drug allergy</option><option value="KNOWN">Known allergies</option></select></label>{allergy.allergy_status === 'KNOWN' && <label>Allergies<input className={field} value={allergy.allergies} onChange={e => setAllergy({ ...allergy, allergies: e.target.value })} required /></label>}</div>}
      <label className="text-sm">Template<select className={field} value={template} onChange={e => setTemplate(e.target.value)}>{[['OUTPATIENT','Outpatient'],['FOLLOW_UP','Follow-up'],['CHRONIC_REVIEW','Chronic review'],['ADVICE_ONLY','Advice or investigation only']].map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label className="text-sm">Diagnosis or provisional diagnosis<input className={field} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} /></label></div>
    {items.map((item, index) => <fieldset key={index} className="rounded-xl border p-4 space-y-3"><legend className="font-semibold">Medicine {index + 1}</legend>
      <div className="grid gap-3 md:grid-cols-3">{[['generic_name','Generic name'],['brand_name','Brand (optional)'],['strength','Strength'],['dosage_form','Dosage form'],['dose','Dose and unit'],['route','Route']].map(([key,label]) => <label className="text-sm" key={key}>{label}<input className={field} value={item[key]} onChange={e => change(index, { [key]: e.target.value })} required={key !== 'brand_name' && !!item.generic_name} /></label>)}</div>
      <div className="grid gap-3 md:grid-cols-4"><label className="text-sm">Schedule type<select className={field} value={item.schedule_type} onChange={e => change(index, { schedule_type: e.target.value, schedule_details: e.target.value === 'EVERY_N_HOURS' ? { hours: 8 } : { times: ['08:00'] } })}><option value="EXPLICIT_TIMES">Explicit daily times</option><option value="EVERY_N_HOURS">Every N hours</option></select></label>
        {item.schedule_type === 'EXPLICIT_TIMES' ? <label className="text-sm">Times, HH:mm comma separated<input className={field} value={item.schedule_details.times.join(', ')} onChange={e => change(index, { schedule_details: { times: e.target.value.split(',').map(v => v.trim()) } })} /></label>
          : <label className="text-sm">Every N hours<input className={field} type="number" min="1" max="24" value={item.schedule_details.hours} onChange={e => change(index, { schedule_details: { hours: Number(e.target.value) } })} /></label>}
        <label className="text-sm">Duration, days<input className={field} type="number" min="1" max="365" value={item.duration_days} onChange={e => change(index, { duration_days: Number(e.target.value) })} /></label>
        <label className="text-sm">Authorized quantity<input className={field} type="number" min="1" value={item.quantity} onChange={e => change(index, { quantity: Number(e.target.value) })} /></label></div>
      <label className="text-sm block">Administration and missed-dose instructions (doctor entered)<textarea className={field} value={item.instructions} onChange={e => change(index, { instructions: e.target.value })} /></label>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={item.is_antibiotic} onChange={e => change(index, { is_antibiotic: e.target.checked })} /> Antibiotic</label>
      {item.is_antibiotic && <label className="text-sm block">Clinical indication<input className={field} value={item.indication} onChange={e => change(index, { indication: e.target.value })} required /></label>}
      {items.length > 1 && <button className="text-red-700 underline" type="button" onClick={() => setItems(current => current.filter((_, i) => i !== index))}>Remove medicine</button>}
    </fieldset>)}
    <button type="button" className="rounded-lg border border-teal-700 px-3 py-2 text-teal-800" onClick={() => setItems(current => [...current, newMedicine()])}>Add medicine</button>
    <label className="block text-sm">Investigation orders, comma separated<input className={field} value={tests} onChange={e => setTests(e.target.value)} /></label>
    <div className="grid gap-3 md:grid-cols-2"><label className="text-sm">General advice<textarea className={field} value={advice} onChange={e => setAdvice(e.target.value)} /></label><label className="text-sm">Follow-up<input className={field} placeholder="e.g. Review in 5 days with CBC report" value={followUp} onChange={e => setFollowUp(e.target.value)} /></label></div>
    <button disabled={busy} className="rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50">Issue prescription</button>
    {message && <p role="status" className="text-sm text-teal-900">{message}</p>}
  </form>;
}
