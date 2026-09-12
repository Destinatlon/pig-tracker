import { GoalRange, GoalSettings } from '../src/domain/models';
import {
  buildDayStatistics,
  chartScaleMax,
  classifyDay,
  goalRangeFor,
  metricTotal,
  summarizePeriod,
} from '../src/domain/statistics/calculations';
import { periodContaining } from '../src/domain/statistics/periods';
import { DailyAggregate, MetricKey } from '../src/domain/statistics/types';

const TODAY = '2026-09-12';
const WEEK = periodContaining('week', TODAY); // Mon 2026-09-07 .. Sun 2026-09-13

const range = (minimum: number | null, maximum: number | null): GoalRange => ({ minimum, maximum });

/** `calories` is the single stored target; the chart derives its +/-10% band. */
function goal(effectiveFrom: string, calories: number, protein: GoalRange = range(null, null)): GoalSettings {
  return {
    id: 1,
    calories,
    protein,
    carbs: range(null, null),
    fat: range(null, null),
    effectiveFrom,
    createdAt: 'c',
  };
}

function aggregate(date: string, values: Partial<DailyAggregate> = {}): DailyAggregate {
  return {
    date,
    entryCount: 1,
    calories: 2000,
    protein: 120,
    carbs: 200,
    fat: 60,
    missing: { protein: 0, carbs: 0, fat: 0 },
    ...values,
  };
}

const BASE_GOALS = [goal('1970-01-01', 2000, range(120, null))];

function build(aggregates: DailyAggregate[], metric: MetricKey = 'calories', goals = BASE_GOALS) {
  return buildDayStatistics(WEEK.dates, aggregates, goals, metric, TODAY);
}

describe('daily aggregation and completeness', () => {
  it('keeps an empty date distinct from a logged zero', () => {
    const days = build([aggregate('2026-09-08', { calories: 0 })]);
    const empty = days.find((day) => day.date === '2026-09-07')!;
    const zero = days.find((day) => day.date === '2026-09-08')!;
    expect(empty.value).toBeNull();
    expect(empty.entryCount).toBe(0);
    expect(empty.status).toBe('noData');
    expect(zero.value).toBe(0);
    expect(zero.entryCount).toBe(1);
    expect(zero.status).toBe('below');
  });

  it('reads the selected metric and its missing-entry count', () => {
    const row = aggregate('2026-09-08', { protein: 95, missing: { protein: 2, carbs: 0, fat: 0 } });
    expect(metricTotal(row, 'calories')).toEqual({ value: 2000, missingEntries: 0 });
    expect(metricTotal(row, 'protein')).toEqual({ value: 95, missingEntries: 2 });
  });

  it('marks a macro incomplete when one entry leaves it unknown, but keeps the partial sum for the bar', () => {
    const days = build([aggregate('2026-09-08', { protein: 95, missing: { protein: 1, carbs: 0, fat: 0 } })], 'protein');
    const day = days.find((d) => d.date === '2026-09-08')!;
    expect(day.complete).toBe(false);
    expect(day.missingEntries).toBe(1);
    expect(day.value).toBe(95);
    expect(day.status).toBe('incomplete');
  });

  it('always treats calories as complete on a logged day', () => {
    const days = build([aggregate('2026-09-08', { missing: { protein: 3, carbs: 3, fat: 3 } })], 'calories');
    expect(days.find((day) => day.date === '2026-09-08')!.status).toBe('normal');
  });

  it('fills in every date of the period', () => {
    expect(build([]).map((day) => day.date)).toEqual(WEEK.dates);
  });
});

describe('the calorie goal band', () => {
  it('derives +/-10% around the stored target, and only for calories', () => {
    const settings = goal('1970-01-01', 2000, range(120, null));
    expect(goalRangeFor(settings, 'calories')).toEqual(range(1800, 2200));
    expect(goalRangeFor(settings, 'protein')).toEqual(range(120, null));
    expect(goalRangeFor(null, 'calories')).toEqual(range(null, null));
  });

  it('classifies a calorie day against the derived band, not the bare target', () => {
    const days = build([
      aggregate('2026-09-07', { calories: 1799 }),
      aggregate('2026-09-08', { calories: 2100 }),
      aggregate('2026-09-09', { calories: 2201 }),
    ]);
    expect(days.find((day) => day.date === '2026-09-07')!.status).toBe('below');
    expect(days.find((day) => day.date === '2026-09-08')!.status).toBe('normal');
    expect(days.find((day) => day.date === '2026-09-09')!.status).toBe('above');
  });

  it('treats a macro boundary exactly as entered, with no hidden tolerance', () => {
    const goals = [goal('1970-01-01', 2000, range(120, null))];
    const days = build([aggregate('2026-09-07', { protein: 119 }), aggregate('2026-09-08', { protein: 120 })], 'protein', goals);
    expect(days.find((day) => day.date === '2026-09-07')!.status).toBe('below');
    expect(days.find((day) => day.date === '2026-09-08')!.status).toBe('normal');
  });
});

