import { useCallback, useEffect, useRef, useState } from 'react';
import { careApi } from '../../services/careApi';
import { fmt, Msg } from './ui';

const POLL_MS = 30000;
const RING_LIMIT_MS = 60000; // limited follow-up: sound stops after one minute; the banner remains

/**
 * In-app dose alarm for the open MedMinders tab. Works without SMS/push providers.
 * Acknowledge/snooze never changes the prescribed time; logging is a separate, explicit patient action.
 */
export default function DoseAlarm({ token, isBangla, onLogged }) {
  const [due, setDue] = useState([]);
  const [next, setNext] = useState(null);
  const [modal, setModal] = useState(null);           // dose object or { test: true }
  const [soundOn, setSoundOn] = useState(false);
  const [permission, setPermission] = useState(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const audio = useRef(null);
  const ringTimer = useRef(null);
  const notified = useRef(new Set());
  const dismissed = useRef(new Set());
  const seq = useRef(0);
  const t = (en, bn) => (isBangla ? bn : en);

  const stopSound = () => { if (ringTimer.current) { window.clearInterval(ringTimer.current); ringTimer.current = null; } };
  const beep = useCallback(() => {
    const ctx = audio.current; if (!ctx) return;
    [0, 0.35, 0.7].forEach(offset => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.frequency.value = offset === 0.35 ? 660 : 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.3);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(ctx.currentTime + offset); osc.stop(ctx.currentTime + offset + 0.32);
    });
  }, []);
  const ring = useCallback(() => {
    if (!audio.current) return;
    stopSound(); beep();
    const started = Date.now();
    ringTimer.current = window.setInterval(() => { if (Date.now() - started > RING_LIMIT_MS) stopSound(); else beep(); }, 2500);
  }, [beep]);

  const enableSound = async () => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) { setMessage(t('This browser cannot play alarm audio.', 'এই ব্রাউজারে অ্যালার্মের শব্দ চালানো যায় না।')); return; }
    if (!audio.current) audio.current = new Ctx();
    await audio.current.resume();
    setSoundOn(true); beep();
    setMessage(t('Alarm sound enabled for this open tab. It cannot play after the tab or browser is closed.', 'এই খোলা ট্যাবে অ্যালার্মের শব্দ চালু হয়েছে। ট্যাব বা ব্রাউজার বন্ধ থাকলে শব্দ বাজবে না।'));
  };
  const askNotifications = async () => {
    if (typeof Notification === 'undefined') return;
    setPermission(await Notification.requestPermission());
  };

  const poll = useCallback(async () => {
    try {
      const mine = ++seq.current;
      const result = await careApi('/alarms/due', { token });
      if (mine !== seq.current) return; // a newer poll superseded this response
      setDue(result.due || []); setNext(result.next || null);
      const ringing = (result.due || []).filter(d => d.ringing && !dismissed.current.has(d.dose_event_id + (d.snoozed_until || '')));
      if (ringing.length) {
        const first = ringing[0];
        setModal(current => current && !current.test ? current : first);
        if (!notified.current.has(first.dose_event_id + (first.snoozed_until || ''))) {
          notified.current.add(first.dose_event_id + (first.snoozed_until || ''));
          ring();
          if (permission === 'granted' && document.visibilityState !== 'visible') {
            new Notification('MedMinders dose reminder', { body: 'A planned dose is due. Open MedMinders to record what happened.', tag: first.dose_event_id });
          }
        }
      }
    } catch { /* API errors are shown elsewhere in the dashboard; keep polling */ }
  }, [token, ring, permission]);

  useEffect(() => {
    poll();
    const id = window.setInterval(poll, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && poll();
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', onVisible); stopSound(); };
  }, [poll]);

  const close = (dose) => { stopSound(); if (dose && !dose.test) dismissed.current.add(dose.dose_event_id + (dose.snoozed_until || '')); setModal(null); };
  async function act(path, body, note) {
    setBusy(true);
    try { const r = await careApi(path, { token, method: 'POST', body }); setMessage(note || r.note || 'Saved.'); const done = modal.dose_event_id; seq.current++; setDue(list => list.filter(d => d.dose_event_id !== done || path.includes('/alarms/'))); close(modal); await poll(); onLogged?.(); }
    catch (e) { setMessage(e.message); }
    finally { setBusy(false); }
  }
  const log = status => act(`/dose-events/${modal.dose_event_id}/logs`, { status, actual_at: ['TAKEN', 'TAKEN_LATE'].includes(status) ? new Date().toISOString() : null },
    status === 'SKIPPED' ? t('Recorded as skipped. Do not double the next dose; follow your prescription instructions or ask your pharmacist/doctor.', 'বাদ পড়েছে হিসেবে লেখা হয়েছে। পরের ডোজ দ্বিগুণ করবেন না; প্রেসক্রিপশনের নির্দেশনা মানুন বা ফার্মাসিস্ট/চিকিৎসকের পরামর্শ নিন।') : t('Dose report saved with a timestamp.', 'ডোজের তথ্য সময়সহ সংরক্ষিত হয়েছে।'));

  const ringingCount = due.filter(d => d.ringing).length;
  const testAlarm = () => { setModal({ test: true, generic_name: 'TEST ALARM', dose: 'Demonstration only', scheduled_at: new Date().toISOString() }); if (soundOn) ring(); };

  return <>
    {ringingCount > 0 && <div role="alert" className="sticky top-2 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-red-400 bg-red-50 p-3 text-red-900 shadow-lg">
      <p className="font-semibold">⏰ {t(`${ringingCount} planned dose${ringingCount > 1 ? 's are' : ' is'} due now`, `${ringingCount}টি নির্ধারিত ডোজের সময় হয়েছে`)}</p>
      <button className="mm-button mm-button-primary" onClick={() => setModal(due.find(d => d.ringing))}>{t('Open alarm', 'অ্যালার্ম খুলুন')}</button>
    </div>}

    <section id="dashboard-alarm" className="mm-surface scroll-mt-24 p-5 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="mm-eyebrow">{t('Dose alarm', 'ডোজ অ্যালার্ম')}</p><h2 className="text-lg font-bold">{t('Alarms while MedMinders is open', 'MedMinders খোলা থাকাকালীন অ্যালার্ম')}</h2></div>
        <div className="text-right text-sm"><p className="mm-muted">{t('Next scheduled dose', 'পরবর্তী নির্ধারিত ডোজ')}</p><p className="font-semibold">{next ? `${next.generic_name} · ${fmt(next.scheduled_at)}` : t('None scheduled', 'কোনো ডোজ নির্ধারিত নেই')}</p></div>
      </div>
      <p className="text-sm">{t('Alarms are checked every 30 seconds in this tab. Snoozing or acknowledging never changes your prescribed time. An unanswered alarm stays “unconfirmed” — it is not recorded as a missed dose. SMS and phone push alarms are not connected yet.', 'এই ট্যাবে প্রতি ৩০ সেকেন্ডে অ্যালার্ম দেখা হয়। স্নুজ বা স্বীকার করলে প্রেসক্রিপশনের সময় বদলায় না। উত্তর না দিলে ডোজটি “অনিশ্চিত” থাকে — মিসড ডোজ হিসেবে লেখা হয় না। SMS ও ফোন পুশ অ্যালার্ম এখনো যুক্ত হয়নি।')}</p>
      <div className="flex flex-wrap gap-2">
        <button className="mm-button mm-button-primary" onClick={enableSound} disabled={soundOn}>{soundOn ? t('🔔 Alarm sound on', '🔔 শব্দ চালু') : t('Enable alarm sound', 'অ্যালার্মের শব্দ চালু করুন')}</button>
        <button className="mm-button mm-button-secondary" onClick={askNotifications} disabled={permission !== 'default'}>{permission === 'granted' ? t('Browser notifications on', 'ব্রাউজার নোটিফিকেশন চালু') : permission === 'denied' ? t('Notifications blocked in browser', 'ব্রাউজারে নোটিফিকেশন বন্ধ') : permission === 'unsupported' ? t('Notifications unsupported', 'নোটিফিকেশন সমর্থিত নয়') : t('Allow browser notifications (optional)', 'ব্রাউজার নোটিফিকেশন (ঐচ্ছিক)')}</button>
        <button className="mm-button mm-button-secondary" onClick={testAlarm}>{t('Test alarm (demo, this device only)', 'টেস্ট অ্যালার্ম (ডেমো, শুধু এই ডিভাইস)')}</button>
      </div>
      {due.length > 0 && <ul className="space-y-1 text-sm">{due.map(d => <li key={d.dose_event_id} className="flex flex-wrap items-center gap-2"><strong>{d.generic_name}</strong> {d.dose} · {t('due', 'সময়')} {fmt(d.scheduled_at)} · {d.acknowledged_at ? t('acknowledged, still unconfirmed', 'স্বীকৃত, এখনো অনিশ্চিত') : d.ringing ? t('ringing', 'বাজছে') : t(`snoozed until ${fmt(d.snoozed_until)}`, `স্নুজ ${fmt(d.snoozed_until)} পর্যন্ত`)} <button className="underline" onClick={() => setModal(d)}>{t('Record', 'লিখুন')}</button></li>)}</ul>}
      <Msg text={message} />
    </section>

    {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="alarm-title">
      <div className="w-full max-w-md space-y-4 rounded-2xl bg-[var(--mm-surface)] p-6 text-[var(--mm-text)] shadow-2xl">
        {modal.test && <p className="rounded-lg bg-amber-100 p-2 text-center text-sm font-bold text-amber-900">{t('TEST ALARM — demonstration only. Nothing is recorded and no one else is notified.', 'টেস্ট অ্যালার্ম — শুধু প্রদর্শনের জন্য। কিছু সংরক্ষিত হয় না এবং কাউকে জানানো হয় না।')}</p>}
        <div className="text-center"><p className="text-5xl" aria-hidden="true">⏰</p><h2 id="alarm-title" className="mt-2 text-2xl font-bold">{t('Time for your medicine', 'ওষুধ খাওয়ার সময়')}</h2>
          <p className="mt-1 text-lg font-semibold">{modal.generic_name} {modal.strength || ''}</p><p className="mm-muted">{modal.dose} {modal.route ? `· ${modal.route}` : ''} · {t('scheduled', 'নির্ধারিত')} {fmt(modal.scheduled_at)}</p>
          {modal.instructions && <p className="mt-2 text-sm">{modal.instructions}</p>}</div>
        {modal.test ? <button className="mm-button mm-button-primary w-full" onClick={() => close(modal)}>{t('Close test alarm', 'টেস্ট অ্যালার্ম বন্ধ করুন')}</button> : <>
          <div className="grid grid-cols-2 gap-2">
            <button disabled={busy} className="mm-button mm-button-primary" onClick={() => log('TAKEN')}>{t('Taken', 'খেয়েছি')}</button>
            <button disabled={busy} className="mm-button mm-button-secondary" onClick={() => log('TAKEN_LATE')}>{t('Taken late', 'দেরিতে খেয়েছি')}</button>
            <button disabled={busy} className="mm-button mm-button-secondary" onClick={() => log('SKIPPED')}>{t('Skipped', 'বাদ পড়েছে')}</button>
            <button disabled={busy} className="mm-button mm-button-secondary" onClick={() => log('NOT_SURE')}>{t('Not sure', 'নিশ্চিত নই')}</button>
          </div>
          <div className="flex flex-wrap justify-center gap-2 border-t pt-3 text-sm">
            {[5, 10, 15].map(m => <button key={m} disabled={busy || modal.snoozes_left <= 0} className="mm-button mm-button-secondary" onClick={() => act(`/alarms/${modal.dose_event_id}/snooze`, { minutes: m })}>{t(`Snooze ${m} min`, `${m} মিনিট পরে`)}</button>)}
            <button disabled={busy} className="mm-button mm-button-secondary" onClick={() => act(`/alarms/${modal.dose_event_id}/acknowledge`)}>{t('Acknowledge', 'স্বীকার করুন')}</button>
          </div>
          <p className="mm-muted text-center text-xs">{t(`Snoozes left: ${Math.max(0, modal.snoozes_left ?? 0)}. Snooze/acknowledge do not change your prescribed time or record a dose. Never double a dose without your doctor’s or pharmacist’s instruction.`, `বাকি স্নুজ: ${Math.max(0, modal.snoozes_left ?? 0)}। স্নুজ/স্বীকার করলে সময় বদলায় না বা ডোজ লেখা হয় না। চিকিৎসক বা ফার্মাসিস্টের নির্দেশ ছাড়া ডোজ দ্বিগুণ করবেন না।`)}</p>
          <button className="w-full text-sm underline" onClick={() => close(modal)}>{t('Close (dose stays unconfirmed)', 'বন্ধ করুন (ডোজ অনিশ্চিত থাকবে)')}</button>
        </>}
      </div>
    </div>}
  </>;
}
