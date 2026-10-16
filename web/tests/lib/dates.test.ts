import { describe, expect, it } from 'vitest';
import { formatDateTime, formatDay, formatTime } from '../../src/utils/dates';

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
