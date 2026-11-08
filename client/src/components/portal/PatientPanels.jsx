import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiImage, apiFetch, careApi } from '../../services/careApi';
import { Badge, field, fmt, fmtDate, Msg, Section, Stat, State, TZ, useApi } from './ui';
import { TodayDoses } from './JourneyPanels';

const todayLocal = (offset = 0) => new Date(Date.now() + offset * 86400000).toLocaleDateString('en-CA', { timeZone: TZ });

export function BookAppointment({ token, recordId, onBooked }) {
  const doctors = useApi('/doctors', token);
  const [doctorId, setDoctorId] = useState('');
  const [affId, setAffId] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [slots, setSlots] = useState(null);
  const [slot, setSlot] = useState('');
  const [reason, setReason] = useState('');
  const [consent, setConsent] = useState(true);
  const [msg, setMsg] = useState('');
  const doctor = doctors.data.find(d => d.id === doctorId);
  const aff = doctor?.affiliations?.find(a => a.id === affId);
  useEffect(() => { setSlot(''); setSlots(null); if (!affId || !date) return;
    careApi(`/affiliations/${affId}/slots?date=${date}`).then(r => setSlots(r.slots)).catch(e => setMsg(e.message)); }, [affId, date]);
  async function submit(e) {
    e.preventDefault(); setMsg('');
    try {
      await careApi('/appointments', { token, method: 'POST', body: { patient_record_id: recordId, affiliation_id: affId, scheduled_at: slot, visit_reason: reason || undefined, consultation_consent: consent } });
      setMsg('Request sent to the hospital. You will see the status change here once they respond.'); setSlot(''); onBooked?.();
      careApi(`/affiliations/${affId}/slots?date=${date}`).then(r => setSlots(r.slots));
    } catch (err) { setMsg(err.message); }
  }
  return <Section id="dashboard-book" eyebrow="Find a doctor" title="Book an appointment">
    <State loading={doctors.loading} error={doctors.error} empty={!doctors.data.length} emptyText="No verified, published doctor profiles yet." />
    {doctors.data.length > 0 && <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        {doctors.data.map(d => <button type="button" key={d.id} onClick={() => { setDoctorId(d.id); setAffId(d.affiliations?.[0]?.id || ''); }} className={`flex gap-3 rounded-xl border p-3 text-left ${doctorId === d.id ? 'border-[var(--mm-primary)] ring-2 ring-[var(--mm-primary)]' : 'border-[var(--mm-border)]'}`}>
          <ApiImage path={d.has_photo ? `/doctors/${d.id}/photo` : null} className="h-14 w-14 rounded-full object-cover" fallback={<span className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 text-xl font-bold text-teal-900">{d.user?.name?.replace('Dr. ', '')[0]}</span>} />
          <span><strong className="block">{d.user?.name}</strong><span className="mm-muted block text-sm">{d.specialty || 'Specialty not listed'} · {d.experience_years ?? '—'} yrs</span><span className="block text-xs">{d.qualifications}</span><Badge tone="green">{d.verification_label}</Badge></span>
        </button>)}
      </div>
      {doctor && (doctor.affiliations?.length ? <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm">Hospital / branch<select className={field} value={affId} onChange={e => setAffId(e.target.value)}>{doctor.affiliations.map(a => <option key={a.id} value={a.id}>{a.organization_name}{a.branch_label ? ` — ${a.branch_label}` : ''}</option>)}</select></label>
        <label className="text-sm">Date<input type="date" className={field} min={todayLocal()} max={todayLocal(60)} value={date} onChange={e => setDate(e.target.value)} required /></label>
        <div className="text-sm"><p>Visiting hours</p><p className="font-semibold">{aff ? `${aff.visiting_days.join(', ')} · ${aff.start_time}–${aff.end_time}` : '—'}</p><p className="mm-muted">Fee: {aff?.fee_bdt ? `৳${Number(aff.fee_bdt).toFixed(0)}` : 'Ask the hospital'}</p></div>
      </div> : <p className="text-sm text-amber-800">This doctor has no hospital-confirmed visiting schedule yet.</p>)}
      {slots && (slots.length ? <div className="flex max-h-48 flex-wrap gap-2 overflow-auto">{slots.map(s => <button type="button" key={s.starts_at} disabled={!s.available} onClick={() => setSlot(s.starts_at)}
        className={`rounded-lg border px-3 py-1.5 text-sm ${slot === s.starts_at ? 'bg-teal-700 text-white' : s.available ? 'border-[var(--mm-border)]' : 'cursor-not-allowed line-through opacity-40'}`}>{s.label}</button>)}</div> : <p className="mm-muted text-sm">No open slots on this date. Try another day.</p>)}
      {slot && <>
        <label className="block text-sm">Reason for visit (optional)<input className={field} value={reason} onChange={e => setReason(e.target.value)} maxLength={500} /></label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> Allow this doctor to open my record and write a prescription for this visit (access expires 7 days after the appointment; I can revoke it in Sharing).</label>
        <button className="mm-button mm-button-primary">Request {new Date(slot).toLocaleString('en-GB', { timeZone: TZ, weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</button>
      </>}
    </form>}
    <Msg text={msg} />
  </Section>;
}

export function MyAppointments({ token, list }) {
  const [msg, setMsg] = useState('');
  const run = async (path, method, body) => { try { await careApi(path, { token, method, body }); setMsg('Updated.'); list.reload(); } catch (e) { setMsg(e.message); } };
  return <Section id="dashboard-appointments" eyebrow="Appointments" title="My appointments" actions={<button className="mm-button mm-button-secondary" onClick={list.reload}>Refresh</button>}>
    <State loading={list.loading} error={list.error} empty={!list.data.length} emptyText="No appointments yet. Book one above." />
    <div className="grid gap-2 md:grid-cols-2">{list.data.map(a => <div key={a.id} className="rounded-xl border border-[var(--mm-border)] p-3 text-sm space-y-1">
      <div className="flex justify-between gap-2"><strong>{a.doctor_name}</strong><Badge status={a.status} /></div>
      <p>{fmt(a.scheduled_at)} · {a.organization_name}</p>{a.visit_reason && <p className="mm-muted">{a.visit_reason}</p>}{a.status_reason && <p className="mm-muted">Note: {a.status_reason}</p>}
      {a.status === 'PROPOSED_CHANGE' && <div className="rounded-lg bg-amber-50 p-2 text-amber-900">Hospital proposed <strong>{fmt(a.proposed_scheduled_at)}</strong>. Nothing changes unless you accept.<div className="mt-2 flex gap-2"><button className="mm-button mm-button-primary" onClick={() => run(`/appointments/${a.id}/respond`, 'POST', { accept: true })}>Accept new time</button><button className="mm-button mm-button-secondary" onClick={() => run(`/appointments/${a.id}/respond`, 'POST', { accept: false })}>Decline</button></div></div>}
      {['PENDING_HOSPITAL', 'CONFIRMED'].includes(a.status) && <button className="text-red-700 underline" onClick={() => run(`/appointments/${a.id}`, 'PATCH', { status: 'CANCELLED', reason: 'Cancelled by patient' })}>Cancel</button>}
    </div>)}</div>
    <Msg text={msg} />
  </Section>;
}

export function CourseTracker({ token, courses, reloadKey, onChange }) {
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [msg, setMsg] = useState('');
  const openSeq = useRef(0);
  // Ignore responses that arrive after a newer request (prevents stale dose status after logging).
  const open = async id => { setSelected(id); const mine = ++openSeq.current; try { const d = await careApi(`/courses/${id}`, { token }); if (mine === openSeq.current) setDetail(d); } catch (e) { setMsg(e.message); } };
  useEffect(() => { const id = selected || courses.find(c => c.status === 'ACTIVE')?.id || courses[0]?.id; if (id) open(id); }, [courses.length, reloadKey]);
  const run = async (fn, note) => { setMsg(''); try { await fn(); setMsg(note); onChange?.(); if (selected) await open(selected); } catch (e) { setMsg(e.message); } };
  const s = detail?.summary;
  const logsByEvent = useMemo(() => { const m = {}; (detail?.logs || []).forEach(l => { (m[l.dose_event_id] ||= []).push(l); }); return m; }, [detail]);
  return <Section id="dashboard-courses" eyebrow="Antibiotic tracking" title="My antibiotic courses" className="lg:col-span-2">
    <p className="text-sm">All dose logs are self-reported with timestamps. Pharmacy supply, your first dose, and doses you report taken are tracked separately.</p>
    {!courses.length && <p className="mm-muted text-sm">No prescribed antibiotic course is linked to your profile yet.</p>}
    <div className="flex flex-wrap gap-2">{courses.map(c => <button key={c.id} onClick={() => open(c.id)} className={`rounded-lg border px-3 py-2 text-sm ${selected === c.id ? 'border-[var(--mm-primary)] ring-2 ring-[var(--mm-primary)]' : 'border-[var(--mm-border)]'}`}><strong>{c.generic_name}</strong> · {c.dose} <Badge status={c.status} /></button>)}</div>
    {detail && <div className="space-y-4">
      <TodayDoses token={token} detail={detail} onChanged={() => { open(detail.course.id); onChange?.(); }} />
      {detail.course.status === 'AWAITING_START' && <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        <p>Your schedule starts from the time you actually take the first dose — not the prescription or purchase time.</p>
        <button className="mm-button mm-button-primary mt-2" onClick={() => run(() => careApi(`/courses/${detail.course.id}/start`, { token, method: 'POST', body: { actual_start_at: new Date().toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || TZ } }), 'First dose confirmed. Your dose schedule was created.')}>I took the first dose now</button>
      </div>}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Antibiotic" value={detail.course.generic_name} hint={`${detail.course.dose} · ${detail.course.route}`} />
        <Stat label="First dose (confirmed)" value={detail.course.actual_start_at ? fmt(detail.course.actual_start_at) : 'Not yet'} />
        <Stat label="Planned end / review" value={detail.course.planned_end_at ? fmtDate(detail.course.planned_end_at) : '—'} hint={detail.course.instructions || ''} />
        <Stat label="Next dose" value={detail.events.find(e => e.status === 'SCHEDULED' && new Date(e.scheduled_at.replace(' ', 'T') + 'Z') > new Date()) ? fmt(detail.events.find(e => e.status === 'SCHEDULED' && new Date(e.scheduled_at.replace(' ', 'T') + 'Z') > new Date()).scheduled_at) : 'None scheduled'} />
        <Stat label="Days elapsed" value={`${s.days_elapsed} / ${s.prescribed_days ?? '—'}`} hint="prescribed days" />
        <Stat label="Reported taken" value={`${s.reported_taken + s.reported_taken_late} / ${s.due_so_far}`} hint={`incl. ${s.reported_taken_late} late · of doses due so far`} />
        <Stat label="Skipped · Not sure · Unconfirmed" value={`${s.reported_skipped} · ${s.reported_not_sure} · ${s.unconfirmed}`} hint="unconfirmed = no report yet, not proof of a missed dose" />
        <Stat label="Remaining scheduled" value={s.remaining_scheduled} hint={`of ${s.scheduled_total} total`} />
        <Stat label="Dispensed (pharmacy)" value={s.dispensed_quantity} hint={`authorized: ${s.prescribed_quantity ?? '—'}`} />
        <Stat label="Estimated supply left" value={s.estimated_supply_units} hint="estimate: dispensed − reported taken" />
        <Stat label="Course status" value={detail.course.completion_status && detail.course.completion_status !== 'UNKNOWN' ? detail.course.completion_status.replaceAll('_', ' ').toLowerCase() : detail.course.status.replaceAll('_', ' ').toLowerCase()} />
        <Stat label="Reported adherence" value={s.reported_adherence_pct == null ? '—' : `${s.reported_adherence_pct}%`} hint="taken ÷ due so far" />
      </div>
      <p className="mm-muted text-xs">{s.denominator_note}</p>
      {s.supply_shortfall && <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Your estimated supply ({s.estimated_supply_units}) is less than the remaining prescribed doses ({s.remaining_scheduled}). Check the medicine you have; if you need more for <em>this</em> prescribed course, contact your pharmacy. · প্রেসক্রিপশনের বাকি ডোজের তুলনায় সরবরাহ কম হতে পারে।</p>}
      {detail.course.planned_end_at && new Date(detail.course.planned_end_at.replace(' ', 'T') + 'Z') <= new Date() && <p className="rounded-lg border border-teal-300 bg-teal-50 p-3 text-sm">The prescribed period has ended. Report completion below. Do not buy more or extend the antibiotic without an updated prescription.</p>}
      {s.reported_skipped > 0 && <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">You reported a skipped dose. Do not double the next dose. Follow your prescription instructions or ask your pharmacist/doctor. A skipped dose does not mean the medicine will stop working. · নিজে থেকে ডাবল ডোজ নেবেন না।</p>}
      <div className="max-h-96 overflow-auto rounded-xl border border-[var(--mm-border)]">{detail.events.map(e => { const past = new Date(e.scheduled_at.replace(' ', 'T') + 'Z') <= new Date(Date.now() + 3600000); const hist = logsByEvent[e.id] || [];
        return <div key={e.id} className="flex flex-wrap items-center gap-2 border-b border-[var(--mm-border)] p-2 text-sm"><span className="w-44">{fmt(e.scheduled_at)}</span>{e.status === 'SCHEDULED' && new Date(e.scheduled_at.replace(' ', 'T') + 'Z') > new Date() ? <Badge tone="slate">scheduled</Badge> : <Badge status={e.status} />}
          {past && e.status !== 'CANCELLED' && detail.course.status === 'ACTIVE' && [['TAKEN', 'Taken'], ['TAKEN_LATE', 'Taken late'], ['SKIPPED', 'Skipped'], ['NOT_SURE', 'Not sure']].map(([st, label]) => st !== e.status && <button key={st} className="rounded bg-[var(--mm-surface-elevated)] px-2 py-1" onClick={() => run(() => careApi(`/dose-events/${e.id}/logs`, { token, method: 'POST', body: { status: st, actual_at: st.startsWith('TAKEN') ? new Date().toISOString() : null, reason: e.status !== 'SCHEDULED' ? 'Patient correction' : undefined } }), e.status === 'SCHEDULED' ? 'Dose report saved.' : 'Correction saved; the earlier entry is kept in history.')}>{label}</button>)}
          {hist.length > 1 && <span className="mm-muted text-xs">corrected · {hist.map(h => `${h.status.toLowerCase()} @ ${fmt(h.created_at)}`).join(' → ')}</span>}
          {hist.length === 1 && <span className="mm-muted text-xs">reported {fmt(hist[0].created_at)}</span>}
        </div>; })}</div>
      {detail.course.status === 'ACTIVE' && <SupportBox token={token} course={detail.course} onDone={msg => setMsg(msg)} />}
    </div>}
    <Msg text={msg} />
  </Section>;
}

function SupportBox({ token, course, onDone }) {
  const [reason, setReason] = useState('FORGOT');
  const [note, setNote] = useState('');
  const send = async () => { try { const r = await careApi(`/courses/${course.id}/support`, { token, method: 'POST', body: { reason, note } }); onDone([r.urgent_message, 'Support request sent to your prescriber.', r.advice].filter(Boolean).join(' ')); } catch (e) { onDone(e.message); } };
  const complete = async status => { try { await careApi(`/courses/${course.id}/completion`, { token, method: 'POST', body: { completion_status: status } }); onDone('Your reported course status was saved.'); } catch (e) { onDone(e.message); } };
  return <div className="grid gap-3 rounded-xl border border-[var(--mm-border)] p-3 md:grid-cols-2">
    <div className="space-y-2"><p className="font-semibold">Need help with this course?</p>
      <select className={field} value={reason} onChange={e => setReason(e.target.value)}>{[['FORGOT', 'I forgot a dose'], ['COULD_NOT_OBTAIN', 'Could not obtain medicine'], ['COST', 'Cost or access'], ['DIFFICULTY_TAKING', 'Vomiting or difficulty taking'], ['SIDE_EFFECT', 'Side effects'], ['SEVERE_ALLERGY', 'Severe allergy / breathing difficulty'], ['OTHER', 'Other']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      {reason === 'SEVERE_ALLERGY' && <p role="alert" className="rounded-lg bg-red-100 p-2 font-bold text-red-900">Seek emergency care now. In Bangladesh, call 999.</p>}
      <textarea className={field} placeholder="Optional details" value={note} onChange={e => setNote(e.target.value)} /><button className="mm-button mm-button-secondary" onClick={send}>Ask care team</button></div>
    <div className="space-y-2"><p className="font-semibold">Report course status</p><p className="mm-muted text-sm">Self-reported; your prescriber can see it.</p>
      <div className="flex flex-wrap gap-2"><button className="mm-button mm-button-secondary" onClick={() => complete('PATIENT_REPORTED_COMPLETE')}>Completed</button><button className="mm-button mm-button-secondary" onClick={() => complete('PATIENT_REPORTED_EARLY_STOP')}>Stopped early</button><button className="mm-button mm-button-secondary" onClick={() => complete('INTERRUPTED')}>Interrupted</button></div></div>
  </div>;
}

export function PrescriptionsAndSharing({ token, prescriptions, sharing, onChange }) {
  const pharmacies = useApi('/organizations/approved?type=PHARMACY', token);
  const hospitals = useApi('/organizations/approved?type=HOSPITAL', token);
  const [choice, setChoice] = useState({});
  const [msg, setMsg] = useState('');
  const share = async (rx, kind) => {
    const org = choice[rx.id + kind]; if (!org) { setMsg('Choose an organization first.'); return; }
    try { const r = await careApi('/sharing/share', { token, method: 'POST', body: { organization_id: org, resource_type: 'PRESCRIPTION', resource_id: rx.id, action: kind === 'pharmacy' ? 'DISPENSE' : 'VIEW', duration_minutes: 7 * 1440 } });
      setMsg(`Shared with ${r.organization} until ${fmt(r.expires_at)}.`); onChange(); } catch (e) { setMsg(e.message); }
  };
  const decide = async (id, decision) => { try { await careApi(`/sharing/requests/${id}/decision`, { token, method: 'POST', body: { decision } }); setMsg(decision === 'APPROVE' ? 'Access approved.' : 'Request declined.'); onChange(); } catch (e) { setMsg(e.message); } };
  const revoke = async id => { try { await careApi(`/sharing/grants/${id}/revoke`, { token, method: 'POST' }); setMsg('Access revoked. Future access stops; audit history remains.'); onChange(); } catch (e) { setMsg(e.message); } };
  const activeGrants = (sharing.grants || []).filter(g => !g.revoked_at && new Date(g.expires_at.replace(' ', 'T') + 'Z') > new Date());
  const grantGroups = Object.values(activeGrants.reduce((m, g) => { const k = `${g.organization_id || g.recipient_id}:${g.resource_id}:${g.action}`; (m[k] ||= g); return m; }, {}));
  const statusOf = rx => rx.cancelled_at ? 'CANCELLED' : rx.superseded_at ? 'SUPERSEDED' : rx.status;
  return <>
    <Section id="dashboard-prescriptions" eyebrow="Prescriptions" title="Issued prescriptions">
      {!prescriptions.length && <p className="mm-muted text-sm">No prescriptions yet. Issued prescriptions appear here automatically.</p>}
      {prescriptions.map(rx => <article key={rx.id} className="space-y-2 rounded-xl border border-[var(--mm-border)] p-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2"><p><strong>{rx.doctor_snapshot?.name || 'Doctor'}</strong> · {fmt(rx.issued_at || rx.created_at)}</p><span className="flex gap-1"><Badge status={statusOf(rx)} />{rx.supersedes_id && <Badge tone="slate">amended version</Badge>}<Badge tone="teal">provider-issued</Badge></span></div>
        {rx.diagnosis && <p>Diagnosis: {rx.diagnosis}</p>}
        <ul className="list-disc pl-5">{rx.items?.map(i => <li key={i.id}><strong>{i.generic_name}</strong> {i.strength} · {i.dose} · {i.route} · {i.schedule_type === 'EVERY_N_HOURS' ? `every ${i.schedule_details?.hours} h` : (i.schedule_details?.times || []).join(', ')} · {i.duration_days} days{i.is_antibiotic ? ' · antibiotic' : ''}{i.quantity ? ` · qty ${i.quantity}` : ''}</li>)}</ul>
        {rx.clinical_details?.advice && <p>Advice: {rx.clinical_details.advice}</p>}{rx.clinical_details?.follow_up && <p>Follow-up: {rx.clinical_details.follow_up}</p>}
        {statusOf(rx) === 'SIGNED' && <div className="grid gap-2 border-t border-[var(--mm-border)] pt-2 md:grid-cols-2">
          {[['pharmacy', 'Share with pharmacy for dispensing', pharmacies.data], ['hospital', 'Send test orders to hospital/lab', hospitals.data]].map(([kind, label, orgs]) => <div key={kind} className="flex flex-wrap items-end gap-2"><label className="min-w-0 flex-1 text-xs">{label}<select className={field} value={choice[rx.id + kind] || ''} onChange={e => setChoice({ ...choice, [rx.id + kind]: e.target.value })}><option value="">Choose…</option>{orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label><button className="mm-button mm-button-secondary" onClick={() => share(rx, kind)}>Share 7 days</button></div>)}
        </div>}
      </article>)}
      <Msg text={msg} />
    </Section>
    <Section id="dashboard-requests" eyebrow="Requests" title="Access requests and record shares">
      <p className="text-sm">You decide who sees what, for how long. Revoking stops future access; provider-authored records and the audit history remain.</p>
      {(sharing.requests || []).filter(r => r.status === 'PENDING').map(r => <div key={r.id} className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><p><strong>{r.requester_name}</strong>{r.organization_name ? ` (${r.organization_name})` : ''} asks for <strong>{r.action}</strong> access to a {r.resource_type.toLowerCase()} for {Math.round(r.duration_minutes / 60)} h.</p><p>Purpose: {r.purpose}</p><div className="mt-2 flex gap-2"><button className="mm-button mm-button-primary" onClick={() => decide(r.id, 'APPROVE')}>Approve</button><button className="mm-button mm-button-secondary" onClick={() => decide(r.id, 'DENY')}>Decline</button></div></div>)}
      {!grantGroups.length && <p className="mm-muted text-sm">No active shares.</p>}
      {grantGroups.map(g => <div key={g.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--mm-border)] py-2 text-sm"><span><strong>{g.resource_type === 'ENCOUNTER' ? g.recipient_name : (g.organization_name || g.recipient_name)}</strong> · {g.resource_type === 'ENCOUNTER' ? 'consultation record access' : `${g.action} ${g.resource_type.toLowerCase()}`} · until {fmt(g.expires_at)}</span><button className="text-red-700 underline" onClick={() => revoke(g.id)}>Revoke</button></div>)}
    </Section>
  </>;
}

export function RecordsArchive({ token, prescriptions, reports, orders, invoices }) {
  const [q, setQ] = useState('');
  const [type, setType] = useState('ALL');
  const [view, setView] = useState(null);
  const [msg, setMsg] = useState('');
  const rows = [
    ...prescriptions.map(p => ({ id: p.id, kind: 'Prescription', date: p.issued_at || p.created_at, title: (p.items || []).map(i => i.generic_name).join(', ') || p.diagnosis || 'Prescription', who: p.doctor_snapshot?.name, status: p.cancelled_at ? 'CANCELLED' : p.superseded_at ? 'SUPERSEDED' : p.status, source: 'Provider-issued' })),
    ...reports.map(r => ({ id: r.id, kind: 'Report', date: r.released_at || r.created_at, title: r.test_name, who: r.organization_name, status: r.status, source: 'Provider-issued', version: r.supersedes_id ? 'Amended version' : 'Original', has_file: r.has_file })),
  ].filter(r => (type === 'ALL' || r.kind === type) && `${r.title} ${r.who} ${r.status}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const openReport = async id => { try { setView(await careApi(`/reports/${id}`, { token })); } catch (e) { setMsg(e.message); } };
  const download = async id => {
    try { const res = await apiFetch(`/reports/${id}/file`, { token }); if (!res.ok) throw new Error('File not available.');
      const url = URL.createObjectURL(await res.blob()); window.open(url, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(url), 60000); } catch (e) { setMsg(e.message); }
  };
  return <Section id="dashboard-reports" eyebrow="Health records" title="Records archive">
    <div className="flex flex-wrap gap-2"><input className={`${field} max-w-xs`} placeholder="Search medicine, test, doctor…" value={q} onChange={e => setQ(e.target.value)} /><select className={`${field} max-w-[10rem]`} value={type} onChange={e => setType(e.target.value)}><option value="ALL">All records</option><option value="Prescription">Prescriptions</option><option value="Report">Reports</option></select></div>
    {!rows.length && <p className="mm-muted text-sm">No records match.</p>}
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="mm-muted"><th className="p-2">Date</th><th className="p-2">Type</th><th className="p-2">Details</th><th className="p-2">Status</th><th className="p-2">Source</th><th className="p-2" /></tr></thead>
      <tbody>{rows.map(r => <tr key={r.id} className="border-t border-[var(--mm-border)]"><td className="p-2 whitespace-nowrap">{fmtDate(r.date)}</td><td className="p-2">{r.kind}</td><td className="p-2">{r.title}<span className="mm-muted block text-xs">{r.who}{r.version ? ` · ${r.version}` : ''}</span></td><td className="p-2"><Badge status={r.status} /></td><td className="p-2 text-xs">{r.source}</td>
        <td className="p-2 whitespace-nowrap">{r.kind === 'Report' && <><button className="underline" onClick={() => openReport(r.id)}>View</button>{r.has_file ? <button className="ml-2 underline" onClick={() => download(r.id)}>File</button> : null}</>}</td></tr>)}</tbody></table></div>
    {view && <div className="rounded-xl border border-[var(--mm-border)] p-3 text-sm"><div className="flex justify-between"><strong>Released report</strong><button className="underline" onClick={() => setView(null)}>Close</button></div><p className="mm-muted">Released {fmt(view.released_at)}{view.amendment_reason ? ` · Amendment: ${view.amendment_reason}` : ''}</p><p className="mt-2 whitespace-pre-wrap">{view.observations || 'See attached file.'}</p><p className="mm-muted mt-2 text-xs">Discuss results with your doctor. MedMinders does not interpret reports.</p></div>}
    {(orders.length > 0 || invoices.length > 0) && <div className="grid gap-3 md:grid-cols-2"><div><p className="font-semibold">Test orders</p>{orders.map(o => <p key={o.id} className="text-sm">{o.test_name} · <Badge status={o.status} /> {o.organization_name ? `· ${o.organization_name}` : ''}</p>)}</div>
      <div><p className="font-semibold">Diagnostic bills</p>{invoices.map(v => <p key={v.id} className="text-sm">{v.test_name}: ৳{(v.price_paisa / 100).toFixed(2)} · paid ৳{(v.paid_paisa / 100).toFixed(2)} · due ৳{((v.price_paisa - v.discount_paisa - v.paid_paisa) / 100).toFixed(2)}</p>)}{!invoices.length && <p className="mm-muted text-sm">No bills.</p>}</div></div>}
    <p className="mm-muted text-xs">PDF export is not available yet. Use your browser’s print to save a copy.</p>
    <Msg text={msg} />
  </Section>;
}

export function ProblemReport({ token, courses }) {
  const mine = useApi('/medication-problems', token);
  const [form, setForm] = useState({ medication_course_id: '', symptoms: '', contact_action: 'CARE_TEAM_REVIEW', medicine_taken: '' });
  const [msg, setMsg] = useState('');
  const submit = async e => { e.preventDefault(); try { await careApi('/medication-problems', { token, method: 'POST', body: { ...form, medicine_taken: form.medicine_taken === '' ? null : form.medicine_taken === 'true' } }); setMsg('Sent to your prescriber. Reports are reviewed in working hours — this is not an emergency service.'); setForm({ ...form, symptoms: '' }); mine.reload(); } catch (err) { setMsg(err.message); } };
  return <Section id="dashboard-problems" eyebrow="Medication support" title="Report a medication problem">
    <p className="text-sm">Describe side effects or difficulties. This does not diagnose a reaction or resistance. For breathing difficulty, swelling of face/lips or fainting, call 999 now.</p>
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
      <select className={field} value={form.medication_course_id} onChange={e => setForm({ ...form, medication_course_id: e.target.value })} required><option value="">Select medicine course</option>{courses.map(c => <option key={c.id} value={c.id}>{c.generic_name} · {c.status}</option>)}</select>
      <select className={field} value={form.medicine_taken} onChange={e => setForm({ ...form, medicine_taken: e.target.value })}><option value="">Still taking it?</option><option value="true">Yes, still taking</option><option value="false">No, stopped</option></select>
      <select className={field} value={form.contact_action} onChange={e => setForm({ ...form, contact_action: e.target.value })}><option value="CARE_TEAM_REVIEW">Care team review</option><option value="SELF_MONITOR">Self-monitor, inform doctor</option><option value="URGENT_CARE">I am seeking urgent care</option></select>
      <textarea className={`${field} md:col-span-3`} placeholder="Symptoms, when they started, anything else relevant" value={form.symptoms} onChange={e => setForm({ ...form, symptoms: e.target.value })} required />
      <button className="mm-button mm-button-primary w-fit">Send to care team</button>
    </form>
    <Msg text={msg} />
    {mine.data.map(r => <p key={r.id} className="border-t border-[var(--mm-border)] pt-2 text-sm"><Badge status={r.status} /> {fmt(r.created_at)} · {r.symptoms}{r.review_note && <span className="block text-teal-900">Care team response: {r.review_note}</span>}</p>)}
  </Section>;
}
