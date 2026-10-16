import { APP_LOCALE } from '../constants/app';
import { unitLabel } from '../i18n/units';

/** U+2212, the typographic minus sign. */
export const MINUS: string = '−';

const numberFormatters: Map<string, Intl.NumberFormat> = new Map<string, Intl.NumberFormat>();

const quantityFormatter = (locale: string = APP_LOCALE): Intl.NumberFormat => {
  let formatter: Intl.NumberFormat | undefined = numberFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 3 });
    numberFormatters.set(locale, formatter);
  }
  return formatter;
};

/** A number with at most 3 decimals: `12.5`, `1,250`. */
export const formatNumber = (value: number, locale?: string): string => quantityFormatter(locale).format(value);

/** A quantity with its unit and at most 3 decimals: `12.5 L`, `3 cajas`. */
export const formatQuantity = (value: number | null | undefined, unit?: string | null, locale?: string): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  const formatted: string = formatNumber(value, locale);
  return unit ? `${formatted} ${unitLabel(unit, value)}` : formatted;
};

/** A signed stock change: `+10 L`, `−3 L`, `0 L`. */
export const formatDelta = (value: number | null | undefined, unit?: string | null, locale?: string): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  const magnitude: string = formatQuantity(Math.abs(value), unit, locale);
  if (value > 0) return `+${magnitude}`;
  if (value < 0) return `${MINUS}${magnitude}`;
  return magnitude;
};

/** Money in the configured currency, using Spanish formatting by default. */
export const formatCurrency = (value: number | null | undefined, currency: string, locale: string = APP_LOCALE): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
};

/** 'positive' | 'negative' | 'zero', used to colour deltas. */
export const deltaTone = (value: number): 'positive' | 'negative' | 'zero' => {
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'zero';
};
