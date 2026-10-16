import { conflict } from '../../lib/errors.js';
import { queryList } from '../../lib/listQuery.js';
import { nowIso, withRestrictGuard, withUniqueGuard } from '../../lib/sqlite.js';

export const supplierListSpec = Object.freeze({
  resource: 'suppliers',
  table: 'suppliers',
  sortable: {
    id: 'id',
    name: 'name',
    contactName: 'contact_name',
    email: 'email',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  textSorts: ['name', 'contactName', 'email'],
  defaultSort: ['name', 'ASC'],
  filters: {},
  search: ['name', 'contact_name', 'email'],
});

const NAME_TAKEN = 'A supplier with this name already exists';

export const toSupplier = (row) => ({
  id: row.id,
  name: row.name,
  contactName: row.contact_name,
  email: row.email,
  phone: row.phone,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function createSuppliersRepository(db) {
  const byId = db.prepare('SELECT * FROM suppliers WHERE id = ?');
  const nameTaken = db.prepare('SELECT 1 FROM suppliers WHERE name = ? COLLATE NOCASE AND id != ?').pluck();
  const insert = db.prepare(`
    INSERT INTO suppliers (name, contact_name, email, phone, notes, created_at, updated_at)
    VALUES (@name, @contactName, @email, @phone, @notes, @now, @now)`);
  const updateStmt = db.prepare(`
    UPDATE suppliers
       SET name = @name, contact_name = @contactName, email = @email, phone = @phone, notes = @notes, updated_at = @now
     WHERE id = @id`);
  const productCount = db.prepare('SELECT COUNT(*) FROM products WHERE supplier_id = ?').pluck();
  const deleteStmt = db.prepare('DELETE FROM suppliers WHERE id = ?');

  const assertNameFree = (name, id = 0) => {
    if (nameTaken.get(name, id)) throw conflict(NAME_TAKEN, { name: NAME_TAKEN });
  };

  const repo = {
    list(parsed) {
      const { rows, total } = queryList(db, supplierListSpec, parsed);
      return { records: rows.map(toSupplier), total };
    },

    findById(id) {
      const row = byId.get(id);
      return row ? toSupplier(row) : null;
    },

    exists(id) {
      return Boolean(byId.get(id));
    },

    create(data) {
      assertNameFree(data.name);
      const { lastInsertRowid } = withUniqueGuard('name', NAME_TAKEN, () => insert.run({ ...data, now: nowIso() }));
      return repo.findById(Number(lastInsertRowid));
    },

    update(id, data) {
      assertNameFree(data.name, id);
      withUniqueGuard('name', NAME_TAKEN, () => updateStmt.run({ ...data, id, now: nowIso() }));
      return repo.findById(id);
    },

    remove(id, current) {
      const count = productCount.get(id);
      const message = `Supplier "${current.name}" is used by ${count} product(s)`;
      if (count > 0) throw conflict(message);
      withRestrictGuard(`Supplier "${current.name}" is used by products`, () => deleteStmt.run(id));
    },
  };
  return repo;
}
