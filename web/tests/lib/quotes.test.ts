import { describe, expect, it } from 'vitest';
import { percentToFraction, fractionToPercent, previewWaste } from '../../src/quotes/format';
import { quoteEnums, quoteIssues } from '../../src/i18n/quotes';
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
});
