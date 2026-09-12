import { convertLegacyGoalRow, goalRangeInsertParams, LegacyGoalRow, migration004GoalRanges } from '../src/db/migrations/004_goal_ranges';
import { goalInsertParams, migration005SingleMacroBound, RangeGoalRow, recoverTarget } from '../src/db/migrations/005_single_macro_bound';
import { resolveEffective } from '../src/domain/goals/history';
import {
  hasGoal,
  isValidRange,
  parseBoundText,
  pointTargetToRange,
  positionInRange,
  preferredBound,
  rangeForBound,
  rangeShape,
} from '../src/domain/goals/range';
import { GoalRange } from '../src/domain/models';
import { formatCalories } from '../src/domain/nutrition/format';

const range = (minimum: number | null, maximum: number | null): GoalRange => ({ minimum, maximum });

describe('goal ranges', () => {
  it('treats a nutrient with no boundary as disabled', () => {
    expect(hasGoal(range(null, null))).toBe(false);
    expect(hasGoal(range(120, null))).toBe(true);
    expect(hasGoal(range(null, 80))).toBe(true);
  });

  it('classifies one-sided ranges', () => {
    expect(positionInRange(100, range(120, null))).toBe('below');
    expect(positionInRange(130, range(120, null))).toBe('within');
    expect(positionInRange(90, range(null, 80))).toBe('above');
    expect(positionInRange(70, range(null, 80))).toBe('within');
  });

  it('classifies two-sided ranges and counts equality as within', () => {
    const band = range(1800, 2200);
    expect(positionInRange(1799.9, band)).toBe('below');
    expect(positionInRange(1800, band)).toBe('within');
    expect(positionInRange(2200, band)).toBe('within');
    expect(positionInRange(2200.1, band)).toBe('above');
  });

  it('reports no goal when both boundaries are absent', () => {
    expect(positionInRange(2000, range(null, null))).toBe('noGoal');
  });

  it('rejects negative and non-finite boundaries', () => {
    expect(isValidRange(range(-1, 100))).toBe(false);
    expect(isValidRange(range(100, Number.POSITIVE_INFINITY))).toBe(false);
    expect(isValidRange(range(Number.NaN, null))).toBe(false);
    expect(isValidRange(range(0, 0))).toBe(true);
  });

  it('rejects a minimum greater than the maximum', () => {
    expect(isValidRange(range(2200, 1800))).toBe(false);
  });

  it('cannot take a negative boundary from a field', () => {
    // The numeric fields sanitize input, so a minus sign never reaches the parser at all.
    expect(parseBoundText('-5', 'minimum')).toEqual({ ok: true, value: range(5, null) });
    expect(isValidRange(range(-5, null))).toBe(false);
  });

  it('widens a point target to +/-10% at full precision', () => {
    expect(pointTargetToRange(2000)).toEqual(range(1800, 2200));
    expect(pointTargetToRange(null)).toEqual(range(null, null));
    expect(pointTargetToRange(0)).toEqual(range(0, 0));
    expect(pointTargetToRange(155).minimum).toBeCloseTo(139.5, 10);
  });

  it('describes a range for display without building user-facing text', () => {
    expect(rangeShape(range(1800, 2200), formatCalories)).toEqual({ key: 'both', params: { min: '1800', max: '2200' } });
    expect(rangeShape(range(120, null), formatCalories)).toEqual({ key: 'min', params: { min: '120' } });
    expect(rangeShape(range(null, 80), formatCalories)).toEqual({ key: 'max', params: { max: '80' } });
    expect(rangeShape(range(null, null), formatCalories)).toEqual({ key: 'none', params: {} });
  });
});

describe('one-sided macro goals', () => {
  it('builds a range from a single boundary and its direction', () => {
    expect(rangeForBound('minimum', 150)).toEqual(range(150, null));
    expect(rangeForBound('maximum', 70)).toEqual(range(null, 70));
  });

  it('edits a two-sided stored range from its minimum', () => {
    expect(preferredBound(range(135, 165))).toBe('minimum');
    expect(preferredBound(range(150, null))).toBe('minimum');
    expect(preferredBound(range(null, 70))).toBe('maximum');
    expect(preferredBound(range(null, null))).toBe('minimum');
  });

  it('requires a value once the macro is enabled', () => {
    expect(parseBoundText('', 'minimum')).toEqual({ ok: false, error: 'required' });
    expect(parseBoundText('150', 'minimum')).toEqual({ ok: true, value: range(150, null) });
    expect(parseBoundText('70', 'maximum')).toEqual({ ok: true, value: range(null, 70) });
    expect(parseBoundText('0', 'maximum')).toEqual({ ok: true, value: range(null, 0) });
  });
});

