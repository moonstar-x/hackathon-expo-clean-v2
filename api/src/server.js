import path from 'node:path';
import dotenv from 'dotenv';
import { API_ROOT, ConfigError, loadConfig } from './config.js';
import { createApp, createLogger } from './app.js';
import { openDatabase } from './db/connection.js';
import { migrate } from './db/migrate.js';

// Real environment variables take precedence over values in api/.env.
dotenv.config({ path: path.join(API_ROOT, '.env'), quiet: true });

let config;
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

const app = createApp({ db, config, logger });
const server = app.listen(config.port, (err) => {
  if (err) {
    logger.fatal({ err }, 'failed to start HTTP server');
    db.close();
    process.exit(1);
  }
  logger.info({ port: config.port, env: config.env, database: config.databasePath }, `API listening on port ${config.port}`);
});

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutting down');
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
