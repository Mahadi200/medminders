export const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const base = API_ORIGIN + '/api/v1';

export async function careApi(path, { method = 'GET', body, token } = {}) {
  let response;
  try {
    response = await fetch(base + path, {
      method,
      headers: {
        ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json', Accept: 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
  } catch {
    throw Object.assign(new Error(`Cannot reach the MedMinders API at ${API_ORIGIN}. Check that the Laravel server is running and VITE_API_URL points to the correct port.`), { status: 0 });
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = data.errors ? Object.entries(data.errors).map(([field, messages]) => `${field}: ${[].concat(messages).join(' ')}`).join(' ') : '';
    if (response.status === 401) throw Object.assign(new Error('Your session has expired. Sign in again.'), { status: 401 });
    if (response.status === 403) throw new Error(data.message || 'You are not authorized for this action.');
    if (response.status === 503) throw new Error(data.message || 'The requested delivery service is temporarily unavailable. Try again later.');
    throw new Error(details || data.message || `Request failed (${response.status}).`);
  }
  return data;
}
