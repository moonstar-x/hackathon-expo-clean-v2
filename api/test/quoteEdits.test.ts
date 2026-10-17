import fs from 'node:fs';
import pino from 'pino';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMeasurementsRepository } from '../src/modules/measurements/repository.ts';
import { metadataSchema } from '../src/modules/measurements/schemas.ts';
import { computeQuote, type EngineResult } from '../src/modules/quotes/engine/index.ts';
import { applyEdits, EDITABLE_FIELDS, type EditableField, type QuoteAdjustments } from '../src/modules/quotes/engine/edits.ts';
import { createQuoteWorker } from '../src/modules/quotes/worker.ts';
import { allSettings } from '../src/modules/quotes/settings.ts';
import { openDatabase } from '../src/db/connection.ts';
import { migrate } from '../src/db/migrate.ts';
import type { EngineInput } from '../src/modules/quotes/types.ts';
import { makeClient, type TestClient } from './helpers.ts';

/** The workbook's clinic, as the golden tests calculate it. */
function clinicInput(): EngineInput {
    const db = openDatabase(':memory:');
    migrate(db);
    const s = allSettings(db);
    db.close();
    s.parameters.flatRatePerM2 = 2.06;
    return { ...s, quote: { assumptionsConfirmed: true, manualPrice: null, externalReferencePrice: 3500 }, zones: JSON.parse(fs.readFileSync(new URL('./fixtures/quote-engine/clinic.json', import.meta.url), 'utf8')).zones };
}

const none: QuoteAdjustments = { manualPrice: null, targetMargin: null, overrides: {} };
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
/** Where each editable value is in a result. */
function valueOf(r: EngineResult, field: EditableField): number | boolean {
    for (const group of [r.pricing, r.costs, r.staffing, r.chemicals, r.parameters] as Record<string, number | boolean>[])
        if (field in group)
            return group[field];
    throw new Error(`No ${field} in the result`);
}
/** The totals still add up after an edit. */
function coherent(r: EngineResult) {
    expect(sum(r.zones.map((z) => z.totalCost))).toBeCloseTo(r.costs.totalCost, 6);
    expect(r.pricing.offeredPrice - r.costs.totalCost).toBeCloseTo(r.pricing.profit, 6);
    expect(sum(r.breakdown.map((b) => b.amount))).toBeCloseTo(r.pricing.offeredPrice, 6);
    expect(r.costs.directCost).toBeCloseTo(r.costs.laborCost + r.costs.chemicalsTheoretical + r.costs.chemicalsWaste + r.costs.eppAndHygiene + r.costs.utensils, 6);
    expect(r.staffing.fte).toBeCloseTo(sum(r.zones.map((z) => z.fte)), 6);
}

