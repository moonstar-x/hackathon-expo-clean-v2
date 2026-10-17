import type Database from 'better-sqlite3';
import { Router } from 'express';
import { z } from 'zod';
import type { AppDeps } from '../../app.ts';
import { createCrudRouter } from '../../lib/crudRouter.ts';
import { conflict, notFound, validationError } from '../../lib/errors.ts';
import { boolFilter, enumFilter, intFilter, type ListSpec, type ParsedListQuery, parseListQuery, sendList } from '../../lib/listQuery.ts';
import { decimal, foreignId, mergeForUpdate, nullableHttpUrl, nullableText, parseId, requiredText, requireObjectBody } from '../../lib/validation.ts';
import { PARAMETER_FIELDS, parameterSchema, type QuoteParameterValues } from './parameters.ts';
import type { ProductValues, ScheduleValues, ZoneTypeValues } from './types.ts';
export const snake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const camel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
type Row = Record<string, string | number | null>;
const booleanFields = ['active', 'publishedPriceIncludesVat', 'includesHolidays', 'wallsInTerminal', 'countsFixtures', 'applyReserveFund', 'fixtureDefaultsExcludeFloor'];
export function mapRow(row: Row): Record<string, unknown> {
    return Object.fromEntries(Object.entries(row).map(([k, v]) => { const key = camel(k); return [key, booleanFields.includes(key) ? !!v : v]; }));
}
export function parameters(db: Database.Database) {
    const cols = PARAMETER_FIELDS.filter((k) => k !== 'notes').map(snake);
    const row = db.prepare<[
    ], Row>(`SELECT id, revision, ${cols.join(', ')}, notes_json, updated_at FROM quote_parameters WHERE id = 1`).get()!;
    const p = mapRow(row);
    delete p.notesJson;
    return { ...p, notes: JSON.parse(row.notes_json as string) as Record<string, string> } as QuoteParameterValues & {
        id: number;
        revision: number;
        notes: Record<string, string>;
        updatedAt: string;
    };
}
const slug = requiredText(50).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Must be a lowercase slug');
const n = () => decimal(6);
const positive = () => decimal(6, { exclusiveMin: true });
const fraction = () => n().refine((v) => v <= 1, 'Must be at most 1');
export const catalogSchemas = {
    'quote-products': z.object({ name: requiredText(100), use: nullableText(100), presentationSize: positive(), unit: z.enum(['L', 'kg']), publishedPrice: n(), publishedPriceIncludesVat: z.boolean(), dosePerLiter: n(), stockContainers: n().nullish().transform((v) => v ?? null), inventoryProductId: foreignId().nullish().transform((v) => v ?? null), presentationStatus: nullableText(100), sourceUrl: nullableHttpUrl(1000), note: nullableText(1000), active: z.boolean().default(true) }),
    'quote-schedules': z.object({ code: slug, name: requiredText(100), serviceHoursPerDay: positive().refine((v) => v <= 24, 'Must be at most 24'), nightHoursFraction: fraction(), includesHolidays: z.boolean(), note: nullableText(1000), active: z.boolean().default(true) }),
    'quote-zone-types': z.object({ code: slug, name: requiredText(100), risk: z.enum(['critical', 'semicritical', 'noncritical']), dailyRateM2PerHour: positive(), terminalRateM2PerHour: positive(), hoursBetweenCleanings: z.object({ low: positive(), medium: positive(), high: positive() }), wallsInTerminal: z.boolean(), suggestedTerminalsPerMonth: n(), cleaningProductId: foreignId(), dailyDisinfectantId: foreignId(), terminalDisinfectantId: foreignId(), solutionLitersPerM2: n(), countsFixtures: z.boolean(), note: nullableText(1000), active: z.boolean().default(true) }),
};
export type CatalogName = keyof typeof catalogSchemas;
export function assertReference(db: Database.Database, table: string, id: unknown, field: string, previous?: unknown) {
    if (id == null)
        return;
    const row = db.prepare(`SELECT id, active FROM ${table} WHERE id = ?`).get(id) as {
        id: number;
        active?: number;
    } | undefined;
    if (!row)
        throw validationError({ [field]: 'Does not exist' });
    if (!row.active && id !== previous)
        throw validationError({ [field]: 'Must be active' });
}
export function effectiveStock(p: Pick<ProductValues, 'unit' | 'presentationSize' | 'stockContainers' | 'inventoryProductId'>, db: Database.Database) {
    if (p.inventoryProductId == null)
        return p.stockContainers ?? 0;
    const row = db.prepare('SELECT quantity, unit FROM products WHERE id = ?').get(p.inventoryProductId) as {
        quantity: number;
        unit: string;
    } | undefined;
    if (!row)
        throw validationError({ inventoryProductId: 'Does not exist' });
    if (['unit', 'box', 'pack', 'roll', 'pair'].includes(row.unit))
        return row.quantity;
    const conversion: Record<string, [
        string,
        number
    ]> = { L: ['L', 1], mL: ['L', .001], gal: ['L', 3.785411784], kg: ['kg', 1], g: ['kg', .001] };
    const unit = conversion[row.unit];
    if (!unit || unit[0] !== p.unit)
        throw validationError({ inventoryProductId: 'Inventory unit is not compatible' });
    return Math.floor(row.quantity * unit[1] / p.presentationSize + 1e-9);
}
export function productComputed(p: ProductValues, db: Database.Database) {
    const pricePerContainer = p.publishedPrice / (1 + (p.publishedPriceIncludesVat ? parameters(db).purchaseVatRate : 0));
    const pricePerUnit = pricePerContainer / p.presentationSize;
    return { ...p, pricePerContainer, pricePerUnit, doseUnit: p.unit === 'L' ? 'ml' : 'g', costPerLiterOfSolution: pricePerUnit * p.dosePerLiter / 1000, effectiveStock: effectiveStock(p, db) };
}
export function catalogRepository(db: Database.Database, resource: CatalogName) {
    const schema = catalogSchemas[resource];
    const table = resource.replaceAll('-', '_');
    const fields = Object.keys(schema.shape);
    const sqlFields = fields.flatMap((k) => k === 'hoursBetweenCleanings' ? ['hours_between_low', 'hours_between_medium', 'hours_between_high'] : [snake(k)]);
    const columns = ['id', ...sqlFields, 'created_at', 'updated_at'].join(', ');
    const spec: ListSpec = { resource, table, sortable: { id: 'id', name: 'name', ...(resource !== 'quote-products' ? { code: 'code' } : {}), ...(resource === 'quote-zone-types' ? { risk: 'risk' } : {}), ...(resource === 'quote-schedules' ? { serviceHoursPerDay: 'service_hours_per_day' } : {}) }, textSorts: ['name', 'code'], defaultSort: resource === 'quote-schedules' ? ['serviceHoursPerDay', 'ASC'] : ['name', 'ASC'], filters: { active: boolFilter('active'), ...(resource === 'quote-zone-types' ? { risk: enumFilter('risk', ['critical', 'semicritical', 'noncritical']) } : {}) }, search: ['name', ...(resource === 'quote-products' ? ['use', 'note'] : ['code', 'note'])] };
    function record(row: Row | undefined) {
        if (!row)
            return null;
        const r = mapRow(row);
        if (resource === 'quote-zone-types') {
            r.hoursBetweenCleanings = { low: r.hoursBetweenLow, medium: r.hoursBetweenMedium, high: r.hoursBetweenHigh };
            delete r.hoursBetweenLow;
            delete r.hoursBetweenMedium;
            delete r.hoursBetweenHigh;
        }
        return (resource === 'quote-products' ? productComputed(r as unknown as ProductValues, db) : r) as Record<string, unknown> & {
            id: number;
        };
    }
    const findById = (id: number) => record(db.prepare<[
        number
    ], Row>(`SELECT ${columns} FROM ${table} WHERE id = ?`).get(id));
    function save(data: Record<string, unknown>, id?: number, current: Record<string, unknown> = {}) {
        for (const [key, target] of Object.entries({ cleaningProductId: 'quote_products', dailyDisinfectantId: 'quote_products', terminalDisinfectantId: 'quote_products', inventoryProductId: 'products' }))
            if (key in data)
                assertReference(db, target, data[key], key, current[key]);
        if (resource === 'quote-products')
            effectiveStock(data as unknown as ProductValues, db);
        const flat = { ...data };
        if (data.hoursBetweenCleanings) {
            const h = data.hoursBetweenCleanings as Record<string, number>;
            delete flat.hoursBetweenCleanings;
            for (const k of ['low', 'medium', 'high'])
                flat[`hoursBetween${k[0].toUpperCase()}${k.slice(1)}`] = h[k];
        }
        const values = sqlFields.map((col) => { const v = flat[camel(col)]; return typeof v === 'boolean' ? +v : v ?? null; });
        const now = new Date().toISOString();
        try {
            if (id)
                db.prepare(`UPDATE ${table} SET ${sqlFields.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`).run(...values, now, id);
            else
                id = Number(db.prepare(`INSERT INTO ${table} (${sqlFields.join(', ')}, created_at, updated_at) VALUES (${values.map(() => '?').join(', ')}, ?, ?)`).run(...values, now, now).lastInsertRowid);
        }
        catch (err) {
            if ((err as {
                code?: string;
            }).code === 'SQLITE_CONSTRAINT_UNIQUE')
                throw conflict('A quoting record with this name or code already exists');
            throw err;
        }
        return findById(id)!;
    }
    return { spec, fields, findById, list({ where, orderBy, range }: ParsedListQuery) { const rows = db.prepare<unknown[], Row>(`SELECT ${columns} FROM ${table} WHERE ${where.sql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).all(...where.params, range.end - range.start + 1, range.start); const total = db.prepare(`SELECT COUNT(*) FROM ${table} WHERE ${where.sql}`).pluck().get(...where.params) as number; return { records: rows.map((r) => record(r)!), total }; }, create: (data: Record<string, unknown>) => save(data), update: (id: number, data: Record<string, unknown>, current: Record<string, unknown>) => save(data, id, current), remove(id: number) { try {
            db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
        }
        catch (err) {
            if (['SQLITE_CONSTRAINT_FOREIGNKEY', 'SQLITE_CONSTRAINT_TRIGGER'].includes((err as {
                code?: string;
            }).code ?? '') && (err as Error).message.includes('FOREIGN KEY'))
                throw conflict(resource === 'quote-zone-types' ? 'Zone type is in use' : resource === 'quote-schedules' ? 'Schedule is in use' : 'Quoting product is in use');
            throw err;
        } } };
}
export function settingsRouter({ db }: AppDeps) {
    const router = Router();
    router.get('/quote-parameters/:id', (req, res) => { if (req.params.id !== '1')
        throw notFound(); res.json(parameters(db)); });
    router.put('/quote-parameters/:id', (req, res) => {
        if (req.params.id !== '1')
            throw notFound();
        const old = parameters(db);
        const data = parameterSchema.parse(mergeForUpdate(old, requireObjectBody(req.body), PARAMETER_FIELDS));
        assertReference(db, 'quote_schedules', data.defaultScheduleId, 'defaultScheduleId', old.defaultScheduleId);
        assertReference(db, 'quote_zone_types', data.defaultZoneTypeId, 'defaultZoneTypeId', old.defaultZoneTypeId);
        const fields = PARAMETER_FIELDS.filter((k) => k !== 'notes');
        db.prepare(`UPDATE quote_parameters SET ${fields.map((k) => `${snake(k)} = ?`).join(', ')}, notes_json = ?, updated_by = ?, updated_at = ?, revision = revision + 1 WHERE id = 1`).run(...fields.map((k) => { const v = data[k as keyof typeof data]; return typeof v === 'boolean' ? +v : v; }), JSON.stringify(data.notes), req.user!.email, new Date().toISOString());
        res.json(parameters(db));
    });
    for (const resource of Object.keys(catalogSchemas) as CatalogName[]) {
        const repo = catalogRepository(db, resource);
        if (resource === 'quote-schedules') {
            // The workbook's 24/7 default is exactly 11/24. Keep its precision on
            // unrelated edits, while enforcing six decimals on changed inputs.
            router.put('/quote-schedules/:id', (req,res) => {
                const id = parseId(req.params.id);
                const current = repo.findById(id);
                if (!current) throw notFound();
                const body = requireObjectBody(req.body);
                const changed = Object.fromEntries(Object.entries(body).filter(([key,value]) => repo.fields.includes(key) && value !== current[key]));
                catalogSchemas['quote-schedules'].partial().parse(changed);
                const schema = catalogSchemas['quote-schedules'].extend({ nightHoursFraction:z.number().min(0).max(1) });
                const data = schema.parse(mergeForUpdate(current,body,repo.fields));
                res.json(repo.update(id,data,current));
            });
        }
        router.use(`/${resource}`, createCrudRouter({ listSpec: repo.spec, repository: repo, createSchema: catalogSchemas[resource], updateSchema: catalogSchemas[resource], writableFields: repo.fields, label: resource }));
    }
    const spec: ListSpec = { resource: 'quote-location-types', table: 'quote_location_types', sortable: { id: 'id', label: 'label', locationType: 'location_type' }, defaultSort: ['label', 'ASC'], textSorts: ['label', 'locationType'], search: ['label', 'location_type'], filters: { zoneTypeId: intFilter('zone_type_id') } };
    const cols = 'id, location_type, label, zone_type_id, updated_at';
    const load = (id: number) => { const row = db.prepare<[
        number
    ], Row>(`SELECT ${cols} FROM quote_location_types WHERE id = ?`).get(id); if (!row)
        throw notFound(); return mapRow(row); };
    router.get('/quote-location-types', (req, res) => {
        const parsed = parseListQuery(req.query, spec);
        // A null equivalence filter means unmapped (other resources ignore null filters).
        const filter = req.query.filter ? JSON.parse(req.query.filter as string) as Record<string, unknown> : {};
        if (Object.hasOwn(filter, 'zoneTypeId') && filter.zoneTypeId === null)
            parsed.where.sql += ' AND zone_type_id IS NULL';
        const rows = db.prepare<unknown[], Row>(`SELECT ${cols} FROM quote_location_types WHERE ${parsed.where.sql} ORDER BY ${parsed.orderBy} LIMIT ? OFFSET ?`).all(...parsed.where.params, parsed.range.end - parsed.range.start + 1, parsed.range.start);
        const total = db.prepare(`SELECT COUNT(*) FROM quote_location_types WHERE ${parsed.where.sql}`).pluck().get(...parsed.where.params) as number;
        sendList(res, spec.resource, parsed.range, rows.map(mapRow), total);
    });
    router.get('/quote-location-types/:id', (req, res) => res.json(load(parseId(req.params.id))));
    router.put('/quote-location-types/:id', (req, res) => { const id = parseId(req.params.id); const old = load(id); const data = z.object({ zoneTypeId: foreignId().nullable() }).parse(mergeForUpdate(old, requireObjectBody(req.body), ['zoneTypeId'])); assertReference(db, 'quote_zone_types', data.zoneTypeId, 'zoneTypeId', old.zoneTypeId); db.prepare('UPDATE quote_location_types SET zone_type_id = ?, updated_at = ? WHERE id = ?').run(data.zoneTypeId, new Date().toISOString(), id); res.json(load(id)); });
    return router;
}
export function allSettings(db: Database.Database) {
    const p = parameters(db);
    const { id: _id, revision, notes: _notes, updatedAt: _time, ...values } = p;
    const get = <T>(resource: CatalogName) => { const repo = catalogRepository(db, resource); return Object.fromEntries((db.prepare(`SELECT id FROM ${resource.replaceAll('-', '_')}`).pluck().all() as number[]).map((id) => [id, repo.findById(id)])) as Record<number, T>; };
    return { parametersRevision: revision, parameters: values, zoneTypes: get<ZoneTypeValues>('quote-zone-types'), schedules: get<ScheduleValues>('quote-schedules'), products: get<ProductValues>('quote-products') };
}
