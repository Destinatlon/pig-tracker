/**
 * Body-weight history: pure summaries over the measurements inside one calendar period.
 * Weighing is expected roughly once a week, so a period holds a handful of points at most and
 * the interesting figures are where it started, where it ended, and the difference.
 */
import { startOfWeek } from '../statistics/periods';
import { DateKey } from '../models';

export interface WeightEntry {
  date: DateKey;
  weightKg: number;
}

export interface WeightTrend {
  /** Earliest and latest measurement in the period, or null when there are none. */
  start: WeightEntry | null;
  end: WeightEntry | null;
  /** end − start, or null while fewer than two measurements make a change meaningless. */
  changeKg: number | null;
  count: number;
}

function byDate(entries: readonly WeightEntry[]): WeightEntry[] {
  return [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function summarizeWeights(entries: readonly WeightEntry[]): WeightTrend {
  const sorted = byDate(entries);
  const start = sorted[0] ?? null;
  const end = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  return {
    start,
    end,
    changeKg: start !== null && end !== null && sorted.length > 1 ? end.weightKg - start.weightKg : null,
    count: sorted.length,
  };
}

export interface WeeklyWeightPoint {
  /** Monday of the week these measurements fall in. */
  weekStart: DateKey;
  /** Mean of that week's measurements; with the expected one weighing a week, that value. */
  weightKg: number;
  count: number;
}

/**
 * One point per week that actually has measurements, in calendar order. Weeks without a
 * weighing are left out rather than interpolated — a missing week is missing data.
 */
export function weeklyWeightPoints(entries: readonly WeightEntry[]): WeeklyWeightPoint[] {
  const buckets = new Map<DateKey, { total: number; count: number }>();
  for (const entry of byDate(entries)) {
    const weekStart = startOfWeek(entry.date);
    const bucket = buckets.get(weekStart) ?? { total: 0, count: 0 };
    bucket.total += entry.weightKg;
    bucket.count += 1;
    buckets.set(weekStart, bucket);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([weekStart, { total, count }]) => ({ weekStart, weightKg: total / count, count }));
}

/** Lowest and highest value across the points, used to scale the weekly diagram. */
export function weightPointBounds(points: readonly WeeklyWeightPoint[]): { min: number; max: number } | null {
  if (points.length === 0) return null;
  let min = points[0].weightKg;
  let max = points[0].weightKg;
  for (const point of points) {
    min = Math.min(min, point.weightKg);
    max = Math.max(max, point.weightKg);
  }
  return { min, max };
}
