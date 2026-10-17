// Dates in the admin use Spanish formatting in the viewer's own time zone.
import { APP_LOCALE } from '../constants/app';

/** A timestamp, e.g. "16 oct 2026, 14:03"; empty for a missing or invalid value. */
export const formatDateTime = (iso: string | null | undefined, locale: string = APP_LOCALE): string => {
  if (!iso) return '';
  const date: Date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
};

/** A day, e.g. "16 oct 2026"; empty for a missing or invalid value. */
export const formatDate = (iso: string | null | undefined, locale: string = APP_LOCALE): string => {
  if (!iso) return '';
  const date: Date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(locale, { dateStyle: 'medium' });
};

const timeFormatter: Intl.DateTimeFormat = new Intl.DateTimeFormat(APP_LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const dayFormatter: Intl.DateTimeFormat = new Intl.DateTimeFormat(APP_LOCALE, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

/** The clock's time, e.g. "14:03:22". */
export const formatTime = (date: Date): string => timeFormatter.format(date);

/** The clock's day, e.g. "jue, 15 oct". */
export const formatDay = (date: Date): string => dayFormatter.format(date);

const monthFormatter: Intl.DateTimeFormat = new Intl.DateTimeFormat(APP_LOCALE, { month: 'long', year: 'numeric' });

/** A `YYYY-MM` period as Spanish writes it, capitalized to start a line: "Octubre de 2026". */
export const formatPeriod = (period: string): string => {
  const [year, month]: number[] = period.split('-').map(Number);
  const label: string = monthFormatter.format(new Date(year, month - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
};

/** The `YYYY-MM` periods of the last `count` months, this one first. */
export const recentPeriods = (count: number, today: Date = new Date()): string[] =>
  Array.from({ length: count }, (_value: unknown, index: number): string => {
    const date: Date = new Date(today.getFullYear(), today.getMonth() - index, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });
