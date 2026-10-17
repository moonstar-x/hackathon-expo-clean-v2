import { describe, expect, it } from 'vitest';
import { percentToFraction, fractionToPercent, previewWaste } from '../../src/quotes/format';
import { quoteEnums, quoteIssues, quoteText } from '../../src/i18n/quotes';
import { editDraft, marginForPrice, previewPricing, priceDraftErrors, priceUpdate } from '../../src/quotes/priceDraft';
import type { EngineResult } from '../../src/types/quotes';
import type { Quote, WasteControl, WasteRow } from '../../src/types/quotes';
import clinic from '../fixtures/quotes/clinic.json';
const quote: Quote = clinic as unknown as Quote;
describe('quoting contracts', (): void => {
    it('converts percentage inputs without float drift', (): void => { expect(percentToFraction('11,15')).toBe(.1115); expect(fractionToPercent(.1115)).toBe(11.15); expect(percentToFraction('')).toBeNull(); expect(fractionToPercent(null)).toBeNull(); });
    it('translates every review cause and warning', (): void => {
        const codes: string[] = ['ASSUMPTIONS_NOT_CONFIRMED', 'NO_ACTIVE_ZONES', 'TARGET_MARGIN_INVALID', 'MINIMUM_MARGIN_INVALID', 'PRODUCTIVE_FRACTION_INVALID', 'OPERATORS_PER_SUPERVISOR_INVALID', 'NO_AVAILABLE_HOURS', 'ZONE_TYPE_MISSING', 'ZONE_FLOOR_AREA_MISSING', 'ZONE_TRAFFIC_MISSING', 'ZONE_SCHEDULE_MISSING', 'ZONE_DAYS_INVALID', 'FIXTURE_COUNTS_MISSING', 'FIXTURE_PAPER_SOAP_MISSING', 'FIXTURE_ASSUMPTIONS_MISSING', 'FIXTURE_DOUBLE_COUNT_UNCONFIRMED', 'FLAT_RATE_ZONES_AT_LOSS', 'OFFERED_MARGIN_BELOW_MINIMUM', 'WALLS_MISSING', 'FLOOR_AREA_APPROXIMATE', 'FIXTURES_DETECTED', 'CRITICAL_DENSITY_ABOVE_LIMIT', 'GENERAL_DENSITY_ABOVE_LIMIT', 'RISK_ORDER_INCOHERENT', 'SCHEDULE_CODE_UNKNOWN', 'GEOMETRY_UNAVAILABLE'];
        expect(Object.keys(quoteIssues).sort()).toEqual(codes.sort());
        for (const code of codes)
            expect(quoteIssues[code].length).toBeGreaterThan(12);
        expect(['healthy', 'acceptable', 'belowMinimum', 'loss', 'simulation', 'needsReview', 'ok', 'noData', 'watch', 'alert'].map((code: string): string => quoteEnums[code])).toEqual(['Saludable', 'Aceptable', 'Bajo el mínimo', 'Pérdida', 'Confirmado', 'Revisar', 'OK', 'Sin dato', 'Vigilar', 'Alerta']);
    });
    it('previews Appendix A.4 with the stored prices and waste target', (): void => { const actual: WasteControl = previewWaste(quote.result!.purchasePlan.rows, quote.snapshot!.parameters.targetWasteRate, { 1: 20.5, 3: 4.4, 4: 15 }, '2026-11'); expect(actual.totalExcessCost).toBeCloseTo(6.068637, 6); expect(actual.rows.map((r: WasteRow): string => r.status)).toEqual(['ok', 'watch', 'alert', 'noData']); expect(actual.rows[1].excess).toBeCloseTo(.72136, 6); expect(actual.rows[2].excessCost).toBeCloseTo(3.640443, 6); });
    it('turns inline prices into the quote\'s own margin and manual price', (): void => {
        const cost: number = quote.result!.costs.totalCost;
        expect(marginForPrice(cost * 2, cost)).toBe(.5);
        const fromPrice: number = priceUpdate({ targetPrice: '12879.61' }, cost).targetMargin!;
        expect(fromPrice).toBeCloseTo(.5, 6);
        expect(String(fromPrice).split('.')[1].length).toBeLessThanOrEqual(10);
        expect(priceUpdate({ targetMargin: '40' }, cost)).toEqual({ targetMargin: .4, manualPrice: null });
        expect(priceUpdate({ targetMargin: '40', offeredPrice: '9000' }, cost)).toEqual({ targetMargin: .4, manualPrice: 9000 });
        expect(priceUpdate({ targetMargin: '', offeredPrice: '' }, cost)).toEqual({ targetMargin: null, manualPrice: null });
        expect(priceUpdate({ targetPrice: '', offeredPrice: '9000,5' }, cost)).toEqual({ targetMargin: null, manualPrice: 9000.5 });
        expect(priceUpdate({ offeredPrice: '9000' }, cost)).toEqual({ manualPrice: 9000 });
        expect(priceUpdate({}, cost)).toEqual({});
        expect(editDraft(editDraft({ offeredPrice: '1' }, 'targetPrice', '2'), 'targetMargin', '30')).toEqual({ offeredPrice: '1', targetMargin: '30' });
    });
    it('rejects inline prices the API would refuse', (): void => {
        const cost: number = quote.result!.costs.totalCost;
        expect(priceDraftErrors({ targetPrice: '5000', targetMargin: '100', offeredPrice: '-1' }, cost)).toEqual({ targetPrice: quoteText.targetPriceBelowCost, targetMargin: quoteText.marginOutOfRange, offeredPrice: quoteText.priceInvalid });
        expect(priceDraftErrors({ targetPrice: '-1' }, cost)).toEqual({ targetPrice: quoteText.priceInvalid });
        expect(priceDraftErrors({ targetPrice: String(cost), targetMargin: '0', offeredPrice: '0' }, cost)).toEqual({});
        expect(priceDraftErrors({ targetPrice: '', targetMargin: '', offeredPrice: '' }, cost)).toEqual({});
    });
    it('previews the pricing a draft gives, as the engine works it out', (): void => {
        const { pricing, costs, totals }: EngineResult = quote.result!;
        const context: Parameters<typeof previewPricing>[2] = { totalCost: costs.totalCost, floorArea: totals.floorArea, parameters: quote.snapshot!.parameters };
        const same: EngineResult['pricing'] = previewPricing(pricing, {}, context);
        for (const [key, value] of Object.entries(pricing)) {
            if (typeof value === 'number')
                expect(same[key as keyof typeof same]).toBeCloseTo(value, 6);
            else
                expect(same[key as keyof typeof same]).toEqual(value);
        }
        const half: EngineResult['pricing'] = previewPricing(pricing, { targetMargin: '50' }, context);
        expect(half).toMatchObject({ targetMargin: .5, isCustomMargin: true, isManualPrice: false, marginStatus: 'healthy' });
        expect(half.targetPrice).toBeCloseTo(costs.totalCost * 2, 6);
        expect(half.offeredPrice).toBe(half.targetPrice);
        expect(half.margin).toBeCloseTo(.5, 9);
        expect(half.vat).toBeCloseTo(half.offeredPrice * quote.snapshot!.parameters.vatRate, 6);
        expect(half.annualProfit).toBeCloseTo(costs.totalCost * 12, 6);
        expect(half.minimumPrice).toBe(pricing.minimumPrice);
        // A manual price stays put unless the target changes; then the offered price follows the target.
        const manual: EngineResult['pricing'] = { ...pricing, offeredPrice: 7000, isManualPrice: true };
        expect(previewPricing(manual, { offeredPrice: '7500' }, context)).toMatchObject({ offeredPrice: 7500, isManualPrice: true, marginStatus: 'belowMinimum', negotiationRoom: 0 });
        expect(previewPricing(manual, { targetPrice: '12879.61' }, context)).toMatchObject({ isManualPrice: false });
        expect(previewPricing(manual, { targetPrice: '12879.61' }, context).offeredPrice).toBeCloseTo(12879.61, 6);
        expect(previewPricing(pricing, { targetMargin: '' }, context).targetMargin).toBe(quote.snapshot!.parameters.targetMargin);
    });
});
