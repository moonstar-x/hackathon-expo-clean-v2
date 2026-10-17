import fs from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../src/db/connection.ts';
import { migrate } from '../src/db/migrate.ts';
import { allSettings } from '../src/modules/quotes/settings.ts';
import { ceilX, computeQuote, marginStatus } from '../src/modules/quotes/engine/index.ts';
import type { EngineInput, ZoneInput } from '../src/modules/quotes/types.ts';
const fixture = (name: string) => JSON.parse(fs.readFileSync(new URL(`./fixtures/quote-engine/${name}.json`, import.meta.url), 'utf8'));
export function assertGolden(actual: unknown, expected: unknown) {
    if (typeof expected === 'number') {
        expect(typeof actual).toBe('number');
        expect(Math.abs((actual as number) - expected)).toBeLessThanOrEqual(1e-6 * Math.max(1, Math.abs(expected)));
    }
    else if (expected !== null && typeof expected === 'object')
        for (const [key, value] of Object.entries(expected))
            assertGolden((actual as Record<string, unknown>)[key], value);
    else
        expect(actual).toBe(expected);
}
const databases: ReturnType<typeof openDatabase>[] = [];
afterEach(() => { for (const db of databases.splice(0))
    db.close(); });
export function clinicInput(): EngineInput {
    const db = openDatabase(':memory:');
    databases.push(db);
    migrate(db);
    const s = allSettings(db);
    s.parameters.flatRatePerM2 = 2.06;
    s.products[1].effectiveStock = 2;
    return { ...s, quote: { assumptionsConfirmed: true, manualPrice: null, externalReferencePrice: 3500 }, zones: fixture('clinic').zones };
}
function invariants(input: EngineInput) {
    const r = computeQuote(input);
    const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
    if (r.zones.some((z) => z.active))
        expect(sum(r.zones.map((z) => z.totalCost))).toBeCloseTo(r.costs.totalCost, 8);
    expect(r.pricing.offeredPrice - r.costs.totalCost - r.pricing.profit).toBeCloseTo(0, 8);
    if (input.quote.manualPrice === null)
        expect(r.pricing.margin).toBeCloseTo(input.parameters.targetMargin, 8);
    expect(r.pricing.totalWithVat - r.pricing.offeredPrice - r.pricing.vat).toBeCloseTo(0, 8);
    expect(sum(r.purchasePlan.rows.map((z) => z.theoretical))).toBeCloseTo(sum(r.zones.map((z) => z.cleaningConcentrate + z.dailyDisinfectantConcentrate + z.terminalDisinfectantConcentrate)), 8);
    expect(sum(r.breakdown.map((z) => z.amount))).toBeCloseTo(r.pricing.offeredPrice, 8);
    expect(r.pricing.minimumPrice).toBeLessThanOrEqual(r.pricing.targetPrice);
    expect(r.zones.filter((z) => z.active).every((z) => z.cleaningsPerDay >= 1)).toBe(true);
    const check = (v: unknown) => { if (typeof v === 'number')
        expect(Number.isFinite(v)).toBe(true);
    else if (v && typeof v === 'object')
        Object.values(v).forEach(check); };
    check(r);
    expect(computeQuote(input)).toEqual(r);
}
describe('workbook golden cases', () => {
    it('A.1 matches every listed zone and aggregate value', () => { const input = clinicInput(); const r = computeQuote(input); const expected = fixture('clinic').expected; expected.zones.forEach((z: Record<string, unknown>, i: number) => { const technical = z.technical; delete z.technical; assertGolden(r.technicalOffer[i], technical); }); assertGolden(r, expected); expect(r.causes).toEqual([]); expect(r.warnings.map((w) => w.code)).toEqual(['FLAT_RATE_ZONES_AT_LOSS']); invariants(input); });
    it('A.1b manual price leaves costs unchanged', () => { const input = clinicInput(); const original = computeQuote(input); input.quote.manualPrice = 3000; const r = computeQuote(input); assertGolden(r, fixture('manual')); expect(r.costs).toEqual(original.costs); expect(r.warnings.map((w) => w.code)).toContain('OFFERED_MARGIN_BELOW_MINIMUM'); invariants(input); });
    it('A.2 apartment matches every listed value', () => { const input = clinicInput(); input.parameters.flatRatePerM2 = null; input.products[1].effectiveStock = 0; input.quote = { assumptionsConfirmed: false, manualPrice: null, externalReferencePrice: null }; input.zones = [20, 14].map((area, i) => ({ ...input.zones[0], name: ['Sala', 'Dormitorio'][i], position: i, zoneTypeId: 1, floorArea: area, wallArea: [39.48, 34.26][i], scheduleId: 1, daysPerMonth: 22, fixedPosts: 0 })); const r = computeQuote(input); assertGolden(r, fixture('apartment')); expect(r.causes.map((c) => c.code)).toEqual(['ASSUMPTIONS_NOT_CONFIRMED']); invariants(input); input.quote.assumptionsConfirmed = true; expect(computeQuote(input).status).toBe('simulation'); });
    it('A.3 empty quote retains fixed costs', () => { const input = clinicInput(); input.quote.assumptionsConfirmed = false; input.zones = []; const r = computeQuote(input); assertGolden(r, fixture('empty')); expect(r.causes.map((c) => c.code)).toEqual(['ASSUMPTIONS_NOT_CONFIRMED', 'NO_ACTIVE_ZONES']); invariants(input); });
    it('ceilX and margin boundaries follow Excel', () => { expect(ceilX(7.6 / 3.8)).toBe(2); expect(ceilX(2.0000001)).toBe(3); const p = clinicInput().parameters; expect(marginStatus(.35 - .000009, p)).toBe('healthy'); expect(marginStatus(.35 - .000011, p)).toBe('acceptable'); expect(marginStatus(.3 - .000009, p)).toBe('acceptable'); expect(marginStatus(.3 - .000011, p)).toBe('belowMinimum'); });
    it.each([['zoneTypeId', null, 'ZONE_TYPE_MISSING'], ['floorArea', null, 'ZONE_FLOOR_AREA_MISSING'], ['traffic', null, 'ZONE_TRAFFIC_MISSING'], ['scheduleId', null, 'ZONE_SCHEDULE_MISSING'], ['daysPerMonth', 0, 'ZONE_DAYS_INVALID'], ['toilets', null, 'FIXTURE_COUNTS_MISSING'], ['paperSoapMonthly', null, 'FIXTURE_PAPER_SOAP_MISSING'], ['fixtureVisitsPerDay', null, 'FIXTURE_ASSUMPTIONS_MISSING'], ['fixturesExcludeFloor', false, 'FIXTURE_DOUBLE_COUNT_UNCONFIRMED']] as const)('reports %s cause', (field, value, code) => { const input = clinicInput(); input.zones = [input.zones[1]]; Object.assign(input.zones[0], { [field]: value }); const r = computeQuote(input); expect(r.causes.map((c) => c.code)).toContain(code); expect(r.status).toBe('needsReview'); if (code.startsWith('ZONE_')) {
        expect(r.zones[0].active).toBe(false);
        expect(r.zones[0].totalCost).toBe(0);
    }
    else
        expect(r.zones[0].active).toBe(true); });
    it.each([['targetMargin', 1, 'TARGET_MARGIN_INVALID'], ['minimumMargin', .5, 'MINIMUM_MARGIN_INVALID'], ['productiveFraction', 0, 'PRODUCTIVE_FRACTION_INVALID'], ['operatorsPerSupervisor', 0, 'OPERATORS_PER_SUPERVISOR_INVALID'], ['theoreticalWorkdaysPerYear', 0, 'NO_AVAILABLE_HOURS']] as const)('guards invalid %s', (field, value, code) => { const input = clinicInput(); input.parameters[field] = value; const r = computeQuote(input); expect(r.causes.map((c) => c.code)).toContain(code); expect(JSON.stringify(r)).not.toContain('NaN'); const visit = (v: unknown) => { if (typeof v === 'number')
        expect(Number.isFinite(v)).toBe(true);
    else if (v && typeof v === 'object')
        Object.values(v).forEach(visit); }; visit(r); });
    it('preserves invariants on 200 reproducible random cases', () => { const input = clinicInput(); let state = 125; const random = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; }; for (let i = 0; i < 200; i++) {
        input.zones = input.zones.map((z): ZoneInput => ({ ...z, floorArea: 1 + random() * 1000, wallArea: random() * 200, daysPerMonth: 1 + Math.floor(random() * 31), fixedPosts: Math.floor(random() * 3) }));
        invariants(input);
    } });
});
