import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { app } from '../app.js';

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

describe('Anonymous Access Denial & Fail-Closed Security Surfaces', () => {
  it('Surface 1: denies anonymous public access to /uploads/*', async () => {
    const res = await fetch(`${baseUrl}/uploads/sample-prescription.jpg`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Direct public access to uploads is disabled');
  });

  it('Surface 2: denies anonymous GET /api/prescriptions/:id', async () => {
    const res = await fetch(`${baseUrl}/api/prescriptions/scan-uuid-12345`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Authentication required');
  });

  it('Surface 3a: denies anonymous POST /api/prescriptions/upload', async () => {
    const res = await fetch(`${baseUrl}/api/prescriptions/upload`, {
      method: 'POST',
      body: JSON.stringify({ note: 'anonymous attempt' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Authentication required');
  });

  it('Surface 3b: denies POST /api/prescriptions/upload with demo-token or demo-patient', async () => {
    const res = await fetch(`${baseUrl}/api/prescriptions/upload`, {
      method: 'POST',
      body: JSON.stringify({ userId: 'demo-patient' }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer demo-token',
      },
    });
    expect(res.status).toBe(401);
  });

  it('Surface 3c: denies anonymous POST /api/prescriptions/scan', async () => {
    const res = await fetch(`${baseUrl}/api/prescriptions/scan`, {
      method: 'POST',
      body: JSON.stringify({ uploadId: 'test-upload' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(401);
  });

  it('Surface 3d: denies POST /api/prescriptions/scan with demo-patient', async () => {
    const res = await fetch(`${baseUrl}/api/prescriptions/scan`, {
      method: 'POST',
      body: JSON.stringify({ uploadId: 'test-upload', userId: 'demo-patient' }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer demo-patient',
      },
    });
    expect(res.status).toBe(401);
  });

  it('Surface 4a: denies anonymous POST /api/admin/antibiotics/import-xlsx', async () => {
    const res = await fetch(`${baseUrl}/api/admin/antibiotics/import-xlsx`, {
      method: 'POST',
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Admin authentication required');
  });

  it('Surface 4b: denies non-admin authenticated users on /api/admin/antibiotics/import-xlsx', async () => {
    const res = await fetch(`${baseUrl}/api/admin/antibiotics/import-xlsx`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_valid_patient_token',
      },
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Forbidden');
  });

  it('preserves public health check at /api/health', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
