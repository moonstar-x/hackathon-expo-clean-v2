import fs from 'node:fs';
import { openDatabase } from '../src/db/connection.ts';
import { migrate } from '../src/db/migrate.ts';
import { seed } from '../src/db/seed.ts';
import { ensureInitialUser } from '../src/modules/users/initialUser.ts';
import { loadScriptConfig } from './common.ts';

const config = loadScriptConfig();

if (config.databasePath !== ':memory:') {
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(`${config.databasePath}${suffix}`, { force: true });
  }
  console.log(`Deleted ${config.databasePath}`);
}

const db = openDatabase(config.databasePath);
try {
  const applied = migrate(db);
  console.log(`Applied migrations: ${applied.join(', ') || 'none'}`);
  const initialUser = await ensureInitialUser(db, config);
  if (initialUser) console.log(`Created the initial user ${initialUser.email}.`);
  const result = seed(db, { createdBy: config.adminEmail });
  console.log(
    `Seeded ${result.categories} categories, ${result.suppliers} suppliers, ${result.products} products and ${result.movements} stock movements.`,
  );
} finally {
  db.close();
}
