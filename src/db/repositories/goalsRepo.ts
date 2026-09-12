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

/**
 * Every goal row needed to resolve the goals of a date range: the one in force on `from` plus
 * each later change inside the range. One query instead of one lookup per charted date.
 */
export async function listGoalsForRange(from: DateKey, to: DateKey): Promise<GoalSettings[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<GoalRow>(
    `SELECT * FROM goal_settings
     WHERE effective_from BETWEEN ? AND ?
        OR effective_from = (SELECT MAX(effective_from) FROM goal_settings WHERE effective_from <= ?)
     ORDER BY effective_from ASC`,
    [from, to, from],
  );
  if (rows.length > 0) return rows.map(mapGoal);
  const baseline = await db.getFirstAsync<GoalRow>('SELECT * FROM goal_settings ORDER BY effective_from ASC LIMIT 1');
  return baseline ? [mapGoal(baseline)] : [];
}

/** Saves a goal effective from the given date without touching earlier history. Same-day saves replace each other. */
export async function saveGoalEffectiveFrom(date: DateKey, goal: GoalInput): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO goal_settings (calories, protein_min, protein_max, carbs_min, carbs_max,
       fat_min, fat_max, effective_from, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(effective_from) DO UPDATE SET
       calories = excluded.calories,
       protein_min = excluded.protein_min, protein_max = excluded.protein_max,
       carbs_min = excluded.carbs_min, carbs_max = excluded.carbs_max,
       fat_min = excluded.fat_min, fat_max = excluded.fat_max`,
    [
      goal.calories,
      goal.protein.minimum,
      goal.protein.maximum,
      goal.carbs.minimum,
      goal.carbs.maximum,
      goal.fat.minimum,
      goal.fat.maximum,
      date,
      nowIso(),
    ],
  );
}
