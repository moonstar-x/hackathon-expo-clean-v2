import { Router } from 'express';
import { z } from 'zod';
import type { AppDeps } from '../../app.ts';
import { badRequest, conflict, validationError } from '../../lib/errors.ts';
import { parseListQuery, sendList } from '../../lib/listQuery.ts';
import { decimal, foreignId, mergeForUpdate, nullableText, parseId, requiredText, requireObjectBody } from '../../lib/validation.ts';
import { enqueue, QUOTE_FIELDS, quoteListSpec, quotesRepository, readZones, replaceZones, ZONE_FIELDS } from './repository.ts';
import { assertReference, parameters, snake } from './settings.ts';
import type { ZoneInput } from './types.ts';
import { wasteControl } from './waste.ts';
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => { const d = new Date(`${v}T00:00:00Z`); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v; }, 'Must be a valid date').nullable();
const numeric = () => decimal(6).nullable();
const integer = () => decimal(6).refine(Number.isInteger, 'Must be an integer').nullable();
const quoteSchema = z.object({ name: requiredText(100), installationType: z.enum(['privateHospital', 'publicHospital', 'office', 'mall', 'other']).nullable(), city: nullableText(100), visitDate: date, measurementOrigin: z.enum(['siteVisit', 'plans', 'estimate']), assumptionsConfirmed: z.boolean(), manualPrice: numeric(), externalReferencePrice: decimal(6, { exclusiveMin: true }).nullable(), notes: nullableText(2000) });
const zoneSchema = z.object({ id: foreignId().optional(), name: requiredText(100), zoneTypeId: foreignId().nullable(), floorArea: numeric(), wallArea: numeric(), traffic: z.enum(['low', 'medium', 'high']).nullable(), scheduleId: foreignId().nullable(), daysPerMonth: numeric().refine((v) => v === null || v <= 31, 'Must be at most 31'), terminalsPerMonth: numeric(), fixedPosts: integer().transform((v) => v ?? 0), measurementSource: z.enum(['measured', 'plans', 'estimated']), observation: nullableText(1000), toilets: integer(), urinals: integer(), sinks: integer(), fixtureVisitsPerDay: numeric(), minutesPerFixture: numeric(), solutionLitersPerFixture: numeric(), paperSoapMonthly: numeric(), fixturesExcludeFloor: z.boolean() });
const blankZone: ZoneInput = { position: 0, origin: 'manual', roomId: null, name: '', zoneTypeId: null, floorArea: null, wallArea: null, isFloorApproximate: false, traffic: null, scheduleId: null, daysPerMonth: null, terminalsPerMonth: null, fixedPosts: 0, measurementSource: 'measured', observation: null, toilets: null, urinals: null, sinks: null, fixtureVisitsPerDay: null, minutesPerFixture: null, solutionLitersPerFixture: null, paperSoapMonthly: null, fixturesExcludeFloor: false, sources: {} };
export function quotesRouter({ db }: AppDeps, nudge: () => void = () => { }) {
    const router = Router();
    const repo = quotesRepository(db);
    router.get('/quoting/options', (_req, res) => { const p = parameters(db); const schedules = db.prepare('SELECT code, name, service_hours_per_day AS serviceHoursPerDay FROM quote_schedules WHERE active = 1 ORDER BY name COLLATE NOCASE').all(); const scheduleCode = p.defaultScheduleId ? (db.prepare('SELECT code FROM quote_schedules WHERE id = ?').pluck().get(p.defaultScheduleId) ?? null) : null; res.json({ revision: p.revision, traffic: ['low', 'medium', 'high'], schedules, defaults: { traffic: p.defaultTraffic, scheduleCode, daysPerMonth: p.defaultDaysPerMonth } }); });
    router.get('/quotes', (req, res) => { const parsed = parseListQuery(req.query, quoteListSpec); const { records, total } = repo.list(parsed); sendList(res, 'quotes', parsed.range, records, total); });
    router.get('/quotes/:id', (req, res) => res.json(repo.get(parseId(req.params.id))));
    router.put('/quotes/:id', (req, res) => {
        const id = parseId(req.params.id);
        const current = repo.get(id);
        const body = requireObjectBody(req.body);
        const data = quoteSchema.parse(mergeForUpdate(current, body, QUOTE_FIELDS));
        const oldZones = readZones(db, id);
        let zones: ZoneInput[] | undefined;
        if (Object.hasOwn(body, 'zones')) {
            const raw = z.array(z.record(z.string(), z.unknown())).max(100).parse(body.zones);
            const seen = new Set<number>();
            const merged = raw.map((item, index) => { const old = item.id === undefined ? blankZone : oldZones.find((z) => z.id === item.id); if (!old || (item.id !== undefined && seen.has(item.id as number)))
                throw validationError({ [`zones.${index}.id`]: 'Zone does not belong to this quote' }); if (item.id !== undefined)
                seen.add(item.id as number); return { ...mergeForUpdate(old, item, ZONE_FIELDS), ...(item.id !== undefined ? { id: item.id } : {}) }; });
            const parsed = z.object({ zones: z.array(zoneSchema).max(100) }).parse({ zones: merged }).zones;
            zones = parsed.map((z, index) => {
                const old = z.id ? oldZones.find((o) => o.id === z.id)! : blankZone;
                assertReference(db, 'quote_zone_types', z.zoneTypeId, `zones.${index}.zoneTypeId`, old.zoneTypeId);
                assertReference(db, 'quote_schedules', z.scheduleId, `zones.${index}.scheduleId`, old.scheduleId);
                const sources = { ...old.sources };
                for (const field of ZONE_FIELDS)
                    if (z[field] !== old[field])
                        sources[field] = 'manual';
                return { ...old, ...z, position: index, sources };
            });
        }
        db.transaction(() => { const fields = QUOTE_FIELDS; db.prepare(`UPDATE quotes SET ${fields.map((f) => `${snake(f)} = ?`).join(', ')}, updated_at = ?, input_revision = input_revision + 1 WHERE id = ?`).run(...fields.map((f) => typeof data[f] === 'boolean' ? +data[f] : data[f]), new Date().toISOString(), id); if (zones)
            replaceZones(db, id, zones); enqueue(db, id, 'recalculate', req.user!.email); })();
        res.json(repo.get(id));
        nudge();
    });
    router.delete('/quotes/:id', (req, res) => { const id = parseId(req.params.id); const current = repo.get(id); db.prepare('DELETE FROM quotes WHERE id = ?').run(id); res.json(current); });
    for (const action of ['recalculate', 'regenerate'] as const)
        router.post(`/quotes/:id/${action}`, (req, res) => { const id = parseId(req.params.id); const current = repo.get(id); if (action === 'regenerate' && !current.measurementId)
            throw conflict('The measurement no longer exists'); db.transaction(() => { enqueue(db, id, action, req.user!.email); })(); res.status(202).json(repo.get(id)); nudge(); });
    router.post('/measurements/:id/quote', (req, res) => {
        const id = parseId(req.params.id);
        const measurement = db.prepare('SELECT id, name, scanned_at FROM measurements WHERE id = ?').get(id) as {
            id: number;
            name: string;
            scanned_at: string;
        } | undefined;
        if (!measurement) {
            res.status(404).json({ code: 'NOT_FOUND', message: 'Not found' });
            return;
        }
        const quoteId = db.transaction(() => { if (db.prepare('SELECT id FROM quotes WHERE measurement_id = ?').get(id))
            throw conflict('A quote already exists'); const now = new Date().toISOString(); const q = Number(db.prepare("INSERT INTO quotes (measurement_id, name, visit_date, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(id, measurement.name, measurement.scanned_at.slice(0, 10), req.user!.email, now, now).lastInsertRowid); enqueue(db, q, 'generate', req.user!.email); return q; })();
        res.status(201).json(repo.get(quoteId));
        nudge();
    });
    const period = (value: string) => { if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value))
        throw badRequest('Invalid period; expected YYYY-MM'); return value; };
    function readWaste(id: number, month: string) { const q = repo.get(id); if (!q.result || !q.snapshot)
        throw conflict('The quote has no results yet'); const actuals = Object.fromEntries((db.prepare('SELECT product_id, actual_consumption FROM quote_waste_controls WHERE quote_id = ? AND period = ?').all(id, month) as {
        product_id: number;
        actual_consumption: number;
    }[]).map((r) => [r.product_id, r.actual_consumption])); return wasteControl(q.result.purchasePlan.rows, q.snapshot.parameters.targetWasteRate, actuals, month); }
    router.get('/quotes/:id/waste-controls/:period', (req, res) => res.json(readWaste(parseId(req.params.id), period(req.params.period))));
    router.put('/quotes/:id/waste-controls/:period', (req, res) => {
        const id = parseId(req.params.id), month = period(req.params.period);
        const existing = readWaste(id, month);
        const data = z.object({ rows: z.array(z.object({ productId: foreignId(), actual: numeric() })).max(100) }).parse(requireObjectBody(req.body));
        data.rows.forEach((r, i) => { if (!existing.rows.some((p) => p.productId === r.productId))
            throw validationError({ [`rows.${i}.productId`]: 'Product is not in the purchase plan' }); });
        db.transaction(() => { for (const r of data.rows) {
            if (r.actual === null)
                db.prepare('DELETE FROM quote_waste_controls WHERE quote_id = ? AND period = ? AND product_id = ?').run(id, month, r.productId);
            else
                db.prepare('INSERT INTO quote_waste_controls (quote_id, period, product_id, actual_consumption, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (quote_id, period, product_id) DO UPDATE SET actual_consumption = excluded.actual_consumption, updated_by = excluded.updated_by, updated_at = excluded.updated_at').run(id, month, r.productId, r.actual, req.user!.email, new Date().toISOString());
        } })();
        res.json(readWaste(id, month));
    });
    return router;
}
