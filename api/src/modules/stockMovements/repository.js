import { insufficientStock, validationError } from '../../lib/errors.js';
import { dateBoundFilter, enumFilter, intFilter, queryList, textFilter } from '../../lib/listQuery.js';
import { roundQuantity } from '../../lib/numbers.js';
import { nowIso } from '../../lib/sqlite.js';
import { MOVEMENT_TYPES } from './schemas.js';

export const movementListSpec = Object.freeze({
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

export const toMovement = (row) => ({
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
export function computeMovement(product, type, quantity) {
  const prev = product.quantity;
  let delta;
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

export function createStockMovementsRepository(db) {
  const byId = db.prepare('SELECT * FROM stock_movements WHERE id = ?');
  const productForUpdate = db.prepare('SELECT id, quantity, unit FROM products WHERE id = ?');
  const insert = db.prepare(`
    INSERT INTO stock_movements
      (product_id, type, quantity, delta, balance_after, reason, reference, created_by, created_at)
    VALUES
      (@productId, @type, @quantity, @delta, @balanceAfter, @reason, @reference, @createdBy, @now)`);
  const setQuantity = db.prepare('UPDATE products SET quantity = ?, updated_at = ? WHERE id = ?');

  /**
   * Records a movement and updates the product's quantity atomically. When
   * called inside another transaction (e.g. product creation) it joins it.
   * @param {{ productId: number, type: string, quantity: number, reason: string|null, reference: string|null }} input
   * @param {string} createdBy email of the authenticated user
   */
  const record = db.transaction((input, createdBy) => {
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
    return toMovement(byId.get(lastInsertRowid));
  });

  return {
    list(parsed) {
      const { rows, total } = queryList(db, movementListSpec, parsed);
      return { records: rows.map(toMovement), total };
    },

    findById(id) {
      const row = byId.get(id);
      return row ? toMovement(row) : null;
    },

    record,
  };
}
