import { describe, expect, it } from 'vitest';
import { getStats } from '../src/modules/stats/router.js';
import { createProduct, makeClient } from './helpers.js';

describe('GET /api/stats', () => {
  it('returns zeros and every type key on an empty database', async () => {
    const { api } = await makeClient();
    const res = await api.get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      products: { total: 0, active: 0, lowStock: 0, outOfStock: 0 },
      stockValue: 0,
      movementsLast30Days: { IN: 0, OUT: 0, ADJUSTMENT: 0 },
    });
  });

  it('matches a known fixture', async () => {
    const { api, db } = await makeClient();
    // healthy: 10 × 1.5 = 15
    await createProduct(api, { initialQuantity: 10, reorderLevel: 2, unitCost: 1.5 });
    // low: 3 × 2.25 = 6.75
    await createProduct(api, { initialQuantity: 3, reorderLevel: 5, unitCost: 2.25 });
    // out of stock (and low): 0
    const out = await createProduct(api, { initialQuantity: 4, reorderLevel: 1, unitCost: 9.99 });
    await api.post('/api/stock-movements', { productId: out.id, type: 'OUT', quantity: 4 });
    // inactive & low: excluded from active/lowStock/outOfStock/stockValue
    const inactive = await createProduct(api, { initialQuantity: 0, reorderLevel: 5, unitCost: 100, active: false });
    await api.post('/api/stock-movements', { productId: inactive.id, type: 'IN', quantity: 1 });
    // a movement from 31 days ago does not count
    db.prepare(
      `INSERT INTO stock_movements (product_id, type, quantity, delta, balance_after, created_by, created_at)
       VALUES (?, 'ADJUSTMENT', 1, 0, 1, 'x', ?)`,
    ).run(inactive.id, new Date(Date.now() - 31 * 24 * 3600 * 1000).toISOString());

    const res = await api.get('/api/stats');
    expect(res.body).toEqual({
      products: { total: 4, active: 3, lowStock: 2, outOfStock: 1 },
      stockValue: 21.75,
      movementsLast30Days: { IN: 4, OUT: 1, ADJUSTMENT: 0 },
    });
  });

  it('rounds stockValue to 2 decimals', async () => {
    const { api, db } = await makeClient();
    await createProduct(api, { initialQuantity: 0.333, unitCost: 0.3333 });
    expect(getStats(db).stockValue).toBe(0.11);
  });

  it('requires auth', async () => {
    const { app } = await makeClient();
    const { default: request } = await import('supertest');
    expect((await request(app).get('/api/stats')).status).toBe(401);
  });
});
