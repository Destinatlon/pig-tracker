import { DateKey } from './models';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Parses a key into a local Date at noon, which keeps day arithmetic stable across DST changes. */
export function parseDateKey(key: DateKey): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function isValidDateKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  return toDateKey(parseDateKey(key)) === key;
}

export function todayKey(now: Date = new Date()): DateKey {
  return toDateKey(now);
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** e.g. `Thursday, 10 September` */
export function formatLongDate(key: DateKey): string {
  const date = parseDateKey(key);
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** e.g. `10 Sep` or `10 Sep 2025` when the year differs from the current one. */
export function formatShortDate(key: DateKey, now: Date = new Date()): string {
  const date = parseDateKey(key);
  const base = `${date.getDate()} ${MONTHS[date.getMonth()].slice(0, 3)}`;
  return date.getFullYear() === now.getFullYear() ? base : `${base} ${date.getFullYear()}`;
}

export function describeDate(key: DateKey, now: Date = new Date()): string {
  const today = todayKey(now);
  if (key === today) return 'today';
  if (key === addDays(today, -1)) return 'yesterday';
  if (key === addDays(today, 1)) return 'tomorrow';
  return formatShortDate(key, now);
}

/** e.g. `21:05` from an ISO timestamp, in local time. */
export function formatTimeOfDay(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return '';
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function formatClock(hour: number, minute: number): string {
  return `${pad2(hour)}:${pad2(minute)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
