import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { makeApp, testEnv } from './helpers.js';

const loginAs = (app, email, password) => request(app).post('/api/auth/login').send({ email, password });

describe('auth', () => {
  it('logs in with a case-insensitive email', async () => {
    const { app } = makeApp();
    const res = await loginAs(app, 'ADMIN@Example.COM', testEnv.ADMIN_PASSWORD);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ token: expect.any(String), user: { email: testEnv.ADMIN_EMAIL } });
    expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThan(Date.now());

    const payload = jwt.verify(res.body.token, testEnv.JWT_SECRET, { algorithms: ['HS256'] });
    expect(payload.sub).toBe(testEnv.ADMIN_EMAIL);
    expect(new Date(payload.exp * 1000).toISOString()).toBe(res.body.expiresAt);
  });

  it('rejects a wrong password or email with the same 401', async () => {
    const { app } = makeApp();
    const badPassword = await loginAs(app, testEnv.ADMIN_EMAIL, 'wrong-password');
    const badEmail = await loginAs(app, 'someone@example.com', testEnv.ADMIN_PASSWORD);
    for (const res of [badPassword, badEmail]) {
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }
  });

  it('returns the email from /api/auth/me', async () => {
    const { app } = makeApp();
    const { token } = (await loginAs(app, testEnv.ADMIN_EMAIL, testEnv.ADMIN_PASSWORD)).body;
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ email: testEnv.ADMIN_EMAIL });
  });

  it.each([
    ['no token', undefined],
    ['a garbage token', 'Bearer not.a.jwt'],
    ['a malformed header', 'Token abc'],
    ['a token signed with another secret', `Bearer ${jwt.sign({ sub: testEnv.ADMIN_EMAIL }, 'x'.repeat(40))}`],
    [
      'an expired token',
      `Bearer ${jwt.sign({ sub: testEnv.ADMIN_EMAIL, exp: Math.floor(Date.now() / 1000) - 60 }, testEnv.JWT_SECRET)}`,
    ],
    ['a token for another user', `Bearer ${jwt.sign({ sub: 'other@example.com' }, testEnv.JWT_SECRET)}`],
  ])('rejects protected routes with %s', async (_label, header) => {
    const { app } = makeApp();
    const req = request(app).get('/api/products');
    if (header) req.set('Authorization', header);
    const res = await req;
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('protects /api/auth/me', async () => {
    const { app } = makeApp();
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
  });

  it('rate-limits the 11th login attempt in a window', async () => {
    const { app } = makeApp();
    for (let i = 0; i < 10; i++) {
      const res = await loginAs(app, testEnv.ADMIN_EMAIL, i % 2 ? 'wrong-password' : testEnv.ADMIN_PASSWORD);
      expect(res.status).not.toBe(429);
    }
    const res = await loginAs(app, testEnv.ADMIN_EMAIL, testEnv.ADMIN_PASSWORD);
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('RATE_LIMITED');
  });

  it('gives each app its own limiter', async () => {
    const first = makeApp();
    for (let i = 0; i < 11; i++) await loginAs(first.app, testEnv.ADMIN_EMAIL, 'wrong-password');
    const second = makeApp();
    expect((await loginAs(second.app, testEnv.ADMIN_EMAIL, testEnv.ADMIN_PASSWORD)).status).toBe(200);
  });
});
