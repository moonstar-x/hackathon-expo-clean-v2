import { describe, expect, it } from 'vitest';
import { percentToFraction, fractionToPercent, previewWaste } from '../../src/quotes/format';
import { quoteEnums, quoteFields, quoteIssues, quoteText } from '../../src/i18n/quotes';
import { draftEdits, editDraft, editErrorText, SUMMARY_FIELDS } from '../../src/quotes/summaryDraft';
import { cleanedArea, cleaningTimes, frequencyDays, frequencyOf } from '../../src/utils/quotes';
import type { Quote, WasteControl, WasteRow } from '../../src/types/quotes';
import clinic from '../fixtures/quotes/clinic.json';
const quote: Quote = clinic as unknown as Quote;
describe('quoting contracts', (): void => {
    it('converts percentage inputs without float drift', (): void => { expect(percentToFraction('11,15')).toBe(.1115); expect(fractionToPercent(.1115)).toBe(11.15); expect(percentToFraction('')).toBeNull(); expect(fractionToPercent(null)).toBeNull(); });
    it('translates every review cause and warning', (): void => {
        const codes: string[] = ['ASSUMPTIONS_NOT_CONFIRMED', 'NO_ACTIVE_ZONES', 'TARGET_MARGIN_INVALID', 'MINIMUM_MARGIN_INVALID', 'PRODUCTIVE_FRACTION_INVALID', 'OPERATORS_PER_SUPERVISOR_INVALID', 'NO_AVAILABLE_HOURS', 'ZONE_TYPE_MISSING', 'ZONE_FLOOR_AREA_MISSING', 'ZONE_TRAFFIC_MISSING', 'ZONE_SCHEDULE_MISSING', 'ZONE_DAYS_INVALID', 'FIXTURE_COUNTS_MISSING', 'FIXTURE_PAPER_SOAP_MISSING', 'FIXTURE_ASSUMPTIONS_MISSING', 'FIXTURE_DOUBLE_COUNT_UNCONFIRMED', 'FLAT_RATE_ZONES_AT_LOSS', 'OFFERED_MARGIN_BELOW_MINIMUM', 'WALLS_MISSING', 'FLOOR_AREA_APPROXIMATE', 'FIXTURES_DETECTED', 'CRITICAL_DENSITY_ABOVE_LIMIT', 'GENERAL_DENSITY_ABOVE_LIMIT', 'RISK_ORDER_INCOHERENT', 'SCHEDULE_CODE_UNKNOWN', 'GEOMETRY_UNAVAILABLE', 'CLEANING_LONGER_THAN_INTERVAL'];
        expect(Object.keys(quoteIssues).sort()).toEqual(codes.sort());
        for (const code of codes)
            expect(quoteIssues[code].length).toBeGreaterThan(12);
        expect(['healthy', 'acceptable', 'belowMinimum', 'loss', 'simulation', 'needsReview', 'ok', 'noData', 'watch', 'alert'].map((code: string): string => quoteEnums[code])).toEqual(['Saludable', 'Aceptable', 'Bajo el mínimo', 'Pérdida', 'Confirmado', 'Revisar', 'OK', 'Sin dato', 'Vigilar', 'Alerta']);
    });
    it('previews Appendix A.4 with the stored prices and waste target', (): void => { const actual: WasteControl = previewWaste(quote.result!.purchasePlan.rows, quote.snapshot!.parameters.targetWasteRate, { 1: 20.5, 3: 4.4, 4: 15 }, '2026-11'); expect(actual.totalExcessCost).toBeCloseTo(6.068637, 6); expect(actual.rows.map((r: WasteRow): string => r.status)).toEqual(['ok', 'watch', 'alert', 'noData']); expect(actual.rows[1].excess).toBeCloseTo(.72136, 6); expect(actual.rows[2].excessCost).toBeCloseTo(3.640443, 6); });
    it('turns the Resumen inputs into the edits the API applies', (): void => {
        expect(draftEdits({ targetMargin: '40', offeredPrice: '9000,5', peopleToHire: '4', profit: '-100', margin: '-5' })).toEqual({ edits: { targetMargin: .4, offeredPrice: 9000.5, peopleToHire: 4, profit: -100, margin: -.05 }, errors: {} });
        expect(draftEdits({ targetMargin: '', laborCost: ' ' })).toEqual({ edits: { targetMargin: null, laborCost: null }, errors: {} });
        expect(draftEdits({ fte: '-1', targetMargin: '100', margin: '100', laborCost: 'x', profit: 'x', shareOfCost: '-1' }).errors).toEqual({ fte: quoteText.priceInvalid, targetMargin: quoteText.marginOutOfRange, margin: quoteText.marginBelowHundred, laborCost: quoteText.priceInvalid, profit: quoteText.numberInvalid, shareOfCost: quoteText.priceInvalid });
        expect(String(draftEdits({ targetMargin: '33.33333333333' }).edits.targetMargin).split('.')[1].length).toBeLessThanOrEqual(10);
    });
    it('keeps the latest edit last, and only the latest of the target price and margin', (): void => {
        expect(Object.keys(editDraft({ offeredPrice: '1', fte: '2' }, 'offeredPrice', '3'))).toEqual(['fte', 'offeredPrice']);
        expect(editDraft(editDraft({ offeredPrice: '1' }, 'targetPrice', '2'), 'targetMargin', '30')).toEqual({ offeredPrice: '1', targetMargin: '30' });
        expect(editDraft({ targetMargin: '30' }, 'targetPrice', '2')).toEqual({ targetPrice: '2' });
    });
    it('names every editable value and explains every reason the API gives', (): void => {
        for (const field of SUMMARY_FIELDS)
            expect(quoteFields[field]).toBeTruthy();
        for (const message of Object.values(editErrorText))
            expect(message.length).toBeGreaterThan(5);
    });
    it('reads a zone\'s frequency from its days of service, and sets the days a frequency means', (): void => {
        expect([null, 0, 1, 4, 5, 6, 22, 30].map(frequencyOf)).toEqual([null, null, 'monthly', 'weekly', 'weekly', 'daily', 'daily', 'daily']);
        expect([frequencyDays('daily', 30), frequencyDays('daily', null), frequencyDays('weekly', 30), frequencyDays('monthly', 30)]).toEqual([30, 22, 4, 1]);
        expect([cleaningTimes('daily', 3, 66), cleaningTimes('daily', 1, 22), cleaningTimes('monthly', 1, 1), cleaningTimes('weekly', 2, 8)]).toEqual(['3 veces al día', '1 vez al día', '1 vez al mes', '8 veces al mes']);
    });
    it('works out the floor to clean as the API does', (): void => {
        expect(cleanedArea({ floorArea: 20, freeArea: 17, cleanedArea: null })).toBe(17);
        expect(cleanedArea({ floorArea: 20, freeArea: null, cleanedArea: 25 })).toBe(20);
        expect(cleanedArea({ floorArea: null, freeArea: null, cleanedArea: null })).toBe(0);
    });
});
