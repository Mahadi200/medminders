import { createElement, useEffect, useState } from 'react';

export const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const base = API_ORIGIN + '/api/v1';

export const OFFLINE_MESSAGE = 'Service is temporarily offline. Please try again shortly.';

/** Headers sent with every API request. ngrok's free tier shows an HTML interstitial unless this header is present. */
export const apiHeaders = (token, json = true) => ({
  'ngrok-skip-browser-warning': 'true',
  Accept: 'application/json',
  ...(json ? { 'Content-Type': 'application/json' } : {}),
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

/** fetch() against the API with the shared headers; network failures become a friendly offline error. */
export async function apiFetch(path, { token, headers, ...options } = {}) {
  try {
    return await fetch(path.startsWith('http') ? path : base + path, { ...options, headers: { ...apiHeaders(token, false), ...headers } });
  } catch (error) {
    console.error('[MedMinders] API unreachable', { origin: API_ORIGIN, path, error });
    throw Object.assign(new Error(OFFLINE_MESSAGE), { status: 0, offline: true });
  }
}

export async function careApi(path, { method = 'GET', body, token } = {}) {
  const isForm = body instanceof FormData;
  const response = await apiFetch(path, {
    method, token,
    headers: isForm ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (data === null && response.ok) {
    // A non-JSON success usually means a proxy/tunnel page instead of the API.
    console.error('[MedMinders] Unexpected non-JSON API response', { path, status: response.status });
    throw Object.assign(new Error(OFFLINE_MESSAGE), { status: 0, offline: true });
  }
  if (!response.ok) {
    const payload = data || {};
    if (response.status >= 500 || data === null) console.error('[MedMinders] API error', { path, status: response.status, payload });
    const details = payload.errors ? Object.entries(payload.errors).map(([, messages]) => [].concat(messages).join(' ')).join(' ') : '';
    if (response.status === 401) throw Object.assign(new Error('Your session has expired. Sign in again.'), { status: 401 });
    if (response.status === 403) throw Object.assign(new Error(payload.message || 'You are not authorized for this action.'), { status: 403 });
    if (response.status === 429) throw Object.assign(new Error('Too many requests. Please wait a moment and try again.'), { status: 429 });
    if (response.status === 503 && payload.status !== 'PROVIDER_UNAVAILABLE' && !payload.message) throw Object.assign(new Error(OFFLINE_MESSAGE), { status: 503, offline: true });
    if (response.status >= 500) throw Object.assign(new Error('Something went wrong on our side. Please try again shortly.'), { status: response.status });
    throw Object.assign(new Error(details || payload.message || 'The request could not be completed.'), { status: response.status });
  }
  return data;
}

/** Loads an API image (e.g. doctor photo) with the API headers and returns an object URL; null until loaded or on failure. */
export function useApiImage(path, token) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!path) return undefined;
    let objectUrl = null; let cancelled = false;
    apiFetch(path, { token }).then(r => (r.ok ? r.blob() : null)).then(blob => {
      if (blob && !cancelled && blob.type.startsWith('image/')) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); }
    }).catch(() => {});
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [path, token]);
  return url;
}

export function ApiImage({ path, token, alt = '', className = '', fallback = null }) {
  const url = useApiImage(path, token);
  return url ? createElement('img', { src: url, alt, className, loading: 'lazy' }) : fallback;
}
