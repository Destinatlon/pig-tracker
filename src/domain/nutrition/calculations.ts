import { ConsumedNutrition, DayEntry, MacroKey, MACRO_KEYS, NutritionPer100g } from '../models';

/** consumedValue = valuePer100g * weightGrams / 100. Unknown values stay unknown. */
export function scaleFrom100g(valuePer100g: number | null, weightGrams: number): number | null {
  if (valuePer100g === null) return null;
  return (valuePer100g * weightGrams) / 100;
}

/** valuePer100g = consumedValue / weightGrams * 100. Unknown values stay unknown. */
export function normalizeTo100g(consumedValue: number | null, weightGrams: number): number | null {
  if (consumedValue === null) return null;
  if (!(weightGrams > 0)) throw new Error('Weight must be greater than zero to normalize nutrition values');
  return (consumedValue / weightGrams) * 100;
}

export function calculateConsumedMacros(per100g: NutritionPer100g, weightGrams: number): ConsumedNutrition {
  return {
    consumedCalories: (per100g.caloriesPer100g * weightGrams) / 100,
    consumedProtein: scaleFrom100g(per100g.proteinPer100g, weightGrams),
    consumedCarbs: scaleFrom100g(per100g.carbsPer100g, weightGrams),
    consumedFat: scaleFrom100g(per100g.fatPer100g, weightGrams),
  };
}

export function normalizeMacrosTo100g(consumed: ConsumedNutrition, weightGrams: number): NutritionPer100g {
  if (!(weightGrams > 0)) throw new Error('Weight must be greater than zero to normalize nutrition values');
  return {
    caloriesPer100g: (consumed.consumedCalories / weightGrams) * 100,
    proteinPer100g: normalizeTo100g(consumed.consumedProtein, weightGrams),
    carbsPer100g: normalizeTo100g(consumed.consumedCarbs, weightGrams),
    fatPer100g: normalizeTo100g(consumed.consumedFat, weightGrams),
  };
}

export const MACRO_PER_100G_FIELD: Record<MacroKey, keyof NutritionPer100g> = {
  protein: 'proteinPer100g',
  carbs: 'carbsPer100g',
  fat: 'fatPer100g',
};

export interface EntryMacroCompleteness<T> {
  entry: T;
  missing: MacroKey[];
}

/** Lists, per entry, which optional macros are unknown. Entries with complete data are omitted. */
export function getMacroCompleteness<T extends NutritionPer100g>(entries: readonly T[]): EntryMacroCompleteness<T>[] {
  const result: EntryMacroCompleteness<T>[] = [];
  for (const entry of entries) {
    const missing = MACRO_KEYS.filter((key) => entry[MACRO_PER_100G_FIELD[key]] === null);
    if (missing.length > 0) result.push({ entry, missing });
  }
  return result;
}

export interface DayTotals {
  calories: number;
  /** Sum of the known values only. Check `incomplete` before treating it as a full total. */
  protein: number;
  carbs: number;
  fat: number;
  incomplete: Record<MacroKey, boolean>;
  entryCount: number;
}

export function calculateDayTotals(entries: readonly DayEntry[]): DayTotals {
  const totals: DayTotals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    incomplete: { protein: false, carbs: false, fat: false },
    entryCount: entries.length,
  };
  for (const entry of entries) {
    const consumed = calculateConsumedMacros(entry, entry.weightGrams);
    totals.calories += consumed.consumedCalories;
    if (consumed.consumedProtein === null) totals.incomplete.protein = true;
    else totals.protein += consumed.consumedProtein;
    if (consumed.consumedCarbs === null) totals.incomplete.carbs = true;
    else totals.carbs += consumed.consumedCarbs;
    if (consumed.consumedFat === null) totals.incomplete.fat = true;
    else totals.fat += consumed.consumedFat;
  }
  return totals;
}

const EPSILON = 1e-6;

function sameValue(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return a === b;
  return Math.abs(a - b) < EPSILON;
}

export function sameNutritionPer100g(a: NutritionPer100g, b: NutritionPer100g): boolean {
  return (
    sameValue(a.caloriesPer100g, b.caloriesPer100g) &&
    sameValue(a.proteinPer100g, b.proteinPer100g) &&
    sameValue(a.carbsPer100g, b.carbsPer100g) &&
    sameValue(a.fatPer100g, b.fatPer100g)
  );
}
