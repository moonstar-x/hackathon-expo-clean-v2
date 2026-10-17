import type Database from 'better-sqlite3';
import type { Logger } from 'pino';
import type { Config } from '../../config.ts';
import type { MeasurementMetadata } from '../measurements/schemas.ts';
import { computeQuote } from './engine/index.ts';
import { deriveZones } from './derive.ts';
import { allSettings } from './settings.ts';
import { engineInput, snapshotFor } from './snapshot.ts';
import { readZones, replaceZones } from './repository.ts';
interface Job {
    id: number;
    quote_id: number;
    kind: 'generate' | 'recalculate' | 'regenerate';
    attempts: number;
}
export function createQuoteWorker({ db, logger, config, compute = computeQuote }: {
    db: Database.Database;
    logger: Logger;
    config: Pick<Config, 'quoteWorkerPollMs' | 'quoteJobMaxAttempts'>;
    compute?: typeof computeQuote;
}) {
    let timer: ReturnType<typeof setInterval> | undefined;
    let nudgeTimer: ReturnType<typeof setImmediate> | undefined;
    function recover() {
        db.transaction(() => {
            // A process can have died with both a running and a later pending job.
            const running = db.prepare("SELECT id, quote_id, kind, attempts FROM quote_jobs WHERE status = 'running'").all() as Job[];
            for (const job of running) {
                const pending = db.prepare("SELECT id, kind FROM quote_jobs WHERE quote_id = ? AND status = 'pending'").get(job.quote_id) as {
                    id: number;
                    kind: string;
                } | undefined;
                if (pending) {
                    const strengths = { generate: 3, regenerate: 2, recalculate: 1 };
                    const kind = strengths[job.kind] > strengths[pending.kind as Job['kind']] ? job.kind : pending.kind;
                    db.prepare('UPDATE quote_jobs SET kind = ? WHERE id = ?').run(kind, pending.id);
                    db.prepare("UPDATE quote_jobs SET status = 'failed', last_error = 'RECOVERED_IN_PENDING_JOB' WHERE id = ?").run(job.id);
                }
                else
                    db.prepare("UPDATE quote_jobs SET status = 'pending' WHERE id = ?").run(job.id);
                db.prepare("UPDATE quotes SET calculation_state = 'pending' WHERE id = ?").run(job.quote_id);
            }
        })();
    }
    function processNextJob() {
        const start = Date.now();
        const now = new Date(start).toISOString();
        const job = db.prepare(`UPDATE quote_jobs SET status = 'running', started_at = ?, attempts = attempts + 1 WHERE id = (SELECT id FROM quote_jobs WHERE status = 'pending' AND run_after <= ? ORDER BY run_after, id LIMIT 1) RETURNING id, quote_id, kind, attempts`).get(now, now) as Job | undefined;
        if (!job)
            return false;
        let outcome = 'done';
        let status: string | null = null;
        try {
            db.transaction(() => {
                const q = db.prepare('SELECT id, measurement_id, assumptions_confirmed, manual_price, target_margin, external_reference_price, overrides_json, input_revision, result_json FROM quotes WHERE id = ?').get(job.quote_id) as {
                    id: number;
                    measurement_id: number | null;
                    assumptions_confirmed: number;
                    manual_price: number | null;
                    target_margin: number | null;
                    external_reference_price: number | null;
                    overrides_json: string;
                    input_revision: number;
                    result_json: string | null;
                } | undefined;
                if (!q) {
                    db.prepare("UPDATE quote_jobs SET status = 'done', finished_at = ? WHERE id = ?").run(now, job.id);
                    return;
                }
                db.prepare("UPDATE quotes SET calculation_state = 'running' WHERE id = ?").run(q.id);
                const settings = allSettings(db);
                let zones = readZones(db, q.id);
                let derivationWarnings = q.result_json ? (JSON.parse(q.result_json) as ReturnType<typeof computeQuote>).warnings.filter((w) => ['GEOMETRY_UNAVAILABLE', 'SCHEDULE_CODE_UNKNOWN'].includes(w.code)) : [];
                if (job.kind === 'regenerate' || (job.kind === 'generate' && zones.length === 0)) {
                    if (!q.measurement_id)
                        throw new Error('MEASUREMENT_DELETED');
                    const m = db.prepare('SELECT rooms_json, quoting_json FROM measurements WHERE id = ?').get(q.measurement_id) as {
                        rooms_json: string;
                        quoting_json: string | null;
                    };
                    const f = db.prepare("SELECT data FROM measurement_files WHERE measurement_id = ? AND kind = 'geometry'").pluck().get(q.measurement_id) as Buffer | undefined;
                    const equivalences = Object.fromEntries((db.prepare('SELECT location_type, zone_type_id FROM quote_location_types').all() as {
                        location_type: string;
                        zone_type_id: number | null;
                    }[]).map((e) => [e.location_type, e.zone_type_id]));
                    const derived = deriveZones(JSON.parse(m.rooms_json) as MeasurementMetadata['rooms'], m.quoting_json ? JSON.parse(m.quoting_json) : null, f ?? null, settings, equivalences);
                    replaceZones(db, q.id, derived.zones);
                    zones = readZones(db, q.id);
                    derivationWarnings = derived.warnings;
                }
                const snapshot = snapshotFor(settings, zones);
                const result = compute(engineInput(snapshot, { assumptionsConfirmed: !!q.assumptions_confirmed, manualPrice: q.manual_price, targetMargin: q.target_margin, externalReferencePrice: q.external_reference_price, overrides: JSON.parse(q.overrides_json) }, zones));
                result.warnings.push(...derivationWarnings);
                status = result.status;
                const pr = result.pricing;
                db.prepare(`UPDATE quotes SET result_json = ?, snapshot_json = ?, status = ?, offered_price = ?, total_cost = ?, profit = ?, margin = ?, margin_status = ?, total_floor_area = ?, fte = ?, active_zone_count = ?, parameters_revision = ?, calculated_input_revision = ?, calculated_at = ?, calculation_state = 'done', calculation_error = NULL WHERE id = ?`).run(JSON.stringify(result), JSON.stringify(snapshot), result.status, pr.offeredPrice, result.costs.totalCost, pr.profit, pr.margin, pr.marginStatus, result.totals.floorArea, result.staffing.fte, result.zones.filter((z) => z.active).length, settings.parametersRevision, q.input_revision, now, q.id);
                db.prepare("UPDATE quote_jobs SET status = 'done', last_error = NULL, finished_at = ? WHERE id = ?").run(now, job.id);
            })();
        }
        catch (err) {
            const error = err instanceof Error ? err.message : 'Calculation failed';
            const permanent = error === 'MEASUREMENT_DELETED' || job.attempts >= config.quoteJobMaxAttempts;
            outcome = permanent ? 'failed' : 'retry';
            const runAfter = new Date(start + Math.min(5000 * 2 ** (job.attempts - 1), 300000)).toISOString();
            db.transaction(() => { db.prepare('UPDATE quote_jobs SET status = ?, last_error = ?, run_after = ?, finished_at = ? WHERE id = ?').run(permanent ? 'failed' : 'pending', error, runAfter, permanent ? now : null, job.id); db.prepare('UPDATE quotes SET calculation_state = ?, calculation_error = ? WHERE id = ?').run(permanent ? 'failed' : 'pending', error, job.quote_id); })();
        }
        logger.info({ jobId: job.id, kind: job.kind, quoteId: job.quote_id, outcome, durationMs: Date.now() - start, status }, 'quote job');
        return true;
    }
    return { processNextJob, start() { if (timer)
            return; recover(); timer = setInterval(() => { while (processNextJob()) { /* drain due jobs */ } }, config.quoteWorkerPollMs); timer.unref(); this.nudge(); }, stop() { if (timer)
            clearInterval(timer); if (nudgeTimer)
            clearImmediate(nudgeTimer); timer = undefined; nudgeTimer = undefined; }, nudge() { if (!timer || nudgeTimer)
            return; nudgeTimer = setImmediate(() => { nudgeTimer = undefined; while (processNextJob()) { /* drain */ } }); } };
}
