import { openDatabase } from '../src/db/connection.js';
import { migrate } from '../src/db/migrate.js';
import { seed } from '../src/db/seed.js';
import { ensureInitialUser } from '../src/modules/users/initialUser.js';
import { loadScriptConfig } from './common.js';

const config = loadScriptConfig();
const db = openDatabase(config.databasePath);
try {
  migrate(db);
  const initialUser = await ensureInitialUser(db, config);
  if (initialUser) console.log(`Created the initial user ${initialUser.email}.`);
  const result = seed(db, { createdBy: config.adminEmail });
  if (result.seeded) {
    console.log(
      `Seeded ${result.categories} categories, ${result.suppliers} suppliers, ${result.products} products and ${result.movements} stock movements.`,
    );
  } else {
    console.log('Products already exist; skipping seed.');
  }
} finally {
  db.close();
}
