import { MacroKey, NutritionPer100g } from '../models';
import { parseNumberText, parseOptionalNonNegative, parsePositiveWeight, parseRequiredName, parseRequiredNonNegative, ParseResult } from '../numeric';
import { formatForInput } from './format';

export type DraftField = 'calories' | MacroKey;
export const DRAFT_FIELDS: readonly DraftField[] = ['calories', 'protein', 'carbs', 'fat'];

/**
 * Editable state for a consumed entry. Text fields hold what the user sees (consumed amounts);
 * `basis` holds full-precision per-100-g values so weight changes never accumulate rounding.
 */
export interface NutritionDraft {
  name: string;
  weightText: string;
  texts: Record<DraftField, string>;
  basis: Record<DraftField, number | null>;
}

export function basisFromPer100g(per100g: NutritionPer100g): Record<DraftField, number | null> {
  return {
    calories: per100g.caloriesPer100g,
    protein: per100g.proteinPer100g,
    carbs: per100g.carbsPer100g,
    fat: per100g.fatPer100g,
  };
}

export function per100gFromBasis(basis: Record<DraftField, number | null>): NutritionPer100g | null {
  if (basis.calories === null) return null;
  return {
    caloriesPer100g: basis.calories,
    proteinPer100g: basis.protein,
    carbsPer100g: basis.carbs,
    fatPer100g: basis.fat,
  };
}

function consumedTexts(basis: Record<DraftField, number | null>, weightGrams: number): Record<DraftField, string> {
  const texts = {} as Record<DraftField, string>;
  for (const field of DRAFT_FIELDS) {
    const value = basis[field];
    texts[field] = value === null ? '' : formatForInput((value * weightGrams) / 100);
  }
  return texts;
}

export function createEmptyDraft(): NutritionDraft {
  return {
    name: '',
    weightText: '',
    texts: { calories: '', protein: '', carbs: '', fat: '' },
    basis: { calories: null, protein: null, carbs: null, fat: null },
  };
}

/** Draft for an existing snapshot (day entry) or a library item at a given weight. */
export function createDraftFromPer100g(name: string, per100g: NutritionPer100g, weightGrams: number | null): NutritionDraft {
  const basis = basisFromPer100g(per100g);
  return {
    name,
    weightText: weightGrams === null ? '' : formatForInput(weightGrams),
    texts: weightGrams === null ? { calories: '', protein: '', carbs: '', fat: '' } : consumedTexts(basis, weightGrams),
    basis,
  };
}

function parsedWeight(text: string): number | null {
  const parsed = parseNumberText(text);
  return parsed.kind === 'value' && parsed.value > 0 ? parsed.value : null;
}

function parsedValue(text: string): number | null {
  const parsed = parseNumberText(text);
  return parsed.kind === 'value' && parsed.value >= 0 ? parsed.value : null;
}

/** Changing the weight rescales every consumed value from its per-100-g basis. */
export function updateDraftWeight(draft: NutritionDraft, weightText: string): NutritionDraft {
  const oldWeight = parsedWeight(draft.weightText);
  const newWeight = parsedWeight(weightText);
  const basis = { ...draft.basis };
  const texts = { ...draft.texts };
  for (const field of DRAFT_FIELDS) {
    if (basis[field] === null && oldWeight !== null) {
      const typed = parsedValue(draft.texts[field]);
      if (typed !== null) basis[field] = (typed / oldWeight) * 100;
    }
    if (newWeight !== null && basis[field] !== null) {
      texts[field] = formatForInput((basis[field] * newWeight) / 100);
    }
  }
  return { ...draft, weightText, texts, basis };
}

/** Typing a consumed value re-normalizes that field's basis when the weight is known. */
export function updateDraftValue(draft: NutritionDraft, field: DraftField, text: string): NutritionDraft {
  const weight = parsedWeight(draft.weightText);
  const typed = parsedValue(text);
  const basis = { ...draft.basis };
  if (text.trim() === '') basis[field] = null;
  else if (weight !== null && typed !== null) basis[field] = (typed / weight) * 100;
  else if (typed === null) basis[field] = null;
  return { ...draft, texts: { ...draft.texts, [field]: text }, basis };
}

