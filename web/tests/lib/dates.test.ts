import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatDay, formatPeriod, formatTime, recentPeriods } from '../../src/utils/dates';

describe('formatDateTime', () => {
  it('formats an ISO timestamp and ignores bad input', (): void => {
    expect(formatDateTime('2026-10-16T14:03:11.512Z', 'en-US')).toMatch(/2026/);
    expect(formatDateTime('nope', 'en-US')).toBe('');
    expect(formatDateTime(null, 'en-US')).toBe('');
    expect(formatDateTime('2026-10-16T14:03:11.512Z')).toBe(
      new Date('2026-10-16T14:03:11.512Z').toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' }),
    );
  });
});

describe('formatDate', () => {
  it('formats the day of an ISO timestamp and ignores bad input', (): void => {
    expect(formatDate('2126-01-01T12:00:00.000Z')).toBe(new Date('2126-01-01T12:00:00.000Z').toLocaleDateString('es', { dateStyle: 'medium' }));
    expect(formatDate('nope')).toBe('');
    expect(formatDate(undefined)).toBe('');
  });
});

// The clock shows the viewer's own time, so these dates are built in the local time zone.
describe('clock', () => {
  it('tells the time on 24 hours', (): void => {
    expect(formatTime(new Date(2026, 9, 15, 14, 3, 22))).toBe('14:03:22');
    expect(formatTime(new Date(2026, 0, 1, 23, 59, 59))).toBe('23:59:59');
  });

  it('tells the day in Spanish', (): void => {
    expect(formatDay(new Date(2026, 9, 15, 12))).toBe('jue, 15 oct');
    expect(formatDay(new Date(2025, 11, 31, 12))).toBe('mié, 31 dic');
  });
});

describe('waste control months', () => {
  it('names a month in Spanish, capitalized to start a line', (): void => {
    expect(formatPeriod('2026-10')).toBe('Octubre de 2026');
    expect(formatPeriod('2025-01')).toBe('Enero de 2025');
  });

  it('lists the last months, this one first, across the turn of the year', (): void => {
    expect(recentPeriods(3, new Date(2026, 0, 15))).toEqual(['2026-01', '2025-12', '2025-11']);
  });
});
