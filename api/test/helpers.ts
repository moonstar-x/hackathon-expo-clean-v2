import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import type Database from 'better-sqlite3';
import type { Express } from 'express';
import request from 'supertest';
import type { expect as vitestExpect } from 'vitest';
import { createApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { openDatabase } from '../src/db/connection.ts';
import { migrate } from '../src/db/migrate.ts';
import { roundQuantity } from '../src/lib/numbers.ts';
import type { Product } from '../src/modules/products/repository.ts';
import { ensureInitialUser } from '../src/modules/users/initialUser.ts';

export const ORIGIN = 'http://admin.test';

export const testEnv = Object.freeze({
  NODE_ENV: 'test',
  QUOTE_WORKER: 'off',
  TDR_WORKER: 'off',
  PUBLIC_URL: 'https://api.test',
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

/**
 * A fresh app on a migrated in-memory database, with the initial user from ADMIN_EMAIL / ADMIN_PASSWORD.
 * Its files (FILES_PATH) go to a folder of its own under the system's temp folder, created only when
 * something is written there.
 */
export async function makeApp(envOverrides: Record<string, string> = {}) {
  const db = openDatabase(':memory:');
  migrate(db);
  const config = loadConfig({ ...testEnv, FILES_PATH: path.join(os.tmpdir(), 'cleaning-api-tests', randomUUID()), ...envOverrides });
  await ensureInitialUser(db, config, FAST_HASH);
  const app = createApp({ db, config });
  return { app, db, config };
}

export type TestApp = Awaited<ReturnType<typeof makeApp>>;

export async function login(app: Express, email: string = testEnv.ADMIN_EMAIL, password: string = testEnv.ADMIN_PASSWORD) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.token as string;
}

/** Encodes list params the way ra-data-simple-rest does. */
export interface ListParams {
  sort?: unknown;
  range?: unknown;
  filter?: unknown;
}

export const listQuery = ({ sort, range, filter }: ListParams = {}) => ({
  ...(sort ? { sort: JSON.stringify(sort) } : {}),
  ...(range ? { range: JSON.stringify(range) } : {}),
  ...(filter ? { filter: JSON.stringify(filter) } : {}),
});

/** A client that sends `token` on every request: `api.get('/api/x')`, `api.post('/api/x', body)`, ... */
export function clientFor(app: Express, token: string) {
  const auth = (req: request.Test) => req.set('Authorization', `Bearer ${token}`);
  return {
    get: (path: string, query?: Record<string, unknown>) => auth(request(app).get(path).query(query ?? {})),
    list: (path: string, params?: ListParams) => auth(request(app).get(path).query(listQuery(params))),
    post: (path: string, body?: string | object) => auth(request(app).post(path).send(body)),
    put: (path: string, body?: string | object) => auth(request(app).put(path).send(body)),
    delete: (path: string) => auth(request(app).delete(path)),
  };
}

export type ApiClient = ReturnType<typeof clientFor>;

/** An app plus a client logged in as the initial user. */
export async function makeClient(envOverrides?: Record<string, string>) {
  const ctx = await makeApp(envOverrides);
  const token = await login(ctx.app);
  return { ...ctx, token, api: clientFor(ctx.app, token) };
}

/** Creates a category (and optionally a supplier) and returns a valid product body for it. */
export type TestClient = Awaited<ReturnType<typeof makeClient>>;

export async function productFixture(api: ApiClient, overrides: Record<string, unknown> = {}) {
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

export async function createProduct(api: ApiClient, overrides: Record<string, unknown> = {}): Promise<Product> {
  const res = await api.post('/api/products', await productFixture(api, overrides));
  if (res.status !== 201) throw new Error(`product create failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}

/** Checks §5.6 invariants 1–3 for every product directly in the database. */
export function assertInvariants(db: Database.Database, expect: typeof vitestExpect) {
  const products = db.prepare<[], { id: number; quantity: number }>('SELECT id, quantity FROM products').all();
  const movements = db.prepare<[number], { delta: number; balance_after: number }>(
    'SELECT delta, balance_after FROM stock_movements WHERE product_id = ? ORDER BY id',
  );
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
