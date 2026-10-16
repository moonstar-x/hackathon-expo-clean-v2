import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { makeApp, testEnv } from './helpers.js';

const loginAs = (app, email, password) => request(app).post('/api/auth/login').send({ email, password });

describe('auth', () => {
  it('logs in with a case-insensitive email', async () => {
    const { app } = await makeApp();
    const res = await loginAs(app, 'ADMIN@Example.COM', testEnv.ADMIN_PASSWORD);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      token: expect.any(String),
      expiresAt: expect.any(String),
      user: { id: expect.any(Number), email: testEnv.ADMIN_EMAIL, name: null },
    });
    expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThan(Date.now());

    const payload = jwt.verify(res.body.token, testEnv.JWT_SECRET, { algorithms: ['HS256'] });
    expect(payload.sub).toBe(String(res.body.user.id));
    expect(new Date(payload.exp * 1000).toISOString()).toBe(res.body.expiresAt);
  });

  it('rejects a wrong password or email with the same 401', async () => {
    const { app } = await makeApp();
    const badPassword = await loginAs(app, testEnv.ADMIN_EMAIL, 'wrong-password');
    const badEmail = await loginAs(app, 'someone@example.com', testEnv.ADMIN_PASSWORD);
    for (const res of [badPassword, badEmail]) {
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }
  });

  it('returns the email from /api/auth/me', async () => {
    const { app } = await makeApp();
    const { token } = (await loginAs(app, testEnv.ADMIN_EMAIL, testEnv.ADMIN_PASSWORD)).body;
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: expect.any(Number), email: testEnv.ADMIN_EMAIL, name: null });
  });

  it('records the last login time', async () => {
    const { app, db } = await makeApp();
    const lastLogin = () => db.prepare('SELECT last_login_at FROM users').pluck().get();
    expect(lastLogin()).toBeNull();
    await loginAs(app, testEnv.ADMIN_EMAIL, testEnv.ADMIN_PASSWORD);
    expect(new Date(lastLogin()).getTime()).toBeGreaterThan(Date.now() - 60_000);
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
    ['a token for a user that does not exist', `Bearer ${jwt.sign({ sub: '999' }, testEnv.JWT_SECRET)}`],
    ['a token without a subject', `Bearer ${jwt.sign({}, testEnv.JWT_SECRET)}`],
    // Tokens from the single-admin era used the email as `sub`.
    ['an old email-subject token', `Bearer ${jwt.sign({ sub: testEnv.ADMIN_EMAIL }, testEnv.JWT_SECRET)}`],
  ])('rejects protected routes with %s', async (_label, header) => {
    const { app } = await makeApp();
    const req = request(app).get('/api/products');
    if (header) req.set('Authorization', header);
    const res = await req;
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('protects /api/auth/me', async () => {
    const { app } = await makeApp();
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
  });

  it('rate-limits the 11th login attempt in a window', async () => {
    const { app } = await makeApp();
    for (let i = 0; i < 10; i++) {
      const res = await loginAs(app, testEnv.ADMIN_EMAIL, i % 2 ? 'wrong-password' : testEnv.ADMIN_PASSWORD);
      expect(res.status).not.toBe(429);
    }
    const res = await loginAs(app, testEnv.ADMIN_EMAIL, testEnv.ADMIN_PASSWORD);
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('RATE_LIMITED');
  });

  it('gives each app its own limiter', async () => {
    const first = await makeApp();
    for (let i = 0; i < 11; i++) await loginAs(first.app, testEnv.ADMIN_EMAIL, 'wrong-password');
    const second = await makeApp();
    expect((await loginAs(second.app, testEnv.ADMIN_EMAIL, testEnv.ADMIN_PASSWORD)).status).toBe(200);
  });
});
