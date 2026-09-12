import { DateKey, GoalRange, MacroKey, NutrientKey } from '../models';

/** The nutrient currently graphed. Only one at a time: calories and grams have different scales. */
export type MetricKey = NutrientKey;
export const METRIC_KEYS: readonly MetricKey[] = ['calories', 'protein', 'carbs', 'fat'];

/**
 * One date as the repository returns it. Dates with no entries have no aggregate at all, which
 * is what distinguishes an untracked day from a logged day that really adds up to zero.
 */
export interface DailyAggregate {
  date: DateKey;
  entryCount: number;
  calories: number;
  /** Sums of the known values only; check `missing` before treating one as a full total. */
  protein: number;
  carbs: number;
  fat: number;
  /** How many of the date's entries have no value for each macro. */
  missing: Record<MacroKey, number>;
}

export type StatisticStatus = 'noData' | 'future' | 'incomplete' | 'noGoal' | 'below' | 'normal' | 'above';

/** Statuses that represent a real comparison against a goal range. */
export const ASSESSED_STATUSES: readonly StatisticStatus[] = ['below', 'normal', 'above'];

export interface DayStatistic {
  date: DateKey;
  entryCount: number;
  /** Known total of the selected metric, or null when the date has no entries. */
  value: number | null;
  /** False when at least one entry of the date has no value for the selected macro. */
  complete: boolean;
  /** How many entries are missing the selected macro. Zero for calories. */
  missingEntries: number;
  goal: GoalRange;
  status: StatisticStatus;
  isToday: boolean;
  isFuture: boolean;
}

export interface Extreme {
  date: DateKey;
  value: number;
}

export interface PeriodSummary {
  /** Average over completed logged days with complete data for the metric; null when there are none. */
  averageValue: number | null;
  /** How many days the average is built from. */
  averageDays: number;
  /** Averages of the historical boundaries, over the same days that had such a boundary. */
  averageMinimum: number | null;
  minimumDays: number;
  averageMaximum: number | null;
  maximumDays: number;
  /** Dates with at least one entry, out of the calendar dates up to and including today. */
  loggedDays: number;
  coverageDays: number;
  counts: { below: number; normal: number; above: number };
  assessedDays: number;
  highest: Extreme | null;
  lowest: Extreme | null;
}