describe('effective-dated goal selection', () => {
  const rows = [
    { effectiveFrom: '1970-01-01', id: 1 },
    { effectiveFrom: '2026-03-10', id: 2 },
    { effectiveFrom: '2026-05-01', id: 3 },
  ];

  it('uses the latest row on or before the date', () => {
    expect(resolveEffective(rows, '2026-03-09')?.id).toBe(1);
    expect(resolveEffective(rows, '2026-03-10')?.id).toBe(2);
    expect(resolveEffective(rows, '2026-04-30')?.id).toBe(2);
    expect(resolveEffective(rows, '2026-12-31')?.id).toBe(3);
  });

  it('falls back to the earliest row for a date before all of them', () => {
    expect(resolveEffective([{ effectiveFrom: '2026-05-01', id: 3 }], '2020-01-01')?.id).toBe(3);
  });

  it('does not care about row order', () => {
    expect(resolveEffective([...rows].reverse(), '2026-04-01')?.id).toBe(2);
  });

  it('returns null without any rows', () => {
    expect(resolveEffective([], '2026-04-01')).toBeNull();
  });
});

/** Minimal stand-in for the SQLite handle: it feeds the legacy rows in and records the inserts. */
function fakeDb(rows: LegacyGoalRow[]) {
  const statements: string[] = [];
  const inserted: (number | string | null)[][] = [];
  return {
    db: {
      getAllAsync: async () => rows,
      execAsync: async (sql: string) => {
        statements.push(sql);
      },
      runAsync: async (_sql: string, params: (number | string | null)[]) => {
        inserted.push(params);
      },
    },
    statements,
    inserted,
  };
}

describe('goal range migration', () => {
  const legacy: LegacyGoalRow[] = [
    { id: 1, calories: 2000, protein: null, carbs: null, fat: null, effective_from: '1970-01-01', created_at: 'c1' },
    { id: 2, calories: 2400, protein: 150, carbs: 250, fat: 70, effective_from: '2026-03-10', created_at: 'c2' },
    { id: 3, calories: 0, protein: 0, carbs: null, fat: 60, effective_from: '2026-05-01', created_at: 'c3' },
  ];

  it('turns the baseline point target into a +/-10% range and keeps its date', () => {
    const converted = convertLegacyGoalRow(legacy[0]);
    expect(converted).toMatchObject({
      id: 1,
      calories_min: 1800,
      calories_max: 2200,
      effective_from: '1970-01-01',
      created_at: 'c1',
    });
  });

  it('keeps disabled macros disabled', () => {
    const converted = convertLegacyGoalRow(legacy[0]);
    expect([converted.protein_min, converted.protein_max, converted.carbs_min, converted.carbs_max]).toEqual([null, null, null, null]);
  });

  it('converts every macro of a historical row', () => {
    const converted = convertLegacyGoalRow(legacy[1]);
    expect(converted.protein_min).toBeCloseTo(135, 10);
    expect(converted.protein_max).toBeCloseTo(165, 10);
    expect(converted.carbs_min).toBeCloseTo(225, 10);
    expect(converted.fat_max).toBeCloseTo(77, 10);
  });

  it('migrates a zero target to [0, 0]', () => {
    const converted = convertLegacyGoalRow(legacy[2]);
    expect([converted.calories_min, converted.calories_max]).toEqual([0, 0]);
    expect([converted.protein_min, converted.protein_max]).toEqual([0, 0]);
  });

  it('rebuilds the table and re-inserts every row with its id and dates', async () => {
    const { db, statements, inserted } = fakeDb(legacy);
    await migration004GoalRanges.up(db as never);
    expect(statements.join('\n')).toContain('CREATE TABLE goal_settings');
    expect(statements.join('\n')).toContain('DROP TABLE goal_settings_legacy');
    expect(inserted).toHaveLength(3);
    expect(inserted.map((params) => params[0])).toEqual([1, 2, 3]);
    expect(inserted.map((params) => params[9])).toEqual(['1970-01-01', '2026-03-10', '2026-05-01']);
    expect(inserted.map((params) => params[10])).toEqual(['c1', 'c2', 'c3']);
    expect(inserted[0]).toEqual(goalRangeInsertParams(convertLegacyGoalRow(legacy[0])));
  });
});

