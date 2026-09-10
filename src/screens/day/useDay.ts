import { useCallback, useEffect, useRef, useState } from 'react';
import { listEntriesForDate } from '../../db/repositories/dayEntriesRepo';
import { getGoalForDate } from '../../db/repositories/goalsRepo';
import { DateKey, DayEntry, GoalSettings } from '../../domain/models';

export interface DayState {
  entries: DayEntry[];
  goal: GoalSettings | null;
  loading: boolean;
  reload: () => Promise<void>;
  /** Optimistic local update after a write that already succeeded. */
  setEntries: (entries: DayEntry[]) => void;
}

/** Loads the entries and the goal in force for a date. Stale responses from a previous date are ignored. */
export function useDay(date: DateKey): DayState {
  const [entries, setEntriesState] = useState<DayEntry[]>([]);
  const [goal, setGoal] = useState<GoalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    const [nextEntries, nextGoal] = await Promise.all([listEntriesForDate(date), getGoalForDate(date)]);
    if (id !== requestId.current) return;
    setEntriesState(nextEntries);
    setGoal(nextGoal);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    setLoading(true);
    reload().catch((error) => console.error('Failed to load day', error));
  }, [reload]);

  const setEntries = useCallback((next: DayEntry[]) => setEntriesState(next), []);

  return { entries, goal, loading, reload, setEntries };
}
