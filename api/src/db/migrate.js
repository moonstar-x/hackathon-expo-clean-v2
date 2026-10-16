import fs from 'node:fs';
import path from 'node:path';
import { API_ROOT } from '../config.js';

export const MIGRATIONS_DIR = path.join(API_ROOT, 'migrations');
const FILE_PATTERN = /^\d{3}_[\w-]+\.sql$/;

/**
 * Applies pending `NNN_description.sql` files in lexical order. Each file runs
 * in its own transaction and is recorded in `schema_migrations`.
 * @returns {string[]} the versions applied by this call
 */
export function migrate(db, dir = MIGRATIONS_DIR) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version    TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`);

  const applied = new Set(db.prepare('SELECT version FROM schema_migrations').pluck().all());
  const files = fs.readdirSync(dir).filter((f) => FILE_PATTERN.test(f)).sort();
  const record = db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)');
  const newlyApplied = [];

  for (const file of files) {
    const version = path.basename(file, '.sql');
    if (applied.has(version)) continue;
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    db.transaction(() => {
      db.exec(sql);
      record.run(version, new Date().toISOString());
    })();
    newlyApplied.push(version);
  }
  return newlyApplied;
}