describe('labor rate, machines, areas and workers', () => {
    it('charges the wage-derived rate unless one is set', () => {
        const input = clinicInput();
        const base = computeQuote(input);
        expect(base.staffing).toMatchObject({ laborHourlyRate: base.labor.hourlyCost, machines: 0, isCustomWorkers: false });
        const manual = computeQuote({ ...input, parameters: { ...input.parameters, laborHourlyRate: 5 } });
        expect(manual.costs.laborCost).toBeCloseTo(base.costs.laborCost * 5 / base.labor.hourlyCost, 6);
        coherent(manual);
    });
    it('cleans a zone\'s floor faster with machines, and each cleaning faster with more of them, at the same price per hour', () => {
        const input = clinicInput();
        const base = computeQuote(input);
        const i = base.zones.findIndex((z) => z.active && z.fixtures.hours === 0 && z.presenceHours === 0);
        expect(i).toBeGreaterThanOrEqual(0);
        const withMachines = (machines: number) => computeQuote({ ...input, zones: input.zones.map((z, n) => n === i ? { ...z, machines } : z) });
        const one = withMachines(1), three = withMachines(3);
        const speedup = 2300 / 300;
        expect(one.zones[i].floorRateM2PerHour).toBeCloseTo(base.zones[i].floorRateM2PerHour * speedup, 9);
        expect(one.zones[i].dailyCleaningHours).toBeCloseTo(base.zones[i].dailyCleaningHours / speedup, 9);
        expect(one.zones[i].cleaningDuration).toBeCloseTo(base.zones[i].cleaningDuration / speedup, 9);
        expect(three.zones[i].cleaningDuration).toBeCloseTo(one.zones[i].cleaningDuration / 3, 9);
        expect(three.zones[i].dailyCleaningHours).toBeCloseTo(one.zones[i].dailyCleaningHours, 9);
        expect(three.staffing.machines).toBe(3);
        expect(one.staffing.laborHourlyRate).toBe(base.staffing.laborHourlyRate);
        expect(one.costs.laborCost).toBeLessThan(base.costs.laborCost);
        // Terminal cleaning and the other zones don't change.
        expect(one.zones[i].terminalHours).toBe(base.zones[i].terminalHours);
        one.zones.forEach((z, n) => { if (n !== i) expect(z).toEqual({ ...base.zones[n], allocatedIndirect: z.allocatedIndirect, totalCost: z.totalCost, targetPrice: z.targetPrice, costPerM2: z.costPerM2, pricePerM2: z.pricePerM2, flatRateMargin: z.flatRateMargin, flatRateStatus: z.flatRateStatus }); });
        // The general metric is a parameter.
        const faster = computeQuote({ ...input, parameters: { ...input.parameters, machineRateM2PerHour: 3000 }, zones: input.zones.map((z, n) => n === i ? { ...z, machines: 1 } : z) });
        expect(faster.zones[i].floorRateM2PerHour).toBeCloseTo(base.zones[i].floorRateM2PerHour * 10, 9);
        coherent(three);
    });
    it('warns when one cleaning takes longer than the time between cleanings', () => {
        const input = clinicInput();
        const i = input.zones.findIndex((z) => z.floorArea !== null);
        const big = { ...input, zones: input.zones.map((z, n) => n === i ? { ...z, floorArea: 50000, freeArea: null, cleanedArea: null, machines: 0 } : z) };
        expect(computeQuote(big).warnings.map((w) => w.code)).toContain('CLEANING_LONGER_THAN_INTERVAL');
        const machines = { ...big, zones: big.zones.map((z, n) => n === i ? { ...z, machines: 50 } : z) };
        expect(computeQuote(machines).warnings.map((w) => w.code)).not.toContain('CLEANING_LONGER_THAN_INTERVAL');
    });
    it('works the floor that is cleaned: the chosen area, the floor without objects, or the whole floor', () => {
        const input = clinicInput();
        const base = computeQuote(input);
        const i = base.zones.findIndex((z) => z.active && z.fixtures.hours === 0);
        const floor = input.zones[i].floorArea!;
        const at = (zone: object) => computeQuote({ ...input, zones: input.zones.map((z, n) => n === i ? { ...z, ...zone } : z) }).zones[i];
        expect(base.zones[i].cleanedArea).toBe(floor);
        expect(at({ freeArea: floor / 2 }).cleanedArea).toBe(floor / 2);
        expect(at({ freeArea: floor / 2, cleanedArea: floor / 4 }).cleanedArea).toBe(floor / 4);
        expect(at({ cleanedArea: floor * 2 }).cleanedArea).toBe(floor);
        const half = at({ cleanedArea: floor / 2 });
        expect(half.floorArea).toBe(floor);
        expect(half.dailyCleaningHours).toBeCloseTo(base.zones[i].dailyCleaningHours / 2, 9);
        expect(half.dailySolutionLiters).toBeCloseTo(base.zones[i].dailySolutionLiters / 2, 9);
        expect(half.utensils).toBeCloseTo(base.zones[i].utensils / 2, 9);
        expect(at({ cleanedArea: 0 })).toMatchObject({ active: true, dailyCleaningHours: 0, cleaningDuration: 0 });
    });
    it('spreads a set number of workers over the zones and works everything else out from them', () => {
        const input = clinicInput();
        const base = computeQuote(input);
        const r = computeQuote({ ...input, quote: { ...input.quote, overrides: { workers: 12 } } });
        expect(r.staffing).toMatchObject({ peopleToHire: 12, isCustomWorkers: true });
        expect(r.staffing.fte).toBeCloseTo(12, 9);
        expect(r.staffing.personHours).toBeCloseTo(12 * r.labor.fteHoursPerMonth, 6);
        expect(r.staffing.supervisors).toBeCloseTo(12 / input.parameters.operatorsPerSupervisor, 9);
        const factor = 12 / base.staffing.fte;
        expect(r.costs.laborCost).toBeCloseTo(base.costs.laborCost * factor, 6);
        expect(r.costs.supervision).toBeCloseTo(base.costs.supervision * factor, 6);
        r.zones.forEach((z, i) => expect(z.fte).toBeCloseTo(base.zones[i].fte * factor, 9));
        expect(r.costs.chemicalsTheoretical).toBeCloseTo(base.costs.chemicalsTheoretical, 9);
        expect(r.costs.totalCost).toBeGreaterThan(base.costs.totalCost);
        coherent(r);
    });
    it('scales the chemicals in the purchase plan with their cost', () => {
        const input = clinicInput();
        const base = computeQuote(input);
        const r = computeQuote({ ...input, quote: { ...input.quote, overrides: { chemicalsFactor: 1.5 } } });
        expect(r.costs.chemicalsTheoretical).toBeCloseTo(base.costs.chemicalsTheoretical * 1.5, 6);
        r.purchasePlan.rows.forEach((row, i) => { expect(row.pricePerUnit).toBeCloseTo(base.purchasePlan.rows[i].pricePerUnit * 1.5, 9); expect(row.total).toBe(base.purchasePlan.rows[i].total); });
    });
});

