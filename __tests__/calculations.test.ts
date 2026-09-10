import { DayEntry } from '../src/domain/models';
import { calculateConsumedMacros, calculateDayTotals, getMacroCompleteness, normalizeMacrosTo100g, sameNutritionPer100g } from '../src/domain/nutrition/calculations';

function entry(partial: Partial<DayEntry>): DayEntry {
  return {
    id: 1,
    date: '2025-09-10',
    sortOrder: 0,
    productId: null,
    variantId: null,
    productName: 'Food',
    variantName: null,
    weightGrams: 100,
    caloriesPer100g: 100,
    proteinPer100g: null,
    carbsPer100g: null,
    fatPer100g: null,
    createdAt: '2025-09-10T10:00:00.000Z',
    updatedAt: '2025-09-10T10:00:00.000Z',
    ...partial,
  };
}

describe('calculateConsumedMacros', () => {
  it('scales per-100g values to the consumed weight (spec section 9)', () => {
    const consumed = calculateConsumedMacros({ caloriesPer100g: 52, proteinPer100g: 3.1, carbsPer100g: 4.7, fatPer100g: 2.5 }, 250);
    expect(consumed.consumedCalories).toBeCloseTo(130);
    expect(consumed.consumedProtein).toBeCloseTo(7.75);
    expect(consumed.consumedCarbs).toBeCloseTo(11.75);
    expect(consumed.consumedFat).toBeCloseTo(6.25);
  });

  it('keeps unknown macros unknown (Example A / C)', () => {
    const consumed = calculateConsumedMacros({ caloriesPer100g: 110, proteinPer100g: 23, carbsPer100g: 0, fatPer100g: null }, 500);
    expect(consumed.consumedCalories).toBe(550);
    expect(consumed.consumedProtein).toBe(115);
    expect(consumed.consumedCarbs).toBe(0);
    expect(consumed.consumedFat).toBeNull();
  });
});

describe('normalizeMacrosTo100g', () => {
  it('normalizes values entered for the consumed amount (spec section 10)', () => {
    const per100g = normalizeMacrosTo100g({ consumedCalories: 38, consumedProtein: 2, consumedCarbs: 2.8, consumedFat: 1.9 }, 60);
    expect(per100g.caloriesPer100g).toBeCloseTo(63.333, 3);
    expect(per100g.proteinPer100g).toBeCloseTo(3.333, 3);
    expect(per100g.carbsPer100g).toBeCloseTo(4.667, 3);
    expect(per100g.fatPer100g).toBeCloseTo(3.167, 3);
    const rescaled = calculateConsumedMacros(per100g, 120);
    expect(rescaled.consumedCalories).toBeCloseTo(76);
    expect(rescaled.consumedProtein).toBeCloseTo(4);
    expect(rescaled.consumedCarbs).toBeCloseTo(5.6);
    expect(rescaled.consumedFat).toBeCloseTo(3.8);
  });

  it('rejects zero weight', () => {
    expect(() => normalizeMacrosTo100g({ consumedCalories: 10, consumedProtein: null, consumedCarbs: null, consumedFat: null }, 0)).toThrow();
  });
});

describe('calculateDayTotals', () => {
  it('sums known values and flags incomplete macros without substituting zero', () => {
    const totals = calculateDayTotals([
      entry({ id: 1, productName: 'Chicken', weightGrams: 200, caloriesPer100g: 110, proteinPer100g: 23, carbsPer100g: 0, fatPer100g: 2 }),
      entry({ id: 2, productName: 'Chocolate', weightGrams: 50, caloriesPer100g: 500, proteinPer100g: null, carbsPer100g: null, fatPer100g: 30 }),
    ]);
    expect(totals.calories).toBeCloseTo(470);
    expect(totals.protein).toBeCloseTo(46);
    expect(totals.carbs).toBeCloseTo(0);
    expect(totals.fat).toBeCloseTo(19);
    expect(totals.incomplete).toEqual({ protein: true, carbs: true, fat: false });
  });

  it('is empty-safe', () => {
    const totals = calculateDayTotals([]);
    expect(totals.calories).toBe(0);
    expect(totals.incomplete).toEqual({ protein: false, carbs: false, fat: false });
  });
});

describe('getMacroCompleteness', () => {
  it('lists which entries are missing which macros', () => {
    const result = getMacroCompleteness([
      entry({ id: 1, productName: 'Complete', proteinPer100g: 1, carbsPer100g: 1, fatPer100g: 1 }),
      entry({ id: 2, productName: 'Pizza' }),
      entry({ id: 3, productName: 'Chocolate', fatPer100g: 12 }),
    ]);
    expect(result.map((r) => [r.entry.productName, r.missing])).toEqual([
      ['Pizza', ['protein', 'carbs', 'fat']],
      ['Chocolate', ['protein', 'carbs']],
    ]);
  });
});

describe('sameNutritionPer100g', () => {
  it('treats null and 0 as different', () => {
    const a = { caloriesPer100g: 10, proteinPer100g: null, carbsPer100g: 0, fatPer100g: 1 };
    expect(sameNutritionPer100g(a, { ...a })).toBe(true);
    expect(sameNutritionPer100g(a, { ...a, proteinPer100g: 0 })).toBe(false);
    expect(sameNutritionPer100g(a, { ...a, fatPer100g: 1.0000000001 })).toBe(true);
  });
});
