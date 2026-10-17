import type { PurchasePlanRow, WasteControl, WasteRow } from '../types/quotes';
export const percentToFraction = (value: string | number | null): number | null => value === '' || value === null ? null : Number((Number(String(value).replace(',', '.')) / 100).toFixed(8));
export const fractionToPercent = (value: number | null): number | null => value === null ? null : Number((value * 100).toFixed(6));
export const number = (value: number | null | undefined, decimals: number = 2): string => value == null ? '—' : new Intl.NumberFormat('es', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
export const percent = (value: number | null | undefined): string => value == null ? '—' : `${number(value * 100, 1)} %`;
export function previewWaste(rows: PurchasePlanRow[], targetWasteRate: number, actuals: Record<number, number | null>, period: string): WasteControl {
    const calculated: WasteRow[] = rows.map((p: PurchasePlanRow): WasteRow => {
        const actual: number | null = actuals[p.productId] ?? null;
        const realWasteRate: number | null = actual !== null && p.theoretical > 0 ? actual / p.theoretical - 1 : null;
        const excess: number | null = realWasteRate !== null ? Math.max(0, actual! - p.theoretical * (1 + targetWasteRate)) : null;
        return { productId: p.productId, name: p.name, unit: p.unit, theoretical: p.theoretical, actual, realWasteRate, excess, excessCost: excess !== null ? excess * p.pricePerUnit : null, status: realWasteRate === null ? 'noData' : realWasteRate <= targetWasteRate ? 'ok' : realWasteRate <= 2 * targetWasteRate ? 'watch' : 'alert' };
    });
    return { period, rows: calculated, totalExcessCost: calculated.reduce((n: number, r: WasteRow): number => n + (r.excessCost ?? 0), 0) };
}
