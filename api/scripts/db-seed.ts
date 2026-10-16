import { openDatabase } from '../src/db/connection.ts';
import { migrate } from '../src/db/migrate.ts';
import { seed } from '../src/db/seed.ts';
import { ensureInitialUser } from '../src/modules/users/initialUser.ts';
import { loadScriptConfig } from './common.ts';

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