describe('collapsing goals to a single number per nutrient', () => {
  it('recovers the originally typed target from a generated +/-10% band', () => {
    const band = pointTargetToRange(150);
    expect(recoverTarget({ minimum: band.minimum, maximum: band.maximum })).toBeCloseTo(150, 9);
  });

  it('takes the midpoint of a hand-entered range', () => {
    expect(recoverTarget({ minimum: 120, maximum: 160 })).toBe(140);
  });

  it('keeps a one-sided value and reports a disabled goal as absent', () => {
    expect(recoverTarget({ minimum: 150, maximum: null })).toBe(150);
    expect(recoverTarget({ minimum: null, maximum: 70 })).toBe(70);
    expect(recoverTarget({ minimum: null, maximum: null })).toBeNull();
  });

  it('collapses a migrated zero target to zero', () => {
    expect(recoverTarget({ minimum: 0, maximum: 0 })).toBe(0);
  });

  it('writes one calorie target and one boundary per macro', () => {
    const row: RangeGoalRow = {
      id: 7,
      calories_min: 1800,
      calories_max: 2200,
      protein_min: 135,
      protein_max: 165,
      carbs_min: null,
      carbs_max: null,
      fat_min: null,
      fat_max: 70,
      effective_from: '2026-03-10',
      created_at: 'c7',
    };
    const params = goalInsertParams(row);
    expect(params[0]).toBe(7);
    expect(params[1]).toBeCloseTo(2000, 9); // calories: the target behind the +/-10% band
    expect(params[2]).toBeCloseTo(150, 9); // protein minimum
    expect(params[3]).toBeNull();
    expect([params[4], params[5]]).toEqual([null, null]); // carbs stay disabled
    expect(params[6]).toBe(70); // a max-only fat goal keeps its value as the single boundary
    expect(params[7]).toBeNull();
    expect([params[8], params[9]]).toEqual(['2026-03-10', 'c7']);
  });

  it('rebuilds the table and preserves every row with its id and dates', async () => {
    const rows: RangeGoalRow[] = [
      {
        id: 1,
        calories_min: 1800,
        calories_max: 2200,
        protein_min: null,
        protein_max: null,
        carbs_min: null,
        carbs_max: null,
        fat_min: null,
        fat_max: null,
        effective_from: '1970-01-01',
        created_at: 'c1',
      },
      {
        id: 2,
        calories_min: 2160,
        calories_max: 2640,
        protein_min: 135,
        protein_max: 165,
        carbs_min: 225,
        carbs_max: 275,
        fat_min: 63,
        fat_max: 77,
        effective_from: '2026-05-01',
        created_at: 'c2',
      },
    ];
    const statements: string[] = [];
    const inserted: (number | string | null)[][] = [];
    const db = {
      getAllAsync: async () => rows,
      execAsync: async (sql: string) => {
        statements.push(sql);
      },
      runAsync: async (_sql: string, params: (number | string | null)[]) => {
        inserted.push(params);
      },
    };
    await migration005SingleMacroBound.up(db as never);
    const sql = statements.join('\n');
    expect(sql).toContain('CREATE TABLE goal_settings');
    expect(sql).toContain('calories REAL NOT NULL');
    expect(sql).toContain('DROP TABLE goal_settings_ranges');
    expect(inserted).toHaveLength(2);
    expect(inserted.map((params) => params[0])).toEqual([1, 2]);
    expect(inserted.map((params) => params[8])).toEqual(['1970-01-01', '2026-05-01']);
    expect(inserted.map((params) => params[9])).toEqual(['c1', 'c2']);
    expect(inserted[0][1]).toBeCloseTo(2000, 9);
    expect(inserted[1][1]).toBeCloseTo(2400, 9);
    // Every macro keeps one side only, so no goal can carry a band the editor cannot show.
    for (const params of inserted) {
      expect([params[3], params[5], params[7]]).toEqual([null, null, null]);
    }
  });
});
