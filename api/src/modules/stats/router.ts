import type Database from 'better-sqlite3';
import express from 'express';
import type { AppDeps } from '../../app.ts';
import { roundMoney } from '../../lib/numbers.ts';
import { MOVEMENT_TYPES, type MovementType } from '../stockMovements/schemas.ts';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

interface ProductTotals {
  total: number;
  active: number;
  lowStock: number;
  outOfStock: number;
  stockValue: number;
}

export function getStats(db: Database.Database, now = new Date()) {
  const products = db
    .prepare<[], ProductTotals>(
      `SELECT COUNT(*)                                                           AS total,
              COALESCE(SUM(active = 1), 0)                                       AS active,
              COALESCE(SUM(active = 1 AND quantity <= reorder_level), 0)         AS lowStock,
              COALESCE(SUM(active = 1 AND quantity = 0), 0)                      AS outOfStock,
              COALESCE(SUM(CASE WHEN active = 1 THEN quantity * unit_cost END), 0) AS stockValue
         FROM products`,
    )
    .get()!;

  const since = new Date(now.getTime() - THIRTY_DAYS_MS).toISOString();
  const movementsLast30Days = Object.fromEntries(MOVEMENT_TYPES.map((t) => [t, 0])) as Record<MovementType, number>;
  const rows = db
    .prepare<[string], { type: MovementType; count: number }>('SELECT type, COUNT(*) AS count FROM stock_movements WHERE created_at >= ? GROUP BY type')
    .all(since);
  for (const { type, count } of rows) movementsLast30Days[type] = count;

  return {
    products: {
      total: products.total,
      active: products.active,
      lowStock: products.lowStock,
      outOfStock: products.outOfStock,
    },
    stockValue: roundMoney(products.stockValue),
    movementsLast30Days,
  };
}

export function statsRouter({ db }: AppDeps) {
  const router = express.Router();
  router.get('/', (_req, res) => {
    res.json(getStats(db));
  });
  return router;
}
