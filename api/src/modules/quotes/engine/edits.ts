import { round } from '../../../lib/numbers.ts';
import type { EngineInput, QuoteOverrides } from '../types.ts';
import { computeQuote, type EngineResult } from './index.ts';

/** The values of a quote's Resumen tab that can be edited, card by card. */
export const EDITABLE_FIELDS = [
    'offeredPrice', 'vat', 'totalWithVat', 'profit', 'margin', 'annualProfit', 'pricePerM2',
    'laborCost', 'chemicalsTheoretical', 'chemicalsWaste', 'eppAndHygiene', 'utensils', 'directCost', 'supervision', 'equipment', 'transport', 'insurance', 'operatingCost', 'administration', 'contingency', 'totalCost', 'indirectToAllocate',
    'targetMargin', 'targetPrice', 'minimumPrice', 'breakEvenPrice', 'negotiationRoom',
    'peopleToHire', 'laborHourlyRate', 'personHours', 'fte', 'supervisors',
    'withWaste', 'uncontrolledWasteCost', 'controlledWasteCost', 'monthlyWasteSavings', 'annualWasteSavings', 'shareOfCost',
    // Set straight on the simple Resumen tab's sliders.
    'minimumMargin', 'targetWasteRate',
] as const;
export type EditableField = typeof EDITABLE_FIELDS[number];
/** A new value for an editable field: a number (a fraction for margins and shares), or null to go back to what it was calculated as. */
export type EditValue = number | null;
/** Why an edit can't be applied. */
export type EditError = 'invalid' | 'outOfRange' | 'belowCost' | 'aboveTarget' | 'noBase';
export const EDIT_ERROR_MESSAGES: Record<EditError, string> = {
    invalid: 'Must be a valid amount',
    outOfRange: 'Gives a value out of range',
    belowCost: 'Must be at least the break-even price',
    aboveTarget: 'Must be at most the target price',
    noBase: 'Cannot be adjusted while it is 0',
};
/** What a quote stores that edits change: its prices and its own values. */
export interface QuoteAdjustments {
    manualPrice: number | null;
    targetMargin: number | null;
    overrides: QuoteOverrides;
}
/** Values that may be negative: a loss is a profit, margin or saving below 0. */
const signed = new Set<EditableField>(['profit', 'margin', 'annualProfit', 'monthlyWasteSavings', 'annualWasteSavings']);
/** The costs that add up to the total, each changed through what it's worked out from. */
type Leaf = 'labor' | 'chemicals' | 'epp' | 'utensils' | 'supervision' | 'equipment' | 'transport' | 'insurance';
const direct: Leaf[] = ['labor', 'chemicals', 'epp', 'utensils'];
const indirect: Leaf[] = ['supervision', 'equipment', 'transport', 'insurance'];
/** The override each cost is changed through; labor's is the rate it's charged at. */
const leafKey = (leaf: Leaf): keyof QuoteOverrides => ({ labor: 'laborHourlyRate', chemicals: 'chemicalsFactor', epp: 'eppFactor', utensils: 'mopCost', supervision: 'supervisorMonthlyCost', equipment: 'equipmentMonthly', transport: 'transportMonthly', insurance: 'insuranceMonthly' } as const)[leaf];
/** Multiplies a cost by `k`: every cost is proportional to what it's changed through. */
function scale(leaf: Leaf, k: number, r: EngineResult, o: QuoteOverrides) {
    const p = r.parameters;
    const current: Record<Leaf, number> = { labor: r.staffing.laborHourlyRate, chemicals: o.chemicalsFactor ?? 1, epp: o.eppFactor ?? 1, utensils: p.mopCost, supervision: p.supervisorMonthlyCost, equipment: p.equipmentMonthly, transport: p.transportMonthly, insurance: p.insuranceMonthly };
    (o as Record<string, number>)[leafKey(leaf)] = round(current[leaf] * k, 10);
}
const fieldLeaves: Partial<Record<EditableField, Leaf[]>> = {
    laborCost: ['labor'], chemicalsTheoretical: ['chemicals'], withWaste: ['chemicals'], shareOfCost: ['chemicals'], eppAndHygiene: ['epp'], utensils: ['utensils'], supervision: ['supervision'], equipment: ['equipment'], transport: ['transport'], insurance: ['insurance'],
    directCost: direct, operatingCost: [...direct, ...indirect], totalCost: [...direct, ...indirect], breakEvenPrice: [...direct, ...indirect], indirectToAllocate: indirect,
};
/** The overrides other fields are set through, cleared with them. */
const fieldKeys: Partial<Record<EditableField, (keyof QuoteOverrides)[]>> = {
    vat: ['vatRate'], minimumPrice: ['minimumMargin'], minimumMargin: ['minimumMargin'], targetWasteRate: ['targetWasteRate'], chemicalsWaste: ['targetWasteRate'], controlledWasteCost: ['targetWasteRate'], administration: ['administrationRate'], contingency: ['contingencyRate'],
    peopleToHire: ['workers'], fte: ['workers'], personHours: ['workers'], laborHourlyRate: ['laborHourlyRate'], supervisors: ['operatorsPerSupervisor'],
    uncontrolledWasteCost: ['uncontrolledWasteRate'], monthlyWasteSavings: ['uncontrolledWasteRate'], annualWasteSavings: ['uncontrolledWasteRate'],
};
/** Fields that set the offered price; clearing one returns it to the target price. */
const priceFields = new Set<EditableField>(['offeredPrice', 'totalWithVat', 'profit', 'margin', 'annualProfit', 'pricePerM2', 'negotiationRoom']);