describe('classification precedence', () => {
  const band = range(1800, 2200);

  it('puts future and no-data first', () => {
    expect(classifyDay({ isFuture: true, entryCount: 3, complete: true, value: 5000, goal: band })).toBe('future');
    expect(classifyDay({ isFuture: false, entryCount: 0, complete: true, value: null, goal: band })).toBe('noData');
  });

  it('puts incompleteness above any range comparison', () => {
    expect(classifyDay({ isFuture: false, entryCount: 2, complete: false, value: 10, goal: band })).toBe('incomplete');
    expect(classifyDay({ isFuture: false, entryCount: 2, complete: false, value: 9000, goal: band })).toBe('incomplete');
  });

  it('reports no goal before comparing anything', () => {
    expect(classifyDay({ isFuture: false, entryCount: 2, complete: true, value: 2000, goal: range(null, null) })).toBe('noGoal');
  });

  it('compares one- and two-sided ranges', () => {
    expect(classifyDay({ isFuture: false, entryCount: 1, complete: true, value: 1700, goal: band })).toBe('below');
    expect(classifyDay({ isFuture: false, entryCount: 1, complete: true, value: 2000, goal: band })).toBe('normal');
    expect(classifyDay({ isFuture: false, entryCount: 1, complete: true, value: 2400, goal: band })).toBe('above');
    expect(classifyDay({ isFuture: false, entryCount: 1, complete: true, value: 3000, goal: range(1800, null) })).toBe('normal');
    expect(classifyDay({ isFuture: false, entryCount: 1, complete: true, value: 10, goal: range(null, 2200) })).toBe('normal');
  });

  it('marks dates after today as future', () => {
    const days = build([]);
    expect(days.find((day) => day.date === '2026-09-13')!.status).toBe('future');
    expect(days.find((day) => day.date === '2026-09-12')!.isToday).toBe(true);
  });
});

