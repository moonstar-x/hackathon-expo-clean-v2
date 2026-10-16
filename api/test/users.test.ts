import type Database from 'better-sqlite3';
import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.ts';
import { openDatabase } from '../src/db/connection.ts';
import { migrate } from '../src/db/migrate.ts';
import { ensureInitialUser } from '../src/modules/users/initialUser.ts';
import type { User } from '../src/modules/users/repository.ts';
import { type ApiClient, clientFor, createProduct, FAST_HASH, login, makeClient, testEnv } from './helpers.ts';

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const JANE = Object.freeze({ email: 'jane@example.com', name: 'Jane Doe', password: 'jane-password-1' });

const loginAs = (app: Express, email: string, password: string) => request(app).post('/api/auth/login').send({ email, password });

describe('users', () => {
  let app: Express, db: Database.Database, api: ApiClient;
  beforeEach(async () => ({ app, db, api } = await makeClient()));

  const createJane = async (overrides = {}) => {
    const res = await api.post('/api/users', { ...JANE, ...overrides });
    expect(res.status).toBe(201);
    return res.body;
  };

  it('lists the initial user created from ADMIN_EMAIL', async () => {
    const res = await api.get('/api/users');
    expect(res.status).toBe(200);
    expect(res.headers['content-range']).toBe('users 0-0/1');
    expect(res.body).toEqual([
      {
        id: expect.any(Number),
        email: testEnv.ADMIN_EMAIL,
        name: null,
        active: true,
        lastLoginAt: expect.stringMatching(ISO),
        createdAt: expect.stringMatching(ISO),
        updatedAt: expect.stringMatching(ISO),
      },
    ]);
  });

  it('creates a user who can then log in', async () => {
    const res = await api.post('/api/users', { ...JANE, email: '  Jane@Example.COM ' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(Number),
      email: 'jane@example.com',
      name: 'Jane Doe',
      active: true,
      lastLoginAt: null,
      createdAt: expect.stringMatching(ISO),
      updatedAt: expect.stringMatching(ISO),
    });

    const session = await loginAs(app, 'JANE@example.com', JANE.password);
    expect(session.status).toBe(200);
    expect(session.body.user).toEqual({ id: res.body.id, email: 'jane@example.com', name: 'Jane Doe' });

    const me = await clientFor(app, session.body.token).get('/api/auth/me');
    expect(me.body).toEqual({ id: res.body.id, email: 'jane@example.com', name: 'Jane Doe' });
    expect((await api.get(`/api/users/${res.body.id}`)).body.lastLoginAt).toMatch(ISO);
  });

  it('stores only a scrypt hash and never returns it', async () => {
    const jane = await createJane();
    const stored = db.prepare('SELECT password_hash FROM users WHERE id = ?').pluck().get(jane.id);
    expect(stored).toMatch(/^scrypt\$/);
    expect(stored).not.toContain(JANE.password);

    const responses = [jane, (await api.get(`/api/users/${jane.id}`)).body, ...(await api.get('/api/users')).body];
    for (const body of responses) {
      expect(Object.keys(body).some((k) => /password/i.test(k))).toBe(false);
    }
  });

  it('validates the body', async () => {
    const missing = await api.post('/api/users', {});
    expect(missing.status).toBe(422);
    expect(missing.body).toMatchObject({ code: 'VALIDATION_ERROR', errors: { email: 'Required', password: 'Required' } });

    const bad = await api.post('/api/users', { email: 'not-an-email', password: 'short', name: 'x'.repeat(101), active: 'yes' });
    expect(bad.status).toBe(422);
    expect(bad.body.errors).toEqual({
      email: 'Must be a valid email',
      password: 'Must be at least 8 characters',
      name: 'Must be at most 100 characters',
      active: 'Must be true or false',
    });

    expect((await api.post('/api/users', { ...JANE, password: 'x'.repeat(129) })).body.errors.password).toBe(
      'Must be at most 128 characters',
    );
    expect((await api.post('/api/users', { ...JANE, password: '' })).body.errors.password).toBe('Required');
  });

  it('stores an empty name as null', async () => {
    expect((await createJane({ name: '   ' })).name).toBeNull();
  });

  it('rejects duplicate emails case-insensitively', async () => {
    const res = await api.post('/api/users', { ...JANE, email: testEnv.ADMIN_EMAIL.toUpperCase() });
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'CONFLICT', errors: { email: 'A user with this email already exists' } });

    const jane = await createJane();
    expect((await api.put(`/api/users/${jane.id}`, { email: testEnv.ADMIN_EMAIL })).status).toBe(409);
    // Re-saving your own email in a different case is fine.
    expect((await api.put(`/api/users/${jane.id}`, { email: 'JANE@example.com' })).body.email).toBe('jane@example.com');
  });

  it('merges updates and keeps the password unless a new one is sent', async () => {
    const jane = await createJane();

    const renamed = await api.put(`/api/users/${jane.id}`, { name: 'Jane Smith' });
    expect(renamed.status).toBe(200);
    expect(renamed.body).toMatchObject({ email: JANE.email, name: 'Jane Smith', active: true });

    // React Admin sends the whole record back; an empty or null password means "unchanged".
    expect((await api.put(`/api/users/${jane.id}`, { ...renamed.body, password: '' })).status).toBe(200);
    expect((await api.put(`/api/users/${jane.id}`, { ...renamed.body, password: null })).status).toBe(200);
    expect((await loginAs(app, JANE.email, JANE.password)).status).toBe(200);

    const short = await api.put(`/api/users/${jane.id}`, { password: 'short' });
    expect(short.status).toBe(422);
    expect(short.body.errors.password).toBe('Must be at least 8 characters');

    expect((await api.put(`/api/users/${jane.id}`, { password: 'a-brand-new-password' })).status).toBe(200);
    expect((await loginAs(app, JANE.email, JANE.password)).status).toBe(401);
    expect((await loginAs(app, JANE.email, 'a-brand-new-password')).status).toBe(200);
  });

  it('ignores read-only and unknown fields', async () => {
    const jane = await createJane();
    const res = await api.put(`/api/users/${jane.id}`, {
      ...jane,
      id: 999,
      lastLoginAt: '1999-01-01T00:00:00.000Z',
      createdAt: '1999-01-01T00:00:00.000Z',
      passwordHash: 'scrypt$2$1$1$AA==$AA==',
      password_hash: 'scrypt$2$1$1$AA==$AA==',
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: jane.id, lastLoginAt: null, createdAt: jane.createdAt });
    expect((await loginAs(app, JANE.email, JANE.password)).status).toBe(200);
  });

  it('deactivating a user blocks login and ends their sessions', async () => {
    const jane = await createJane();
    const token = await login(app, JANE.email, JANE.password);
    const asJane = clientFor(app, token);
    expect((await asJane.get('/api/products')).status).toBe(200);

    expect((await api.put(`/api/users/${jane.id}`, { active: false })).body.active).toBe(false);
    expect((await asJane.get('/api/products')).status).toBe(401);
    const denied = await loginAs(app, JANE.email, JANE.password);
    expect(denied.status).toBe(401);
    expect(denied.body.code).toBe('INVALID_CREDENTIALS');

    await api.put(`/api/users/${jane.id}`, { active: true });
    expect((await asJane.get('/api/products')).status).toBe(200);
  });

  it('deleting a user ends their sessions but keeps their stock history', async () => {
    const jane = await createJane();
    const asJane = clientFor(app, await login(app, JANE.email, JANE.password));
    const product = await createProduct(asJane, { initialQuantity: 5 });
    const movement = (await asJane.list('/api/stock-movements', { filter: { productId: product.id } })).body[0];
    expect(movement.createdBy).toBe(JANE.email);

    const deleted = await api.delete(`/api/users/${jane.id}`);
    expect(deleted.status).toBe(200);
    expect(deleted.body).toMatchObject({ id: jane.id, email: JANE.email });
    expect((await api.get(`/api/users/${jane.id}`)).status).toBe(404);
    expect((await asJane.get('/api/products')).status).toBe(401);
    expect((await api.get(`/api/stock-movements/${movement.id}`)).body.createdBy).toBe(JANE.email);
  });

  it('attributes movements to the current email after an email change', async () => {
    const jane = await createJane();
    const asJane = clientFor(app, await login(app, JANE.email, JANE.password));
    await api.put(`/api/users/${jane.id}`, { email: 'jane.doe@example.com' });

    // The existing session keeps working: tokens identify the user by id.
    const product = await createProduct(asJane, { initialQuantity: 1 });
    const movement = (await asJane.list('/api/stock-movements', { filter: { productId: product.id } })).body[0];
    expect(movement.createdBy).toBe('jane.doe@example.com');
  });

  it('refuses to delete or deactivate your own account', async () => {
    const me = (await api.get('/api/auth/me')).body;

    const del = await api.delete(`/api/users/${me.id}`);
    expect(del.status).toBe(409);
    expect(del.body).toEqual({ code: 'CONFLICT', message: 'You cannot delete your own account' });

    const deactivate = await api.put(`/api/users/${me.id}`, { active: false });
    expect(deactivate.status).toBe(422);
    expect(deactivate.body.errors).toEqual({ active: 'You cannot deactivate your own account' });

    const renamed = await api.put(`/api/users/${me.id}`, { name: 'Site Admin' });
    expect(renamed.status).toBe(200);
    expect(renamed.body).toMatchObject({ name: 'Site Admin', active: true });

    // Another user can do both.
    const jane = await createJane();
    const asJane = clientFor(app, await login(app, JANE.email, JANE.password));
    expect((await asJane.put(`/api/users/${me.id}`, { active: false })).status).toBe(200);
    expect((await asJane.delete(`/api/users/${me.id}`)).status).toBe(200);
    expect((await api.get('/api/users')).status).toBe(401);
    expect((await asJane.get(`/api/users/${jane.id}`)).status).toBe(200);
  });

  it('filters, searches and sorts', async () => {
    await createJane();
    await api.post('/api/users', { email: 'bob@example.com', name: 'Bob Builder', password: 'bob-password', active: false });

    const inactive = await api.list('/api/users', { filter: { active: false } });
    expect(inactive.body.map((u: User) => u.email)).toEqual(['bob@example.com']);

    const search = await api.list('/api/users', { filter: { q: 'DOE' } });
    expect(search.body.map((u: User) => u.email)).toEqual(['jane@example.com']);

    const byEmail = await api.list('/api/users', {});
    expect(byEmail.body.map((u: User) => u.email)).toEqual(['admin@example.com', 'bob@example.com', 'jane@example.com']);

    const byName = await api.list('/api/users', { sort: ['name', 'DESC'] });
    expect(byName.body.map((u: User) => u.name)).toEqual(['Jane Doe', 'Bob Builder', null]);

    expect((await api.list('/api/users', { filter: { role: 'admin' } })).status).toBe(400);
  });

  it('returns 404 for unknown users', async () => {
    expect((await api.get('/api/users/99999')).status).toBe(404);
    expect((await api.put('/api/users/99999', { name: 'x' })).status).toBe(404);
    expect((await api.delete('/api/users/abc')).status).toBe(404);
  });

  it('requires auth', async () => {
    expect((await request(app).get('/api/users')).status).toBe(401);
    expect((await request(app).post('/api/users').send(JANE)).status).toBe(401);
  });
});

describe('ensureInitialUser', () => {
  const freshDb = () => {
    const db = openDatabase(':memory:');
    migrate(db);
    return db;
  };

  it('creates the first user from ADMIN_EMAIL / ADMIN_PASSWORD only while there are no users', async () => {
    const db = freshDb();
    const config = loadConfig({ ...testEnv, ADMIN_EMAIL: ' Owner@Example.com ' });

    const created = await ensureInitialUser(db, config, FAST_HASH);
    expect(created).toMatchObject({ email: 'owner@example.com', name: null, active: true });

    // Changing the env afterwards does not add or change accounts.
    const changed = loadConfig({ ...testEnv, ADMIN_EMAIL: 'someone-else@example.com', ADMIN_PASSWORD: 'other-password' });
    expect(await ensureInitialUser(db, changed, FAST_HASH)).toBeNull();
    expect(db.prepare('SELECT email FROM users').pluck().all()).toEqual(['owner@example.com']);
  });
});
