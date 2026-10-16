import path from 'node:path';
import dotenv from 'dotenv';
import { API_ROOT, ConfigError, loadConfig } from '../src/config.js';

/** Loads api/.env (real env vars win) and validates it, exiting 1 with every problem listed. */
export function loadScriptConfig() {
  dotenv.config({ path: path.join(API_ROOT, '.env'), quiet: true });
  try {
    return loadConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }
}
