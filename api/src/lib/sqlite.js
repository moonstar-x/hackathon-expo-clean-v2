import { conflict } from './errors.js';

export const nowIso = () => new Date().toISOString();

/**
 * Runs `fn`, turning a SQLite UNIQUE violation into a 409 on `field`. This is
 * the backstop behind the repositories' pre-checks (e.g. for concurrent writes).
 */
export function withUniqueGuard(field, message, fn) {
  try {
    return fn();
  } catch (err) {
    if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE') throw conflict(message, { [field]: message });
    throw err;
  }
}

/** Turns a SQLite foreign-key violation on delete into a 409. */
export function withRestrictGuard(message, fn) {
  try {
    return fn();
  } catch (err) {
    if (err?.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') throw conflict(message);
    throw err;
  }
}
