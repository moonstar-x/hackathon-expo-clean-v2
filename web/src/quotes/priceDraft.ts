import { quoteText } from '../i18n/quotes';
import type { EngineResult, PriceDraft, PriceDraftField, PriceUpdate, QuoteParameterValues } from '../types/quotes';
import { percentToFraction } from './format';
/** An inline price input as a number: null when cleared, NaN when it isn't one. */
const parse = (raw: string): number | null => raw.trim() === '' ? null : Number(raw.replace(',', '.'));
type Pricing = EngineResult['pricing'];
/** The engine's division: 0 instead of an infinite or undefined quotient. */
const divide = (a: number, b: number): number => b > 0 && Number.isFinite(b) && Number.isFinite(a / b) ? a / b : 0;
/** The target margin that prices a quote of this total cost at `price`. */
export const marginForPrice = (price: number, totalCost: number): number => Number((1 - totalCost / price).toFixed(10));
/** Why each changed input can't be applied; empty when the whole draft can. A cleared input always can. */
export function priceDraftErrors(draft: PriceDraft, totalCost: number): Partial<Record<PriceDraftField, string>> {
    const errors: Partial<Record<PriceDraftField, string>> = {};
    const price: (field: 'offeredPrice' | 'targetPrice') => number | null = (field: 'offeredPrice' | 'targetPrice'): number | null => draft[field] === undefined ? null : parse(draft[field]);
    const offered: number | null = price('offeredPrice'), target: number | null = price('targetPrice');
    if (offered !== null && !(offered >= 0))
        errors.offeredPrice = quoteText.priceInvalid;
    if (target !== null && !(target >= 0))
        errors.targetPrice = quoteText.priceInvalid;
    else if (target !== null && !(target > 0 && target >= totalCost))
        errors.targetPrice = quoteText.targetPriceBelowCost;
    const margin: number | null = draft.targetMargin === undefined ? null : parse(draft.targetMargin);
    if (margin !== null && !(margin >= 0 && margin < 100))
        errors.targetMargin = quoteText.marginOutOfRange;
    return errors;
}
/**
 * What a valid draft saves on the quote. A target price becomes the quote's own target margin at its
 * current total cost, so the recalculation prices it there; clearing either returns to the parameters'.
 * A new target with the offered price untouched drops the manual price, so the offered price follows it.
 */
export function priceUpdate(draft: PriceDraft, totalCost: number): PriceUpdate {
    const update: PriceUpdate = {};
    if (draft.targetMargin !== undefined)
        update.targetMargin = percentToFraction(draft.targetMargin.trim());
    else if (draft.targetPrice !== undefined) {
        const price: number | null = parse(draft.targetPrice);
        update.targetMargin = price === null ? null : marginForPrice(price, totalCost);
    }
    if (draft.offeredPrice !== undefined) {
        const price: number | null = parse(draft.offeredPrice);
        update.manualPrice = price === null ? null : Number(price.toFixed(6));
    }
    else if (update.targetMargin !== undefined)
        update.manualPrice = null;
    return update;
}
/**
 * The pricing figures a valid draft will give once recalculated, the way the API's engine works them out,
 * so both cards follow the inputs as they are typed. Costs don't depend on prices, so they stay as calculated.
 */
export function previewPricing(pricing: Pricing, draft: PriceDraft, { totalCost, floorArea, parameters }: {
    totalCost: number;
    /** The active zones' floor area. */
    floorArea: number;
    parameters: Pick<QuoteParameterValues, 'targetMargin' | 'minimumMargin' | 'vatRate' | 'monthsPerYear'>;
}): Pricing {
    const update: PriceUpdate = priceUpdate(draft, totalCost);
    const targetMargin: number = update.targetMargin === undefined ? pricing.targetMargin : update.targetMargin ?? parameters.targetMargin;
    const manualPrice: number | null = update.manualPrice === undefined ? (pricing.isManualPrice ? pricing.offeredPrice : null) : update.manualPrice;
    const targetPrice: number = targetMargin < 1 ? divide(totalCost, 1 - targetMargin) : 0;
    const offeredPrice: number = manualPrice ?? targetPrice, profit: number = offeredPrice - totalCost, margin: number = divide(profit, offeredPrice), vat: number = offeredPrice * parameters.vatRate;
    const marginStatus: Pricing['marginStatus'] = margin < 0 ? 'loss' : margin < parameters.minimumMargin - .00001 ? 'belowMinimum' : margin < targetMargin - .00001 ? 'acceptable' : 'healthy';
    return { ...pricing, targetMargin, isCustomMargin: update.targetMargin === undefined ? pricing.isCustomMargin : update.targetMargin !== null, targetPrice, offeredPrice, isManualPrice: manualPrice !== null, profit, margin, marginStatus, vat, totalWithVat: offeredPrice + vat, annualProfit: profit * parameters.monthsPerYear, pricePerM2: divide(offeredPrice, floorArea), negotiationRoom: Math.max(0, offeredPrice - pricing.minimumPrice) };
}
/** A draft with one input changed. The target price and margin set the same thing: the latest one wins. */
export function editDraft(draft: PriceDraft, field: PriceDraftField, value: string): PriceDraft {
    const next: PriceDraft = { ...draft, [field]: value };
    if (field === 'targetPrice')
        delete next.targetMargin;
    if (field === 'targetMargin')
        delete next.targetPrice;
    return next;
}
