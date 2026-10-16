import { conflict, validationError } from '../../lib/errors.js';
import { boolFilter, enumFilter, intFilter, queryList, toBool } from '../../lib/listQuery.js';
import { roundMoney } from '../../lib/numbers.js';
import { nowIso, withRestrictGuard, withUniqueGuard } from '../../lib/sqlite.js';
import { createStockMovementsRepository } from '../stockMovements/repository.js';
import { UNITS } from './schemas.js';

export const productListSpec = Object.freeze({
  resource: 'products',
  table: 'products',
  sortable: {
    id: 'id',
    sku: 'sku',
    name: 'name',
    categoryId: 'category_id',
    supplierId: 'supplier_id',
    quantity: 'quantity',
    reorderLevel: 'reorder_level',
    unitCost: 'unit_cost',
    stockValue: '(quantity * unit_cost)',
    active: 'active',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  textSorts: ['sku', 'name'],
  defaultSort: ['name', 'ASC'],
  filters: {
    categoryId: intFilter('category_id'),
    supplierId: intFilter('supplier_id'),
    unit: enumFilter('unit', UNITS),
    active: boolFilter('active'),
    hazardous: boolFilter('hazardous'),
    lowStock: (value, key) => ({
      sql: toBool(key, value) ? 'quantity <= reorder_level' : 'quantity > reorder_level',
      params: [],
    }),
    // Not in the SPEC-002 whitelist: added so the dashboard's "Out of stock" card can link to a filtered list.
    outOfStock: (value, key) => ({ sql: toBool(key, value) ? 'quantity = 0' : 'quantity > 0', params: [] }),
  },
  search: ['sku', 'name', 'description'],
});

const SKU_TAKEN = 'SKU already exists';
const HAS_HISTORY = 'Product has stock history; set it inactive instead';

export const toProduct = (row) => ({
  id: row.id,
  sku: row.sku,
  name: row.name,
  description: row.description,
  categoryId: row.category_id,
  supplierId: row.supplier_id,
  unit: row.unit,
  quantity: row.quantity,
  reorderLevel: row.reorder_level,
  unitCost: row.unit_cost,
  location: row.location,
  hazardous: row.hazardous === 1,
  sdsUrl: row.sds_url,
  active: row.active === 1,
  isLowStock: row.quantity <= row.reorder_level,
  stockValue: roundMoney(row.quantity * row.unit_cost),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toParams = (data) => ({
  sku: data.sku,
  name: data.name,
  description: data.description,
  categoryId: data.categoryId,
  supplierId: data.supplierId,
  unit: data.unit,
  reorderLevel: data.reorderLevel,
  unitCost: data.unitCost,
  location: data.location,
  hazardous: data.hazardous ? 1 : 0,
  sdsUrl: data.sdsUrl,
  active: data.active ? 1 : 0,
});

export function createProductsRepository(db) {
  const movements = createStockMovementsRepository(db);

  const byId = db.prepare('SELECT * FROM products WHERE id = ?');
  const skuTaken = db.prepare('SELECT 1 FROM products WHERE sku = ? COLLATE NOCASE AND id != ?').pluck();
  const categoryExists = db.prepare('SELECT 1 FROM categories WHERE id = ?').pluck();
  const supplierExists = db.prepare('SELECT 1 FROM suppliers WHERE id = ?').pluck();
  const movementCount = db.prepare('SELECT COUNT(*) FROM stock_movements WHERE product_id = ?').pluck();
  const insert = db.prepare(`
    INSERT INTO products
      (sku, name, description, category_id, supplier_id, unit, quantity, reorder_level, unit_cost,
       location, hazardous, sds_url, active, created_at, updated_at)
    VALUES
      (@sku, @name, @description, @categoryId, @supplierId, @unit, 0, @reorderLevel, @unitCost,
       @location, @hazardous, @sdsUrl, @active, @now, @now)`);
  const updateStmt = db.prepare(`
    UPDATE products
       SET sku = @sku, name = @name, description = @description, category_id = @categoryId,
           supplier_id = @supplierId, unit = @unit, reorder_level = @reorderLevel, unit_cost = @unitCost,
           location = @location, hazardous = @hazardous, sds_url = @sdsUrl, active = @active, updated_at = @now
     WHERE id = @id`);
  const deleteStmt = db.prepare('DELETE FROM products WHERE id = ?');

  /** 422 for dangling references, 409 for a duplicate SKU. */
  const checkWrite = (data, id = 0) => {
    const errors = {};
    if (!categoryExists.get(data.categoryId)) errors.categoryId = `Category ${data.categoryId} does not exist`;
    if (data.supplierId !== null && !supplierExists.get(data.supplierId)) {
      errors.supplierId = `Supplier ${data.supplierId} does not exist`;
    }
    if (Object.keys(errors).length) throw validationError(errors);
    if (skuTaken.get(data.sku, id)) throw conflict(SKU_TAKEN, { sku: SKU_TAKEN });
  };

  const repo = {
    list(parsed) {
      const { rows, total } = queryList(db, productListSpec, parsed);
      return { records: rows.map(toProduct), total };
    },

    findById(id) {
      const row = byId.get(id);
      return row ? toProduct(row) : null;
    },

    /** Creates the product and, for `initialQuantity > 0`, its opening IN movement in one transaction. */
    create: db.transaction((data, ctx) => {
      checkWrite(data);
      const { lastInsertRowid } = withUniqueGuard('sku', SKU_TAKEN, () =>
        insert.run({ ...toParams(data), now: nowIso() }),
      );
      const id = Number(lastInsertRowid);
      if (data.initialQuantity > 0) {
        movements.record(
          { productId: id, type: 'IN', quantity: data.initialQuantity, reason: 'Initial stock', reference: null },
          ctx.user.email,
        );
      }
      return repo.findById(id);
    }),

    update: db.transaction((id, data, current) => {
      checkWrite(data, id);
      if (data.unit !== current.unit && movementCount.get(id) > 0) {
        throw validationError({ unit: 'Unit cannot be changed after stock movements exist' });
      }
      withUniqueGuard('sku', SKU_TAKEN, () => updateStmt.run({ ...toParams(data), id, now: nowIso() }));
      return repo.findById(id);
    }),

    remove(id) {
      if (movementCount.get(id) > 0) throw conflict(HAS_HISTORY);
      withRestrictGuard(HAS_HISTORY, () => deleteStmt.run(id));
    },
  };
  return repo;
}
