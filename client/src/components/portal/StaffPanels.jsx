import { useState } from 'react';
import { careApi } from '../../services/careApi';
import { Badge, field, fmt, Msg, Section, State, Stat, useApi } from './ui';

const DAYS = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'];

/* ---------------- Doctor ---------------- */
export function DoctorAffiliations({ token }) {
  const mine = useApi('/doctor/affiliations', token);
  const hospitals = useApi('/organizations/approved?type=HOSPITAL', token);
  const [form, setForm] = useState({ organization_id: '', branch_label: '', visiting_days: ['SUN', 'TUE', 'THU'], start_time: '17:00', end_time: '21:00', slot_minutes: 15, fee_bdt: 800 });
  const [msg, setMsg] = useState('');
  const submit = async e => { e.preventDefault(); try { await careApi('/doctor/affiliations', { token, method: 'POST', body: form }); setMsg('Schedule submitted. Patients can book once the hospital confirms it.'); mine.reload(); } catch (err) { setMsg(err.message); } };
  return <Section id="dashboard-profile" eyebrow="Hospital affiliations" title="Where and when patients can book you">
    <State loading={mine.loading} error={mine.error} empty={!mine.data.length} emptyText="No hospital affiliation yet." />
    {mine.data.map(a => <p key={a.id} className="flex flex-wrap items-center gap-2 text-sm"><strong>{a.organization_name}</strong>{a.branch_label && ` · ${a.branch_label}`} · {a.visiting_days.join(', ')} {a.start_time}–{a.end_time} · {a.slot_minutes}-min slots · ৳{a.fee_bdt ?? '—'} <Badge status={a.status}>{a.status === 'CONFIRMED' ? 'Confirmed by hospital' : undefined}</Badge></p>)}
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-[var(--mm-border)] p-3 md:grid-cols-3">
      <label className="text-sm">Hospital<select className={field} required value={form.organization_id} onChange={e => setForm({ ...form, organization_id: e.target.value })}><option value="">Choose approved hospital…</option>{hospitals.data.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
      <label className="text-sm">Branch / department<input className={field} value={form.branch_label} onChange={e => setForm({ ...form, branch_label: e.target.value })} /></label>
      <label className="text-sm">Fee (BDT)<input type="number" min="0" className={field} value={form.fee_bdt} onChange={e => setForm({ ...form, fee_bdt: Number(e.target.value) })} /></label>
      <fieldset className="text-sm md:col-span-3"><legend>Visiting days</legend><div className="flex flex-wrap gap-2">{DAYS.map(d => <label key={d} className="flex items-center gap-1"><input type="checkbox" checked={form.visiting_days.includes(d)} onChange={e => setForm({ ...form, visiting_days: e.target.checked ? [...form.visiting_days, d] : form.visiting_days.filter(x => x !== d) })} />{d}</label>)}</div></fieldset>
      <label className="text-sm">Start<input type="time" className={field} value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></label>
      <label className="text-sm">End<input type="time" className={field} value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></label>
      <label className="text-sm">Slot length<select className={field} value={form.slot_minutes} onChange={e => setForm({ ...form, slot_minutes: Number(e.target.value) })}>{[10, 15, 20, 30].map(m => <option key={m} value={m}>{m} minutes</option>)}</select></label>
      <button className="mm-button mm-button-primary w-fit">Submit for hospital confirmation</button>
    </form>
    <p className="mm-muted text-xs">Changing a schedule sends it back to the hospital for confirmation.</p>
    <Msg text={msg} />
  </Section>;
}

export function DoctorAppointments({ token, list }) {
  const [msg, setMsg] = useState('');
  const set = async (id, status) => { try { await careApi(`/appointments/${id}`, { token, method: 'PATCH', body: { status } }); list.reload(); } catch (e) { setMsg(e.message); } };
  return <Section id="dashboard-appointments" eyebrow="Appointments" title="Confirmed appointments" actions={<button className="mm-button mm-button-secondary" onClick={list.reload}>Refresh</button>}>
    <p className="mm-muted text-sm">Only requests confirmed by the hospital appear here.</p>
    <State loading={list.loading} error={list.error} empty={!list.data.length} emptyText="No confirmed appointments." />
    <div className="grid gap-2 md:grid-cols-2">{list.data.map(a => <div key={a.id} className="rounded-xl border border-[var(--mm-border)] p-3 text-sm"><div className="flex justify-between"><strong>{a.patient_name}</strong><Badge status={a.status} /></div><p>{fmt(a.scheduled_at)} · {a.organization_name}</p>{a.visit_reason && <p className="mm-muted">{a.visit_reason}</p>}<p className="text-xs">{a.consultation_consent ? 'Patient consented to record access for this visit.' : 'No record-access consent given at booking — request access if needed.'}</p>
      {['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'].includes(a.status) && <div className="mt-2 flex gap-2">{a.status === 'CONFIRMED' && <button className="underline" onClick={() => set(a.id, 'IN_PROGRESS')}>Start visit</button>}<button className="underline" onClick={() => set(a.id, 'COMPLETED')}>Mark completed</button></div>}</div>)}</div>
    <Msg text={msg} />
  </Section>;
}

export function DoctorPatients({ token, patients }) {
  return <Section id="dashboard-patients" eyebrow="My patients" title="Patients and antibiotic adherence" actions={<button className="mm-button mm-button-secondary" onClick={patients.reload}>Refresh</button>}>
    <p className="mm-muted text-sm">Visible only with patient consent or for records you created. Figures are patient-reported; “unconfirmed” means no report, not a missed dose.</p>
    <State loading={patients.loading} error={patients.error} empty={!patients.data.length} emptyText="No patients with active access." />
    {patients.data.map(p => <article key={p.id} className="space-y-2 rounded-xl border border-[var(--mm-border)] p-3 text-sm">
      <div className="flex flex-wrap justify-between gap-2"><strong>{p.name}</strong><span className="mm-muted text-xs">{p.access} · Allergies: {p.allergy_status.replace('_', ' ').toLowerCase()}</span></div>
      {!p.courses.length && <p className="mm-muted">No antibiotic course from your prescriptions.</p>}
      {p.courses.map(c => <div key={c.id} className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6"><Stat label={c.generic_name} value={<Badge status={c.status} />} hint={c.completion_status?.replaceAll('_', ' ').toLowerCase()} /><Stat label="Day" value={`${c.summary.days_elapsed}/${c.summary.prescribed_days ?? '—'}`} /><Stat label="Reported taken" value={`${c.summary.reported_taken + c.summary.reported_taken_late}/${c.summary.due_so_far}`} hint="of due so far" /><Stat label="Skipped" value={c.summary.reported_skipped} /><Stat label="Unconfirmed" value={c.summary.unconfirmed} /><Stat label="Supply est." value={c.summary.estimated_supply_units} hint={`dispensed ${c.summary.dispensed_quantity}`} /></div>)}
    </article>)}
  </Section>;
}

export function DoctorProblems({ token }) {
  const data = useApi('/doctor/problems', token, { problem_reports: [], support_alerts: [] });
  const [notes, setNotes] = useState({});
  const [msg, setMsg] = useState('');
  const review = async (r, status) => { try { await careApi(r.kind === 'PROBLEM_REPORT' ? `/medication-problems/${r.id}/review` : `/support-alerts/${r.id}/respond`, { token, method: 'POST', body: r.kind === 'PROBLEM_REPORT' ? { status, note: notes[r.id] || '' } : { note: notes[r.id] || '' } }); setMsg('Response saved and sent to the patient.'); data.reload(); } catch (e) { setMsg(e.message); } };
  const items = [...(data.data.problem_reports || []), ...(data.data.support_alerts || [])];
  return <Section id="dashboard-problems" eyebrow="Medication support" title="Problem reports and support requests" actions={<button className="mm-button mm-button-secondary" onClick={data.reload}>Refresh</button>}>
    <p className="mm-muted text-sm">{data.data.expectation}</p>
    <State loading={data.loading} error={data.error} empty={!items.length} emptyText="No reports from your patients." />
    {items.map(r => <div key={r.id} className={`space-y-2 rounded-xl border p-3 text-sm ${r.status === 'OPEN' ? 'border-amber-300' : 'border-[var(--mm-border)]'}`}>
      <div className="flex flex-wrap justify-between gap-2"><strong>{r.patient_name} · {r.generic_name}</strong><span><Badge status={r.status} /> <Badge tone={r.contact_action === 'URGENT_CARE' || r.reason === 'SEVERE_ALLERGY' ? 'red' : 'slate'}>{r.kind === 'PROBLEM_REPORT' ? r.contact_action?.replaceAll('_', ' ').toLowerCase() : r.reason?.replaceAll('_', ' ').toLowerCase()}</Badge></span></div>
      <p>{r.symptoms || r.patient_note || 'No details given.'}</p><p className="mm-muted text-xs">{fmt(r.created_at)}{r.medicine_taken != null ? ` · still taking: ${r.medicine_taken ? 'yes' : 'no'}` : ''}</p>
      {r.status === 'OPEN' ? <div className="flex flex-wrap gap-2"><input className={`${field} flex-1`} placeholder="Response to patient (required)" value={notes[r.id] || ''} onChange={e => setNotes({ ...notes, [r.id]: e.target.value })} />{r.kind === 'PROBLEM_REPORT' && <button className="mm-button mm-button-secondary" onClick={() => review(r, 'REVIEWED')}>Reviewed</button>}<button className="mm-button mm-button-primary" onClick={() => review(r, 'RESOLVED')}>Resolve</button></div>
        : <p className="text-xs">Response: {r.review_note || r.resolution_note}</p>}
    </div>)}
    <Msg text={msg} />
  </Section>;
}

/* ---------------- Pharmacy ---------------- */
export function PharmacyQueue({ token }) {
  const shared = useApi('/shared-with-me', token);
  const [forms, setForms] = useState({});
  const [msg, setMsg] = useState('');
  const dispense = async (entry, item) => {
    const f = forms[item.id] || {};
    try { const r = await careApi(`/prescription-items/${item.id}/dispensings`, { token, method: 'POST', body: { organization_id: entry.organization_id, quantity: Number(f.quantity || 0), product: f.product ?? item.generic_name, batch: f.batch || undefined, idempotency_key: crypto.randomUUID() } });
      setMsg(`Supply recorded. Remaining authorized: ${r.remaining_quantity}. This does not confirm the patient took a dose.`); setForms({ ...forms, [item.id]: {} }); shared.reload(); } catch (e) { setMsg(e.message); }
  };
  return <Section id="dashboard-dispensing" eyebrow="Dispensing" title="Prescriptions shared with this pharmacy" actions={<button className="mm-button mm-button-secondary" onClick={shared.reload}>Refresh</button>}>
    <p className="mm-muted text-sm">Only prescriptions the patient chose to share appear here, until the share expires or is revoked. Dispensing never edits the prescription.</p>
    <State loading={shared.loading} error={shared.error} empty={!shared.data.length} emptyText="No prescriptions are currently shared with you." />
    {shared.data.map(entry => <article key={entry.prescription.id} className="space-y-2 rounded-xl border border-[var(--mm-border)] p-3 text-sm">
      <div className="flex flex-wrap justify-between gap-2"><p><strong>{entry.patient.name}</strong> · prescribed by {entry.prescription.doctor_snapshot?.name} · {fmt(entry.prescription.issued_at)}</p><span className="flex gap-1">{entry.actions.map(a => <Badge key={a} tone="teal">{a}</Badge>)}<Badge tone="slate">until {fmt(entry.expires_at)}</Badge></span></div>
      {entry.items.map(item => { const left = (item.quantity || 0) - item.dispensed_quantity; return <div key={item.id} className="rounded-lg bg-[var(--mm-surface-elevated)] p-2">
        <p><strong>{item.generic_name}</strong> {item.strength} · {item.dose} · {item.duration_days} days {item.is_antibiotic ? <Badge tone="amber">antibiotic</Badge> : null}</p>
        <p className="mm-muted">Authorized {item.quantity ?? '—'} · dispensed {item.dispensed_quantity} · remaining {item.quantity ? left : '—'}</p>
        {item.dispensings.map(d => <p key={d.id} className="text-xs">• {d.quantity} × {d.product} on {fmt(d.supplied_at)}</p>)}
        {entry.actions.includes('DISPENSE') && left > 0 && <div className="mt-2 flex flex-wrap items-end gap-2"><label className="text-xs">Quantity<input type="number" min="1" max={left} className={`${field} w-24`} value={forms[item.id]?.quantity || ''} onChange={e => setForms({ ...forms, [item.id]: { ...forms[item.id], quantity: e.target.value } })} /></label>
          <label className="text-xs">Product supplied<input className={field} value={forms[item.id]?.product ?? item.generic_name} onChange={e => setForms({ ...forms, [item.id]: { ...forms[item.id], product: e.target.value } })} /></label>
          <label className="text-xs">Batch (optional)<input className={`${field} w-28`} value={forms[item.id]?.batch || ''} onChange={e => setForms({ ...forms, [item.id]: { ...forms[item.id], batch: e.target.value } })} /></label>
          <button className="mm-button mm-button-primary" onClick={() => dispense(entry, item)}>Record supply</button></div>}
      </div>; })}
    </article>)}
    <Msg text={msg} />
  </Section>;
}

/* ---------------- Hospital ---------------- */
export function HospitalAffiliations({ token }) {
  const list = useApi('/organization/affiliations', token);
  const [msg, setMsg] = useState('');
  const decide = async (id, decision) => { try { await careApi(`/affiliations/${id}/decision`, { token, method: 'POST', body: { decision } }); list.reload(); } catch (e) { setMsg(e.message); } };
  return <Section id="dashboard-status" eyebrow="Doctors" title="Doctor visiting schedules">
    <State loading={list.loading} error={list.error} empty={!list.data.length} emptyText="No doctor has submitted a schedule for this hospital." />
    {list.data.map(a => <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--mm-border)] py-2 text-sm"><span><strong>{a.doctor_name}</strong> · BMDC {a.bmdc_number} <Badge status={a.verification_status === 'VERIFIED' ? 'CONFIRMED' : 'PENDING'}>{a.verification_status === 'VERIFIED' ? 'BMDC reviewed' : 'BMDC pending'}</Badge><br />{a.visiting_days.join(', ')} {a.start_time}–{a.end_time} · {a.slot_minutes} min · ৳{a.fee_bdt ?? '—'}</span>
      <span className="flex items-center gap-2"><Badge status={a.status} />{a.status === 'PENDING' && <><button className="mm-button mm-button-primary" onClick={() => decide(a.id, 'CONFIRMED')}>Confirm</button><button className="mm-button mm-button-secondary" onClick={() => decide(a.id, 'REJECTED')}>Reject</button></>}{a.status === 'CONFIRMED' && <button className="underline" onClick={() => decide(a.id, 'ENDED')}>End</button>}</span></div>)}
    <Msg text={msg} />
  </Section>;
}

export function HospitalAppointments({ token, list }) {
  const [proposal, setProposal] = useState({});
  const [assign, setAssign] = useState({});
  const affs = useApi('/organization/affiliations', token);
  const doctors = affs.data.filter(a => a.status === 'CONFIRMED');
  const [msg, setMsg] = useState('');
  const set = async (id, body) => { try { await careApi(`/appointments/${id}`, { token, method: 'PATCH', body }); setMsg('Updated. The patient was notified.'); list.reload(); } catch (e) { setMsg(e.message); } };
  const pending = list.data.filter(a => a.status === 'PENDING_HOSPITAL');
  return <Section id="dashboard-appointments" eyebrow="Front desk" title="Appointment requests" actions={<button className="mm-button mm-button-secondary" onClick={list.reload}>Refresh</button>}>
    <State loading={list.loading} error={list.error} empty={!list.data.length} emptyText="No appointment requests." />
    {pending.length > 0 && <p className="text-sm font-semibold">{pending.length} awaiting confirmation</p>}
    <div className="grid gap-2 md:grid-cols-2">{list.data.map(a => <div key={a.id} className={`space-y-1 rounded-xl border p-3 text-sm ${a.status === 'PENDING_HOSPITAL' ? 'border-amber-300' : 'border-[var(--mm-border)]'}`}>
      <div className="flex justify-between"><strong>{a.patient_name}</strong><Badge status={a.status} /></div><p>{a.doctor_name} · {fmt(a.scheduled_at)}</p>{a.visit_reason && <p className="mm-muted">{a.visit_reason}</p>}
      {a.status === 'PROPOSED_CHANGE' && <p className="text-xs">Proposed {fmt(a.proposed_scheduled_at)} — waiting for patient.</p>}
      {a.status === 'PENDING_HOSPITAL' && <div className="space-y-2"><label className="block text-xs">Assign doctor<select className={field} value={assign[a.id] || a.doctor_id} onChange={e => setAssign({ ...assign, [a.id]: e.target.value })}>{[...new Map([[a.doctor_id, a.doctor_name + ' (requested)'], ...doctors.map(d => [d.doctor_id, d.doctor_name])]).entries()].map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></label><div className="flex flex-wrap gap-2"><button className="mm-button mm-button-primary" onClick={() => set(a.id, { status: 'CONFIRMED', assigned_doctor_id: assign[a.id] || a.doctor_id })}>Confirm & assign</button><button className="mm-button mm-button-secondary" onClick={() => set(a.id, { status: 'REJECTED', reason: 'The hospital could not accommodate this request.' })}>Decline</button></div>
        <div className="flex flex-wrap items-end gap-2"><label className="text-xs">Propose another time<input type="datetime-local" className={field} value={proposal[a.id] || ''} onChange={e => setProposal({ ...proposal, [a.id]: e.target.value })} /></label><button className="mm-button mm-button-secondary" disabled={!proposal[a.id]} onClick={() => set(a.id, { status: 'PROPOSED_CHANGE', proposed_scheduled_at: new Date(proposal[a.id]).toISOString() })}>Send to patient</button></div></div>}
      {a.status === 'CONFIRMED' && <span className="flex gap-3"><span className="font-semibold">Serial #{a.serial_number}</span><button className="underline" onClick={() => set(a.id, { status: 'CHECKED_IN' })}>Check in</button><button className="underline" onClick={() => set(a.id, { status: 'NO_SHOW' })}>No-show</button><button className="text-red-700 underline" onClick={() => { const reason = window.prompt('Reason for cancelling (sent to the patient):'); if (reason) set(a.id, { status: 'CANCELLED', reason }); }}>Cancel</button></span>}
    </div>)}</div>
    <Msg text={msg} />
  </Section>;
}

export function HospitalDiagnostics({ token, organizationId }) {
  const shared = useApi('/shared-with-me', token);
  const orders = useApi('/test-orders', token);
  const reports = useApi('/reports', token);
  const [f, setF] = useState({});
  const [msg, setMsg] = useState('');
  const run = async (fn, note) => { try { await fn(); setMsg(note); shared.reload(); orders.reload(); reports.reload(); } catch (e) { setMsg(e.message); } };
  const incoming = shared.data.flatMap(e => e.tests.filter(t => t.status === 'ORDERED').map(t => ({ ...t, patient: e.patient.name, doctor: e.prescription.doctor_snapshot?.name })));
  const mine = orders.data.filter(o => o.performing_organization_id === organizationId);
  return <Section id="dashboard-orders" eyebrow="Diagnostics" title="Test orders, billing and reports">
    <p className="mm-muted text-sm">Orders appear only after the patient sends them to this hospital. Reports stay private until a reviewer releases them.</p>
    <h3 className="font-semibold">Incoming orders</h3>
    <State loading={shared.loading} error={shared.error} empty={!incoming.length} emptyText="No new orders shared with this hospital." />
    {incoming.map(t => <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--mm-border)] py-2 text-sm"><span><strong>{t.test_name}</strong> · {t.patient} · ordered by {t.doctor}</span><button className="mm-button mm-button-primary" onClick={() => run(() => careApi(`/test-orders/${t.id}/accept`, { token, method: 'POST', body: { organization_id: organizationId } }), 'Order accepted.')}>Accept</button></div>)}
    <h3 className="pt-2 font-semibold">Accepted orders</h3>
    {!mine.length && <p className="mm-muted text-sm">None yet.</p>}
    {mine.map(o => { const draft = reports.data.find(r => r.test_order_id === o.id && r.status === 'DRAFT'); const released = reports.data.find(r => r.test_order_id === o.id && r.status === 'RELEASED');
      return <div key={o.id} className="space-y-2 rounded-xl border border-[var(--mm-border)] p-3 text-sm"><div className="flex justify-between"><strong>{o.test_name} · {o.patient_name}</strong><Badge status={o.status} /></div>
        {o.invoice_id ? <p>Bill: ৳{(o.price_paisa / 100).toFixed(2)} · paid ৳{(o.paid_paisa / 100).toFixed(2)} · due ৳{((o.price_paisa - o.discount_paisa - o.paid_paisa) / 100).toFixed(2)} {o.price_paisa - o.discount_paisa - o.paid_paisa > 0 && <button className="ml-2 underline" onClick={() => run(() => careApi(`/invoices/${o.invoice_id}/payments`, { token, method: 'POST', body: { amount_bdt: (o.price_paisa - o.discount_paisa - o.paid_paisa) / 100, note: 'Paid at counter' } }), 'Offline payment recorded. No online payment was processed.')}>Record cash payment</button>}</p>
          : <div className="flex flex-wrap items-end gap-2"><label className="text-xs">Price (BDT)<input type="number" min="0" className={`${field} w-28`} value={f[o.id + 'p'] || ''} onChange={e => setF({ ...f, [o.id + 'p']: e.target.value })} /></label><button className="mm-button mm-button-secondary" onClick={() => run(() => careApi(`/test-orders/${o.id}/bill`, { token, method: 'POST', body: { price_bdt: Number(f[o.id + 'p'] || 0) } }), 'Bill created.')}>Create bill</button></div>}
        {!draft && !released && ['ACCEPTED', 'IN_PROGRESS'].includes(o.status) && <div className="space-y-2"><textarea className={field} placeholder="Report observations" value={f[o.id + 'o'] || ''} onChange={e => setF({ ...f, [o.id + 'o']: e.target.value })} /><button className="mm-button mm-button-secondary" onClick={() => run(() => careApi(`/test-orders/${o.id}/reports`, { token, method: 'POST', body: { observations: f[o.id + 'o'] } }), 'Draft saved — not visible to the patient yet.')}>Save draft report</button></div>}
        {draft && <div className="rounded-lg bg-amber-50 p-2 text-amber-900"><p>Draft: {draft.observations}</p><button className="mm-button mm-button-primary mt-2" onClick={() => run(() => careApi(`/reports/${draft.id}/release`, { token, method: 'POST' }), 'Report released to the patient and ordering doctor.')}>Review and release</button></div>}
        {released && <p className="text-emerald-800">Released {fmt(released.released_at)}</p>}
      </div>; })}
    <Msg text={msg} />
  </Section>;
}
