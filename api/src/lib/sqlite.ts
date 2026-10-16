import { conflict } from './errors.ts';

export const nowIso = () => new Date().toISOString();

const sqliteCode = (err: unknown) => (err instanceof Error && 'code' in err ? err.code : undefined);

/**
 * Runs `fn`, turning a SQLite UNIQUE violation into a 409 on `field`. This is
 * the backstop behind the repositories' pre-checks (e.g. for concurrent writes).
 */
export function withUniqueGuard<T>(field: string, message: string, fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    if (sqliteCode(err) === 'SQLITE_CONSTRAINT_UNIQUE') throw conflict(message, { [field]: message });
    throw err;
  }
}

/** Turns a SQLite foreign-key violation on delete into a 409. */
export function withRestrictGuard<T>(message: string, fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    if (sqliteCode(err) === 'SQLITE_CONSTRAINT_FOREIGNKEY') throw conflict(message);
    throw err;
  }
}
