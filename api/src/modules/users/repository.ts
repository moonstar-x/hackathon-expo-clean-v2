import type Database from 'better-sqlite3';
import type { RequestContext } from '../../lib/crudRouter.ts';
import { conflict, validationError } from '../../lib/errors.ts';
import { boolFilter, type ListSpec, type ParsedListQuery, queryList } from '../../lib/listQuery.ts';
import { DEFAULT_SCRYPT_PARAMS, hashPassword, type ScryptParams } from '../../lib/password.ts';
import { nowIso, withUniqueGuard } from '../../lib/sqlite.ts';
import type { UserCreateInput, UserUpdateInput } from './schemas.ts';

export const userListSpec = Object.freeze<ListSpec>({
  resource: 'users',
  table: 'users',
  sortable: {
    id: 'id',
    email: 'email',
    name: 'name',
    active: 'active',
    lastLoginAt: 'last_login_at',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  textSorts: ['email', 'name'],
  defaultSort: ['email', 'ASC'],
  filters: { active: boolFilter('active') },
  search: ['email', 'name'],
});

const EMAIL_TAKEN = 'A user with this email already exists';
const CANNOT_DELETE_SELF = 'You cannot delete your own account';
const CANNOT_DEACTIVATE_SELF = 'You cannot deactivate your own account';

/** The public shape. The password hash never leaves this module except through `findCredentials`. */
interface UserRow {
  id: number;
  email: string;
  name: string | null;
  password_hash: string;
  active: 0 | 1;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export type User = ReturnType<typeof toUser>;

export interface UsersRepositoryOptions {
  /** scrypt cost for new hashes (tests use a cheap one). */
  hashParams?: ScryptParams;
}

export const toUser = (row: UserRow) => ({
  id: row.id,
  email: row.email,
  name: row.name,
  active: row.active === 1,
  lastLoginAt: row.last_login_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function createUsersRepository(
  db: Database.Database,
  { hashParams = DEFAULT_SCRYPT_PARAMS }: UsersRepositoryOptions = {},
) {
  const byId = db.prepare<[number], UserRow>('SELECT * FROM users WHERE id = ?');
  // `email` is declared COLLATE NOCASE, so these comparisons ignore case.
  const byEmail = db.prepare<[string], UserRow>('SELECT * FROM users WHERE email = ?');
  const emailTaken = db.prepare<[string, number], 1>('SELECT 1 FROM users WHERE email = ? AND id != ?').pluck();
  const countAll = db.prepare<[], number>('SELECT COUNT(*) FROM users').pluck();
  const insert = db.prepare<
    [{ email: string; name: string | null; passwordHash: string; active: 0 | 1; now: string }]
  >(`
    INSERT INTO users (email, name, password_hash, active, created_at, updated_at)
    VALUES (@email, @name, @passwordHash, @active, @now, @now)`);
  const updateStmt = db.prepare<
    [{ id: number; email: string; name: string | null; active: 0 | 1; passwordHash: string | null; now: string }]
  >(`
    UPDATE users
       SET email = @email, name = @name, active = @active,
           password_hash = COALESCE(@passwordHash, password_hash), updated_at = @now
     WHERE id = @id`);
  const touchLogin = db.prepare<[string, number]>('UPDATE users SET last_login_at = ? WHERE id = ?');
  const deleteStmt = db.prepare<[number]>('DELETE FROM users WHERE id = ?');

  const assertEmailFree = (email: string, id = 0) => {
    if (emailTaken.get(email, id)) throw conflict(EMAIL_TAKEN, { email: EMAIL_TAKEN });
  };

  const repo = {
    list(parsed: ParsedListQuery) {
      const { rows, total } = queryList<UserRow>(db, userListSpec, parsed);
      return { records: rows.map(toUser), total };
    },

    findById(id: number): User | null {
      const row = byId.get(id);
      return row ? toUser(row) : null;
    },

    count() {
      return countAll.get()!;
    },

    /** For login only: the user plus their password hash, or null. */
    findCredentials(email: string) {
      const row = byEmail.get(email);
      return row ? { ...toUser(row), passwordHash: row.password_hash } : null;
    },

    recordLogin(id: number) {
      touchLogin.run(nowIso(), id);
    },

    async create(data: UserCreateInput): Promise<User> {
      assertEmailFree(data.email);
      const passwordHash = await hashPassword(data.password, hashParams);
      // The unique guard catches an email taken by another request while hashing.
      const { lastInsertRowid } = withUniqueGuard('email', EMAIL_TAKEN, () =>
        insert.run({ email: data.email, name: data.name, passwordHash, active: data.active ? 1 : 0, now: nowIso() }),
      );
      return repo.findById(Number(lastInsertRowid))!;
    },

    async update(id: number, data: UserUpdateInput, _current: User, ctx?: RequestContext): Promise<User> {
      // Self-protection keeps at least one active account able to log in.
      if (id === ctx?.user?.id && !data.active) {
        throw validationError({ active: CANNOT_DEACTIVATE_SELF }, CANNOT_DEACTIVATE_SELF);
      }
      assertEmailFree(data.email, id);
      const passwordHash = data.password ? await hashPassword(data.password, hashParams) : null;
      withUniqueGuard('email', EMAIL_TAKEN, () =>
        updateStmt.run({ id, email: data.email, name: data.name, active: data.active ? 1 : 0, passwordHash, now: nowIso() }),
      );
      return repo.findById(id)!;
    },

    remove(id: number, _current: User, ctx?: RequestContext) {
      if (id === ctx?.user?.id) throw conflict(CANNOT_DELETE_SELF);
      deleteStmt.run(id);
    },
  };
  return repo;
}
