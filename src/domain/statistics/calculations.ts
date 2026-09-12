/**
 * Pure classification and period summaries. Nothing here reads the database or the product
 * library: day-entry snapshots, already aggregated per date, are the only source of truth.
 */
import { resolveEffective } from '../goals/history';
import { NO_GOAL, pointTargetToRange, positionInRange } from '../goals/range';
import { DateKey, GoalRange, GoalSettings, MacroKey } from '../models';
import { DailyAggregate, DayStatistic, Extreme, MetricKey, PeriodSummary, StatisticStatus } from './types';

/** The known total of one metric on a date, plus whether any entry left it unknown. */
export function metricTotal(aggregate: DailyAggregate, metric: MetricKey): { value: number; missingEntries: number } {
  if (metric === 'calories') return { value: aggregate.calories, missingEntries: 0 };
  const macro: MacroKey = metric;
  return { value: aggregate[macro], missingEntries: aggregate.missing[macro] };
}

/**
 * The boundaries a metric is judged against on one date. Calories are stored as a single daily
 * target, so the tolerance band around it is derived here — the only place it exists — while a
 * macro is compared against the one boundary the user configured, exactly as entered.
 */
export function goalRangeFor(goal: GoalSettings | null, metric: MetricKey): GoalRange {
  if (goal === null) return NO_GOAL;
  return metric === 'calories' ? pointTargetToRange(goal.calories) : goal[metric];
}

export interface ClassifyInput {
  isFuture: boolean;
  entryCount: number;
  complete: boolean;
  value: number | null;
  goal: GoalRange;
}

/**
 * Exhaustive status in the specified precedence order. An incomplete macro day never becomes
 * adherence or non-adherence: a partial sum is not a total.
 */
export function classifyDay({ isFuture, entryCount, complete, value, goal }: ClassifyInput): StatisticStatus {
  if (isFuture) return 'future';
  if (entryCount === 0 || value === null) return 'noData';
  if (!complete) return 'incomplete';
  const position = positionInRange(value, goal);
  if (position === 'noGoal') return 'noGoal';
  if (position === 'below') return 'below';
  if (position === 'above') return 'above';
  return 'normal';
}

/**
 * One entry per date of the period, in calendar order. Dates the query returned nothing for are
 * filled in explicitly so the chart always has exactly as many columns as the period has days.
 */
export function buildDayStatistics(
  dates: readonly DateKey[],
  aggregates: readonly DailyAggregate[],
  goals: readonly GoalSettings[],
  metric: MetricKey,
  today: DateKey,
): DayStatistic[] {
  const byDate = new Map(aggregates.map((aggregate) => [aggregate.date, aggregate]));
  return dates.map((date) => {
    const aggregate = byDate.get(date);
    const range = goalRangeFor(resolveEffective(goals, date), metric);
    const isFuture = date > today;
    const totals = aggregate ? metricTotal(aggregate, metric) : null;
    const entryCount = aggregate?.entryCount ?? 0;
    const complete = totals !== null && totals.missingEntries === 0;
    const value = totals === null ? null : totals.value;
    return {
      date,
      entryCount,
      value,
      complete,
      missingEntries: totals?.missingEntries ?? 0,
      goal: range,
      status: classifyDay({ isFuture, entryCount, complete, value, goal: range }),
      isToday: date === today,
      isFuture,
    };
  });
}

function average(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Days whose intake counts towards the average, the extremes and the status counts: completed
 * (so never today or a future date), logged, and complete for the selected metric.
 */
function eligibleDays(days: readonly DayStatistic[]): DayStatistic[] {
  return days.filter((day) => !day.isToday && !day.isFuture && day.entryCount > 0 && day.complete && day.value !== null);
}

/** Ties resolve to the earliest date so repeated renders always pick the same day. */
function extremes(days: readonly DayStatistic[]): { highest: Extreme | null; lowest: Extreme | null } {
  let highest: Extreme | null = null;
  let lowest: Extreme | null = null;
  for (const day of days) {
    const value = day.value as number;
    if (highest === null || value > highest.value) highest = { date: day.date, value };
    if (lowest === null || value < lowest.value) lowest = { date: day.date, value };
  }
  return { highest, lowest };
}

/**
 * Period statistics for the selected metric. Empty days are never counted as zero intake, today
 * is charted but excluded from every aggregate, and goal boundaries are averaged per date from
 * the history that actually applied.
 */
export function summarizePeriod(days: readonly DayStatistic[], today: DateKey): PeriodSummary {
  const eligible = eligibleDays(days);
  const minimums = eligible.map((day) => day.goal.minimum).filter((value): value is number => value !== null);
  const maximums = eligible.map((day) => day.goal.maximum).filter((value): value is number => value !== null);
  const throughToday = days.filter((day) => day.date <= today);
  const counts = { below: 0, normal: 0, above: 0 };
  for (const day of eligible) {
    if (day.status === 'below') counts.below++;
    else if (day.status === 'normal') counts.normal++;
    else if (day.status === 'above') counts.above++;
  }
  const { highest, lowest } = extremes(eligible);
  return {
    averageValue: average(eligible.map((day) => day.value as number)),
    averageDays: eligible.length,
    averageMinimum: average(minimums),
    minimumDays: minimums.length,
    averageMaximum: average(maximums),
    maximumDays: maximums.length,
    loggedDays: throughToday.filter((day) => day.entryCount > 0).length,
    coverageDays: throughToday.length,
    counts,
    assessedDays: counts.below + counts.normal + counts.above,
    highest,
    lowest,
  };
}

/** Upper bound of the value axis: the largest charted intake or boundary, plus modest headroom. */
export function chartScaleMax(days: readonly DayStatistic[], headroom = 0.1): number {
  let max = 0;
  for (const day of days) {
    if (day.value !== null) max = Math.max(max, day.value);
    if (day.goal.minimum !== null) max = Math.max(max, day.goal.minimum);
    if (day.goal.maximum !== null) max = Math.max(max, day.goal.maximum);
  }
  // An all-zero or entirely empty period still needs a positive scale to divide by.
  if (!(max > 0)) return 1;
  return max * (1 + headroom);
}
