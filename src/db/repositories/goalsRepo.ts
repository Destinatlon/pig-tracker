import { nowIso } from '../../domain/dates';
import { DateKey, GoalInput, GoalSettings } from '../../domain/models';
import { getDb } from '../database';
import { GoalRow, mapGoal } from './rowMappers';

/** The goal in force on a date: the latest row whose effective_from is on or before it. */
export async function getGoalForDate(date: DateKey): Promise<GoalSettings> {
  const db = await getDb();
  const row =
    (await db.getFirstAsync<GoalRow>(
      'SELECT * FROM goal_settings WHERE effective_from <= ? ORDER BY effective_from DESC LIMIT 1',
      [date],
    )) ?? (await db.getFirstAsync<GoalRow>('SELECT * FROM goal_settings ORDER BY effective_from ASC LIMIT 1'));
  if (!row) throw new Error('No goal settings found');
  return mapGoal(row);
}

/** Saves a goal effective from the given date without touching earlier history. Same-day saves replace each other. */
export async function saveGoalEffectiveFrom(date: DateKey, goal: GoalInput): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO goal_settings (calories, protein, carbs, fat, effective_from, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(effective_from) DO UPDATE SET calories = excluded.calories, protein = excluded.protein,
       carbs = excluded.carbs, fat = excluded.fat`,
    [goal.calories, goal.protein, goal.carbs, goal.fat, date, nowIso()],
  );
}
