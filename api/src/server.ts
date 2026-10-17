import path from 'node:path';
import dotenv from 'dotenv';
import { API_ROOT, type Config, ConfigError, loadConfig } from './config.ts';
import { createApp, createLogger } from './app.ts';
import { openDatabase } from './db/connection.ts';
import { migrate } from './db/migrate.ts';
import { createQuoteWorker } from './modules/quotes/worker.ts';
import { ensureInitialUser } from './modules/users/initialUser.ts';

// Real environment variables take precedence over values in api/.env.
dotenv.config({ path: path.join(API_ROOT, '.env'), quiet: true });

let config: Config;
try {
  config = loadConfig();
} catch (err) {
  if (err instanceof ConfigError) {
    console.error(err.message);
    process.exit(1);
  }
  throw err;
}

const logger = createLogger(config);
const db = openDatabase(config.databasePath);
const applied = migrate(db);
if (applied.length) logger.info({ migrations: applied }, 'applied database migrations');
const initialUser = await ensureInitialUser(db, config);
if (initialUser) logger.info({ email: initialUser.email }, 'created the initial user from ADMIN_EMAIL / ADMIN_PASSWORD');

const worker = createQuoteWorker({ db,config,logger });
if (config.quoteWorker === 'on') worker.start();
const app = createApp({ db, config, logger, nudgeQuotes:() => worker.nudge() });
const server = app.listen(config.port, (err) => {
  if (err) {
    logger.fatal({ err }, 'failed to start HTTP server');
    db.close();
    process.exit(1);
  }
  logger.info({ port: config.port, env: config.env, database: config.databasePath, publicUrl: config.publicUrl }, `API listening on port ${config.port} (${config.publicUrl})`);
});

let shuttingDown = false;
function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutting down');
  worker.stop();
  server.close(() => {
    db.close();
    process.exit(0);
  });
  // Keep-alive connections can hold server.close() open; don't hang forever.
  setTimeout(() => {
    db.close();
    process.exit(0);
  }, 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
