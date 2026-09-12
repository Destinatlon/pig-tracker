import { nowIso } from '../../domain/dates';
import { DateKey } from '../../domain/models';
import { WeightEntry } from '../../domain/weight/trend';
import { getDb } from '../database';

interface BodyWeightRow {
  date: string;
  weight_kg: number;
}

/** Measurements inside a bounded date range, in calendar order. */
export async function listWeightsInRange(from: DateKey, to: DateKey): Promise<WeightEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<BodyWeightRow>(
    'SELECT date, weight_kg FROM body_weights WHERE date BETWEEN ? AND ? ORDER BY date ASC',
    [from, to],
  );
  return rows.map((row) => ({ date: row.date, weightKg: row.weight_kg }));
}

export async function getWeightForDate(date: DateKey): Promise<WeightEntry | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<BodyWeightRow>('SELECT date, weight_kg FROM body_weights WHERE date = ?', [date]);
  return row ? { date: row.date, weightKg: row.weight_kg } : null;
}

/** The most recent measurement on or before a date, used to prefill the next weighing. */
export async function getLatestWeight(onOrBefore: DateKey): Promise<WeightEntry | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<BodyWeightRow>(
    'SELECT date, weight_kg FROM body_weights WHERE date <= ? ORDER BY date DESC LIMIT 1',
    [onOrBefore],
  );
  return row ? { date: row.date, weightKg: row.weight_kg } : null;
}

/** Records the weighing for a date, replacing that date's measurement if it already has one. */
export async function saveWeight(date: DateKey, weightKg: number): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  await db.runAsync(
    `INSERT INTO body_weights (date, weight_kg, created_at, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET weight_kg = excluded.weight_kg, updated_at = excluded.updated_at`,
    [date, weightKg, now, now],
  );
}

export async function deleteWeight(date: DateKey): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM body_weights WHERE date = ?', [date]);
}
