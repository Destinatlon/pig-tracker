import { MacroKey, MACRO_KEYS, NutritionPer100g } from '../models';
import { MACRO_PER_100G_FIELD, calculateConsumedMacros } from '../nutrition/calculations';

/** The minimum an ingredient must provide for the recipe maths: a weight and per-100-g values. */
export interface RecipeIngredientLike extends NutritionPer100g {
  weightGrams: number;
}

/** A recipe's totals for the whole dish, plus which macros could not be fully accounted for. */
export interface RecipeTotals {
  /** Sum of the ingredient weights, before any cooked-weight override. */
  ingredientWeightGrams: number;
  /** Weight the per-100-g values are based on: the cooked weight when set, else the sum. */
  totalWeightGrams: number;
  usesCookedWeight: boolean;
  calories: number;
  /** Sums of the known values only; check `missing` before presenting them as complete. */
  protein: number;
  carbs: number;
  fat: number;
  /** Macros at least one ingredient did not provide. */
  missing: MacroKey[];
  ingredientCount: number;
}

const MACRO_TOTAL_FIELD: Record<MacroKey, 'protein' | 'carbs' | 'fat'> = {
  protein: 'protein',
  carbs: 'carbs',
  fat: 'fat',
};

const MACRO_CONSUMED_FIELD = {
  protein: 'consumedProtein',
  carbs: 'consumedCarbs',
  fat: 'consumedFat',
} as const;

/**
 * Adds up the whole dish. Calories are always known (every ingredient requires them); a macro is
 * flagged as missing when any ingredient leaves it unknown, so a partial sum is never mistaken
 * for a complete one.
 */
export function calculateRecipeTotals(
  ingredients: readonly RecipeIngredientLike[],
  cookedWeightGrams: number | null,
): RecipeTotals {
  const missing = new Set<MacroKey>();
  let ingredientWeightGrams = 0;
  let calories = 0;
  const macroTotals = { protein: 0, carbs: 0, fat: 0 };

  for (const ingredient of ingredients) {
    ingredientWeightGrams += ingredient.weightGrams;
    const consumed = calculateConsumedMacros(ingredient, ingredient.weightGrams);
    calories += consumed.consumedCalories;
    for (const macro of MACRO_KEYS) {
      const value = consumed[MACRO_CONSUMED_FIELD[macro]];
      if (value === null) missing.add(macro);
      else macroTotals[MACRO_TOTAL_FIELD[macro]] += value;
    }
  }

  const usesCookedWeight = cookedWeightGrams !== null && cookedWeightGrams > 0;
  return {
    ingredientWeightGrams,
    totalWeightGrams: usesCookedWeight ? (cookedWeightGrams as number) : ingredientWeightGrams,
    usesCookedWeight,
    calories,
    ...macroTotals,
    missing: MACRO_KEYS.filter((macro) => missing.has(macro)),
    ingredientCount: ingredients.length,
  };
}

/**
 * Per-100-g values for the finished dish, assuming it is evenly mixed — an approximation the UI
 * must state. A macro that any ingredient left unknown stays null rather than understating it.
 */
export function recipePer100g(totals: RecipeTotals): NutritionPer100g | null {
  if (!(totals.totalWeightGrams > 0)) return null;
  const scale = 100 / totals.totalWeightGrams;
  const known = (macro: MacroKey, total: number): number | null =>
    totals.missing.includes(macro) ? null : total * scale;
  return {
    caloriesPer100g: totals.calories * scale,
    proteinPer100g: known('protein', totals.protein),
    carbsPer100g: known('carbs', totals.carbs),
    fatPer100g: known('fat', totals.fat),
  };
}

export interface RecipeLike {
  cookedWeightGrams: number | null;
  macrosOverridden: boolean;
  overridePer100g: NutritionPer100g | null;
}

/** What the recipe is actually worth per 100 g: the user's override when set, else the calculation. */
export function effectiveRecipePer100g(
  recipe: RecipeLike,
  ingredients: readonly RecipeIngredientLike[],
): NutritionPer100g | null {
  if (recipe.macrosOverridden && recipe.overridePer100g) return recipe.overridePer100g;
  return recipePer100g(calculateRecipeTotals(ingredients, recipe.cookedWeightGrams));
}

/** Ingredients that are missing at least one macro, for the "some values are unknown" hint. */
export function ingredientsMissingMacros<T extends NutritionPer100g>(ingredients: readonly T[]): T[] {
  return ingredients.filter((ingredient) => MACRO_KEYS.some((macro) => ingredient[MACRO_PER_100G_FIELD[macro]] === null));
}
