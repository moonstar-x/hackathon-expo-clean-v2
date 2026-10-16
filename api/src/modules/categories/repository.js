import { conflict } from '../../lib/errors.js';
import { queryList } from '../../lib/listQuery.js';
import { nowIso, withRestrictGuard, withUniqueGuard } from '../../lib/sqlite.js';

export const categoryListSpec = Object.freeze({
  resource: 'categories',
  table: 'categories',
  sortable: { id: 'id', name: 'name', createdAt: 'created_at', updatedAt: 'updated_at' },
  textSorts: ['name'],
  defaultSort: ['name', 'ASC'],
  filters: {},
  search: ['name', 'description'],
});

const NAME_TAKEN = 'A category with this name already exists';

export const toCategory = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function createCategoriesRepository(db) {
  const byId = db.prepare('SELECT * FROM categories WHERE id = ?');
  const nameTaken = db.prepare('SELECT 1 FROM categories WHERE name = ? COLLATE NOCASE AND id != ?').pluck();
  const insert = db.prepare(
    'INSERT INTO categories (name, description, created_at, updated_at) VALUES (@name, @description, @now, @now)',
  );
  const updateStmt = db.prepare(
    'UPDATE categories SET name = @name, description = @description, updated_at = @now WHERE id = @id',
  );
  const productCount = db.prepare('SELECT COUNT(*) FROM products WHERE category_id = ?').pluck();
  const deleteStmt = db.prepare('DELETE FROM categories WHERE id = ?');

  const assertNameFree = (name, id = 0) => {
    if (nameTaken.get(name, id)) throw conflict(NAME_TAKEN, { name: NAME_TAKEN });
  };

  const repo = {
    list(parsed) {
      const { rows, total } = queryList(db, categoryListSpec, parsed);
      return { records: rows.map(toCategory), total };
    },

    findById(id) {
      const row = byId.get(id);
      return row ? toCategory(row) : null;
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
      const message = `Category "${current.name}" is used by ${count} product(s)`;
      if (count > 0) throw conflict(message);
      withRestrictGuard(`Category "${current.name}" is used by products`, () => deleteStmt.run(id));
    },
  };
  return repo;
}
