import type Database from 'better-sqlite3';
import { conflict } from '../../lib/errors.ts';
import { type ListSpec, type ParsedListQuery, queryList } from '../../lib/listQuery.ts';
import { nowIso, withRestrictGuard, withUniqueGuard } from '../../lib/sqlite.ts';
import type { SupplierInput } from './schemas.ts';

export const supplierListSpec = Object.freeze<ListSpec>({
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

interface SupplierRow {
  id: number;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type Supplier = ReturnType<typeof toSupplier>;

export const toSupplier = (row: SupplierRow) => ({
  id: row.id,
  name: row.name,
  contactName: row.contact_name,
  email: row.email,
  phone: row.phone,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

type WriteParams = SupplierInput & { now: string };

export function createSuppliersRepository(db: Database.Database) {
  const byId = db.prepare<[number], SupplierRow>('SELECT * FROM suppliers WHERE id = ?');
  const nameTaken = db.prepare<[string, number], 1>(
    'SELECT 1 FROM suppliers WHERE name = ? COLLATE NOCASE AND id != ?',
  ).pluck();
  const insert = db.prepare<[WriteParams]>(`
    INSERT INTO suppliers (name, contact_name, email, phone, notes, created_at, updated_at)
    VALUES (@name, @contactName, @email, @phone, @notes, @now, @now)`);
  const updateStmt = db.prepare<[WriteParams & { id: number }]>(`
    UPDATE suppliers
       SET name = @name, contact_name = @contactName, email = @email, phone = @phone, notes = @notes, updated_at = @now
     WHERE id = @id`);
  const productCount = db.prepare<[number], number>('SELECT COUNT(*) FROM products WHERE supplier_id = ?').pluck();
  const deleteStmt = db.prepare<[number]>('DELETE FROM suppliers WHERE id = ?');

  const assertNameFree = (name: string, id = 0) => {
    if (nameTaken.get(name, id)) throw conflict(NAME_TAKEN, { name: NAME_TAKEN });
  };

  const repo = {
    list(parsed: ParsedListQuery) {
      const { rows, total } = queryList<SupplierRow>(db, supplierListSpec, parsed);
      return { records: rows.map(toSupplier), total };
    },

    findById(id: number): Supplier | null {
      const row = byId.get(id);
      return row ? toSupplier(row) : null;
    },

    exists(id: number) {
      return Boolean(byId.get(id));
    },

    create(data: SupplierInput): Supplier {
      assertNameFree(data.name);
      const { lastInsertRowid } = withUniqueGuard('name', NAME_TAKEN, () => insert.run({ ...data, now: nowIso() }));
      return repo.findById(Number(lastInsertRowid))!;
    },

    update(id: number, data: SupplierInput): Supplier {
      assertNameFree(data.name, id);
      withUniqueGuard('name', NAME_TAKEN, () => updateStmt.run({ ...data, id, now: nowIso() }));
      return repo.findById(id)!;
    },

    remove(id: number, current: Supplier) {
      const count = productCount.get(id)!;
      const message = `Supplier "${current.name}" is used by ${count} product(s)`;
      if (count > 0) throw conflict(message);
      withRestrictGuard(`Supplier "${current.name}" is used by products`, () => deleteStmt.run(id));
    },
  };
  return repo;
}
