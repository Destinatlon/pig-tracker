import { addDays, describeDate, formatLongDate, formatShortDate, isValidDateKey, parseDateKey, toDateKey } from '../src/domain/dates';

describe('dates', () => {
  it('round-trips keys', () => {
    expect(toDateKey(parseDateKey('2025-09-10'))).toBe('2025-09-10');
    expect(isValidDateKey('2025-02-30')).toBe(false);
    expect(isValidDateKey('2024-02-29')).toBe(true);
  });
  it('adds days across month and year boundaries', () => {
    expect(addDays('2025-09-30', 1)).toBe('2025-10-01');
    expect(addDays('2025-01-01', -1)).toBe('2024-12-31');
  });
  it('formats the long date as in the design spec', () => {
    expect(formatLongDate('2026-09-10')).toBe('Thursday, 10 September');
    expect(formatShortDate('2025-09-10', new Date(2025, 0, 1))).toBe('10 Sep');
    expect(formatShortDate('2024-09-10', new Date(2025, 0, 1))).toBe('10 Sep 2024');
  });
  it('describes relative dates', () => {
    const now = new Date(2025, 8, 10, 12);
    expect(describeDate('2025-09-10', now)).toBe('today');
    expect(describeDate('2025-09-09', now)).toBe('yesterday');
    expect(describeDate('2025-09-11', now)).toBe('tomorrow');
    expect(describeDate('2025-09-01', now)).toBe('1 Sep');
  });
});
