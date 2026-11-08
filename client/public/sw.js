/* MedMinders service worker: dose reminder push notifications with Taken / Snooze actions. */
const DB = 'medminders-push', STORE = 'kv';
const idb = () => new Promise((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(STORE); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const get = async key => { const db = await idb(); return new Promise(res => { const q = db.transaction(STORE).objectStore(STORE).get(key); q.onsuccess = () => res(q.result); q.onerror = () => res(null); }); };

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'MedMinders', body: event.data && event.data.text() }; }
  const options = {
    body: data.body || 'A planned dose is due.', tag: data.dose_event_id || 'medminders', renotify: true, requireInteraction: !data.test,
    icon: '/icon.svg', badge: '/icon.svg', vibrate: [300, 150, 300, 150, 600], data,
    actions: data.dose_event_id ? [{ action: 'TAKEN', title: 'Taken' }, { action: 'SNOOZE', title: 'Snooze 10 min' }] : [],
  };
  event.waitUntil(self.registration.showNotification(data.title || 'MedMinders', options));
});

self.addEventListener('notificationclick', event => {
  const n = event.notification; const data = n.data || {};
  n.close();
  event.waitUntil((async () => {
    if (event.action && data.dose_event_id) {
      const [key, api] = [await get('action_key'), await get('api_base')];
      if (key && api) {
        try {
          const r = await fetch(api + '/push/action', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify({ key, dose_event_id: data.dose_event_id, action: event.action }) });
          if (r.ok) return self.registration.showNotification(event.action === 'TAKEN' ? 'Dose recorded ✓' : 'Snoozed for 10 minutes', { body: event.action === 'TAKEN' ? data.body : 'We will remind you again.', tag: 'ack-' + data.dose_event_id, icon: '/icon.svg' });
        } catch { /* fall through to opening the app */ }
      }
    }
    const url = data.url || '/patient-login#dashboard-alarm';
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = all.find(c => new URL(c.url).origin === self.location.origin);
    if (existing) { await existing.focus(); return existing.navigate(url); }
    return self.clients.openWindow(url);
  })());
});