export function updateDraftName(draft: NutritionDraft, name: string): NutritionDraft {
  return { ...draft, name };
}

export interface ValidatedDraft {
  name: string;
  weightGrams: number;
  per100g: NutritionPer100g;
}

export interface DraftErrors {
  name?: string;
  weight?: string;
  calories?: string;
  protein?: string;
  carbs?: string;
  fat?: string;
}

const LABELS: Record<DraftField, string> = { calories: 'kcal', protein: 'Protein', carbs: 'Carbs', fat: 'Fat' };

/** Validates and normalizes a draft to per-100-g values, preferring the full-precision basis. */
export function validateDraft(draft: NutritionDraft, options: { requireName?: boolean } = {}): { ok: true; value: ValidatedDraft } | { ok: false; errors: DraftErrors } {
  const errors: DraftErrors = {};
  const name = parseRequiredName(draft.name);
  if (options.requireName !== false && !name.ok) errors.name = name.error;
  const weight = parsePositiveWeight(draft.weightText);
  if (!weight.ok) errors.weight = weight.error;
  const calories = parseRequiredNonNegative(draft.texts.calories, LABELS.calories);
  if (!calories.ok) errors.calories = calories.error;
  const macros: Partial<Record<MacroKey, number | null>> = {};
  for (const field of ['protein', 'carbs', 'fat'] as const) {
    const parsed = parseOptionalNonNegative(draft.texts[field], LABELS[field]);
    if (!parsed.ok) errors[field] = parsed.error;
    else macros[field] = parsed.value;
  }
  if (Object.keys(errors).length > 0 || !weight.ok || !calories.ok) return { ok: false, errors };

  const weightGrams = weight.value;
  const per100g: NutritionPer100g = {
    caloriesPer100g: draft.basis.calories ?? (calories.value / weightGrams) * 100,
    proteinPer100g: resolveMacro(draft.basis.protein, macros.protein ?? null, weightGrams),
    carbsPer100g: resolveMacro(draft.basis.carbs, macros.carbs ?? null, weightGrams),
    fatPer100g: resolveMacro(draft.basis.fat, macros.fat ?? null, weightGrams),
  };
  return { ok: true, value: { name: name.ok ? name.value : draft.name.trim(), weightGrams, per100g } };
}

function resolveMacro(basis: number | null, typed: number | null, weightGrams: number): number | null {
  if (typed === null) return null;
  return basis ?? (typed / weightGrams) * 100;
}

/** Text state for per-100-g forms (product, variant, save-as-product). */
export interface Per100gTexts {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

export function per100gTextsFrom(per100g: NutritionPer100g | null): Per100gTexts {
  return {
    calories: formatForInput(per100g?.caloriesPer100g),
    protein: formatForInput(per100g?.proteinPer100g),
    carbs: formatForInput(per100g?.carbsPer100g),
    fat: formatForInput(per100g?.fatPer100g),
  };
}

export function parsePer100gTexts(texts: Per100gTexts): { ok: true; value: NutritionPer100g } | { ok: false; errors: DraftErrors } {
  const errors: DraftErrors = {};
  const calories = parseRequiredNonNegative(texts.calories, 'kcal');
  if (!calories.ok) errors.calories = calories.error;
  const protein = parseOptionalNonNegative(texts.protein, 'Protein');
  if (!protein.ok) errors.protein = protein.error;
  const carbs = parseOptionalNonNegative(texts.carbs, 'Carbs');
  if (!carbs.ok) errors.carbs = carbs.error;
  const fat = parseOptionalNonNegative(texts.fat, 'Fat');
  if (!fat.ok) errors.fat = fat.error;
  if (!calories.ok || !protein.ok || !carbs.ok || !fat.ok) return { ok: false, errors };
  return {
    ok: true,
    value: { caloriesPer100g: calories.value, proteinPer100g: protein.value, carbsPer100g: carbs.value, fatPer100g: fat.value },
  };
}

export type { ParseResult };
