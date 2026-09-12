import { pointTargetToRange } from '../../domain/goals/range';
import type { Migration } from './index';

/** A row of the original point-target `goal_settings` table. */
export interface LegacyGoalRow {
  id: number;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  effective_from: string;
  created_at: string;
}

/** A row of the rebuilt range-based table. */
export interface GoalRangeRow {
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

/**
 * Each non-null point target becomes an explicit +/-10% range; a disabled macro stays disabled.
 * Ids and dates are preserved so goal history keeps pointing at the same days. Exported so the
 * conversion can be unit-tested without a database.
 */
export function convertLegacyGoalRow(row: LegacyGoalRow): GoalRangeRow {
  const calories = pointTargetToRange(row.calories);
  const protein = pointTargetToRange(row.protein);
  const carbs = pointTargetToRange(row.carbs);
  const fat = pointTargetToRange(row.fat);
  return {
    id: row.id,
    calories_min: calories.minimum,
    calories_max: calories.maximum,
    protein_min: protein.minimum,
    protein_max: protein.maximum,
    carbs_min: carbs.minimum,
    carbs_max: carbs.maximum,
    fat_min: fat.minimum,
    fat_max: fat.maximum,
    effective_from: row.effective_from,
    created_at: row.created_at,
  };
}

export const INSERT_GOAL_RANGE_SQL = `
  INSERT INTO goal_settings (id, calories_min, calories_max, protein_min, protein_max, carbs_min, carbs_max,
    fat_min, fat_max, effective_from, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

export function goalRangeInsertParams(row: GoalRangeRow): (number | string | null)[] {
  return [
    row.id,
    row.calories_min,
    row.calories_max,
    row.protein_min,
    row.protein_max,
    row.carbs_min,
    row.carbs_max,
    row.fat_min,
    row.fat_max,
    row.effective_from,
    row.created_at,
  ];
}

/**
 * Replaces the single point target per nutrient with a lower/upper range. The table is rebuilt
 * rather than extended so the obsolete columns cannot survive as a second source of truth.
 */
export const migration004GoalRanges: Migration = {
  version: 4,
  name: 'goal_ranges',
  async up(db) {
    const legacy = await db.getAllAsync<LegacyGoalRow>('SELECT * FROM goal_settings ORDER BY effective_from ASC');

    await db.execAsync(`
      ALTER TABLE goal_settings RENAME TO goal_settings_legacy;

      CREATE TABLE goal_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        -- Either boundary may be NULL. Both NULL means the nutrient has no goal; calories always have one.
        calories_min REAL CHECK (calories_min IS NULL OR calories_min >= 0),
        calories_max REAL CHECK (calories_max IS NULL OR calories_max >= 0),
        protein_min REAL CHECK (protein_min IS NULL OR protein_min >= 0),
        protein_max REAL CHECK (protein_max IS NULL OR protein_max >= 0),
        carbs_min REAL CHECK (carbs_min IS NULL OR carbs_min >= 0),
        carbs_max REAL CHECK (carbs_max IS NULL OR carbs_max >= 0),
        fat_min REAL CHECK (fat_min IS NULL OR fat_min >= 0),
        fat_max REAL CHECK (fat_max IS NULL OR fat_max >= 0),
        effective_from TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        CHECK (calories_min IS NOT NULL OR calories_max IS NOT NULL),
        CHECK (calories_min IS NULL OR calories_max IS NULL OR calories_min <= calories_max),
        CHECK (protein_min IS NULL OR protein_max IS NULL OR protein_min <= protein_max),
        CHECK (carbs_min IS NULL OR carbs_max IS NULL OR carbs_min <= carbs_max),
        CHECK (fat_min IS NULL OR fat_max IS NULL OR fat_min <= fat_max)
      );
    `);

    for (const row of legacy) {
      await db.runAsync(INSERT_GOAL_RANGE_SQL, goalRangeInsertParams(convertLegacyGoalRow(row)));
    }

    await db.execAsync('DROP TABLE goal_settings_legacy;');
  },
};
