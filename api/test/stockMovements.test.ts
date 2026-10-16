import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Product } from '../src/modules/products/repository.ts';
import type { StockMovement } from '../src/modules/stockMovements/repository.ts';
import { type ApiClient, assertInvariants, createProduct, makeClient, testEnv } from './helpers.ts';

const move = (api: ApiClient, productId: number, type: string, quantity: unknown, extra = {}) =>
  api.post('/api/stock-movements', { productId, type, quantity, ...extra });
const quantityOf = async (api: ApiClient, id: number) => (await api.get(`/api/products/${id}`)).body.quantity;

describe('stock movements', () => {
  let api: ApiClient, db: Database.Database, product: Product;
  beforeEach(async () => {
    ({ api, db } = await makeClient());
    product = await createProduct(api, { unit: 'L', initialQuantity: 10 });
  });

  it('IN increases stock', async () => {
    const res = await move(api, product.id, 'IN', 5, { reason: 'Monthly restock', reference: 'PO-77' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      productId: product.id,
      type: 'IN',
      quantity: 5,
      delta: 5,
      balanceAfter: 15,
      reason: 'Monthly restock',
      reference: 'PO-77',
      createdBy: testEnv.ADMIN_EMAIL,
    });
    expect(await quantityOf(api, product.id)).toBe(15);
  });

  it('OUT decreases stock', async () => {
    const res = await move(api, product.id, 'OUT', 4);
    expect(res.body).toMatchObject({ delta: -4, balanceAfter: 6 });
    expect(await quantityOf(api, product.id)).toBe(6);
  });

  it('OUT can take stock exactly to zero', async () => {
    const res = await move(api, product.id, 'OUT', 10);
    expect(res.status).toBe(201);
    expect(await quantityOf(api, product.id)).toBe(0);
  });

  it('rejects OUT larger than stock and changes nothing', async () => {
    const before = db.prepare('SELECT COUNT(*) FROM stock_movements').pluck().get();
    const res = await move(api, product.id, 'OUT', 10.001);
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      code: 'INSUFFICIENT_STOCK',
      message: 'Insufficient stock: requested 10.001 L, available 10 L',
      errors: { quantity: 'Insufficient stock: requested 10.001 L, available 10 L' },
    });
    expect(await quantityOf(api, product.id)).toBe(10);
    expect(db.prepare('SELECT COUNT(*) FROM stock_movements').pluck().get()).toBe(before);
  });

  it('ADJUSTMENT sets stock to the counted value with a signed delta', async () => {
    const down = await move(api, product.id, 'ADJUSTMENT', 7.5);
    expect(down.body).toMatchObject({ quantity: 7.5, delta: -2.5, balanceAfter: 7.5 });
    const up = await move(api, product.id, 'ADJUSTMENT', 9);
    expect(up.body).toMatchObject({ delta: 1.5, balanceAfter: 9 });
    const same = await move(api, product.id, 'ADJUSTMENT', 9);
    expect(same.status).toBe(201);
    expect(same.body).toMatchObject({ delta: 0, balanceAfter: 9 });
    const zero = await move(api, product.id, 'ADJUSTMENT', 0);
    expect(zero.body).toMatchObject({ delta: -9, balanceAfter: 0 });
    expect(await quantityOf(api, product.id)).toBe(0);
  });

  it.each([
    ['IN', 0],
    ['IN', -1],
    ['OUT', 0],
    ['OUT', -2],
  ])('rejects %s with quantity %s', async (type, quantity) => {
    const res = await move(api, product.id, type, quantity);
    expect(res.status).toBe(422);
    expect(res.body.errors.quantity).toBeDefined();
  });

  it('rejects a negative ADJUSTMENT', async () => {
    expect((await move(api, product.id, 'ADJUSTMENT', -1)).status).toBe(422);
  });

  it('validates the body', async () => {
    const res = await api.post('/api/stock-movements', {});
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.errors).sort()).toEqual(['productId', 'quantity', 'type']);
    expect((await move(api, product.id, 'TRANSFER', 1)).body.errors.type).toBeDefined();
    expect((await move(api, product.id, 'IN', 1.0001)).body.errors.quantity).toBeDefined();
    expect((await move(api, product.id, 'IN', '1')).body.errors.quantity).toBeDefined();
    expect((await move(api, product.id, 'IN', 1, { reason: 'x'.repeat(256) })).body.errors.reason).toBeDefined();
  });

  it('rejects an unknown product with 422 errors.productId', async () => {
    const res = await move(api, 99999, 'IN', 1);
    expect(res.status).toBe(422);
    expect(res.body.errors.productId).toBe('Product 99999 does not exist');
  });

  it('allows movements on inactive products', async () => {
    await api.put(`/api/products/${product.id}`, { active: false });
    expect((await move(api, product.id, 'IN', 1)).status).toBe(201);
  });

  it('is append-only: PUT and DELETE return 405', async () => {
    const { body } = await move(api, product.id, 'IN', 1);
    for (const res of [await api.put(`/api/stock-movements/${body.id}`, { quantity: 2 }), await api.delete(`/api/stock-movements/${body.id}`)]) {
      expect(res.status).toBe(405);
      expect(res.body.code).toBe('METHOD_NOT_ALLOWED');
    }
    expect((await api.get(`/api/stock-movements/${body.id}`)).body).toEqual(body);
  });

  it('records createdBy from the token and returns 404 for unknown ids', async () => {
    const { body } = await move(api, product.id, 'IN', 1);
    expect(body.createdBy).toBe(testEnv.ADMIN_EMAIL);
    expect((await api.get('/api/stock-movements/99999')).status).toBe(404);
  });

  it('lists newest first by default and filters by product, type and createdBy', async () => {
    const other = await createProduct(api, { initialQuantity: 3 });
    await move(api, product.id, 'OUT', 1, { reason: 'Used at Office Tower job', reference: 'WO-1042' });

    const all = await api.get('/api/stock-movements');
    expect(all.headers['content-range']).toBe('stock-movements 0-2/3');
    // Movements created in the same millisecond tie on createdAt (then sort by id ASC), so compare timestamps.
    const times = all.body.map((m: StockMovement) => m.createdAt);
    expect(times).toEqual([...times].sort().reverse());

    const forProduct = await api.list('/api/stock-movements', { filter: { productId: product.id } });
    expect(forProduct.body).toHaveLength(2);
    const outs = await api.list('/api/stock-movements', { filter: { type: 'OUT' } });
    expect(outs.body.map((m: StockMovement) => m.reference)).toEqual(['WO-1042']);
    const inTypes = await api.list('/api/stock-movements', { filter: { type: ['IN'], productId: [other.id] } });
    expect(inTypes.body).toHaveLength(1);
    const byUser = await api.list('/api/stock-movements', { filter: { createdBy: 'ADMIN@example.com' } });
    expect(byUser.body).toHaveLength(3);
    const search = await api.list('/api/stock-movements', { filter: { q: 'wo-104' } });
    expect(search.body).toHaveLength(1);
  });

  it('applies inclusive date-range filters; date-only _lte covers the whole day', async () => {
    const insert = db.prepare(`
      INSERT INTO stock_movements (product_id, type, quantity, delta, balance_after, created_by, created_at)
      VALUES (?, 'ADJUSTMENT', 10, 0, 10, 'admin@example.com', ?)`);
    const stamps = ['2026-01-09T23:59:59.999Z', '2026-01-10T00:00:00.000Z', '2026-01-10T23:59:59.999Z', '2026-01-11T00:00:00.000Z'];
    for (const s of stamps) insert.run(product.id, s);

    const between = (filter: Record<string, unknown>) =>
      api.list('/api/stock-movements', { filter: { productId: product.id, ...filter }, sort: ['createdAt', 'ASC'] });
    const dates = (res: { body: StockMovement[] }) =>
      res.body.map((m) => m.createdAt).filter((d) => d.startsWith('2026-01'));

    expect(dates(await between({ createdAt_gte: '2026-01-10', createdAt_lte: '2026-01-10' }))).toEqual([stamps[1], stamps[2]]);
    expect(dates(await between({ createdAt_gte: stamps[0], createdAt_lte: stamps[1] }))).toEqual([stamps[0], stamps[1]]);
    expect(dates(await between({ createdAt_lte: '2026-01-09' }))).toEqual([stamps[0]]);
    expect(dates(await between({ createdAt_gte: '2026-01-11T00:00:00Z' }))).toEqual([stamps[3]]);

    for (const bad of ['yesterday', '2026-02-31', '2026-13-01', 42]) {
      expect((await between({ createdAt_gte: bad })).status).toBe(400);
    }
  });

  it('sorts by the whitelisted fields only', async () => {
    expect((await api.list('/api/stock-movements', { sort: ['delta', 'ASC'] })).status).toBe(200);
    expect((await api.list('/api/stock-movements', { sort: ['reason', 'ASC'] })).status).toBe(400);
  });

  it('keeps the invariants', async () => {
    await move(api, product.id, 'OUT', 3);
    await move(api, product.id, 'ADJUSTMENT', 2);
    assertInvariants(db, expect);
  });
});

