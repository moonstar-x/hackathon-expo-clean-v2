import { APP_LOCALE } from '../constants/app';
import { NONE } from '../constants/components';
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

/** The currency's symbol as Spanish formatting writes it: `US$` for USD. */
export const currencySymbol = (currency: string, locale: string = APP_LOCALE): string =>
  new Intl.NumberFormat(locale, { style: 'currency', currency })
    .formatToParts(0)
    .find((part: Intl.NumberFormatPart): boolean => part.type === 'currency')?.value ?? currency;

const fixedFormatters: Map<string, Intl.NumberFormat> = new Map<string, Intl.NumberFormat>();

/** Always `decimals` decimals, so a column of measurements lines up: `3,40`, `12,05`. */
const fixed = (value: number, decimals: number, locale: string = APP_LOCALE): string => {
  const key: string = `${locale}/${decimals}`;
  let formatter: Intl.NumberFormat | undefined = fixedFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    fixedFormatters.set(key, formatter);
  }
  return formatter.format(value);
};

/** A length in meters, with 2 decimals: `3,42 m`; a dash when it's unknown (SPEC-004 WEB-MEAS-3). */
export const formatLength = (meters: number | null, locale?: string): string =>
  meters === null ? NONE : `${fixed(meters, 2, locale)} m`;

/** An area in square meters, with 1 decimal: `12,4 m²`, `≈ 12,4 m²` when approximate, a dash when unknown. */
export const formatArea = (squareMeters: number | null, approximate: boolean = false, locale?: string): string =>
  squareMeters === null ? NONE : `${approximate ? '≈ ' : ''}${fixed(squareMeters, 1, locale)} m²`;

/** Sides in meters, with 2 decimals: `2,10 × 0,90 × 0,85 m`. */
export const formatDimensions = (meters: number[], locale?: string): string =>
  `${meters.map((side: number): string => fixed(side, 2, locale)).join(' × ')} m`;

/** A file's size in KB, or MB from 1 MB up, with 1 decimal: `40,8 KB`, `2,3 MB`. */
export const formatFileSize = (bytes: number, locale?: string): string => {
  const megabyte: number = 1024 * 1024;
  return bytes >= megabyte ? `${fixed(bytes / megabyte, 1, locale)} MB` : `${fixed(bytes / 1024, 1, locale)} KB`;
};

/** 'positive' | 'negative' | 'zero', used to colour deltas. */
export const deltaTone = (value: number): 'positive' | 'negative' | 'zero' => {
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'zero';
};
