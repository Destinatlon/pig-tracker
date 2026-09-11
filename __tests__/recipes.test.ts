import { NutritionPer100g } from '../src/domain/models';
import {
  calculateRecipeTotals,
  effectiveRecipePer100g,
  ingredientsMissingMacros,
  recipePer100g,
} from '../src/domain/recipes/calculations';
import {
  createEmptyRecipeDraft,
  draftPer100g,
  isRecipeDraftDirty,
  nextIngredientKey,
  RecipeDraft,
  RecipeIngredientDraft,
  validateRecipeDraft,
} from '../src/domain/recipes/draft';

function ingredient(overrides: Partial<RecipeIngredientDraft> & { weightGrams: number; caloriesPer100g: number }): RecipeIngredientDraft {
  return {
    key: nextIngredientKey(),
    productId: null,
    variantId: null,
    productName: 'Ingredient',
    variantName: null,
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatPer100g: 0,
    ...overrides,
  };
}

describe('calculateRecipeTotals', () => {
  const chicken = ingredient({ weightGrams: 200, caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6 });
  const rice = ingredient({ weightGrams: 100, caloriesPer100g: 344, proteinPer100g: 6.7, carbsPer100g: 78.9, fatPer100g: 0.7 });

  it('sums weights and scales each ingredient by its own weight', () => {
    const totals = calculateRecipeTotals([chicken, rice], null);
    expect(totals.ingredientWeightGrams).toBe(300);
    expect(totals.totalWeightGrams).toBe(300);
    expect(totals.usesCookedWeight).toBe(false);
    expect(totals.calories).toBeCloseTo(165 * 2 + 344, 6);
    expect(totals.protein).toBeCloseTo(62 + 6.7, 6);
    expect(totals.missing).toEqual([]);
  });

  it('uses the cooked weight when set, without changing the totals themselves', () => {
    const totals = calculateRecipeTotals([chicken, rice], 250);
    expect(totals.ingredientWeightGrams).toBe(300);
    expect(totals.totalWeightGrams).toBe(250);
    expect(totals.usesCookedWeight).toBe(true);
    expect(totals.calories).toBeCloseTo(674, 6);
  });

  it('flags a macro that any ingredient leaves unknown', () => {
    const spice = ingredient({ weightGrams: 5, caloriesPer100g: 300, proteinPer100g: null, carbsPer100g: null, fatPer100g: null });
    const totals = calculateRecipeTotals([chicken, spice], null);
    expect(totals.missing).toEqual(['protein', 'carbs', 'fat']);
    // Known values are still summed, so the UI can show a partial figure alongside the warning.
    expect(totals.protein).toBeCloseTo(62, 6);
  });

  it('treats an empty recipe as weightless rather than throwing', () => {
    const totals = calculateRecipeTotals([], null);
    expect(totals.totalWeightGrams).toBe(0);
    expect(recipePer100g(totals)).toBeNull();
  });
});

describe('recipePer100g', () => {
  it('concentrates the dish when water boils off', () => {
    const soup = [ingredient({ weightGrams: 1000, caloriesPer100g: 50, proteinPer100g: 2, carbsPer100g: 5, fatPer100g: 1 })];
    const asMixed = recipePer100g(calculateRecipeTotals(soup, null));
    const afterBoiling = recipePer100g(calculateRecipeTotals(soup, 500));
    expect(asMixed?.caloriesPer100g).toBeCloseTo(50, 6);
    expect(afterBoiling?.caloriesPer100g).toBeCloseTo(100, 6);
    expect(afterBoiling?.proteinPer100g).toBeCloseTo(4, 6);
  });

  it('keeps an incomplete macro unknown instead of understating it', () => {
    const items = [
      ingredient({ weightGrams: 100, caloriesPer100g: 100, proteinPer100g: 10, carbsPer100g: 10, fatPer100g: 10 }),
      ingredient({ weightGrams: 100, caloriesPer100g: 100, proteinPer100g: null, carbsPer100g: 10, fatPer100g: 10 }),
    ];
    const per100g = recipePer100g(calculateRecipeTotals(items, null));
    expect(per100g?.proteinPer100g).toBeNull();
    expect(per100g?.carbsPer100g).toBeCloseTo(10, 6);
    expect(per100g?.caloriesPer100g).toBeCloseTo(100, 6);
  });
});