describe('editing the Resumen values', () => {
    let input: EngineInput;
    let base: EngineResult;
    beforeEach(() => { input = clinicInput(); base = computeQuote(input); });
    /** A different value for each field that the quote can reach. */
    const target = (field: EditableField): number => {
        const v = valueOf(base, field) as number;
        if (field === 'peopleToHire') return v + 3;
        if (field === 'targetMargin') return .4;
        if (field === 'margin') return v - .05;
        if (field === 'minimumPrice') return (base.pricing.breakEvenPrice + base.pricing.targetPrice) / 2;
        return v * 1.1;
    };
    it.each(EDITABLE_FIELDS)('lands %s on the value typed and recalculates the rest', (field) => {
        const value = target(field);
        const { result, errors } = applyEdits(input, none, [[field, value]]);
        expect(errors).toEqual({});
        // Within the 6 decimals a manual price is saved with, times 12 for the annual profit.
        expect(valueOf(result, field)).toBeCloseTo(value, 4);
        expect(valueOf(result, field)).not.toBeCloseTo(valueOf(base, field) as number, 3);
        coherent(result);
        // Clearing it goes back to what it was calculated as.
        const cleared = applyEdits(input, applyEdits(input, none, [[field, value]]).adjustments, [[field, null]]);
        expect(cleared.adjustments).toEqual(none);
        expect(valueOf(cleared.result, field)).toBeCloseTo(valueOf(base, field) as number, 6);
    });
    it('applies edits in order, so the latest one wins', () => {
        const { result } = applyEdits(input, none, [['laborCost', base.costs.laborCost * 2], ['directCost', base.costs.directCost]]);
        expect(result.costs.directCost).toBeCloseTo(base.costs.directCost, 6);
        const priced = applyEdits(input, none, [['offeredPrice', 9000], ['targetMargin', .5]]);
        expect(priced.adjustments).toMatchObject({ manualPrice: null, targetMargin: .5 });
        expect(applyEdits(input, none, [['targetMargin', .5], ['offeredPrice', 9000]]).adjustments).toMatchObject({ manualPrice: 9000, targetMargin: .5 });
    });
    it('keeps the other edits when one can not be applied', () => {
        const { adjustments, errors } = applyEdits(input, none, [['targetPrice', base.costs.totalCost / 2], ['minimumPrice', base.pricing.targetPrice * 2], ['laborCost', -1], ['vat', base.pricing.offeredPrice * 2], ['equipment', 99], ['supervisors', 0]]);
        expect(errors).toEqual({ targetPrice: 'belowCost', minimumPrice: 'aboveTarget', laborCost: 'invalid', vat: 'outOfRange', supervisors: 'invalid' });
        expect(adjustments).toEqual({ ...none, overrides: { equipmentMonthly: 99 } });
    });
    it('allows a loss', () => {
        const { result, errors } = applyEdits(input, none, [['profit', -100]]);
        expect(errors).toEqual({});
        expect(result.pricing).toMatchObject({ marginStatus: 'loss' });
        expect(result.pricing.profit).toBeCloseTo(-100, 6);
    });
});

