import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { openDatabase } from '../src/db/connection.js';
import { migrate } from '../src/db/migrate.js';
import { roundQuantity } from '../src/lib/numbers.js';
import { ensureInitialUser } from '../src/modules/users/initialUser.js';

export const ORIGIN = 'http://admin.test';

export const testEnv = Object.freeze({
  NODE_ENV: 'test',
  DATABASE_PATH: ':memory:',
  CORS_ORIGIN: ORIGIN,
  JWT_SECRET: 'test-secret-that-is-definitely-longer-than-32-chars',
  JWT_EXPIRES_IN: '1h',
  ADMIN_EMAIL: 'admin@example.com',
  ADMIN_PASSWORD: 'correct-horse-battery',
  LOG_LEVEL: 'silent',
});

/**
 * A cheap scrypt cost for test-only hashes. Verification reads the cost from the
 * stored hash, so logging in as the initial user stays fast in every test.
 */
export const FAST_HASH = Object.freeze({ hashParams: Object.freeze({ N: 2 ** 10, r: 8, p: 1 }) });

/** A fresh app on a migrated in-memory database, with the initial user from ADMIN_EMAIL / ADMIN_PASSWORD. */
export async function makeApp(envOverrides = {}) {
  const db = openDatabase(':memory:');
  migrate(db);
  const config = loadConfig({ ...testEnv, ...envOverrides });
  await ensureInitialUser(db, config, FAST_HASH);
  const app = createApp({ db, config });
  return { app, db, config };
}

export async function login(app, email = testEnv.ADMIN_EMAIL, password = testEnv.ADMIN_PASSWORD) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.token;
}

/** Encodes list params the way ra-data-simple-rest does. */
export const listQuery = ({ sort, range, filter } = {}) => ({
  ...(sort ? { sort: JSON.stringify(sort) } : {}),
  ...(range ? { range: JSON.stringify(range) } : {}),
  ...(filter ? { filter: JSON.stringify(filter) } : {}),
});

/** A client that sends `token` on every request: `api.get('/api/x')`, `api.post('/api/x', body)`, ... */
export function clientFor(app, token) {
  const auth = (req) => req.set('Authorization', `Bearer ${token}`);
  return {
    get: (path, query) => auth(request(app).get(path).query(query ?? {})),
    list: (path, params) => auth(request(app).get(path).query(listQuery(params))),
    post: (path, body) => auth(request(app).post(path).send(body)),
    put: (path, body) => auth(request(app).put(path).send(body)),
    delete: (path) => auth(request(app).delete(path)),
  };
}

/** An app plus a client logged in as the initial user. */
export async function makeClient(envOverrides) {
  const ctx = await makeApp(envOverrides);
  const token = await login(ctx.app);
  return { ...ctx, token, api: clientFor(ctx.app, token) };
}

/** Creates a category (and optionally a supplier) and returns a valid product body for it. */
export async function productFixture(api, overrides = {}) {
  const category = (await api.post('/api/categories', { name: `Cat ${Math.random()}` })).body;
  return {
    sku: `sku-${Math.random().toString(36).slice(2, 10)}`,
    name: 'Test product',
    categoryId: category.id,
    unit: 'L',
    reorderLevel: 5,
    unitCost: 2,
    ...overrides,
  };
}

export async function createProduct(api, overrides = {}) {
  const res = await api.post('/api/products', await productFixture(api, overrides));
  if (res.status !== 201) throw new Error(`product create failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}

/** Checks §5.6 invariants 1–3 for every product directly in the database. */
export function assertInvariants(db, expect) {
  const products = db.prepare('SELECT id, quantity FROM products').all();
  const movements = db.prepare('SELECT delta, balance_after FROM stock_movements WHERE product_id = ? ORDER BY id');
  for (const p of products) {
    expect(p.quantity).toBeGreaterThanOrEqual(0);
    let running = 0;
    for (const m of movements.all(p.id)) {
      running = roundQuantity(running + m.delta);
      expect(m.balance_after).toBe(running);
    }
    expect(p.quantity).toBe(running);
  }
}
