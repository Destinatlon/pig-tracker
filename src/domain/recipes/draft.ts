import { NewRecipeIngredient, NutritionPer100g, RecipeWithIngredients } from '../models';
import { DraftField, DraftErrors, Per100gTexts, parsePer100gTexts, per100gTextsFrom } from '../nutrition/draft';
import { FieldErrorCode, parsePositiveWeight, parseRequiredName } from '../numeric';
import { formatForInput } from '../nutrition/format';
import { RecipeTotals, calculateRecipeTotals, recipePer100g } from './calculations';

/** One ingredient while the recipe is being edited. `key` is list identity, not a database id. */
export interface RecipeIngredientDraft extends NutritionPer100g {
  key: string;
  productId: number | null;
  variantId: number | null;
  productName: string;
  variantName: string | null;
  weightGrams: number;
}

/** The whole editor state. Nothing is written until the user saves. */
export interface RecipeDraft {
  id?: number;
  name: string;
  description: string;
  cookedWeightText: string;
  ingredients: RecipeIngredientDraft[];
  /** True when the user chose to type per-100-g values instead of using the calculation. */
  overrideEnabled: boolean;
  overrideTexts: Per100gTexts;
}

export type RecipeDraftErrorField = 'name' | 'cookedWeight' | DraftField;
export type RecipeDraftErrors = Partial<Record<RecipeDraftErrorField, FieldErrorCode>>;

let keyCounter = 0;
export function nextIngredientKey(): string {
  keyCounter += 1;
  return `i${keyCounter}`;
}

export function createEmptyRecipeDraft(): RecipeDraft {
  return {
    name: '',
    description: '',
    cookedWeightText: '',
    ingredients: [],
    overrideEnabled: false,
    overrideTexts: per100gTextsFrom(null),
  };
}

export function recipeDraftFrom(recipe: RecipeWithIngredients): RecipeDraft {
  return {
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    cookedWeightText: formatForInput(recipe.cookedWeightGrams),
    ingredients: recipe.ingredients.map((ingredient) => ({
      key: nextIngredientKey(),
      productId: ingredient.productId,
      variantId: ingredient.variantId,
      productName: ingredient.productName,
      variantName: ingredient.variantName,
      weightGrams: ingredient.weightGrams,
      caloriesPer100g: ingredient.caloriesPer100g,
      proteinPer100g: ingredient.proteinPer100g,
      carbsPer100g: ingredient.carbsPer100g,
      fatPer100g: ingredient.fatPer100g,
    })),
    overrideEnabled: recipe.macrosOverridden,
    overrideTexts: per100gTextsFrom(recipe.overridePer100g),
  };
}

/** Cooked weight as typed, or null when empty or not yet a positive number. */
export function draftCookedWeight(draft: RecipeDraft): number | null {
  if (draft.cookedWeightText.trim() === '') return null;
  const parsed = parsePositiveWeight(draft.cookedWeightText);
  return parsed.ok ? parsed.value : null;
}

export function draftTotals(draft: RecipeDraft): RecipeTotals {
  return calculateRecipeTotals(draft.ingredients, draftCookedWeight(draft));
}

/** What the draft is worth per 100 g right now, honouring an active override. */
export function draftPer100g(draft: RecipeDraft): NutritionPer100g | null {
  if (draft.overrideEnabled) {
    const parsed = parsePer100gTexts(draft.overrideTexts);
    return parsed.ok ? parsed.value : null;
  }
  return recipePer100g(draftTotals(draft));
}

export interface ValidatedRecipe {
  id?: number;
  name: string;
  description: string;
  cookedWeightGrams: number | null;
  overridePer100g: NutritionPer100g | null;
  ingredients: NewRecipeIngredient[];
}

export type RecipeValidationFailure = { ok: false; errors: RecipeDraftErrors; problem?: 'noValues' };

/**
 * A recipe needs a name and something to work from: either ingredients that add up to a weight,
 * or per-100-g values the user typed themselves.
 */
export function validateRecipeDraft(draft: RecipeDraft): { ok: true; value: ValidatedRecipe } | RecipeValidationFailure {
  const errors: RecipeDraftErrors = {};
  const name = parseRequiredName(draft.name);
  if (!name.ok) errors.name = name.error;

  let cookedWeightGrams: number | null = null;
  if (draft.cookedWeightText.trim() !== '') {
    const parsed = parsePositiveWeight(draft.cookedWeightText);
    if (!parsed.ok) errors.cookedWeight = parsed.error;
    else cookedWeightGrams = parsed.value;
  }

  let overridePer100g: NutritionPer100g | null = null;
  if (draft.overrideEnabled) {
    const parsed = parsePer100gTexts(draft.overrideTexts);
    if (!parsed.ok) Object.assign(errors, parsed.errors as DraftErrors);
    else overridePer100g = parsed.value;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const totals = calculateRecipeTotals(draft.ingredients, cookedWeightGrams);
  if (!draft.overrideEnabled && !(totals.totalWeightGrams > 0)) {
    return { ok: false, errors, problem: 'noValues' };
  }

  return {
    ok: true,
    value: {
      id: draft.id,
      name: name.ok ? name.value : draft.name.trim(),
      description: draft.description.trim(),
      cookedWeightGrams,
      overridePer100g,
      ingredients: draft.ingredients.map((ingredient) => ({
        productId: ingredient.productId,
        variantId: ingredient.variantId,
        productName: ingredient.productName,
        variantName: ingredient.variantName,
        weightGrams: ingredient.weightGrams,
        caloriesPer100g: ingredient.caloriesPer100g,
        proteinPer100g: ingredient.proteinPer100g,
        carbsPer100g: ingredient.carbsPer100g,
        fatPer100g: ingredient.fatPer100g,
      })),
    },
  };
}

/** Compares the editable parts only, so an untouched editor never warns about discarding. */
export function isRecipeDraftDirty(draft: RecipeDraft, original: RecipeDraft): boolean {
  if (draft.name !== original.name) return true;
  if (draft.description !== original.description) return true;
  if (draft.cookedWeightText !== original.cookedWeightText) return true;
  if (draft.overrideEnabled !== original.overrideEnabled) return true;
  for (const field of ['calories', 'protein', 'carbs', 'fat'] as const) {
    if (draft.overrideTexts[field] !== original.overrideTexts[field]) return true;
  }
  if (draft.ingredients.length !== original.ingredients.length) return true;
  return draft.ingredients.some((ingredient, index) => {
    const before = original.ingredients[index];
    return (
      ingredient.productName !== before.productName ||
      ingredient.variantName !== before.variantName ||
      ingredient.weightGrams !== before.weightGrams ||
      ingredient.caloriesPer100g !== before.caloriesPer100g ||
      ingredient.proteinPer100g !== before.proteinPer100g ||
      ingredient.carbsPer100g !== before.carbsPer100g ||
      ingredient.fatPer100g !== before.fatPer100g
    );
  });
}
