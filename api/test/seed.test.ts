import { describe, expect, it } from 'vitest';
import { openDatabase } from '../src/db/connection.ts';
import { migrate } from '../src/db/migrate.ts';
import { seed } from '../src/db/seed.ts';
import { getStats } from '../src/modules/stats/router.ts';
import { assertInvariants } from './helpers.ts';

const freshDb = () => {
  const db = openDatabase(':memory:');
  migrate(db);
  return db;
};

describe('seed', () => {
  it('seeds a fresh database with dashboard-worthy data', () => {
    const db = freshDb();
    const result = seed(db, { createdBy: 'admin@example.com' });
    expect(result.seeded).toBe(true);

    const count = (table: string) => db.prepare(`SELECT COUNT(*) FROM ${table}`).pluck().get();
    expect(count('categories')).toBe(7);
    expect(count('suppliers')).toBe(3);
    expect(count('products')).toBeGreaterThanOrEqual(15);

    // Every category is used and several units appear.
    expect(db.prepare('SELECT COUNT(DISTINCT category_id) FROM products').pluck().get()).toBe(7);
    expect(db.prepare('SELECT COUNT(DISTINCT unit) FROM products').pluck().get()).toBeGreaterThanOrEqual(6);

    // Every product got an initial IN, plus OUT usage and an ADJUSTMENT.
    const types = Object.fromEntries(db.prepare<[], { type: string; n: number }>('SELECT type, COUNT(*) AS n FROM stock_movements GROUP BY type').all().map((r) => [r.type, r.n]));
    expect(types.IN).toBe(count('products'));
    expect(types.OUT).toBeGreaterThan(0);
    expect(types.ADJUSTMENT).toBeGreaterThanOrEqual(1);
    expect(db.prepare("SELECT COUNT(*) FROM stock_movements WHERE created_by != 'admin@example.com'").pluck().get()).toBe(0);

    const stats = getStats(db);
    expect(stats.products.lowStock).toBeGreaterThanOrEqual(3);
    expect(stats.products.outOfStock).toBeGreaterThanOrEqual(1);
    expect(stats.stockValue).toBeGreaterThan(0);

    assertInvariants(db, expect);
  });

  it('is a no-op when products already exist', () => {
    const db = freshDb();
    seed(db, { createdBy: 'admin@example.com' });
    const before = db.prepare('SELECT COUNT(*) FROM stock_movements').pluck().get();
    expect(seed(db, { createdBy: 'admin@example.com' })).toEqual({ seeded: false });
    expect(db.prepare('SELECT COUNT(*) FROM stock_movements').pluck().get()).toBe(before);
  });
});

describe('migrations', () => {
  it('records applied versions and skips them next time', () => {
    const db = openDatabase(':memory:');
    expect(migrate(db)).toEqual(['001_init', '002_users', '003_measurements', '004_quotes', '005_quote_defaults', '006_quote_documents', '007_company_branding']);
    expect(migrate(db)).toEqual([]);
    expect(db.prepare('SELECT version FROM schema_migrations ORDER BY version').pluck().all()).toEqual(['001_init', '002_users', '003_measurements', '004_quotes', '005_quote_defaults', '006_quote_documents', '007_company_branding']);
  });

  it('enables foreign keys', () => {
    const db = freshDb();
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
  });
});
