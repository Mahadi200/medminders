import { useCallback, useEffect, useState } from 'react';
import { careApi } from '../../services/careApi';

export const TZ = 'Asia/Dhaka';
export const fmt = value => value ? new Date(String(value).includes('T') || String(value).endsWith('Z') ? value : String(value).replace(' ', 'T') + 'Z').toLocaleString('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
export const fmtDate = value => value ? new Date(String(value).includes('T') ? value : String(value).replace(' ', 'T') + 'Z').toLocaleDateString('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const field = 'mt-1 w-full rounded-lg border border-[var(--mm-border)] bg-[var(--mm-surface)] p-2 text-[var(--mm-text)]';

/** Loads a list/object from the API with loading/error state and a reload function. */
export function useApi(path, token, initial = []) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    if (!path || !token) return;
    setLoading(true);
    try { setData(await careApi(path, { token })); setError(''); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [path, token]);
  useEffect(() => { reload(); }, [reload]);
  return { data, setData, error, loading, reload };
}

export function Section({ id, eyebrow, title, children, actions, className = '' }) {
  return <section id={id} className={`mm-surface scroll-mt-24 p-5 space-y-3 ${className}`}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div>{eyebrow && <p className="mm-eyebrow">{eyebrow}</p>}<h2 className="text-lg font-bold">{title}</h2></div>{actions}</div>
    {children}
  </section>;
}

export function State({ loading, error, empty, emptyText }) {
  if (loading) return empty ? <p className="mm-muted text-sm" aria-live="polite">Loading…</p> : null;
  if (error) return <p role="alert" className="text-sm text-red-700">{error}</p>;
  if (empty) return <p className="mm-muted text-sm">{emptyText}</p>;
  return null;
}

const tones = { green: 'bg-emerald-100 text-emerald-900', amber: 'bg-amber-100 text-amber-900', red: 'bg-red-100 text-red-900', slate: 'bg-slate-100 text-slate-800', teal: 'bg-teal-100 text-teal-900' };
const statusTone = { CONFIRMED: 'green', SIGNED: 'green', RELEASED: 'green', ACTIVE: 'teal', TAKEN: 'green', TAKEN_LATE: 'amber', RESOLVED: 'green', REVIEWED: 'teal', COMPLETED: 'green',
  PENDING_HOSPITAL: 'amber', PENDING: 'amber', PROPOSED_CHANGE: 'amber', AWAITING_START: 'amber', OPEN: 'amber', DRAFT: 'amber', ORDERED: 'amber', ACCEPTED: 'teal', IN_PROGRESS: 'teal',
  SKIPPED: 'red', REJECTED: 'red', CANCELLED: 'slate', NOT_SURE: 'slate', SCHEDULED: 'slate', SUPERSEDED: 'slate' };
const statusLabel = { PENDING_HOSPITAL: 'Awaiting hospital', PROPOSED_CHANGE: 'New time proposed', AWAITING_START: 'Awaiting first dose', SIGNED: 'Issued', TAKEN_LATE: 'Taken late', NOT_SURE: 'Not sure', SCHEDULED: 'Unconfirmed' };
export function Badge({ status, tone, children }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone || statusTone[status] || 'slate']}`}>{children || statusLabel[status] || String(status || '').replaceAll('_', ' ').toLowerCase()}</span>;
}

export function Msg({ text }) {
  if (!text) return null;
  const bad = /not |cannot|invalid|failed|error|required|exceeds|already|taken|limit|unavailable|denied/i.test(text);
  return <p role="status" className={`rounded-lg border p-2 text-sm ${bad ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-teal-200 bg-teal-50 text-teal-900'}`}>{text}</p>;
}

export function Stat({ label, value, hint }) {
  return <div className="rounded-xl bg-[var(--mm-surface-elevated)] p-3"><p className="mm-muted text-xs uppercase tracking-wide">{label}</p><p className="text-xl font-bold">{value ?? '—'}</p>{hint && <p className="mm-muted text-xs">{hint}</p>}</div>;
}
