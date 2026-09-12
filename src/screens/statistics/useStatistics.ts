import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { listGoalsForRange } from '../../db/repositories/goalsRepo';
import { listDailyAggregates } from '../../db/repositories/statisticsRepo';
import { buildDayStatistics, summarizePeriod } from '../../domain/statistics/calculations';
import { Period } from '../../domain/statistics/periods';
import { DailyAggregate, DayStatistic, MetricKey, PeriodSummary } from '../../domain/statistics/types';
import { GoalSettings, DateKey } from '../../domain/models';

interface Loaded {
  aggregates: DailyAggregate[];
  goals: GoalSettings[];
}

export interface StatisticsState {
  days: DayStatistic[];
  summary: PeriodSummary | null;
  loading: boolean;
  error: unknown;
  reload: () => void;
}

/**
 * Loads the entries and goal history of one calendar period in two bounded queries and derives
 * the per-day statistics locally, so switching metric costs no I/O. Reloading on focus keeps the
 * chart honest after entries or goals are edited elsewhere, and responses that arrive after the
 * user has moved on are dropped rather than rendered over the newer period.
 */
export function useStatistics(period: Period, metric: MetricKey, today: DateKey): StatisticsState {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const requestId = useRef(0);
  const { start, end } = period;

  useFocusEffect(
    useCallback(() => {
      const id = ++requestId.current;
      setLoading(true);
      setError(null);
      Promise.all([listDailyAggregates(start, end), listGoalsForRange(start, end)])
        .then(([aggregates, goals]) => {
          if (id !== requestId.current) return;
          setLoaded({ aggregates, goals });
          setLoading(false);
        })
        .catch((failure) => {
          if (id !== requestId.current) return;
          // An empty chart would read as "nothing logged"; surface the failure and keep the retry.
          console.error('Failed to load statistics', failure);
          setLoaded(null);
          setError(failure);
          setLoading(false);
        });
      // Leaving the screen invalidates the request in flight; refocusing starts a fresh one.
      return () => {
        requestId.current++;
      };
    }, [start, end, attempt]),
  );

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  if (loaded === null) return { days: [], summary: null, loading, error, reload };
  const days = buildDayStatistics(period.dates, loaded.aggregates, loaded.goals, metric, today);
  return { days, summary: summarizePeriod(days, today), loading, error, reload };
}
