import { quoteText } from '../i18n/quotes';
import type { SummaryDraft, SummaryEditError, SummaryEdits, SummaryField } from '../types/quotes';
/** The values that can be changed in place, as the API's EDITABLE_FIELDS lists them. */
export const SUMMARY_FIELDS: ReadonlySet<string> = new Set<SummaryField>([
    'offeredPrice', 'vat', 'totalWithVat', 'profit', 'margin', 'annualProfit', 'pricePerM2',
    'laborCost', 'chemicalsTheoretical', 'chemicalsWaste', 'eppAndHygiene', 'utensils', 'directCost', 'supervision', 'equipment', 'transport', 'insurance', 'operatingCost', 'administration', 'contingency', 'totalCost', 'indirectToAllocate',
    'targetMargin', 'targetPrice', 'minimumPrice', 'breakEvenPrice', 'negotiationRoom',
    'peopleToHire', 'laborHourlyRate', 'personHours', 'fte', 'supervisors',
    'withWaste', 'uncontrolledWasteCost', 'controlledWasteCost', 'monthlyWasteSavings', 'annualWasteSavings', 'shareOfCost',
    'minimumMargin', 'targetWasteRate',
]);
/** Typed as a percentage, sent as a fraction. */
export const PERCENT_FIELDS: ReadonlySet<SummaryField> = new Set<SummaryField>(['margin', 'targetMargin', 'shareOfCost', 'minimumMargin', 'targetWasteRate']);
/** May be below 0: a loss is a profit, margin or saving below 0. */
export const SIGNED_FIELDS: ReadonlySet<SummaryField> = new Set<SummaryField>(['profit', 'margin', 'annualProfit', 'monthlyWasteSavings', 'annualWasteSavings']);
/** An input as a number: null when cleared, NaN when it isn't one. */
const parse = (raw: string): number | null => raw.trim() === '' ? null : Number(raw.replace(',', '.'));
/** What the API's reasons an edit can't be applied say. */
export const editErrorText: Record<SummaryEditError, string> = {
    invalid: quoteText.priceInvalid,
    outOfRange: quoteText.editOutOfRange,
    belowCost: quoteText.targetPriceBelowCost,
    aboveTarget: quoteText.minimumAboveTarget,
    noBase: quoteText.editNoBase,
};
/**
 * The edits a draft sends, and why the inputs that can't be sent can't; a cleared input sends null, which
 * returns the value to what it is calculated as. Whether a value can be reached is the API's to say.
 */
export function draftEdits(draft: SummaryDraft): { edits: SummaryEdits; errors: Partial<Record<SummaryField, string>> } {
    const edits: SummaryEdits = {};
    const errors: Partial<Record<SummaryField, string>> = {};
    for (const [field, raw] of Object.entries(draft) as [SummaryField, string][]) {
        const value: number | null = parse(raw);
        if (value === null)
            edits[field] = null;
        else if (Number.isNaN(value))
            errors[field] = SIGNED_FIELDS.has(field) ? quoteText.numberInvalid : quoteText.priceInvalid;
        else if (!SIGNED_FIELDS.has(field) && value < 0)
            errors[field] = quoteText.priceInvalid;
        else if (PERCENT_FIELDS.has(field) && !(value < 100))
            errors[field] = field === 'margin' ? quoteText.marginBelowHundred : quoteText.marginOutOfRange;
        else
            edits[field] = PERCENT_FIELDS.has(field) ? Number((value / 100).toFixed(10)) : value;
    }
    return { edits, errors };
}
/**
 * A draft with one input changed, moved last: the API applies edits in order, so the latest one wins when two
 * change the same thing. The target price and margin set the same thing, so only the latest is kept.
 */
export function editDraft(draft: SummaryDraft, field: SummaryField, value: string): SummaryDraft {
    const next: SummaryDraft = { ...draft };
    delete next[field];
    if (field === 'targetPrice')
        delete next.targetMargin;
    if (field === 'targetMargin')
        delete next.targetPrice;
    return { ...next, [field]: value };
}