describe('quote edits API', () => {
    let ctx: TestClient;
    const logger = pino({ level: 'silent' });
    const metadata = JSON.parse(fs.readFileSync(new URL('./fixtures/metadata.json', import.meta.url), 'utf8'));
    const geometry = fs.readFileSync(new URL('./fixtures/two-room-apartment.geometry.json', import.meta.url));
    const drain = () => { const w = createQuoteWorker({ ...ctx, logger }); while (w.processNextJob()) { /* drain */ } };
    const quoteUrl = () => { const m = createMeasurementsRepository(ctx.db, ctx.config).upload(metadataSchema.parse({ ...metadata, clientId: crypto.randomUUID() }), { geometry: [{ buffer: geometry }] }, { id: 1, email: 'admin@example.com' }).record; drain(); return `/api/quotes/${m.quote!.id}`; };
    beforeEach(async () => { ctx = await makeClient(); });
    afterEach(() => ctx.db.close());
    it('previews edits without saving them', async () => {
        const url = quoteUrl();
        const before = (await ctx.api.get(url)).body;
        const preview = await ctx.api.post(`${url}/preview`, { edits: { peopleToHire: 4, laborHourlyRate: 3, targetPrice: 1 } });
        expect(preview.status).toBe(200);
        expect(preview.body).toMatchObject({ manualPrice: null, targetMargin: null, overrides: { workers: 4, laborHourlyRate: 3 }, errors: { targetPrice: 'belowCost' } });
        expect(preview.body.result.staffing).toMatchObject({ peopleToHire: 4, laborHourlyRate: 3 });
        expect((await ctx.api.get(url)).body).toEqual(before);
        expect((await ctx.api.post(`${url}/preview`, { edits: { name: 1 } })).body.errors).toEqual({ 'edits.name': 'Is not an editable value' });
        expect((await ctx.api.post(`${url}/preview`, { edits: { fte: 'x' } })).status).toBe(422);
    });
    it('previews changed zones with the edits, without saving them', async () => {
        const url = quoteUrl();
        const before = (await ctx.api.get(url)).body;
        const [first, ...rest] = before.zones;
        const zones = [{ id: first.id, cleanedArea: first.floorArea / 2, machines: 1, daysPerMonth: 1 }, ...rest.map((z: { id: number }) => ({ id: z.id }))];
        const preview = await ctx.api.post(`${url}/preview`, { zones, edits: { targetMargin: .4, minimumMargin: .2, targetWasteRate: .1 } });
        expect(preview.status).toBe(200);
        expect(preview.body.errors).toEqual({});
        expect(preview.body.result.zones[0]).toMatchObject({ cleanedArea: first.floorArea / 2, machines: 1, daysPerMonth: 1 });
        expect(preview.body.result.pricing).toMatchObject({ targetMargin: .4, minimumMargin: .2 });
        expect(preview.body.result.parameters.targetWasteRate).toBe(.1);
        expect((await ctx.api.get(url)).body).toEqual(before);
        expect((await ctx.api.post(`${url}/preview`, { edits: { minimumMargin: .9 } })).body.errors).toEqual({ minimumMargin: 'aboveTarget' });
        expect((await ctx.api.post(`${url}/preview`, { zones: [{ id: 9999 }] })).status).toBe(422);
    });
    it('saves edits as the quote\'s own values and recalculates with them', async () => {
        const url = quoteUrl();
        const response = await ctx.api.put(url, { edits: { fte: 3, totalWithVat: 1000 } });
        expect(response.status).toBe(200);
        expect(response.body.overrides).toEqual({ workers: 3 });
        drain();
        const q = (await ctx.api.get(url)).body;
        expect(q.result.staffing.fte).toBeCloseTo(3, 9);
        expect(q.result.pricing.totalWithVat).toBeCloseTo(1000, 4);
        expect(q.result.parameters.vatRate).toBe(.15);
        expect((await ctx.api.put(url, { edits: { targetPrice: 1 } })).body.errors).toEqual({ 'edits.targetPrice': 'Must be at least the break-even price' });
        expect((await ctx.api.put(url, { edits: { fte: null, totalWithVat: null } })).body).toMatchObject({ overrides: {}, manualPrice: null });
    });
    it('derives each room\'s floor without objects, and saves its machines and the floor to clean', async () => {
        const url = quoteUrl();
        let q = (await ctx.api.get(url)).body;
        expect(q.zones.map((z: { freeArea: number }) => z.freeArea)).toEqual([17.15, 10.8]);
        expect(q.zones[0]).toMatchObject({ floorArea: 20, machines: 0, cleanedArea: null, sources: { freeArea: 'scan', machines: 'default' } });
        expect(q.result.zones.map((z: { cleanedArea: number }) => z.cleanedArea)).toEqual([17.15, 10.8]);
        const response = await ctx.api.put(url, { zones: [{ id: q.zones[0].id, machines: 2, cleanedArea: 12 }, { id: q.zones[1].id }] });
        expect(response.body.zones[0]).toMatchObject({ machines: 2, cleanedArea: 12, sources: { machines: 'manual', cleanedArea: 'manual' } });
        drain();
        q = (await ctx.api.get(url)).body;
        expect(q.result.zones[0]).toMatchObject({ cleanedArea: 12, machines: 2 });
        expect(q.result.staffing.machines).toBe(2);
        for (const [zone, field] of [[{ cleanedArea: 21 }, 'cleanedArea'], [{ freeArea: 25 }, 'freeArea'], [{ machines: 1.5 }, 'machines'], [{ machines: -1 }, 'machines']] as const) {
            const invalid = await ctx.api.put(url, { zones: [{ id: q.zones[0].id, ...zone }] });
            expect(invalid.status).toBe(422);
            expect(Object.keys(invalid.body.errors)).toEqual([`zones.0.${field}`]);
        }
    });
    it('accepts and validates overrides, and the labor rates in the parameters', async () => {
        const url = quoteUrl();
        expect((await ctx.api.put(url, { overrides: { workers: 2, vatRate: .12 } })).body.overrides).toEqual({ workers: 2, vatRate: .12 });
        drain();
        expect((await ctx.api.get(url)).body.result.pricing.vatRate).toBe(.12);
        for (const overrides of [{ vatRate: 2 }, { workers: 0 }, { useMachines: true }])
            expect((await ctx.api.put(url, { overrides })).status).toBe(422);
        const parameters = await ctx.api.put('/api/quote-parameters/1', { laborHourlyRate: 4.5, machineRateM2PerHour: 2000 });
        expect(parameters.body).toMatchObject({ laborHourlyRate: 4.5, manualRateM2PerHour: 300, machineRateM2PerHour: 2000 });
        for (const patch of [{ laborHourlyRate: -1 }, { manualRateM2PerHour: 0 }])
            expect((await ctx.api.put('/api/quote-parameters/1', patch)).status).toBe(422);
        await ctx.api.post(`${url}/recalculate`);
        drain();
        expect((await ctx.api.get(url)).body.result.staffing).toMatchObject({ laborHourlyRate: 4.5 });
    });
});
