import type { PurchasePlanRow } from './types.ts';
export function wasteControl(rows: PurchasePlanRow[], targetWasteRate: number, actuals: Record<number, number>, period: string) {
    const calculated = rows.map((p) => {
        const actual = actuals[p.productId] ?? null;
        const realWasteRate = actual !== null && p.theoretical > 0 ? actual / p.theoretical - 1 : null;
        const excess = realWasteRate !== null ? Math.max(0, actual! - p.theoretical * (1 + targetWasteRate)) : null;
        const excessCost = excess !== null ? excess * p.pricePerUnit : null;
        return { productId: p.productId, name: p.name, unit: p.unit, theoretical: p.theoretical, actual, realWasteRate, excess, excessCost, status: realWasteRate === null ? 'noData' : realWasteRate <= targetWasteRate ? 'ok' : realWasteRate <= 2 * targetWasteRate ? 'watch' : 'alert' };
    });
    return { period, rows: calculated, totalExcessCost: calculated.reduce((n, r) => n + (r.excessCost ?? 0), 0) };
}
