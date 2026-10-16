import type Database from 'better-sqlite3';
import { conflict } from '../../lib/errors.ts';
import { type ListSpec, type ParsedListQuery, queryList } from '../../lib/listQuery.ts';
import { nowIso, withRestrictGuard, withUniqueGuard } from '../../lib/sqlite.ts';
import type { CategoryInput } from './schemas.ts';

export const categoryListSpec = Object.freeze<ListSpec>({
  resource: 'categories',
  table: 'categories',
  sortable: { id: 'id', name: 'name', createdAt: 'created_at', updatedAt: 'updated_at' },
  textSorts: ['name'],
  defaultSort: ['name', 'ASC'],
  filters: {},
  search: ['name', 'description'],
});

const NAME_TAKEN = 'A category with this name already exists';

interface CategoryRow {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type Category = ReturnType<typeof toCategory>;

export const toCategory = (row: CategoryRow) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

type WriteParams = CategoryInput & { now: string };

export function createCategoriesRepository(db: Database.Database) {
  const byId = db.prepare<[number], CategoryRow>('SELECT * FROM categories WHERE id = ?');
  const nameTaken = db.prepare<[string, number], 1>(
    'SELECT 1 FROM categories WHERE name = ? COLLATE NOCASE AND id != ?',
  ).pluck();
  const insert = db.prepare<[WriteParams]>(
    'INSERT INTO categories (name, description, created_at, updated_at) VALUES (@name, @description, @now, @now)',
  );
  const updateStmt = db.prepare<[WriteParams & { id: number }]>(
    'UPDATE categories SET name = @name, description = @description, updated_at = @now WHERE id = @id',
  );
  const productCount = db.prepare<[number], number>('SELECT COUNT(*) FROM products WHERE category_id = ?').pluck();
  const deleteStmt = db.prepare<[number]>('DELETE FROM categories WHERE id = ?');

  const assertNameFree = (name: string, id = 0) => {
    if (nameTaken.get(name, id)) throw conflict(NAME_TAKEN, { name: NAME_TAKEN });
  };

  const repo = {
    list(parsed: ParsedListQuery) {
      const { rows, total } = queryList<CategoryRow>(db, categoryListSpec, parsed);
      return { records: rows.map(toCategory), total };
    },

    findById(id: number): Category | null {
      const row = byId.get(id);
      return row ? toCategory(row) : null;
    },

    exists(id: number) {
      return Boolean(byId.get(id));
    },

    create(data: CategoryInput): Category {
      assertNameFree(data.name);
      const { lastInsertRowid } = withUniqueGuard('name', NAME_TAKEN, () => insert.run({ ...data, now: nowIso() }));
      return repo.findById(Number(lastInsertRowid))!;
    },

    update(id: number, data: CategoryInput): Category {
      assertNameFree(data.name, id);
      withUniqueGuard('name', NAME_TAKEN, () => updateStmt.run({ ...data, id, now: nowIso() }));
      return repo.findById(id)!;
    },

    remove(id: number, current: Category) {
      const count = productCount.get(id)!;
      const message = `Category "${current.name}" is used by ${count} product(s)`;
      if (count > 0) throw conflict(message);
      withRestrictGuard(`Category "${current.name}" is used by products`, () => deleteStmt.run(id));
    },
  };
  return repo;
}
