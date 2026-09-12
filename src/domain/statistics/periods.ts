/**
 * Calendar period generation. Weeks are always Monday–Sunday regardless of the device region,
 * months are always the named calendar month. All arithmetic goes through the noon-based date
 * helpers so it stays stable across DST transitions.
 */
import { addDays, parseDateKey, toDateKey } from '../dates';
import { DateKey } from '../models';

export type PeriodKind = 'week' | 'month';

export interface Period {
  kind: PeriodKind;
  start: DateKey;
  end: DateKey;
  /** Every date of the period, in order: 7 for a week, 28–31 for a month. */
  dates: DateKey[];
}

/** The Monday of the week containing the date. */
export function startOfWeek(date: DateKey): DateKey {
  const weekday = parseDateKey(date).getDay();
  return addDays(date, -((weekday + 6) % 7));
}

export function startOfMonth(date: DateKey): DateKey {
  const parsed = parseDateKey(date);
  return toDateKey(new Date(parsed.getFullYear(), parsed.getMonth(), 1, 12, 0, 0, 0));
}

/** Number of days in the month containing the date. */
export function daysInMonth(date: DateKey): number {
  const parsed = parseDateKey(date);
  return new Date(parsed.getFullYear(), parsed.getMonth() + 1, 0, 12, 0, 0, 0).getDate();
}

function buildPeriod(kind: PeriodKind, start: DateKey, length: number): Period {
  const dates: DateKey[] = [];
  for (let i = 0; i < length; i++) dates.push(addDays(start, i));
  return { kind, start, end: dates[dates.length - 1], dates };
}

/** The week or month containing a date. Used both on first render and when switching tabs. */
export function periodContaining(kind: PeriodKind, date: DateKey): Period {
  if (kind === 'week') return buildPeriod('week', startOfWeek(date), 7);
  const start = startOfMonth(date);
  return buildPeriod('month', start, daysInMonth(start));
}

/** Moves by whole calendar periods: `delta` weeks or `delta` months. */
export function shiftPeriod(period: Period, delta: number): Period {
  if (period.kind === 'week') return periodContaining('week', addDays(period.start, delta * 7));
  const parsed = parseDateKey(period.start);
  const moved = new Date(parsed.getFullYear(), parsed.getMonth() + delta, 1, 12, 0, 0, 0);
  return periodContaining('month', toDateKey(moved));
}

/** The next period exists only when the current one does not already contain today. */
export function canShowNext(period: Period, today: DateKey): boolean {
  return period.end < today;
}

export function containsDate(period: Period, date: DateKey): boolean {
  return date >= period.start && date <= period.end;
}

/**
 * The date a period should keep selected: the previously selected one when it is inside,
 * otherwise today when the period contains it, otherwise the first date.
 */
export function selectableDateIn(period: Period, preferred: DateKey, today: DateKey): DateKey {
  if (containsDate(period, preferred)) return preferred;
  if (containsDate(period, today)) return today;
  return period.start;
}
