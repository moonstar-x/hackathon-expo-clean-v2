import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import pino from 'pino';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { migrate, MIGRATIONS_DIR } from '../src/db/migrate.ts';
import { openDatabase } from '../src/db/connection.ts';
import { seed } from '../src/db/seed.ts';
import { createMeasurementsRepository } from '../src/modules/measurements/repository.ts';
import { metadataSchema } from '../src/modules/measurements/schemas.ts';
import { computeQuote } from '../src/modules/quotes/engine/index.ts';
import { enqueue, quotesRepository, readZones } from '../src/modules/quotes/repository.ts';
import { createQuoteWorker } from '../src/modules/quotes/worker.ts';
import { clientFor, makeClient, type TestClient } from './helpers.ts';
let ctx: TestClient;
const metadata = JSON.parse(fs.readFileSync(new URL('./fixtures/metadata.json', import.meta.url), 'utf8'));
const geometry = fs.readFileSync(new URL('./fixtures/two-room-apartment.geometry.json', import.meta.url));
const logger = pino({ level: 'silent' });
function measurement(extra: Record<string, unknown> = {}) { return createMeasurementsRepository(ctx.db, ctx.config).upload(metadataSchema.parse({ ...metadata, ...extra, clientId: crypto.randomUUID() }), { geometry: [{ buffer: geometry }] }, { id: 1, email: 'admin@example.com' }).record; }
function worker(compute = computeQuote) { return createQuoteWorker({ ...ctx, logger, compute }); }
function drain() { while (worker().processNextJob()) { /* drain */ } }
beforeEach(async () => { ctx = await makeClient(); });
afterEach(() => ctx.db.close());
describe('quoting settings', () => {
    it('loads workbook defaults and revision, validates merge updates and decimal limits', async () => { const p = (await ctx.api.get('/api/quote-parameters/1')).body; expect(p.monthlyWage).toBe(482); expect((await ctx.api.get('/api/quote-parameters/2')).status).toBe(404); const changed = await ctx.api.put('/api/quote-parameters/1', { monthlyWage: 500 }); expect(changed.body.revision).toBe(p.revision + 1); for (const patch of [{ monthlyWage: 0 }, { vatRate: .1234567 }, { monthsPerYear: 1.5 }])
        expect((await ctx.api.put('/api/quote-parameters/1', patch)).status).toBe(422); expect((await ctx.api.put('/api/quote-parameters/1', { minimumMargin: .8 })).body.errors.minimumMargin).toBe('Must be less than or equal to the target margin'); });
    it('uses list protocol, case insensitive names, conflicts and active reference rules', async () => { const list = await ctx.api.list('/api/quote-zone-types', { filter: { risk: 'critical' } }); expect(list.body).toHaveLength(3); expect(list.headers['content-range']).toBe('quote-zone-types 0-2/3'); expect((await ctx.api.delete('/api/quote-zone-types/1')).status).toBe(409); expect((await ctx.api.delete('/api/quote-products/1')).status).toBe(409); expect((await ctx.api.delete('/api/quote-schedules/1')).status).toBe(409); await ctx.api.put('/api/quote-zone-types/2', { active: false }); expect((await ctx.api.put('/api/quote-parameters/1', { defaultZoneTypeId: 2 })).body.errors.defaultZoneTypeId).toBe('Must be active'); expect((await ctx.api.put('/api/quote-parameters/1', { defaultScheduleId: 999 })).status).toBe(422); const unmapped = await ctx.api.list('/api/quote-location-types', { filter: { zoneTypeId: null } }); expect(unmapped.body.every((r: {
        zoneTypeId: null;
    }) => r.zoneTypeId === null)).toBe(true); });
    it.each([['L', 15.2, 4], ['mL', 15200, 4], ['gal', 4, 3], ['unit', 3.5, 3.5], ['box', 3, 3], ['pack', 2, 2], ['roll', 2, 2], ['pair', 2, 2]])('converts inventory %s stock', async (unit, quantity, expected) => { const c = (await ctx.api.post('/api/categories', { name: 'Categoría' })).body; const p = (await ctx.api.post('/api/products', { sku: 'TEST', name: 'Producto', categoryId: c.id, unit, initialQuantity: quantity, unitCost: 1, reorderLevel: 0 })).body; const res = await ctx.api.put('/api/quote-products/1', { inventoryProductId: p.id }); expect(res.status).toBe(200); expect(res.body.effectiveStock).toBe(expected); expect(res.body.pricePerContainer).toBeCloseTo(14.71 / 1.15, 10); expect(res.body.costPerLiterOfSolution).toBeCloseTo(14.71 / 1.15 / 3.8 * .01, 10); const incompatible = await ctx.api.put('/api/quote-products/5', { inventoryProductId: p.id }); if (!['unit', 'box', 'pack', 'roll', 'pair'].includes(unit))
        expect(incompatible.body.errors.inventoryProductId).toBe('Inventory unit is not compatible'); });
    it('protects linked inventory unit kinds from becoming incompatible',async () => {
        const category = (await ctx.api.post('/api/categories',{name:'Enlaces'})).body;
        const product = (await ctx.api.post('/api/products',{sku:'EMPTY',name:'Vacío',categoryId:category.id,unit:'L',initialQuantity:0,unitCost:1,reorderLevel:0})).body;
        expect((await ctx.api.put('/api/quote-products/1',{ inventoryProductId:product.id })).status).toBe(200);
        expect((await ctx.api.put(`/api/products/${product.id}`,{ unit:'kg' })).body.errors.unit).toBe('Inventory unit is not compatible');
        expect((await ctx.api.put(`/api/products/${product.id}`,{ unit:'mL' })).status).toBe(200);
    });
    it('keeps the exact 24/7 default while validating changed decimal inputs',async () => {
        const schedule = (await ctx.api.get('/api/quote-schedules/4')).body;
        const changed = await ctx.api.put('/api/quote-schedules/4',{ ...schedule,note:'Revisado' });
        expect(changed.status).toBe(200);
        expect(changed.body.nightHoursFraction).toBe(11/24);
        expect((await ctx.api.put('/api/quote-schedules/4',{ nightHoursFraction:.1234567 })).status).toBe(422);
    });
    it('normalizes mass inventory and settings revisions', async () => { const c = (await ctx.api.post('/api/categories', { name: 'Categoría' })).body; for (const [unit, quantity] of [['kg', .1], ['g', 100]] as const) {
        const inv = (await ctx.api.post('/api/products', { sku: unit, name: unit, categoryId: c.id, unit, initialQuantity: quantity, unitCost: 1, reorderLevel: 0 })).body;
        const p = (await ctx.api.put('/api/quote-products/5', { inventoryProductId: inv.id })).body;
        expect(p.effectiveStock).toBe(2);
    } const before = (await ctx.api.get('/api/quote-parameters/1')).body.revision; await ctx.api.put('/api/quote-products/1', { note: 'Origen' }); expect((await ctx.api.get('/api/quote-parameters/1')).body.revision).toBe(before + 1); });
});
describe('quote workflow', () => {
    it('trigger, derivation, snapshot replay, review confirmation and stale calculations', async () => { const m = measurement(); expect(m.quote).toMatchObject({ calculationState: 'pending' }); expect(ctx.db.prepare("SELECT kind, status FROM quote_jobs").get()).toEqual({ kind: 'generate', status: 'pending' }); drain(); const repo = quotesRepository(ctx.db); const q = repo.get(m.quote!.id); expect(q.result!.pricing.offeredPrice).toBeCloseTo(241.181359, 6); expect(q.zones!.map((z) => z.wallArea)).toEqual([39.48, 34.26]); expect(q.zones![0].sources).toMatchObject({ zoneTypeId: 'scan', floorArea: 'scan', traffic: 'default', scheduleId: 'default' }); expect(computeQuote({ ...q.snapshot!, quote: q, zones: q.zones! })).toEqual(q.result); await ctx.api.put(`/api/quotes/${q.id}`, { assumptionsConfirmed: true }); drain(); expect(repo.get(q.id).status).toBe('simulation'); await ctx.api.put('/api/quote-parameters/1', { targetMargin: .4 }); const stale = repo.get(q.id); expect(stale.calculation.isStale).toBe(true); expect(stale.result).toEqual(repo.get(q.id).result); await ctx.api.post(`/api/quotes/${q.id}/recalculate`); drain(); expect(repo.get(q.id).result!.pricing.offeredPrice).toBeCloseTo(261.279806, 6); });
    it('accepts new app metadata, records app sources and falls back for unknown schedules', async () => { const rooms = structuredClone(metadata.rooms); rooms[0].locationType = 'bathroom'; rooms[0].quoting = { traffic: 'high', fixedPosts: 1, fixtures: { toilets: 2, urinals: 1, sinks: 2 } }; const m = measurement({ rooms, quoting: { traffic: 'low', scheduleCode: 'unknown', daysPerMonth: 30 } }); drain(); const q = quotesRepository(ctx.db).get(m.quote!.id); expect(q.zones![0]).toMatchObject({ zoneTypeId: 5, traffic: 'high', daysPerMonth: 30, fixedPosts: 1, toilets: 2 }); expect(q.zones![0].sources).toMatchObject({ zoneTypeId: 'app', traffic: 'app', daysPerMonth: 'app', toilets: 'app' }); expect(q.result!.warnings.map((w) => w.code)).toContain('SCHEDULE_CODE_UNKNOWN'); expect(m.quoting).toMatchObject({ daysPerMonth: 30 }); expect((await ctx.api.get('/api/quoting/options')).body.defaults).toEqual({ traffic: 'medium', scheduleCode: 'diurno-8h', daysPerMonth: 22 }); });
    it('detects bathroom fixtures and survives corrupt geometry', () => { const m = measurement({ rooms: metadata.rooms.map((r: object) => ({ ...r, locationType: 'bathroom' })) }); const g = JSON.parse(geometry.toString()); g.rooms[0].objects = [{ category: 'toilet' }, { category: 'bathtub' }]; ctx.db.prepare("UPDATE measurement_files SET data = ? WHERE measurement_id = ?").run(Buffer.from(JSON.stringify(g)), m.id); drain(); let q = quotesRepository(ctx.db).get(m.quote!.id); expect(q.zones![0]).toMatchObject({ toilets: 1, urinals: 0, sinks: 0 }); expect(q.result!.warnings.map((w) => w.code)).toContain('FIXTURES_DETECTED'); ctx.db.prepare("UPDATE measurement_files SET data = ? WHERE measurement_id = ?").run(Buffer.from('{'), m.id); enqueue(ctx.db, q.id, 'regenerate'); drain(); q = quotesRepository(ctx.db).get(q.id); expect(q.calculation.state).toBe('done'); expect(q.result!.warnings.map((w) => w.code)).toContain('GEOMETRY_UNAVAILABLE'); });
    it('replaces zones, preserves manual edits, accepts missing inputs and rejects malformed fields', async () => { const m = measurement(); drain(); const url = `/api/quotes/${m.quote!.id}`; const q = (await ctx.api.get(url)).body; let response = await ctx.api.put(url, { zones: [{ id: q.zones[1].id, name: 'Manual', floorArea: null }, { name: 'Nueva', floorArea: 4 }] }); expect(response.status).toBe(200); expect(response.body.zones).toHaveLength(2); expect(response.body.zones[0]).toMatchObject({ position: 0, name: 'Manual', floorArea: null, sources: { floorArea: 'manual' } }); drain(); expect((await ctx.api.get(url)).body.result.causes.map((c: {
        code: string;
    }) => c.code)).toContain('ZONE_FLOOR_AREA_MISSING'); await ctx.api.post(`${url}/recalculate`); drain(); expect((await ctx.api.get(url)).body.zones[0].name).toBe('Manual'); for (const data of [{ floorArea: -1 }, { toilets: 1.5 }, { daysPerMonth: 32 }, { wallArea: .1234567 }]) {
        response = await ctx.api.put(url, { zones: [{ id: q.zones[1].id, ...data }] });
        expect(response.status).toBe(422);
        expect(Object.keys(response.body.errors)[0]).toMatch(/^zones\.0\./);
    } expect((await ctx.api.put(url, { zones: [{ id: 999 }] })).status).toBe(422); await ctx.api.post(`${url}/regenerate`); drain(); expect((await ctx.api.get(url)).body.zones.map((z: {
        name: string;
    }) => z.name)).toEqual(['Sala', 'Dormitorio']); });
    it('prices a quote with its own target margin and falls back to the parameters', async () => { const m = measurement(); drain(); const url = `/api/quotes/${m.quote!.id}`; const global = (await ctx.api.get(url)).body.result.pricing; expect(global).toMatchObject({ targetMargin: .35, isCustomMargin: false }); const response = await ctx.api.put(url, { targetMargin: .5 }); expect(response.status).toBe(200); drain(); let q = (await ctx.api.get(url)).body; expect(q.targetMargin).toBe(.5); expect(q.result.pricing).toMatchObject({ targetMargin: .5, isCustomMargin: true, marginStatus: 'healthy' }); expect(q.result.pricing.targetPrice).toBeCloseTo(q.result.costs.totalCost * 2, 6); expect(q.result.pricing.offeredPrice).toBe(q.result.pricing.targetPrice); expect(q.summary.margin).toBeCloseTo(.5, 9); expect(q.result.zones[0].targetPrice).toBeCloseTo(q.result.zones[0].totalCost * 2, 6); expect((await ctx.api.get('/api/quote-parameters/1')).body.targetMargin).toBe(.35); for (const targetMargin of [1, -.1, .12345678901]) expect((await ctx.api.put(url, { targetMargin })).status).toBe(422); expect((await ctx.api.put(url, { targetMargin: null })).status).toBe(200); drain(); q = (await ctx.api.get(url)).body; expect(q.result.pricing.offeredPrice).toBeCloseTo(global.offeredPrice, 9); expect(q.result.pricing.isCustomMargin).toBe(false); });
    it('supports sorting, list filters and deletion lifecycles', async () => { const m = measurement(); drain(); const id = m.quote!.id; for (const filter of [{ status: 'needsReview' }, { calculationState: 'done' }, { measurementId: m.id }, { isStale: false }, { q: metadata.name }, { createdAt_gte: '2020-01-01', createdAt_lte: '2099-01-01' }]) {
        const list = await ctx.api.list('/api/quotes', { filter, sort: ['offeredPrice', 'DESC'] });
        expect(list.status).toBe(200);
        expect(list.headers['content-range']).toBe('quotes 0-0/1');
        expect(list.body[0]).not.toHaveProperty('result');
        expect(list.body[0]).not.toHaveProperty('snapshot');
    } await ctx.api.delete(`/api/measurements/${m.id}`); expect((await ctx.api.get(`/api/quotes/${id}`)).body.measurementId).toBeNull(); expect((await ctx.api.post(`/api/quotes/${id}/regenerate`)).status).toBe(409); await ctx.api.delete(`/api/quotes/${id}`); expect(ctx.db.prepare('SELECT count(*) FROM quote_jobs').pluck().get()).toBe(0); const n = measurement(); const quote = n.quote!.id; expect((await ctx.api.post(`/api/measurements/${n.id}/quote`)).status).toBe(409); await ctx.api.delete(`/api/quotes/${quote}`); expect((await ctx.api.post(`/api/measurements/${n.id}/quote`)).status).toBe(201); });
    it('upgrades pending jobs, retries with backoff and reports terminal failure', () => { const m = measurement(); const id = m.quote!.id; enqueue(ctx.db, id, 'recalculate'); enqueue(ctx.db, id, 'regenerate'); expect(ctx.db.prepare("SELECT kind FROM quote_jobs WHERE status = 'pending'").pluck().all()).toEqual(['generate']); const failing = createQuoteWorker({ db: ctx.db, logger, config: { quoteWorkerPollMs: 1000, quoteJobMaxAttempts: 2 }, compute: () => { throw new Error('Injected failure'); } }); expect(failing.processNextJob()).toBe(true); expect(failing.processNextJob()).toBe(false); const job = ctx.db.prepare('SELECT attempts, status, run_after FROM quote_jobs').get() as {
        attempts: number;
        status: string;
        run_after: string;
    }; expect(job.attempts).toBe(1); expect(new Date(job.run_after).getTime()).toBeGreaterThan(Date.now() + 4000); ctx.db.prepare("UPDATE quote_jobs SET run_after = '2000'").run(); failing.processNextJob(); expect(quotesRepository(ctx.db).get(id).calculation).toMatchObject({ state: 'failed', error: 'Injected failure' }); expect(readZones(ctx.db, id)).toEqual([]); });
    it('recovers running work at startup', () => { measurement(); ctx.db.prepare("UPDATE quote_jobs SET status = 'running'").run(); const w = worker(); w.start(); w.stop(); expect(ctx.db.prepare('SELECT status FROM quote_jobs').pluck().get()).toBe('pending'); });
    it('stores waste control against snapshot prices, rejects bad periods and deletes with null', async () => { const m = measurement(); const url = `/api/quotes/${m.quote!.id}/waste-controls/2026-11`; expect((await ctx.api.get(url)).status).toBe(409); drain(); let r = await ctx.api.put(url, { rows: [{ productId: 1, actual: 1 }] }); expect(r.status).toBe(200); expect(r.body.rows.find((p: {
        productId: number;
    }) => p.productId === 1).actual).toBe(1); expect((await ctx.api.get(url)).body).toEqual(r.body); expect((await ctx.api.put(url, { rows: [{ productId: 2, actual: 0 }] })).status).toBe(422); expect((await ctx.api.get(url.replace('2026-11', '2026-13'))).status).toBe(400); r = await ctx.api.put(url, { rows: [{ productId: 1, actual: null }] }); expect(r.body.rows.find((p: {
        productId: number;
    }) => p.productId === 1).status).toBe('noData'); });
    it('A.4 waste values match through the API', async () => { const m = measurement(); drain(); const clinic = JSON.parse(fs.readFileSync(new URL('./fixtures/quote-engine/clinic.json', import.meta.url), 'utf8')); const q = (await ctx.api.get(`/api/quotes/${m.quote!.id}`)).body; await ctx.api.put(`/api/quotes/${q.id}`, { assumptionsConfirmed: true, externalReferencePrice: 3500, zones: clinic.zones }); drain(); const res = await ctx.api.put(`/api/quotes/${q.id}/waste-controls/2026-11`, { rows: [{ productId: 1, actual: 20.5 }, { productId: 3, actual: 4.4 }, { productId: 4, actual: 15 }] }); const expected = JSON.parse(fs.readFileSync(new URL('./fixtures/quote-engine/waste.json', import.meta.url), 'utf8')); expect(res.body.totalExcessCost).toBeCloseTo(expected.totalExcessCost, 6); expect(res.body.rows.map((r: {
        status: string;
    }) => r.status)).toEqual(['ok', 'watch', 'alert', 'noData']); });
    it('seed drains the sample quote and upload validation rolls back jobs', async () => { seed(ctx.db, { createdBy: 'admin@example.com' }); expect(quotesRepository(ctx.db).get(1).result!.pricing.offeredPrice).toBeCloseTo(241.181359, 6); const before = ctx.db.prepare('SELECT count(*) FROM quotes').pluck().get(); const api = clientFor(ctx.app, ctx.token); expect((await api.get('/api/quoting/options')).status).toBe(200); const res = await request(ctx.app).post('/api/measurements').set('Authorization', `Bearer ${ctx.token}`).field('metadata', JSON.stringify({ ...metadata, quoting: { daysPerMonth: 32 } })).attach('geometry', geometry, 'geometry.json').attach('floorPlan', Buffer.from('89504e470d0a1a0a', 'hex'), 'plan.png'); expect(res.status).toBe(422); expect(res.body.errors).toHaveProperty('quoting.daysPerMonth'); expect(ctx.db.prepare('SELECT count(*) FROM quotes').pluck().get()).toBe(before); });
    it('backfills preexisting measurements', () => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'quote-migrations-')); const db = openDatabase(':memory:'); try {
        for (const f of ['001_init.sql', '002_users.sql', '003_measurements.sql'])
            fs.copyFileSync(path.join(MIGRATIONS_DIR, f), path.join(dir, f));
        migrate(db, dir);
        db.prepare("INSERT INTO measurements (client_id,name,scanned_at,room_count,total_floor_area,is_area_approximate,is_merged,geometry_version,rooms_json,created_by,created_at,updated_at) VALUES ('legacy','Antes','2026-10-16',1,0,0,0,1,'[]','admin','2026','2026')").run();
        migrate(db);
        expect(db.prepare('SELECT name FROM quotes').pluck().get()).toBe('Antes');
        expect(db.prepare('SELECT status FROM quote_jobs').pluck().get()).toBe('pending');
    }
    finally {
        db.close();
        fs.rmSync(dir, { recursive: true });
    } });
});
