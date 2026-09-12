import { DailyAggregate } from '../../domain/statistics/types';
import { DateKey } from '../../domain/models';
import { getDb } from '../database';

interface DailyAggregateRow {
  date: string;
  entry_count: number;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  protein_missing: number;
  carbs_missing: number;
  fat_missing: number;
}

/**
 * One grouped query over the visible dates. Rows exist only for dates that have entries, so an
 * absent row means "nothing tracked" while a present row summing to zero is a real logged zero;
 * the per-macro missing counts keep unknown values out of the sums. Uses the (date, sort_order)
 * index for the range scan.
 */
const DAILY_AGGREGATE_SQL = `
  SELECT date,
    COUNT(*) AS entry_count,
    SUM(calories_per_100g * weight_grams / 100.0) AS calories,
    SUM(CASE WHEN protein_per_100g IS NULL THEN 0 ELSE protein_per_100g * weight_grams / 100.0 END) AS protein,
    SUM(CASE WHEN carbs_per_100g IS NULL THEN 0 ELSE carbs_per_100g * weight_grams / 100.0 END) AS carbs,
    SUM(CASE WHEN fat_per_100g IS NULL THEN 0 ELSE fat_per_100g * weight_grams / 100.0 END) AS fat,
    SUM(CASE WHEN protein_per_100g IS NULL THEN 1 ELSE 0 END) AS protein_missing,
    SUM(CASE WHEN carbs_per_100g IS NULL THEN 1 ELSE 0 END) AS carbs_missing,
    SUM(CASE WHEN fat_per_100g IS NULL THEN 1 ELSE 0 END) AS fat_missing
  FROM day_entries
  WHERE date BETWEEN ? AND ?
  GROUP BY date
  ORDER BY date ASC`;

/** Daily totals for a bounded date range. Dates without entries are absent and filled in by the caller. */
export async function listDailyAggregates(from: DateKey, to: DateKey): Promise<DailyAggregate[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DailyAggregateRow>(DAILY_AGGREGATE_SQL, [from, to]);
  return rows.map((row) => ({
    date: row.date,
    entryCount: row.entry_count,
    calories: row.calories ?? 0,
    protein: row.protein ?? 0,
    carbs: row.carbs ?? 0,
    fat: row.fat ?? 0,
    missing: { protein: row.protein_missing, carbs: row.carbs_missing, fat: row.fat_missing },
  }));
}
