import { createDraftFromPer100g, createEmptyDraft, parsePer100gTexts, updateDraftValue, updateDraftWeight, validateDraft } from '../src/domain/nutrition/draft';

describe('nutrition draft', () => {
  it('rescales consumed values when the weight changes (spec section 11)', () => {
    let draft = createDraftFromPer100g('Milk', { caloriesPer100g: 52, proteinPer100g: 3.1, carbsPer100g: null, fatPer100g: 2.5 }, 100);
    expect(draft.texts.calories).toBe('52');
    draft = updateDraftWeight(draft, '200');
    expect(draft.texts.calories).toBe('104');
    expect(draft.texts.protein).toBe('6.2');
    expect(draft.texts.carbs).toBe('');
    expect(draft.texts.fat).toBe('5');
  });

  it('keeps full precision in the basis across weight edits', () => {
    let draft = createDraftFromPer100g('Milk', { caloriesPer100g: 63.3333333, proteinPer100g: null, carbsPer100g: null, fatPer100g: null }, 60);
    draft = updateDraftWeight(draft, '90');
    draft = updateDraftWeight(draft, '120');
    const result = validateDraft(draft);
    expect(result.ok && result.value.per100g.caloriesPer100g).toBeCloseTo(63.3333333, 6);
  });

  it('renormalizes a manually overridden value and uses it for later weight changes', () => {
    let draft = createDraftFromPer100g('Milk', { caloriesPer100g: 52, proteinPer100g: 3.1, carbsPer100g: 4.7, fatPer100g: 2.5 }, 60);
    draft = updateDraftValue(draft, 'calories', '38');
    draft = updateDraftValue(draft, 'protein', '2');
    const result = validateDraft(draft);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.per100g.caloriesPer100g).toBeCloseTo(63.333, 3);
      expect(result.value.per100g.proteinPer100g).toBeCloseTo(3.333, 3);
      expect(result.value.per100g.carbsPer100g).toBeCloseTo(4.7);
    }
    draft = updateDraftWeight(draft, '120');
    expect(draft.texts.calories).toBe('76');
    expect(draft.texts.protein).toBe('4');
  });

  it('handles values typed before the weight', () => {
    let draft = createEmptyDraft();
    draft = { ...draft, name: 'Pizza' };
    draft = updateDraftValue(draft, 'calories', '800');
    draft = updateDraftWeight(draft, '350');
    const result = validateDraft(draft);
    expect(result.ok && result.value.per100g.caloriesPer100g).toBeCloseTo(228.571, 3);
    expect(result.ok && result.value.per100g.proteinPer100g).toBeNull();
    draft = updateDraftWeight(draft, '700');
    expect(draft.texts.calories).toBe('1600');
  });

  it('clearing a macro makes it unknown again', () => {
    let draft = createDraftFromPer100g('Milk', { caloriesPer100g: 52, proteinPer100g: 3.1, carbsPer100g: 4.7, fatPer100g: 2.5 }, 100);
    draft = updateDraftValue(draft, 'fat', '');
    const result = validateDraft(draft);
    expect(result.ok && result.value.per100g.fatPer100g).toBeNull();
  });

  it('reports validation errors for missing name, weight and calories', () => {
    const result = validateDraft(createEmptyDraft());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.name).toBeDefined();
      expect(result.errors.weight).toBeDefined();
      expect(result.errors.calories).toBeDefined();
      expect(result.errors.protein).toBeUndefined();
    }
  });

  it('rejects zero weight and accepts zero calories', () => {
    let draft = createEmptyDraft();
    draft = { ...draft, name: 'Water' };
    draft = updateDraftWeight(draft, '0');
    draft = updateDraftValue(draft, 'calories', '0');
    let result = validateDraft(draft);
    expect(result.ok).toBe(false);
    draft = updateDraftWeight(draft, '250');
    result = validateDraft(draft);
    expect(result.ok && result.value.per100g.caloriesPer100g).toBe(0);
  });
});

describe('parsePer100gTexts', () => {
  it('maps empty optional fields to null and requires calories', () => {
    const ok = parsePer100gTexts({ calories: '52', protein: '', carbs: '4,7', fat: '0' });
    expect(ok.ok && ok.value).toEqual({ caloriesPer100g: 52, proteinPer100g: null, carbsPer100g: 4.7, fatPer100g: 0 });
    const bad = parsePer100gTexts({ calories: '', protein: '', carbs: '', fat: '' });
    expect(bad.ok).toBe(false);
  });
});
