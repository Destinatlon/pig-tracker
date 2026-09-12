import { POINT_TARGET_TOLERANCE } from '../../domain/goals/constants';
import type { Migration } from './index';

/** Ratio between the two sides of a band written by the +/-10% point-target rule. */
const BAND_RATIO = (1 + POINT_TARGET_TOLERANCE) / (1 - POINT_TARGET_TOLERANCE);

export interface Bounds {
  minimum: number | null;
  maximum: number | null;
}

/**
 * The single number behind a stored pair of boundaries. A recognisable +/-10% band (written by
 * migration 004 or by an applied estimate) gives back exactly the number the user typed; any
 * other two-sided range collapses to its midpoint, and a one-sided range keeps its own value.
 */
export function recoverTarget(bounds: Bounds): number | null {
  const { minimum, maximum } = bounds;
  if (minimum === null) return maximum;
  if (maximum === null) return minimum;
  const expected = minimum * BAND_RATIO;
  const isGeneratedBand = minimum > 0 && Math.abs(maximum - expected) <= 1e-9 * Math.max(1, expected);
  return isGeneratedBand ? minimum / (1 - POINT_TARGET_TOLERANCE) : (minimum + maximum) / 2;
}

export interface RangeGoalRow {
  id: number;
  calories_min: number | null;
  calories_max: number | null;
  protein_min: number | null;
  protein_max: number | null;
  carbs_min: number | null;
  carbs_max: number | null;
  fat_min: number | null;
  fat_max: number | null;
  effective_from: string;
  created_at: string;
}

export const INSERT_GOAL_SQL = `
  INSERT INTO goal_settings (id, calories, protein_min, protein_max, carbs_min, carbs_max, fat_min, fat_max,
    effective_from, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

/**
 * Calories become the single daily target again — the +/-10% band belongs to the statistics
 * screen, which derives it when it needs to colour a day, not to storage. A macro keeps one
 * boundary, as its editor now offers one value plus a direction.
 */
export function goalInsertParams(row: RangeGoalRow): (number | string | null)[] {
  const calories = recoverTarget({ minimum: row.calories_min, maximum: row.calories_max });
  return [
    row.id,
    calories ?? 0,
    recoverTarget({ minimum: row.protein_min, maximum: row.protein_max }),
    null,
    recoverTarget({ minimum: row.carbs_min, maximum: row.carbs_max }),
    null,
    recoverTarget({ minimum: row.fat_min, maximum: row.fat_max }),
    null,
    row.effective_from,
    row.created_at,
  ];
}

/**
 * Collapses each nutrient goal to the single number its editor now shows: one calorie target,
 * and one boundary per macro. Ids and effective dates are preserved so goal history keeps
 * pointing at the same days.
 */
export const migration005SingleMacroBound: Migration = {
  version: 5,
  name: 'single_macro_bound',
  async up(db) {
    const rows = await db.getAllAsync<RangeGoalRow>('SELECT * FROM goal_settings ORDER BY effective_from ASC');

    await db.execAsync(`
      ALTER TABLE goal_settings RENAME TO goal_settings_ranges;

      CREATE TABLE goal_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        -- One daily calorie target. Any tolerance around it is a presentation concern.
        calories REAL NOT NULL CHECK (calories >= 0),
        -- A macro goal fills exactly one side, or neither when the macro is disabled.
        protein_min REAL CHECK (protein_min IS NULL OR protein_min >= 0),
        protein_max REAL CHECK (protein_max IS NULL OR protein_max >= 0),
        carbs_min REAL CHECK (carbs_min IS NULL OR carbs_min >= 0),
        carbs_max REAL CHECK (carbs_max IS NULL OR carbs_max >= 0),
        fat_min REAL CHECK (fat_min IS NULL OR fat_min >= 0),
        fat_max REAL CHECK (fat_max IS NULL OR fat_max >= 0),
        effective_from TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        CHECK (protein_min IS NULL OR protein_max IS NULL),
        CHECK (carbs_min IS NULL OR carbs_max IS NULL),
        CHECK (fat_min IS NULL OR fat_max IS NULL)
      );
    `);

    for (const row of rows) {
      await db.runAsync(INSERT_GOAL_SQL, goalInsertParams(row));
    }

    await db.execAsync('DROP TABLE goal_settings_ranges;');
  },
};