describe('period summaries', () => {
  const loggedWeek = [
    aggregate('2026-09-07', { calories: 1700 }), // below
    aggregate('2026-09-08', { calories: 2000 }), // normal
    aggregate('2026-09-09', { calories: 2500 }), // above
    aggregate('2026-09-11', { calories: 2000 }), // normal
    aggregate('2026-09-12', { calories: 500 }), // today, excluded
  ];

  it('excludes empty days rather than counting them as zero', () => {
    const summary = summarizePeriod(build(loggedWeek), TODAY);
    expect(summary.averageDays).toBe(4);
    expect(summary.averageValue).toBe((1700 + 2000 + 2500 + 2000) / 4);
  });

  it('charts today but leaves it out of averages, counts and extremes', () => {
    const days = build(loggedWeek);
    expect(days.find((day) => day.date === TODAY)!.value).toBe(500);
    const summary = summarizePeriod(days, TODAY);
    expect(summary.highest).toEqual({ date: '2026-09-09', value: 2500 });
    expect(summary.lowest).toEqual({ date: '2026-09-07', value: 1700 });
    expect(summary.counts).toEqual({ below: 1, normal: 2, above: 1 });
  });

  it('excludes future days from every aggregate', () => {
    const summary = summarizePeriod(build([...loggedWeek, aggregate('2026-09-13', { calories: 9000 })]), TODAY);
    expect(summary.highest!.value).toBe(2500);
    expect(summary.averageDays).toBe(4);
  });

  it('counts logged-day coverage only up to today', () => {
    const summary = summarizePeriod(build(loggedWeek), TODAY);
    expect(summary.loggedDays).toBe(5);
    expect(summary.coverageDays).toBe(6);
  });

  it('uses the whole period as the denominator for a past week', () => {
    const past = periodContaining('week', '2026-08-10');
    const days = buildDayStatistics(past.dates, [aggregate('2026-08-11')], BASE_GOALS, 'calories', TODAY);
    const summary = summarizePeriod(days, TODAY);
    expect(summary.coverageDays).toBe(7);
    expect(summary.loggedDays).toBe(1);
  });

  it('averages macros over complete days only', () => {
    const days = build(
      [
        aggregate('2026-09-07', { protein: 140 }),
        aggregate('2026-09-08', { protein: 90, missing: { protein: 2, carbs: 0, fat: 0 } }),
        aggregate('2026-09-09', { protein: 160 }),
      ],
      'protein',
    );
    const summary = summarizePeriod(days, TODAY);
    expect(summary.averageDays).toBe(2);
    expect(summary.averageValue).toBe(150);
    expect(summary.assessedDays).toBe(2);
  });

  it('counts statuses for assessed days only', () => {
    const days = build(
      [
        aggregate('2026-09-07', { protein: 140 }),
        aggregate('2026-09-08', { protein: 90, missing: { protein: 1, carbs: 0, fat: 0 } }),
      ],
      'protein',
      [goal('1970-01-01', 2000, range(null, null))],
    );
    const summary = summarizePeriod(days, TODAY);
    // No protein goal at all, so nothing is assessable even though one day is complete.
    expect(summary.assessedDays).toBe(0);
    expect(summary.counts).toEqual({ below: 0, normal: 0, above: 0 });
    expect(summary.averageDays).toBe(1);
  });

  it('applies a goal change from the date it took effect', () => {
    const goals = [goal('1970-01-01', 2000), goal('2026-09-09', 2500)];
    const days = build([aggregate('2026-09-08', { calories: 2000 }), aggregate('2026-09-09', { calories: 2000 })], 'calories', goals);
    expect(days.find((day) => day.date === '2026-09-08')!.status).toBe('normal');
    expect(days.find((day) => day.date === '2026-09-09')!.status).toBe('below');
    expect(days.find((day) => day.date === '2026-09-09')!.goal).toEqual(range(2250, 2750));
  });

  it('averages each goal boundary only over days that have it', () => {
    const goals = [goal('1970-01-01', 2000, range(100, null)), goal('2026-09-09', 2000, range(200, null))];
    const summary = summarizePeriod(
      build([aggregate('2026-09-07', { protein: 150 }), aggregate('2026-09-09', { protein: 210 })], 'protein', goals),
      TODAY,
    );
    expect(summary.averageMinimum).toBe(150);
    expect(summary.minimumDays).toBe(2);
    // No included day configures an upper protein boundary, so there is no average to show.
    expect(summary.averageMaximum).toBeNull();
    expect(summary.maximumDays).toBe(0);
  });

  it('resolves highest/lowest ties to the earliest date', () => {
    const summary = summarizePeriod(
      build([aggregate('2026-09-07', { calories: 2000 }), aggregate('2026-09-08', { calories: 2000 })]),
      TODAY,
    );
    expect(summary.highest!.date).toBe('2026-09-07');
    expect(summary.lowest!.date).toBe('2026-09-07');
  });

  it('reports the single eligible day as both extremes', () => {
    const summary = summarizePeriod(build([aggregate('2026-09-07', { calories: 2000 })]), TODAY);
    expect(summary.averageDays).toBe(1);
    expect(summary.highest).toEqual(summary.lowest);
  });

  it('has no average at all when nothing is eligible', () => {
    const summary = summarizePeriod(build([]), TODAY);
    expect(summary.averageValue).toBeNull();
    expect(summary.averageDays).toBe(0);
    expect(summary.highest).toBeNull();
  });
});

describe('chart scale', () => {
  it('leaves headroom above the largest intake or boundary', () => {
    const days = build([aggregate('2026-09-07', { calories: 3000 })]);
    expect(chartScaleMax(days)).toBeCloseTo(3300, 6);
  });

  it('never returns zero for an all-zero or empty period with no goal', () => {
    // A disabled macro: no entries and no boundaries, so nothing positive to scale from.
    const days = buildDayStatistics(WEEK.dates, [], [goal('1970-01-01', 2000, range(null, null))], 'protein', TODAY);
    expect(chartScaleMax(days)).toBeGreaterThan(0);
  });
});
