import { openDatabase } from '../src/db/connection.ts';
import { migrate } from '../src/db/migrate.ts';
import { loadScriptConfig } from './common.ts';

const config = loadScriptConfig();
const db = openDatabase(config.databasePath);
try {
  const applied = migrate(db);
  console.log(applied.length ? `Applied migrations: ${applied.join(', ')}` : 'Database is up to date.');
} finally {
  db.close();
}
