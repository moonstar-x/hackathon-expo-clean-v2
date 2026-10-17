import fs from 'node:fs';
import path from 'node:path';
import { openDatabase } from '../src/db/connection.ts';
import { migrate } from '../src/db/migrate.ts';
import { seed } from '../src/db/seed.ts';
import { LOGO_FOLDER } from '../src/modules/quoteDocuments/logo.ts';
import { SIGNATURE_FOLDER } from '../src/modules/quoteDocuments/signature.ts';
import { TDR_FOLDER } from '../src/modules/tdrDocuments/schemas.ts';
import { ensureInitialUser } from '../src/modules/users/initialUser.ts';
import { loadScriptConfig } from './common.ts';

const config = loadScriptConfig();

if (config.databasePath !== ':memory:') {
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(`${config.databasePath}${suffix}`, { force: true });
  }
  console.log(`Deleted ${config.databasePath}`);
  // The files the deleted rows pointed to. Only the API's own folders: FILES_PATH itself may hold more.
  for (const folder of [LOGO_FOLDER, SIGNATURE_FOLDER, TDR_FOLDER]) {
    const files = path.join(config.filesPath, folder);
    fs.rmSync(files, { recursive: true, force: true });
    console.log(`Deleted ${files}`);
  }
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
