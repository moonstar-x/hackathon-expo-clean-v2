import { openDatabase } from '../src/db/connection.js';
import { migrate } from '../src/db/migrate.js';
import { loadScriptConfig } from './common.js';

const config = loadScriptConfig();
const db = openDatabase(config.databasePath);
try {
  const applied = migrate(db);
  console.log(applied.length ? `Applied migrations: ${applied.join(', ')}` : 'Database is up to date.');
} finally {
  db.close();
}