/** Changes `a` so the quote, once calculated, has `value` in `field`; returns why it can't instead. */
function solve(field: EditableField, value: EditValue, r: EngineResult, a: QuoteAdjustments): EditError | undefined {
    const o = a.overrides;
    if (value === null) {
        if (priceFields.has(field))
            a.manualPrice = null;
        if (field === 'targetMargin' || field === 'targetPrice') {
            a.targetMargin = null;
            a.manualPrice = null;
        }
        for (const leaf of fieldLeaves[field] ?? [])
            delete o[leafKey(leaf)];
        for (const key of fieldKeys[field] ?? [])
            delete o[key];
        return;
    }
    if (typeof value !== 'number' || !Number.isFinite(value) || (!signed.has(field) && value < 0))
        return 'invalid';
    const p = r.parameters, c = r.costs, pr = r.pricing;
    const chemicals = c.chemicalsTheoretical + c.chemicalsWaste;
    const markup = (1 + p.administrationRate) * (1 + p.contingencyRate);
    const setPrice = (price: number) => { if (!(price >= 0 && Number.isFinite(price)))
        return 'invalid' as const; a.manualPrice = round(price, 6); };
    const set = (key: keyof QuoteOverrides, v: number, max: number = 1e9, min: number = 0) => { if (!(Number.isFinite(v) && v >= min && v <= max))
        return 'outOfRange' as const; (o as Record<string, number>)[key] = round(v, 10); };
    const scaleTo = (current: number, leaves: Leaf[] = fieldLeaves[field]!) => { if (!(current > 0))
        return 'noBase' as const; for (const leaf of leaves)
        scale(leaf, value / current, r, o); };
    const workers = (fte: number) => fte > 0 ? set('workers', fte) : 'invalid' as const;
    switch (field) {
        case 'offeredPrice': return setPrice(value);
        case 'totalWithVat': return setPrice(value / (1 + pr.vatRate));
        case 'profit': return setPrice(c.totalCost + value);
        case 'annualProfit': return setPrice(c.totalCost + value / p.monthsPerYear);
        case 'margin': return value < 1 ? setPrice(c.totalCost / (1 - value)) : 'outOfRange';
        case 'pricePerM2': return r.totals.floorArea > 0 ? setPrice(value * r.totals.floorArea) : 'noBase';
        case 'negotiationRoom': return setPrice(pr.minimumPrice + value);
        case 'vat': return pr.offeredPrice > 0 ? set('vatRate', value / pr.offeredPrice, 1) : 'noBase';
        case 'targetMargin':
        case 'targetPrice': {
            if (field === 'targetPrice' && !(value > 0 && value >= c.totalCost))
                return 'belowCost';
            const margin = field === 'targetMargin' ? value : 1 - c.totalCost / value;
            if (!(margin < 1))
                return 'outOfRange';
            a.targetMargin = round(margin, 10);
            // The offered price follows the new target, unless a later edit sets it.
            a.manualPrice = null;
            return;
        }
        case 'minimumPrice': {
            if (!(value > 0 && value >= c.totalCost))
                return 'belowCost';
            const margin = 1 - c.totalCost / value;
            return margin > pr.targetMargin + 1e-9 ? 'aboveTarget' : set('minimumMargin', margin, 1);
        }
        case 'minimumMargin': return value > pr.targetMargin + 1e-9 ? 'aboveTarget' : set('minimumMargin', value, 1);
        case 'targetWasteRate': return set('targetWasteRate', value, 1);
        case 'laborCost': return scaleTo(c.laborCost);
        case 'chemicalsTheoretical': return scaleTo(c.chemicalsTheoretical);
        case 'withWaste': return scaleTo(chemicals);
        case 'eppAndHygiene': return scaleTo(c.eppAndHygiene);
        case 'directCost': return scaleTo(c.directCost);
        case 'operatingCost': return scaleTo(c.operatingCost);
        case 'totalCost':
        case 'breakEvenPrice': return scaleTo(c.totalCost);
        case 'utensils': {
            const mops = r.totals.floorArea / p.mopCoverageM2 * p.mopReplacementsPerMonth;
            return mops > 0 ? set('mopCost', value / mops) : 'noBase';
        }
        case 'supervision': return r.staffing.fte > 0 ? set('supervisorMonthlyCost', value * p.operatorsPerSupervisor / r.staffing.fte) : 'noBase';
        case 'equipment': return set('equipmentMonthly', value);
        case 'transport': return set('transportMonthly', value);
        case 'insurance': return set('insuranceMonthly', value);
        case 'administration': return c.operatingCost > 0 ? set('administrationRate', value / c.operatingCost, 1) : 'noBase';
        case 'contingency': return c.operatingCost + c.administration > 0 ? set('contingencyRate', value / (c.operatingCost + c.administration), 1) : 'noBase';
        case 'indirectToAllocate': {
            // (direct + k · indirect costs) · (1 + administration) · (1 + contingency) − direct = value
            const base = c.supervision + c.equipment + c.transport + c.insurance;
            if (!(base > 0))
                return 'noBase';
            const k = ((value + c.directCost) / markup - c.directCost) / base;
            if (!(k >= 0))
                return 'outOfRange';
            for (const leaf of indirect)
                scale(leaf, k, r, o);
            return;
        }
        case 'chemicalsWaste':
        case 'controlledWasteCost': return c.chemicalsTheoretical > 0 ? set('targetWasteRate', value / c.chemicalsTheoretical, 1) : 'noBase';
        case 'uncontrolledWasteCost': return c.chemicalsTheoretical > 0 ? set('uncontrolledWasteRate', value / c.chemicalsTheoretical, 1) : 'noBase';
        case 'monthlyWasteSavings':
        case 'annualWasteSavings': {
            const monthly = field === 'monthlyWasteSavings' ? value : value / p.monthsPerYear;
            return c.chemicalsTheoretical > 0 ? set('uncontrolledWasteRate', (monthly + c.chemicalsWaste) / c.chemicalsTheoretical, 1) : 'noBase';
        }
        case 'shareOfCost': {
            // chemicals / (rest of the total + chemicals · markup) = value
            if (!(chemicals > 0))
                return 'noBase';
            if (!(value < 1 / markup))
                return 'outOfRange';
            const rest = c.totalCost - chemicals * markup;
            scale('chemicals', value * rest / (1 - value * markup) / chemicals, r, o);
            return;
        }
        case 'peopleToHire':
        case 'fte': return workers(value);
        case 'personHours': return r.labor.fteHoursPerMonth > 0 ? workers(value / r.labor.fteHoursPerMonth) : 'noBase';
        case 'laborHourlyRate': return set('laborHourlyRate', value);
        case 'supervisors': return r.staffing.fte > 0 ? (value > 0 ? set('operatorsPerSupervisor', r.staffing.fte / value, 1e9, 1e-9) : 'invalid') : 'noBase';
    }
}

/** The quote's calculation with these adjustments in place of its own. */
export const computeWith = (input: EngineInput, a: QuoteAdjustments) => computeQuote({ ...input, quote: { ...input.quote, manualPrice: a.manualPrice, targetMargin: a.targetMargin, overrides: a.overrides } });

/**
 * Applies edits in order, each to the quote as the ones before it left it, so the latest one wins when
 * two change the same thing. An edit that can't be applied is reported and skipped.
 */
export function applyEdits(input: EngineInput, current: QuoteAdjustments, edits: [EditableField, EditValue][]) {
    let adjustments: QuoteAdjustments = { ...current, overrides: { ...current.overrides } };
    let result = computeWith(input, adjustments);
    const errors: Partial<Record<EditableField, EditError>> = {};
    for (const [field, value] of edits) {
        const next: QuoteAdjustments = { ...adjustments, overrides: { ...adjustments.overrides } };
        const error = solve(field, value, result, next);
        if (error)
            errors[field] = error;
        else {
            adjustments = next;
            result = computeWith(input, adjustments);
        }
    }
    return { adjustments, result, errors };
}
