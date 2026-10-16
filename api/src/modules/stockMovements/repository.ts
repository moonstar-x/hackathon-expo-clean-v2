import type Database from 'better-sqlite3';
import { insufficientStock, validationError } from '../../lib/errors.ts';
import {
  dateBoundFilter,
  enumFilter,
  intFilter,
  type ListSpec,
  type ParsedListQuery,
  queryList,
  textFilter,
} from '../../lib/listQuery.ts';
import { roundQuantity } from '../../lib/numbers.ts';
import { nowIso } from '../../lib/sqlite.ts';
import { MOVEMENT_TYPES, type MovementType } from './schemas.ts';

export const movementListSpec = Object.freeze<ListSpec>({
  resource: 'stock-movements',
  table: 'stock_movements',
  sortable: {
    id: 'id',
    createdAt: 'created_at',
    productId: 'product_id',
    type: 'type',
    quantity: 'quantity',
    delta: 'delta',
  },
  textSorts: ['type'],
  defaultSort: ['createdAt', 'DESC'],
  filters: {
    productId: intFilter('product_id'),
    type: enumFilter('type', MOVEMENT_TYPES),
    createdBy: textFilter('created_by'),
    createdAt_gte: dateBoundFilter('created_at', 'gte'),
    createdAt_lte: dateBoundFilter('created_at', 'lte'),
  },
  search: ['reason', 'reference'],
});

interface MovementRow {
  id: number;
  product_id: number;
  type: MovementType;
  quantity: number;
  delta: number;
  balance_after: number;
  reason: string | null;
  reference: string | null;
  created_by: string;
  created_at: string;
}

export type StockMovement = ReturnType<typeof toMovement>;

export interface MovementRecordInput {
  productId: number;
  type: MovementType;
  quantity: number;
  reason?: string | null;
  reference?: string | null;
}

export const toMovement = (row: MovementRow) => ({
  id: row.id,
  productId: row.product_id,
  type: row.type,
  quantity: row.quantity,
  delta: row.delta,
  balanceAfter: row.balance_after,
  reason: row.reason,
  reference: row.reference,
  createdBy: row.created_by,
  createdAt: row.created_at,
});

/**
 * Computes the signed delta and resulting balance for a movement (§6.7 step 3–4).
 * Throws 409 INSUFFICIENT_STOCK when an OUT would take stock below zero.
 */
export function computeMovement(
  product: { quantity: number; unit: string },
  type: MovementType,
  quantity: number,
): { delta: number; balanceAfter: number } {
  const prev = product.quantity;
  let delta: number;
  if (type === 'IN') {
    delta = quantity;
  } else if (type === 'OUT') {
    if (roundQuantity(prev - quantity) < 0) {
      throw insufficientStock(
        `Insufficient stock: requested ${quantity} ${product.unit}, available ${prev} ${product.unit}`,
      );
    }
    delta = -quantity;
  } else {
    delta = roundQuantity(quantity - prev);
  }
  return { delta: roundQuantity(delta), balanceAfter: roundQuantity(prev + delta) };
}

interface InsertParams {
  productId: number;
  type: MovementType;
  quantity: number;
  delta: number;
  balanceAfter: number;
  reason: string | null;
  reference: string | null;
  createdBy: string;
  now: string;
}

export function createStockMovementsRepository(db: Database.Database) {
  const byId = db.prepare<[number | bigint], MovementRow>('SELECT * FROM stock_movements WHERE id = ?');
  const productForUpdate = db.prepare<[number], { id: number; quantity: number; unit: string }>(
    'SELECT id, quantity, unit FROM products WHERE id = ?',
  );
  const insert = db.prepare<[InsertParams]>(`
    INSERT INTO stock_movements
      (product_id, type, quantity, delta, balance_after, reason, reference, created_by, created_at)
    VALUES
      (@productId, @type, @quantity, @delta, @balanceAfter, @reason, @reference, @createdBy, @now)`);
  const setQuantity = db.prepare<[number, string, number]>(
    'UPDATE products SET quantity = ?, updated_at = ? WHERE id = ?',
  );

  /**
   * Records a movement and updates the product's quantity atomically. When
   * called inside another transaction (e.g. product creation) it joins it.
   * `createdBy` is the email of the authenticated user.
   */
  const record = db.transaction((input: MovementRecordInput, createdBy: string): StockMovement => {
    const product = productForUpdate.get(input.productId);
    if (!product) throw validationError({ productId: `Product ${input.productId} does not exist` });

    const { delta, balanceAfter } = computeMovement(product, input.type, input.quantity);
    const now = nowIso();
    const { lastInsertRowid } = insert.run({
      productId: product.id,
      type: input.type,
      quantity: input.quantity,
      delta,
      balanceAfter,
      reason: input.reason ?? null,
      reference: input.reference ?? null,
      createdBy,
      now,
    });
    setQuantity.run(balanceAfter, now, product.id);
    return toMovement(byId.get(lastInsertRowid)!);
  });

  return {
    list(parsed: ParsedListQuery) {
      const { rows, total } = queryList<MovementRow>(db, movementListSpec, parsed);
      return { records: rows.map(toMovement), total };
    },

    findById(id: number) {
      const row = byId.get(id);
      return row ? toMovement(row) : null;
    },

    record,
  };
}