describe('decimals', () => {
  let api: ApiClient, db: Database.Database;
  beforeEach(async () => ({ api, db } = await makeClient()));

  it('IN 0.1 then IN 0.2 gives exactly 0.3', async () => {
    const product = await createProduct(api);
    await move(api, product.id, 'IN', 0.1);
    const res = await move(api, product.id, 'IN', 0.2);
    expect(res.body.balanceAfter).toBe(0.3);
    expect(await quantityOf(api, product.id)).toBe(0.3);
    expect(db.prepare('SELECT quantity FROM products WHERE id = ?').pluck().get(product.id)).toBe(0.3);
  });

  it('OUT of a value with float error does not report insufficient stock', async () => {
    const product = await createProduct(api);
    await move(api, product.id, 'IN', 0.1);
    await move(api, product.id, 'IN', 0.2);
    const res = await move(api, product.id, 'OUT', 0.3);
    expect(res.status).toBe(201);
    expect(res.body.balanceAfter).toBe(0);
  });

  it('initialQuantity creates exactly one IN movement with reason "Initial stock"', async () => {
    const product = await createProduct(api, { initialQuantity: 2.5 });
    expect(product.quantity).toBe(2.5);
    const res = await api.list('/api/stock-movements', { filter: { productId: product.id } });
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ type: 'IN', quantity: 2.5, delta: 2.5, balanceAfter: 2.5, reason: 'Initial stock' });
  });

  it('initialQuantity 0 creates no movement', async () => {
    const product = await createProduct(api, { initialQuantity: 0 });
    expect(product.quantity).toBe(0);
    expect((await api.list('/api/stock-movements', { filter: { productId: product.id } })).body).toHaveLength(0);
  });

  it('rolls back the product when the initial movement fails', async () => {
    db.exec(`CREATE TRIGGER fail_movement BEFORE INSERT ON stock_movements BEGIN SELECT RAISE(ABORT, 'boom'); END`);
    const before = db.prepare('SELECT COUNT(*) FROM products').pluck().get();
    const res = await api.post('/api/products', {
      sku: 'ROLLBACK-1',
      name: 'Rollback',
      categoryId: (await api.post('/api/categories', { name: 'RB' })).body.id,
      unit: 'L',
      reorderLevel: 0,
      initialQuantity: 5,
    });
    expect(res.status).toBe(500);
    expect(res.body.code).toBe('INTERNAL_ERROR');
    expect(db.prepare('SELECT COUNT(*) FROM products').pluck().get()).toBe(before);
  });

  it('rejects a unit change once movements exist', async () => {
    const fresh = await createProduct(api, { unit: 'L' });
    expect((await api.put(`/api/products/${fresh.id}`, { unit: 'mL' })).status).toBe(200);

    const stocked = await createProduct(api, { unit: 'L', initialQuantity: 1 });
    const res = await api.put(`/api/products/${stocked.id}`, { unit: 'gal' });
    expect(res.status).toBe(422);
    expect(res.body.errors.unit).toBeDefined();
    // Re-sending the same unit is fine.
    expect((await api.put(`/api/products/${stocked.id}`, { unit: 'L', name: 'Renamed' })).status).toBe(200);
  });
});

describe('invariants (§5.6)', () => {
  it('hold after a random sequence of valid and invalid movements', async () => {
    const { api, db } = await makeClient();
    const products: Product[] = [];
    for (let i = 0; i < 4; i++) products.push(await createProduct(api, { initialQuantity: i * 2.5 }));

    // Small deterministic PRNG so failures are reproducible.
    let seed = 42;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

    let created = 0;
    let rejected = 0;
    for (let i = 0; i < 120; i++) {
      const product = pick(products);
      const type = pick(['IN', 'OUT', 'OUT', 'ADJUSTMENT']);
      // Mostly valid 3-decimal amounts, plus some invalid ones (too many decimals, zero, negative).
      const quantity = pick([
        Math.round(rand() * 10_000) / 1000,
        Math.round(rand() * 5_000) / 1000,
        0.1,
        0.2,
        0,
        -1,
        1.23456,
      ]);
      const res = await move(api, product.id, type, quantity);
      expect([201, 409, 422]).toContain(res.status);
      if (res.status === 201) created++;
      else rejected++;
    }
    expect(created).toBeGreaterThan(20);
    expect(rejected).toBeGreaterThan(5);
    assertInvariants(db, expect);
  });
});
