import type Database from 'better-sqlite3';
import type { Logger } from 'pino';
import type { Config } from '../../config.ts';
import type { FileStore } from '../../lib/fileStore.ts';
import { extractTdr, TdrError, type Extractor } from './extractor.ts';
import { tdrCatalog, tdrFileName, type TdrRow } from './repository.ts';

/** Attempts before an analysis that keeps failing for a passing reason fails for good. */
export const TDR_MAX_ATTEMPTS = 3;
const POLL_MS = 2000;

/**
 * Analyses TDR documents one at a time (SPEC-009 §2). Claiming an entry and writing its result are
 * two short transactions; the model call in between holds nothing, so the API keeps answering.
 */
export function createTdrWorker({ db, logger, config, files, extract = extractTdr, fetch: fetchImpl }: {
  db: Database.Database;
  logger: Logger;
  config: Pick<Config, 'openRouterApiKey' | 'openRouterModel'>;
  files: FileStore;
  extract?: Extractor;
  fetch?: typeof fetch;
}) {
  let timer: ReturnType<typeof setInterval> | undefined;
  let busy = false;

  /** A process that died mid-analysis left entries running; they run again. */
  function recover() {
    db.prepare("UPDATE tdr_documents SET status = 'pending' WHERE status = 'running'").run();
  }

  /** Analyses the next due entry; false when there is none. */
  async function processNext(): Promise<boolean> {
    const start = Date.now();
    const now = new Date(start).toISOString();
    const row = db.prepare(`UPDATE tdr_documents SET status = 'running', attempts = attempts + 1, updated_at = ?
      WHERE id = (SELECT id FROM tdr_documents WHERE status = 'pending' AND run_after <= ? ORDER BY run_after, id LIMIT 1)
      RETURNING *`).get(now, now) as TdrRow | undefined;
    if (!row) return false;
    const model = config.openRouterModel;
    let outcome = 'done';
    try {
      const file = files.read(tdrFileName(row));
      if (!file) throw new TdrError('FILE_MISSING', 'The stored file is missing');
      const extraction = await extract({ file, fileName: row.file_name, contentType: row.content_type, catalog: tdrCatalog(db) }, { apiKey: config.openRouterApiKey, model, fetch: fetchImpl });
      const finished = new Date().toISOString();
      // Only the analysis that is still running writes: the entry may have been deleted meanwhile.
      db.prepare("UPDATE tdr_documents SET status = 'done', error = NULL, error_detail = NULL, model = ?, extraction_json = ?, analyzed_at = ?, updated_at = ? WHERE id = ? AND status = 'running'")
        .run(model, JSON.stringify(extraction), finished, finished, row.id);
    } catch (err) {
      const error = err instanceof TdrError ? err : new TdrError('OPENROUTER_UNAVAILABLE', err instanceof Error ? err.message : String(err), true);
      const permanent = !error.retryable || row.attempts >= TDR_MAX_ATTEMPTS;
      outcome = permanent ? 'failed' : 'retry';
      const runAfter = new Date(Date.now() + 10_000 * 2 ** (row.attempts - 1)).toISOString();
      db.prepare("UPDATE tdr_documents SET status = ?, error = ?, error_detail = ?, model = ?, run_after = ?, updated_at = ? WHERE id = ? AND status = 'running'")
        .run(permanent ? 'failed' : 'pending', error.code, error.message.slice(0, 1000), model, runAfter, new Date().toISOString(), row.id);
    }
    logger.info({ tdrDocumentId: row.id, attempt: row.attempts, model, outcome, durationMs: Date.now() - start }, 'tdr analysis');
    return true;
  }

  /** Runs every due entry, unless a run is already doing so. */
  async function drain() {
    if (busy) return;
    busy = true;
    try {
      while (await processNext()) { /* next */ }
    } catch (err) {
      logger.error({ err }, 'tdr worker failed');
    } finally {
      busy = false;
    }
  }

  return {
    processNext,
    start() {
      if (timer) return;
      recover();
      timer = setInterval(() => void drain(), POLL_MS);
      timer.unref();
      void drain();
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = undefined;
    },
    /** Starts on new work at once instead of at the next poll. */
    nudge() {
      if (timer) void drain();
    },
  };
}
