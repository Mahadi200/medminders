import { useEffect, useState } from 'react';
import { careApi } from '../../services/careApi';
import { Badge, field, fmt, Msg, Section, State, Stat, TZ, useApi } from './ui';

const SCOPES = [['PROFILE', 'Profile'], ['PRESCRIPTIONS', 'Prescriptions'], ['REPORTS', 'Reports'], ['HISTORY', 'History']];
const utc = s => new Date(String(s).includes('T') ? s : String(s).replace(' ', 'T') + 'Z');

export function ProgressRing({ value, total, label, sub, size = 132 }) {
  const pct = total ? Math.min(1, value / total) : 0; const r = 52; const c = 2 * Math.PI * r;
  return <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${value} of ${total}`}>
    <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90"><circle cx="60" cy="60" r={r} fill="none" stroke="var(--mm-border)" strokeWidth="10" />
      <circle cx="60" cy="60" r={r} fill="none" stroke="url(#mmRing)" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: 'stroke-dashoffset .6s ease' }} />
      <defs><linearGradient id="mmRing" x1="0" x2="1"><stop offset="0" stopColor="#0E7C7B" /><stop offset="1" stopColor="#2DD4BF" /></linearGradient></defs></svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center"><span className="text-lg font-black">{label}</span><span className="mm-muted text-[11px] leading-tight">{sub}</span></div>
  </div>;
}

/** "Today's doses" timeline for the selected course, with countdown and big Mark-as-taken buttons. */
export function TodayDoses({ token, detail, onChanged }) {
  const [now, setNow] = useState(Date.now());
  const [msg, setMsg] = useState('');
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id); }, []);
  if (!detail || detail.course.status !== 'ACTIVE' || !detail.events.length) return null;
  const s = detail.summary;
  const todayKey = new Date(now).toLocaleDateString('en-CA', { timeZone: TZ });
  const today = detail.events.filter(e => utc(e.scheduled_at).toLocaleDateString('en-CA', { timeZone: TZ }) === todayKey);
  const next = detail.events.find(e => e.status === 'SCHEDULED' && utc(e.scheduled_at) > new Date(now));
  const mins = next ? Math.max(0, Math.round((utc(next.scheduled_at) - now) / 60000)) : null;
  const doseNo = detail.events.filter(e => utc(e.scheduled_at) <= new Date(now) && e.status !== 'CANCELLED').length;
  const take = async e => { try { await careApi(`/dose-events/${e.id}/logs`, { token, method: 'POST', body: { status: 'TAKEN', actual_at: new Date().toISOString() } }); setMsg('Dose recorded ✓'); onChanged(); } catch (err) { setMsg(err.message); } };
  return <div className="space-y-4 rounded-3xl border border-[var(--mm-border)] bg-[var(--mm-surface-elevated)] p-4">
    {s.completed ? <div className="text-center"><p className="text-4xl">🎉</p><p className="text-xl font-black">Course completed</p><p className="mm-muted text-sm">Well done. Don’t keep leftover antibiotics or share them — return them to a pharmacy.</p></div> : <>
      <div className="flex flex-wrap items-center gap-5">
        <ProgressRing value={doseNo} total={s.scheduled_total} label={`Dose ${doseNo} of ${s.scheduled_total}`} sub={`Day ${Math.min(s.days_elapsed + 1, s.prescribed_days || 1)} of ${s.prescribed_days}`} />
        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat label="Next dose" value={next ? (mins < 60 ? `in ${mins} min` : fmt(next.scheduled_at).split(', ').pop()) : '—'} hint={next ? fmt(next.scheduled_at) : ''} />
          <Stat label="Adherence" value={s.reported_adherence_pct == null ? '—' : `${s.reported_adherence_pct}%`} hint="taken ÷ doses due so far" />
          <Stat label="Streak" value={`${s.streak} 🔥`} hint="doses in a row" />
        </div>
      </div>
      <div><p className="font-bold">Today’s doses</p><ol className="mt-2 space-y-2">{today.map(e => { const due = utc(e.scheduled_at) <= new Date(now + 15 * 60000); return <li key={e.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--mm-border)] bg-[var(--mm-surface)] p-3">
        <span className="w-20 font-bold">{utc(e.scheduled_at).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })}</span>
        <span className="flex-1">{detail.course.generic_name} · {detail.course.dose}</span>
        {e.status === 'SCHEDULED' ? (due ? <button className="mm-button mm-button-primary min-h-[44px]" onClick={() => take(e)}>Mark as taken</button> : <Badge tone="slate">upcoming</Badge>) : <Badge status={e.status} />}
      </li>; })}{!today.length && <li className="mm-muted text-sm">No doses scheduled today.</li>}</ol></div>
    </>}
    <Msg text={msg} />
  </div>;
}

export function AccessPanel({ token }) {
  const overview = useApi('/access/overview', token, { grants: [], access_log: [] });
  const [target, setTarget] = useState(null);
  const [options, setOptions] = useState([]);
  const [form, setForm] = useState({ target_id: '', scopes: ['PRESCRIPTIONS', 'REPORTS'], days: 7, q: '' });
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (!target) return;
    if (target === 'DOCTOR') careApi('/public/doctors').then(r => setOptions(r.doctors.map(d => ({ id: d.user_id, name: d.name, hint: d.specialty })))).catch(() => setOptions([]));
    else careApi(`/organizations/approved?type=${target}`).then(r => setOptions(r.map(o => ({ id: o.id, name: o.name, hint: o.address })))).catch(() => setOptions([]));
  }, [target]);
  const submit = async () => { try { await careApi('/access/authorize', { token, method: 'POST', body: { target, target_id: form.target_id, scopes: form.scopes, days: Number(form.days) } }); setMsg('Access granted. You can revoke it at any time.'); setTarget(null); overview.reload(); } catch (e) { setMsg(e.message); } };
  const revoke = async id => { if (!window.confirm('Revoke this access? They will lose access immediately.')) return; try { await careApi(`/sharing/grants/${id}/revoke`, { token, method: 'POST' }); setMsg('Access revoked.'); overview.reload(); } catch (e) { setMsg(e.message); } };
  const filtered = options.filter(o => !form.q || `${o.name} ${o.hint}`.toLowerCase().includes(form.q.toLowerCase()));
  return <Section id="dashboard-sharing" eyebrow="Your consent" title="Access & sharing">
    <div className="flex flex-wrap gap-2">{[['DOCTOR', 'Authorize doctor'], ['HOSPITAL', 'Authorize hospital'], ['PHARMACY', 'Authorize pharmacy']].map(([k, l]) => <button key={k} className={`mm-button ${target === k ? 'mm-button-primary' : 'mm-button-secondary'}`} onClick={() => { setTarget(k); setForm({ ...form, target_id: '', q: '' }); }}>{l}</button>)}</div>
    {target && <div className="space-y-3 rounded-2xl border border-[var(--mm-border)] p-3">
      <input className={field} placeholder="Search by name" value={form.q} onChange={e => setForm({ ...form, q: e.target.value })} aria-label="Search" />
      <div className="max-h-40 space-y-1 overflow-auto">{filtered.map(o => <label key={o.id} className={`flex cursor-pointer gap-2 rounded-lg p-2 text-sm ${form.target_id === o.id ? 'bg-teal-100 text-teal-950' : ''}`}><input type="radio" name="target" checked={form.target_id === o.id} onChange={() => setForm({ ...form, target_id: o.id })} /><span><strong>{o.name}</strong><span className="mm-muted block text-xs">{o.hint}</span></span></label>)}</div>
      <fieldset className="flex flex-wrap gap-3 text-sm"><legend className="mb-1 font-semibold">They can see</legend>{SCOPES.map(([k, l]) => <label key={k} className="flex items-center gap-1"><input type="checkbox" checked={form.scopes.includes(k)} onChange={e => setForm({ ...form, scopes: e.target.checked ? [...form.scopes, k] : form.scopes.filter(x => x !== k) })} />{l}</label>)}</fieldset>
      <label className="text-sm">For how long<select className={field} value={form.days} onChange={e => setForm({ ...form, days: e.target.value })}>{[1, 7, 30, 90].map(d => <option key={d} value={d}>{d} day{d > 1 ? 's' : ''}</option>)}</select></label>
      <button className="mm-button mm-button-primary" disabled={!form.target_id || !form.scopes.length} onClick={submit}>Confirm access</button>
    </div>}
    <Msg text={msg} />
    <h3 className="font-semibold">Active access</h3>
    <State loading={overview.loading} error={overview.error} empty={!overview.data.grants.length} emptyText="No one has access to your records right now." />
    {overview.data.grants.map(g => <div key={g.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--mm-border)] py-2 text-sm"><span><strong>{g.organization_name || g.recipient_name}</strong> · {g.resource_type === 'ENCOUNTER' ? 'doctor access' : g.resource_type === 'PATIENT_RECORD' ? `${g.organization_type?.toLowerCase()} access` : `${g.action.toLowerCase()} ${g.resource_type.toLowerCase()}`}{g.scopes ? ` (${g.scopes.map(s => s.toLowerCase()).join(', ')})` : ''} · until {fmt(g.expires_at)}{g.created_via === 'ASSIGNMENT' && <Badge tone="teal">from your appointment</Badge>}</span><button className="text-red-700 underline" onClick={() => revoke(g.id)}>Revoke</button></div>)}
    {overview.data.access_log.length > 0 && <details className="text-sm"><summary className="cursor-pointer font-semibold">Who accessed what</summary><ul className="mt-2 space-y-1">{overview.data.access_log.map((l, i) => <li key={i}>{fmt(l.created_at)} · {l.actor} · {l.action.replaceAll('_', ' ').toLowerCase()}</li>)}</ul></details>}
  </Section>;
}

/** Hospital/pharmacy: find a patient by phone; details only when the patient has authorized this organization. */
export function FindPatient({ token, organizationId, kind }) {
  const [phone, setPhone] = useState('');
  const [results, setResults] = useState(null);
  const [msg, setMsg] = useState('');
  const [qty, setQty] = useState({});
  const search = async e => { e?.preventDefault(); setMsg(''); try { setResults(await careApi(`/organization/patients/search?phone=${encodeURIComponent(phone)}`, { token })); } catch (err) { setMsg(err.message); } };
  const run = async (fn, note) => { try { await fn(); setMsg(note); search(); } catch (e) { setMsg(e.message); } };
  return <Section id="dashboard-find" eyebrow="Patients" title="Find patient by phone number">
    <form onSubmit={search} className="flex flex-wrap gap-2"><input className={`${field} max-w-xs`} type="tel" placeholder="01XXXXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} aria-label="Patient phone number" /><button className="mm-button mm-button-primary">Search</button></form>
    {results && !results.length && <p className="mm-muted text-sm">No MedMinders patient uses this number.</p>}
    {results?.map(p => <div key={p.patient_record_id} className="space-y-2 rounded-2xl border border-[var(--mm-border)] p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2"><p><strong>{p.name}</strong> · {p.phone}</p>{p.authorized ? <Badge tone="green">authorized</Badge> : p.pending_request ? <Badge status="PENDING">request sent</Badge> : <button className="mm-button mm-button-secondary" onClick={() => run(() => careApi(`/organization/patients/${p.patient_record_id}/request-access`, { token, method: 'POST', body: { purpose: kind === 'pharmacy' ? 'Dispense prescribed medicines' : 'Tests, billing and reports' } }), 'Request sent. The patient will approve or decline in their app.')}>Request access</button>}</div>
      {p.authorized && p.prescriptions?.map(rx => <div key={rx.id} className="rounded-xl bg-[var(--mm-surface-elevated)] p-2"><p className="font-semibold">{rx.doctor_snapshot?.name} · {fmt(rx.issued_at)}</p>
        {kind === 'pharmacy' && rx.items.map(i => { const left = (i.quantity || 0) - i.dispensed_quantity; return <div key={i.id} className="flex flex-wrap items-center gap-2 py-1"><span className="flex-1">{i.generic_name} {i.strength} · prescribed {i.quantity ?? '—'} · dispensed {i.dispensed_quantity} · remaining {left}</span>
          {left > 0 && <><input type="number" min="1" max={left} className={`${field} w-20`} value={qty[i.id] || ''} onChange={e => setQty({ ...qty, [i.id]: e.target.value })} aria-label="Quantity now" /><button className="mm-button mm-button-primary" onClick={() => run(() => careApi(`/prescription-items/${i.id}/dispensings`, { token, method: 'POST', body: { organization_id: organizationId, quantity: Number(qty[i.id] || 0), product: i.generic_name, idempotency_key: crypto.randomUUID() } }), 'Dispensing recorded. The patient can see it.')}>Dispense</button></>}</div>; })}
        {kind === 'hospital' && rx.tests.map(t => <div key={t.id} className="flex items-center gap-2 py-1"><span className="flex-1">{t.test_name}</span><Badge status={t.status} />{t.status === 'ORDERED' && <button className="mm-button mm-button-primary" onClick={() => run(() => careApi(`/test-orders/${t.id}/accept`, { token, method: 'POST', body: { organization_id: organizationId } }), 'Test accepted — continue billing and reporting in Diagnostics.')}>Accept test</button>}</div>)}
      </div>)}
    </div>)}
    <Msg text={msg} />
  </Section>;
}

/** Doctor: today's assigned patients ordered by serial, with patient view and Start consultation. */
export function DoctorQueue({ token, onStart }) {
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: TZ }));
  const queue = useApi(`/doctor/queue?date=${date}`, token);
  const [view, setView] = useState(null);
  const open = async id => { try { setView(await careApi(`/doctor/patients/${id}`, { token })); } catch (e) { setView({ error: e.message }); } };
  return <Section id="dashboard-appointments" eyebrow="Today" title="Today's patients" actions={<input type="date" className={`${field} w-auto`} value={date} onChange={e => setDate(e.target.value)} aria-label="Queue date" />}>
    <State loading={queue.loading} error={queue.error} empty={!queue.data.length} emptyText="No assigned patients for this day." />
    <ol className="space-y-2">{queue.data.map(a => <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--mm-border)] p-3 text-sm">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 font-black text-teal-900">{a.serial_number ?? '—'}</span>
      <span className="min-w-0 flex-1"><strong>{a.name}</strong> · {a.age ?? '?'} y · {a.sex?.toLowerCase() || '—'} · {a.phone}<span className="mm-muted block">{utc(a.scheduled_at).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })} · {a.visit_reason || 'No reason given'}</span>
        {a.needs_attention?.length > 0 && <span className="mt-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">Needs attention: {a.needs_attention.join(', ')}</span>}</span>
      <Badge status={a.status} />
      <button className="mm-button mm-button-secondary" onClick={() => open(a.patient_record_id)}>View</button>
      {['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'].includes(a.status) && <button className="mm-button mm-button-primary" onClick={() => onStart(a)}>Start consultation</button>}
    </li>)}</ol>
    {view && <div className="rounded-2xl border border-[var(--mm-border)] p-4 text-sm space-y-2"><div className="flex justify-between"><strong>{view.profile?.name || 'Patient'}</strong><button className="underline" onClick={() => setView(null)}>Close</button></div>
      {view.error ? <p>{view.error}</p> : <>
        <p>{view.profile.age ?? '?'} y · {view.profile.sex?.toLowerCase() || '—'} · allergies: {view.profile.allergy_status?.replace('_', ' ').toLowerCase()} {view.profile.allergies || ''}</p>
        {view.needs_attention?.length > 0 && <p className="font-semibold text-red-700">Needs attention: {view.needs_attention.join(', ')}</p>}
        {view.courses?.map(c => <p key={c.id}>{c.generic_name} · <Badge status={c.status} /> taken {c.summary.reported_taken + c.summary.reported_taken_late}/{c.summary.due_so_far} · missed {c.summary.missed_no_confirmation} · skipped {c.summary.reported_skipped}</p>)}
        {view.prescriptions?.map(r => <p key={r.id} className="mm-muted">{fmt(r.issued_at)} · {r.doctor_snapshot?.name} · {r.items.map(i => i.generic_name).join(', ')}</p>)}
        {view.reports?.map(r => <p key={r.id}>📄 {r.test_name}: {r.observations}</p>)}
        {view.problems?.map(p => <p key={p.id}>⚠️ {p.symptoms} <Badge status={p.status} /></p>)}
        <p className="mm-muted text-xs">Shown with the patient’s permission: {view.scopes.join(', ').toLowerCase()}.</p></>}
    </div>}
  </Section>;
}
