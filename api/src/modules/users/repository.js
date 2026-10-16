import { conflict, validationError } from '../../lib/errors.js';
import { boolFilter, queryList } from '../../lib/listQuery.js';
import { DEFAULT_SCRYPT_PARAMS, hashPassword } from '../../lib/password.js';
import { nowIso, withUniqueGuard } from '../../lib/sqlite.js';

export const userListSpec = Object.freeze({
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
export const toUser = (row) => ({
  id: row.id,
  email: row.email,
  name: row.name,
  active: row.active === 1,
  lastLoginAt: row.last_login_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ hashParams?: typeof DEFAULT_SCRYPT_PARAMS }} [options] scrypt cost for new hashes (tests use a cheap one)
 */
export function createUsersRepository(db, { hashParams = DEFAULT_SCRYPT_PARAMS } = {}) {
  const byId = db.prepare('SELECT * FROM users WHERE id = ?');
  // `email` is declared COLLATE NOCASE, so these comparisons ignore case.
  const byEmail = db.prepare('SELECT * FROM users WHERE email = ?');
  const emailTaken = db.prepare('SELECT 1 FROM users WHERE email = ? AND id != ?').pluck();
  const countAll = db.prepare('SELECT COUNT(*) FROM users').pluck();
  const insert = db.prepare(`
    INSERT INTO users (email, name, password_hash, active, created_at, updated_at)
    VALUES (@email, @name, @passwordHash, @active, @now, @now)`);
  const updateStmt = db.prepare(`
    UPDATE users
       SET email = @email, name = @name, active = @active,
           password_hash = COALESCE(@passwordHash, password_hash), updated_at = @now
     WHERE id = @id`);
  const touchLogin = db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?');
  const deleteStmt = db.prepare('DELETE FROM users WHERE id = ?');

  const assertEmailFree = (email, id = 0) => {
    if (emailTaken.get(email, id)) throw conflict(EMAIL_TAKEN, { email: EMAIL_TAKEN });
  };

  const repo = {
    list(parsed) {
      const { rows, total } = queryList(db, userListSpec, parsed);
      return { records: rows.map(toUser), total };
    },

    findById(id) {
      const row = byId.get(id);
      return row ? toUser(row) : null;
    },

    count() {
      return countAll.get();
    },

    /** For login only: the user plus their password hash, or null. */
    findCredentials(email) {
      const row = byEmail.get(email);
      return row ? { ...toUser(row), passwordHash: row.password_hash } : null;
    },

    recordLogin(id) {
      touchLogin.run(nowIso(), id);
    },

    async create(data) {
      assertEmailFree(data.email);
      const passwordHash = await hashPassword(data.password, hashParams);
      // The unique guard catches an email taken by another request while hashing.
      const { lastInsertRowid } = withUniqueGuard('email', EMAIL_TAKEN, () =>
        insert.run({ email: data.email, name: data.name, passwordHash, active: data.active ? 1 : 0, now: nowIso() }),
      );
      return repo.findById(Number(lastInsertRowid));
    },

    async update(id, data, _current, ctx) {
      // Self-protection keeps at least one active account able to log in.
      if (id === ctx?.user?.id && !data.active) {
        throw validationError({ active: CANNOT_DEACTIVATE_SELF }, CANNOT_DEACTIVATE_SELF);
      }
      assertEmailFree(data.email, id);
      const passwordHash = data.password ? await hashPassword(data.password, hashParams) : null;
      withUniqueGuard('email', EMAIL_TAKEN, () =>
        updateStmt.run({ id, email: data.email, name: data.name, active: data.active ? 1 : 0, passwordHash, now: nowIso() }),
      );
      return repo.findById(id);
    },

    remove(id, _current, ctx) {
      if (id === ctx?.user?.id) throw conflict(CANNOT_DELETE_SELF);
      deleteStmt.run(id);
    },
  };
  return repo;
}
