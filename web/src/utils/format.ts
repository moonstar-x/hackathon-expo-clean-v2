/** U+2212, the typographic minus sign. */
export const MINUS = '−';

const numberFormatters = new Map<string, Intl.NumberFormat>();
function quantityFormatter(locale?: string): Intl.NumberFormat {
  const key = locale ?? '';
  let formatter = numberFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 3 });
    numberFormatters.set(key, formatter);
  }
  return formatter;
}

/** A number with at most 3 decimals: `12.5`, `1,250`. */
export function formatNumber(value: number, locale?: string): string {
  return quantityFormatter(locale).format(value);
}

/** A quantity with its unit and at most 3 decimals: `12.5 L`, `3 box`. */
export function formatQuantity(value: number | null | undefined, unit?: string | null, locale?: string): string {
  if (value == null || !Number.isFinite(value)) return '';
  const formatted = formatNumber(value, locale);
  return unit ? `${formatted} ${unit}` : formatted;
}

/** A signed stock change: `+10 L`, `−3 L`, `0 L`. */
export function formatDelta(value: number | null | undefined, unit?: string | null, locale?: string): string {
  if (value == null || !Number.isFinite(value)) return '';
  const magnitude = formatQuantity(Math.abs(value), unit, locale);
  if (value > 0) return `+${magnitude}`;
  if (value < 0) return `${MINUS}${magnitude}`;
  return magnitude;
}

/** Money in the configured currency, using the browser locale by default. */
export function formatCurrency(value: number | null | undefined, currency: string, locale?: string): string {
  if (value == null || !Number.isFinite(value)) return '';
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
}

/** A timestamp in the browser locale. */
export function formatDateTime(iso: string | null | undefined, locale?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
}

/** 'positive' | 'negative' | 'zero', used to colour deltas. */
export function deltaTone(value: number): 'positive' | 'negative' | 'zero' {
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'zero';
}
