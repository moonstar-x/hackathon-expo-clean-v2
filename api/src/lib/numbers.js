/** Decimal places allowed for quantities (stock, reorder level, movement amounts). */
export const QUANTITY_DECIMALS = 3;
/** Decimal places allowed for `unitCost`. */
export const COST_DECIMALS = 4;
/** Decimal places of computed money values such as `stockValue`. */
export const MONEY_DECIMALS = 2;
/** Upper bound for every numeric input. */
export const MAX_NUMBER = 1_000_000_000;

/**
 * Rounds `n` to `decimals` places. Apply after every arithmetic operation on
 * quantities and money so float error never accumulates (0.1 + 0.2 → 0.3).
 */
export function round(n, decimals) {
  const factor = 10 ** decimals;
  const result = Math.round((n + Number.EPSILON) * factor) / factor;
  return Object.is(result, -0) ? 0 : result;
}

export const roundQuantity = (n) => round(n, QUANTITY_DECIMALS);
export const roundMoney = (n) => round(n, MONEY_DECIMALS);

/** True when `n` has no more than `decimals` digits after the decimal point. */
export function hasAtMostDecimals(n, decimals) {
  return Number.isFinite(n) && Number(n.toFixed(decimals)) === n;
}
