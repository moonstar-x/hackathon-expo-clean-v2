// Dates in the admin use Spanish formatting in the viewer's own time zone.
import { APP_LOCALE } from '../constants/app';

/** A timestamp, e.g. "16 oct 2026, 14:03"; empty for a missing or invalid value. */
export const formatDateTime = (iso: string | null | undefined, locale: string = APP_LOCALE): string => {
  if (!iso) return '';
  const date: Date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
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
