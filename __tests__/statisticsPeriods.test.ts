import {
  canShowNext,
  containsDate,
  daysInMonth,
  periodContaining,
  selectableDateIn,
  shiftPeriod,
  startOfWeek,
} from '../src/domain/statistics/periods';

describe('week periods', () => {
  it('always starts on Monday, whatever weekday the date is', () => {
    // 2026-09-12 is a Saturday.
    expect(startOfWeek('2026-09-12')).toBe('2026-09-07');
    expect(startOfWeek('2026-09-07')).toBe('2026-09-07');
    // 2026-09-13 is a Sunday and belongs to the week that started on the 7th.
    expect(startOfWeek('2026-09-13')).toBe('2026-09-07');
  });

  it('lists seven dates from Monday to Sunday', () => {
    const week = periodContaining('week', '2026-09-12');
    expect(week.dates).toHaveLength(7);
    expect(week.start).toBe('2026-09-07');
    expect(week.end).toBe('2026-09-13');
  });

  it('moves by whole weeks, across a year boundary', () => {
    const week = periodContaining('week', '2025-12-31');
    expect(week.start).toBe('2025-12-29');
    expect(shiftPeriod(week, 1).start).toBe('2026-01-05');
    expect(shiftPeriod(week, -1).start).toBe('2025-12-22');
  });
});

describe('month periods', () => {
  it('covers 28, 29, 30 and 31 day months', () => {
    expect(daysInMonth('2026-02-15')).toBe(28);
    expect(daysInMonth('2024-02-15')).toBe(29);
    expect(daysInMonth('2026-04-15')).toBe(30);
    expect(daysInMonth('2026-01-15')).toBe(31);
  });

  it('lists exactly the dates of the named month', () => {
    const february = periodContaining('month', '2024-02-20');
    expect(february.dates).toHaveLength(29);
    expect(february.start).toBe('2024-02-01');
    expect(february.end).toBe('2024-02-29');
  });

  it('moves by whole months across a year boundary and into short months', () => {
    const january = periodContaining('month', '2026-01-31');
    expect(shiftPeriod(january, -1).start).toBe('2025-12-01');
    const next = shiftPeriod(january, 1);
    expect(next.start).toBe('2026-02-01');
    expect(next.end).toBe('2026-02-28');
  });
});

describe('period navigation', () => {
  it('does not offer a period beyond the one containing today', () => {
    const today = '2026-09-12';
    expect(canShowNext(periodContaining('week', today), today)).toBe(false);
    expect(canShowNext(periodContaining('week', '2026-09-01'), today)).toBe(true);
    expect(canShowNext(periodContaining('month', today), today)).toBe(false);
    expect(canShowNext(periodContaining('month', '2026-08-01'), today)).toBe(true);
  });

  it('switching tabs keeps the period containing the selected date', () => {
    const selected = '2026-03-18';
    const week = periodContaining('week', selected);
    const month = periodContaining('month', selected);
    expect(containsDate(week, selected)).toBe(true);
    expect(containsDate(month, selected)).toBe(true);
    expect(selectableDateIn(month, selected, '2026-09-12')).toBe(selected);
  });

  it('falls back to today, then to the first date, when the selection moves out of range', () => {
    const thisWeek = periodContaining('week', '2026-09-12');
    expect(selectableDateIn(thisWeek, '2026-01-01', '2026-09-12')).toBe('2026-09-12');
    const oldWeek = periodContaining('week', '2026-01-15');
    expect(selectableDateIn(oldWeek, '2026-09-12', '2026-09-12')).toBe(oldWeek.start);
  });
});

describe('DST transitions', () => {
  it('keeps whole days across a spring-forward date', () => {
    // 2026-03-29 is the European DST switch; 2026-11-01 the North American one.
    const week = periodContaining('week', '2026-03-29');
    expect(week.dates).toEqual(['2026-03-23', '2026-03-24', '2026-03-25', '2026-03-26', '2026-03-27', '2026-03-28', '2026-03-29']);
    const month = periodContaining('month', '2026-11-01');
    expect(month.dates).toHaveLength(30);
    expect(month.dates[0]).toBe('2026-11-01');
    expect(month.end).toBe('2026-11-30');
  });
});
