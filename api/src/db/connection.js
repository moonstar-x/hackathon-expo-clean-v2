import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

/**
 * Opens a SQLite database with the pragmas the app relies on.
 * `:memory:` opens a private in-memory database (used by tests).
 */
export function openDatabase(filePath) {
  const inMemory = filePath === ':memory:';
  if (!inMemory) fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });

  const db = new Database(filePath);
  db.pragma('foreign_keys = ON');
  if (!inMemory) db.pragma('journal_mode = WAL');
  return db;
}
