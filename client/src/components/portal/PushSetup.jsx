import { useEffect, useState } from 'react';
import { API_ORIGIN, careApi } from '../../services/careApi';

const idbSet = (key, value) => new Promise((res, rej) => {
  const r = indexedDB.open('medminders-push', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('kv');
  r.onsuccess = () => { const tx = r.result.transaction('kv', 'readwrite'); tx.objectStore('kv').put(value, key); tx.oncomplete = res; tx.onerror = () => rej(tx.error); };
  r.onerror = () => rej(r.error);
});
const b64ToBytes = s => { const p = (s + '='.repeat((4 - s.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/'); return Uint8Array.from(atob(p), c => c.charCodeAt(0)); };
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone;

/** Turns on phone/desktop push reminders (works with the tab closed). Requires HTTPS and notification permission. */
export default function PushSetup({ token, t }) {
  const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const [state, setState] = useState({ configured: null, devices: 0, subscribed: false });
  const [msg, setMsg] = useState('');
  const [install, setInstall] = useState(null);
  useEffect(() => {
    const onPrompt = e => { e.preventDefault(); setInstall(e); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    if (supported) navigator.serviceWorker.register('/sw.js').then(reg => reg.pushManager.getSubscription()).then(sub => setState(s => ({ ...s, subscribed: !!sub }))).catch(() => {});
    careApi('/push/status', { token }).then(r => setState(s => ({ ...s, configured: r.configured, devices: r.devices }))).catch(() => {});
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, [token]);

  async function enable() {
    setMsg('');
    try {
      if (Notification.permission !== 'granted' && (await Notification.requestPermission()) !== 'granted') { setMsg(t('Notifications are blocked. Allow them in your browser settings.', 'নোটিফিকেশন বন্ধ আছে। ব্রাউজার সেটিংসে চালু করুন।')); return; }
      const { public_key: key, configured } = await careApi('/push/public-key');
      if (!configured) { setMsg(t('Phone reminders are not set up on the server yet. In-app alarms still work.', 'সার্ভারে ফোন রিমাইন্ডার এখনো চালু হয়নি। অ্যাপের অ্যালার্ম কাজ করবে।')); return; }
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub = existing || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) });
      const r = await careApi('/push/subscriptions', { token, method: 'POST', body: sub.toJSON() });
      await idbSet('action_key', r.action_key); await idbSet('api_base', API_ORIGIN + '/api/v1');
      setState(s => ({ ...s, subscribed: true, devices: s.devices + (existing ? 0 : 1) }));
      setMsg(t('Phone reminders are on for this device.', 'এই ডিভাইসে ফোন রিমাইন্ডার চালু হয়েছে।'));
    } catch (e) { console.error('[MedMinders] push setup failed', e); setMsg(e.message || t('Could not turn on reminders on this device.', 'এই ডিভাইসে রিমাইন্ডার চালু করা যায়নি।')); }
  }
  const test = async () => { try { const r = await careApi('/push/test', { token, method: 'POST' }); setMsg(r.sent ? t('Test notification sent. Nothing was recorded.', 'টেস্ট নোটিফিকেশন পাঠানো হয়েছে।') : t('The push service did not accept the test.', 'পুশ সার্ভিস টেস্ট গ্রহণ করেনি।')); } catch (e) { setMsg(e.message); } };

  return <div className="rounded-2xl border border-[var(--mm-border)] p-3 space-y-2">
    <p className="font-semibold">{t('Reminders when the app is closed', 'অ্যাপ বন্ধ থাকলেও রিমাইন্ডার')}</p>
    {!supported ? <p className="text-sm">{isIos() && !isStandalone() ? t('On iPhone: tap Share → “Add to Home Screen”, open MedMinders from the home screen, then turn on reminders here.', 'আইফোনে: Share → “Add to Home Screen” চাপুন, হোম স্ক্রিন থেকে MedMinders খুলে এখানে রিমাইন্ডার চালু করুন।') : t('This browser cannot receive push reminders. In-app alarms still work while MedMinders is open.', 'এই ব্রাউজারে পুশ রিমাইন্ডার কাজ করে না। অ্যাপ খোলা থাকলে অ্যালার্ম কাজ করবে।')}</p>
      : <div className="flex flex-wrap gap-2">
        <button className="mm-button mm-button-primary" onClick={enable} disabled={state.subscribed}>{state.subscribed ? t('✓ Phone reminders on', '✓ ফোন রিমাইন্ডার চালু') : t('Turn on phone reminders', 'ফোন রিমাইন্ডার চালু করুন')}</button>
        {state.subscribed && <button className="mm-button mm-button-secondary" onClick={test}>{t('Send test notification', 'টেস্ট নোটিফিকেশন')}</button>}
        {install && <button className="mm-button mm-button-secondary" onClick={async () => { install.prompt(); await install.userChoice; setInstall(null); }}>{t('Install MedMinders app', 'MedMinders অ্যাপ ইনস্টল করুন')}</button>}
      </div>}
    <p className="mm-muted text-xs">{t('Phones deliver reminders most reliably when MedMinders is installed to the home screen and notifications are allowed. SMS reminders are used only where an SMS provider is set up.', 'MedMinders হোম স্ক্রিনে ইনস্টল ও নোটিফিকেশন চালু থাকলে রিমাইন্ডার সবচেয়ে নির্ভরযোগ্যভাবে আসে।')}</p>
    {msg && <p role="status" className="text-sm">{msg}</p>}
  </div>;
}
