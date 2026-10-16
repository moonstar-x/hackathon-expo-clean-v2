import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { makeApp } from './helpers.ts';

describe('GET /health', () => {
  it('returns 200 without auth', async () => {
    const { app } = await makeApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'ok' });
  });

  it('returns 503 when the database is unavailable', async () => {
    const { app, db } = await makeApp();
    db.close();
    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'error', db: 'error' });
  });
});

describe('errors', () => {
  it('returns 404 in the error format for unknown routes', async () => {
    const { app } = await makeApp();
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ code: 'NOT_FOUND', message: expect.any(String) });
  });

  it('returns 400 for malformed JSON', async () => {
    const { app } = await makeApp();
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
  });
});
