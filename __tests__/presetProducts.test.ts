import { PRESET_CATEGORY_NAMES, PRESET_PRODUCTS } from '../src/db/seed/presetProducts';

describe('preset products', () => {
  it('ships 150 products', () => {
    expect(PRESET_PRODUCTS).toHaveLength(150);
  });

  it('has no duplicate names', () => {
    const names = PRESET_PRODUCTS.map((p) => p.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it('names every product in Ukrainian', () => {
    for (const product of PRESET_PRODUCTS) {
      expect(product.name.trim()).toBe(product.name);
      expect(product.name).toMatch(/[а-яіїєґА-ЯІЇЄҐ]/);
    }
  });

  it('uses a known category for every product', () => {
    for (const product of PRESET_PRODUCTS) {
      expect(PRESET_CATEGORY_NAMES[product.category]).toBeDefined();
    }
  });

  it('covers every category', () => {
    const used = new Set(PRESET_PRODUCTS.map((p) => p.category));
    for (const category of Object.keys(PRESET_CATEGORY_NAMES)) {
      expect(used.has(category as keyof typeof PRESET_CATEGORY_NAMES)).toBe(true);
    }
  });

  it('keeps macros non-negative, and null rather than a guessed zero', () => {
    for (const product of PRESET_PRODUCTS) {
      expect(product.caloriesPer100g).toBeGreaterThanOrEqual(0);
      for (const macro of [product.proteinPer100g, product.carbsPer100g, product.fatPer100g]) {
        if (macro !== null) expect(macro).toBeGreaterThanOrEqual(0);
      }
    }
  });

  // Ethanol carries ~7 kcal/g and is not a macro, so the 4/4/9 rule does not apply to these.
  const ALCOHOLIC = new Set(['Пиво світле', 'Вино червоне сухе', 'Горілка']);

  it('keeps calories roughly consistent with the macros', () => {
    for (const product of PRESET_PRODUCTS) {
      if (ALCOHOLIC.has(product.name)) continue;
      const { proteinPer100g: p, carbsPer100g: c, fatPer100g: f } = product;
      if (p === null || c === null || f === null) continue;
      const fromMacros = p * 4 + c * 4 + f * 9;
      expect(Math.abs(fromMacros - product.caloriesPer100g)).toBeLessThanOrEqual(
        Math.max(25, product.caloriesPer100g * 0.25),
      );
    }
  });
});
