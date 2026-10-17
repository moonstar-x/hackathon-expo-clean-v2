import type Database from 'better-sqlite3';
import { boolFilter, dateBoundFilter, enumFilter, intFilter, type ListSpec, type ParsedListQuery } from '../../lib/listQuery.ts';
import { notFound } from '../../lib/errors.ts';
import { mapRow, snake } from './settings.ts';
import type { QuoteOverrides, ZoneInput } from './types.ts';
import type { EngineResult } from './engine/index.ts';
import type { allSettings } from './settings.ts';
export const QUOTE_FIELDS = ['name', 'installationType', 'city', 'visitDate', 'measurementOrigin', 'assumptionsConfirmed', 'manualPrice', 'targetMargin', 'externalReferencePrice', 'notes'] as const;
export const ZONE_FIELDS = ['name', 'zoneTypeId', 'floorArea', 'wallArea', 'traffic', 'scheduleId', 'daysPerMonth', 'terminalsPerMonth', 'fixedPosts', 'machines', 'freeArea', 'cleanedArea', 'measurementSource', 'observation', 'toilets', 'urinals', 'sinks', 'fixtureVisitsPerDay', 'minutesPerFixture', 'solutionLitersPerFixture', 'paperSoapMonthly', 'fixturesExcludeFloor'] as const;
const zoneFields = ['position', 'origin', 'roomId', ...ZONE_FIELDS, 'isFloorApproximate', 'sourcesJson'] as const;
const zoneColumns = ['id', 'quote_id', ...zoneFields.map(snake), 'created_at', 'updated_at'].join(', ');
const quoteColumns = ['id', 'measurement_id', ...QUOTE_FIELDS.map(snake), 'overrides_json', 'status', 'calculation_state', 'calculation_error', 'input_revision', 'calculated_input_revision', 'parameters_revision', 'calculated_at', 'offered_price', 'total_cost', 'profit', 'margin', 'margin_status', 'total_floor_area', 'fte', 'active_zone_count', 'created_by', 'created_at', 'updated_at'];
const stale = '(parameters_revision < (SELECT revision FROM quote_parameters WHERE id = 1))';
export const quoteListSpec: ListSpec = { resource: 'quotes', table: 'quotes', sortable: { id: 'id', name: 'name', status: 'status', offeredPrice: 'offered_price', totalCost: 'total_cost', margin: 'margin', totalFloorArea: 'total_floor_area', fte: 'fte', calculatedAt: 'calculated_at', createdAt: 'created_at', updatedAt: 'updated_at' }, textSorts: ['name'], defaultSort: ['createdAt', 'DESC'], search: ['name', 'city', 'notes', 'created_by'], filters: { status: enumFilter('status', ['needsReview', 'simulation']), calculationState: enumFilter('calculation_state', ['pending', 'running', 'done', 'failed']), measurementId: intFilter('measurement_id'), isStale: boolFilter(stale), createdAt_gte: dateBoundFilter('created_at', 'gte'), createdAt_lte: dateBoundFilter('created_at', 'lte') } };
export function readZones(db: Database.Database, id: number): ZoneInput[] {
    return (db.prepare(`SELECT ${zoneColumns} FROM quote_zones WHERE quote_id = ? ORDER BY position`).all(id) as Record<string, string | number | null>[]).map((row) => {
        const r = mapRow(row);
        delete r.quoteId;
        delete r.sourcesJson;
        return { ...r, isFloorApproximate: !!row.is_floor_approximate, fixturesExcludeFloor: !!row.fixtures_exclude_floor, sources: JSON.parse(row.sources_json as string) } as unknown as ZoneInput;
    });
}
export function replaceZones(db: Database.Database, quoteId: number, zones: ZoneInput[]) {
    // Move old positions out of the way before reordering, retaining identities and audit sources.
    db.prepare('UPDATE quote_zones SET position = position + 1000 WHERE quote_id = ?').run(quoteId);
    const now = new Date().toISOString();
    const retained: number[] = [];
    for (const [position, z] of zones.entries()) {
        const data: Record<string, unknown> = { ...z, position, sourcesJson: JSON.stringify(z.sources) };
        const values = zoneFields.map((k) => typeof data[k] === 'boolean' ? +data[k]! : data[k] ?? null);
        if (z.id) {
            db.prepare(`UPDATE quote_zones SET ${zoneFields.map((k) => `${snake(k)} = ?`).join(', ')}, updated_at = ? WHERE id = ? AND quote_id = ?`).run(...values, now, z.id, quoteId);
            retained.push(z.id);
        }
        else
            retained.push(Number(db.prepare(`INSERT INTO quote_zones (quote_id, ${zoneFields.map(snake).join(', ')}, created_at, updated_at) VALUES (?, ${values.map(() => '?').join(', ')}, ?, ?)`).run(quoteId, ...values, now, now).lastInsertRowid));
    }
    db.prepare(`DELETE FROM quote_zones WHERE quote_id = ?${retained.length ? ` AND id NOT IN (${retained.map(() => '?').join(', ')})` : ''}`).run(quoteId, ...retained);
}
export function enqueue(db: Database.Database, id: number, kind: 'generate' | 'regenerate' | 'recalculate', user: string | null = null) {
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO quote_jobs (quote_id, kind, status, run_after, requested_by, created_at) VALUES (?, ?, 'pending', ?, ?, ?)
    ON CONFLICT (quote_id) WHERE status = 'pending' DO UPDATE SET kind = CASE WHEN quote_jobs.kind = 'generate' OR excluded.kind = 'generate' THEN 'generate' WHEN quote_jobs.kind = 'regenerate' OR excluded.kind = 'regenerate' THEN 'regenerate' ELSE 'recalculate' END, run_after = excluded.run_after, requested_by = excluded.requested_by`).run(id, kind, now, user, now);
    db.prepare("UPDATE quotes SET calculation_state = 'pending', calculation_error = NULL WHERE id = ?").run(id);
}
export function quotesRepository(db: Database.Database) {
    const columns = `${quoteColumns.join(', ')}, ${stale} AS is_stale, (SELECT count(*) FROM quote_zones WHERE quote_id = quotes.id) AS zone_count`;
    function record(row: Record<string, unknown>, detail: boolean) {
        const r = mapRow(row as Record<string, string | number | null>);
        const result = detail && row.result_json ? JSON.parse(row.result_json as string) as EngineResult : null;
        const snapshot = detail && row.snapshot_json ? JSON.parse(row.snapshot_json as string) as ReturnType<typeof allSettings> : null;
        return { id: r.id as number, measurementId: r.measurementId as number | null, name: r.name as string, installationType: r.installationType, city: r.city, visitDate: r.visitDate, measurementOrigin: r.measurementOrigin, assumptionsConfirmed: !!r.assumptionsConfirmed, manualPrice: r.manualPrice as number | null, targetMargin: r.targetMargin as number | null, externalReferencePrice: r.externalReferencePrice as number | null, overrides: JSON.parse(r.overridesJson as string) as QuoteOverrides, notes: r.notes, status: r.status,
            calculation: { state: r.calculationState as string, error: r.calculationError, calculatedAt: r.calculatedAt, parametersRevision: r.parametersRevision, isStale: !!r.isStale, inputRevision: r.inputRevision as number, isCurrent: r.calculatedInputRevision === r.inputRevision },
            summary: { offeredPrice: r.offeredPrice, totalCost: r.totalCost, profit: r.profit, margin: r.margin, marginStatus: r.marginStatus, totalFloorArea: r.totalFloorArea, fte: r.fte, activeZoneCount: r.activeZoneCount, zoneCount: r.zoneCount },
            ...(detail ? { zones: readZones(db, r.id as number), result, snapshot } : {}), createdBy: r.createdBy, createdAt: r.createdAt, updatedAt: r.updatedAt };
    }
    return { get(id: number) { const row = db.prepare(`SELECT ${columns}, result_json, snapshot_json FROM quotes WHERE id = ?`).get(id) as Record<string, unknown> | undefined; if (!row)
            throw notFound(); return record(row, true); }, list({ where, orderBy, range }: ParsedListQuery) { const rows = db.prepare(`SELECT ${columns} FROM quotes WHERE ${where.sql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).all(...where.params, range.end - range.start + 1, range.start) as Record<string, unknown>[]; const total = db.prepare(`SELECT count(*) FROM quotes WHERE ${where.sql}`).pluck().get(...where.params) as number; return { records: rows.map((r) => record(r, false)), total }; } };
}