describe('effectiveRecipePer100g', () => {
  const items = [ingredient({ weightGrams: 100, caloriesPer100g: 100, proteinPer100g: 5, carbsPer100g: 5, fatPer100g: 5 })];
  const override: NutritionPer100g = { caloriesPer100g: 250, proteinPer100g: 9, carbsPer100g: null, fatPer100g: 3 };

  it('prefers the user override over the calculation', () => {
    const result = effectiveRecipePer100g({ cookedWeightGrams: null, macrosOverridden: true, overridePer100g: override }, items);
    expect(result).toEqual(override);
  });

  it('falls back to the calculation when no override is set', () => {
    const result = effectiveRecipePer100g({ cookedWeightGrams: null, macrosOverridden: false, overridePer100g: override }, items);
    expect(result?.caloriesPer100g).toBeCloseTo(100, 6);
  });
});

describe('ingredientsMissingMacros', () => {
  it('lists only the ingredients with a gap', () => {
    const complete = ingredient({ weightGrams: 10, caloriesPer100g: 10, productName: 'Complete' });
    const partial = ingredient({ weightGrams: 10, caloriesPer100g: 10, productName: 'Partial', fatPer100g: null });
    expect(ingredientsMissingMacros([complete, partial]).map((i) => i.productName)).toEqual(['Partial']);
  });
});

describe('validateRecipeDraft', () => {
  function draftWith(overrides: Partial<RecipeDraft>): RecipeDraft {
    return { ...createEmptyRecipeDraft(), name: 'Borscht', ...overrides };
  }

  it('requires a name', () => {
    const result = validateRecipeDraft(draftWith({ name: '  ' , ingredients: [ingredient({ weightGrams: 100, caloriesPer100g: 50 })] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.name).toBe('required');
  });

  it('rejects a recipe with neither ingredients nor typed values', () => {
    const result = validateRecipeDraft(draftWith({}));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problem).toBe('noValues');
  });

  it('accepts a typed-value recipe with no ingredients at all', () => {
    const result = validateRecipeDraft(
      draftWith({ overrideEnabled: true, overrideTexts: { calories: '120', protein: '4', carbs: '', fat: '2' } }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.overridePer100g).toEqual({ caloriesPer100g: 120, proteinPer100g: 4, carbsPer100g: null, fatPer100g: 2 });
      expect(result.value.ingredients).toEqual([]);
    }
  });

  it('rejects a non-positive cooked weight', () => {
    const result = validateRecipeDraft(draftWith({ cookedWeightText: '0', ingredients: [ingredient({ weightGrams: 100, caloriesPer100g: 50 })] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.cookedWeight).toBe('positive');
  });

  it('carries ingredients through as snapshots', () => {
    const result = validateRecipeDraft(
      draftWith({
        description: '  simmer 40 min  ',
        ingredients: [ingredient({ weightGrams: 150, caloriesPer100g: 43, productName: 'Буряк', productId: 7, variantId: 9 })],
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.description).toBe('simmer 40 min');
      expect(result.value.ingredients[0]).toMatchObject({ productId: 7, variantId: 9, productName: 'Буряк', weightGrams: 150 });
    }
  });
});

describe('draftPer100g', () => {
  it('reflects the override fields as they are typed', () => {
    const draft = { ...createEmptyRecipeDraft(), overrideEnabled: true, overrideTexts: { calories: '200', protein: '', carbs: '1', fat: '2' } };
    expect(draftPer100g(draft)).toEqual({ caloriesPer100g: 200, proteinPer100g: null, carbsPer100g: 1, fatPer100g: 2 });
  });
});

describe('isRecipeDraftDirty', () => {
  it('is clean for an untouched draft and dirty once anything changes', () => {
    const original = { ...createEmptyRecipeDraft(), name: 'Soup', ingredients: [ingredient({ weightGrams: 100, caloriesPer100g: 50 })] };
    expect(isRecipeDraftDirty(original, original)).toBe(false);
    expect(isRecipeDraftDirty({ ...original, cookedWeightText: '900' }, original)).toBe(true);
    expect(isRecipeDraftDirty({ ...original, ingredients: [] }, original)).toBe(true);
    expect(
      isRecipeDraftDirty({ ...original, ingredients: [{ ...original.ingredients[0], weightGrams: 120 }] }, original),
    ).toBe(true);
  });
});
