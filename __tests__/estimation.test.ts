import { ACTIVITY_LEVELS, ACTIVITY_MULTIPLIERS, GOAL_CALORIE_ADJUSTMENTS, GOAL_PROTEIN_PER_KG } from '../src/domain/goals/constants';
import { calculateBmr, calculateGoalCalories, calculateSuggestedProtein, calculateTdee, estimateGoals } from '../src/domain/goals/estimation';
import { parseAge, parseHeightCm, parseProfileTexts, parseWeightKg, profileFromJson } from '../src/domain/goals/profile';
import { formatCalories, formatMacro } from '../src/domain/nutrition/format';

const male = { sex: 'male' as const, age: 30, heightCm: 175, weightKg: 90 };
const female = { sex: 'female' as const, age: 30, heightCm: 165, weightKg: 60 };

describe('calculateBmr (Mifflin–St Jeor)', () => {
  it('male: 10w + 6.25h − 5a + 5', () => {
    expect(calculateBmr(male)).toBe(10 * 90 + 6.25 * 175 - 5 * 30 + 5); // 1848.75
    expect(calculateBmr(male)).toBe(1848.75);
  });
  it('female: 10w + 6.25h − 5a − 161', () => {
    expect(calculateBmr(female)).toBe(10 * 60 + 6.25 * 165 - 5 * 30 - 161); // 1320.25
    expect(calculateBmr(female)).toBe(1320.25);
  });
  it('rejects zero, negative and non-finite inputs', () => {
    expect(() => calculateBmr({ ...male, age: 0 })).toThrow(RangeError);
    expect(() => calculateBmr({ ...male, heightCm: -175 })).toThrow(RangeError);
    expect(() => calculateBmr({ ...male, weightKg: Number.NaN })).toThrow(RangeError);
    expect(() => calculateBmr({ ...male, weightKg: Number.POSITIVE_INFINITY })).toThrow(RangeError);
  });
});

describe('calculateTdee', () => {
  it.each(ACTIVITY_LEVELS)('applies the %s multiplier', (level) => {
    expect(calculateTdee(2000, level)).toBe(2000 * ACTIVITY_MULTIPLIERS[level]);
  });
  it('uses the standard multipliers', () => {
    expect(ACTIVITY_MULTIPLIERS).toEqual({ sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725 });
  });
  it('rejects an invalid BMR', () => {
    expect(() => calculateTdee(0, 'moderate')).toThrow(RangeError);
    expect(() => calculateTdee(-1, 'moderate')).toThrow(RangeError);
  });
});

describe('calculateGoalCalories', () => {
  it('maintenance keeps TDEE unchanged', () => {
    expect(calculateGoalCalories(2700, 'maintain')).toBe(2700);
  });
  it('slow fat loss is 12.5 % below maintenance', () => {
    expect(calculateGoalCalories(2700, 'slowFatLoss')).toBeCloseTo(2362.5, 10);
  });
  it('fat loss is 20 % below maintenance', () => {
    expect(calculateGoalCalories(2700, 'fatLoss')).toBeCloseTo(2160, 10);
  });
  it('weight gain is above maintenance', () => {
    expect(calculateGoalCalories(2700, 'slowGain')).toBeCloseTo(2835, 10);
    expect(calculateGoalCalories(2700, 'muscleGain')).toBeCloseTo(2970, 10);
  });
  it('uses percentage adjustments, not fixed subtractions', () => {
    const small = calculateGoalCalories(1500, 'fatLoss');
    const large = calculateGoalCalories(3000, 'fatLoss');
    expect(1500 - small).toBeCloseTo(300, 10);
    expect(3000 - large).toBeCloseTo(600, 10);
    expect(GOAL_CALORIE_ADJUSTMENTS).toEqual({ maintain: 0, slowFatLoss: -0.125, fatLoss: -0.2, slowGain: 0.05, muscleGain: 0.1 });
  });
  it('rejects a non-positive TDEE', () => {
    expect(() => calculateGoalCalories(0, 'maintain')).toThrow(RangeError);
  });
});

describe('calculateSuggestedProtein', () => {
  it('multiplies body weight by the goal factor', () => {
    expect(calculateSuggestedProtein(90, 'slowFatLoss')).toBeCloseTo(171, 10);
    expect(calculateSuggestedProtein(90, 'maintain')).toBeCloseTo(144, 10);
    expect(calculateSuggestedProtein(90, 'fatLoss')).toBeCloseTo(180, 10);
    expect(calculateSuggestedProtein(90, 'muscleGain')).toBeCloseTo(162, 10);
    expect(GOAL_PROTEIN_PER_KG).toEqual({ maintain: 1.6, slowFatLoss: 1.9, fatLoss: 2.0, slowGain: 1.6, muscleGain: 1.8 });
  });
  it('rejects zero or negative weight', () => {
    expect(() => calculateSuggestedProtein(0, 'maintain')).toThrow(RangeError);
    expect(() => calculateSuggestedProtein(-70, 'maintain')).toThrow(RangeError);
  });
});

describe('estimateGoals', () => {
  it('chains BMR → TDEE → target with full precision', () => {
    const result = estimateGoals({ ...male, activityLevel: 'moderate', goalType: 'slowFatLoss' });
    expect(result.bmr).toBe(1848.75);
    expect(result.estimatedTdee).toBeCloseTo(1848.75 * 1.55, 10); // 2865.5625
    expect(result.calorieTarget).toBeCloseTo(2865.5625 * 0.875, 10); // 2507.3671875
    expect(result.proteinTarget).toBeCloseTo(171, 10);
  });
  it('keeps unrounded values; rounding happens only in display formatting', () => {
    const result = estimateGoals({ ...male, activityLevel: 'moderate', goalType: 'slowFatLoss' });
    expect(Number.isInteger(result.calorieTarget)).toBe(false);
    expect(formatCalories(result.calorieTarget)).toBe('2507');
    expect(formatCalories(result.estimatedTdee)).toBe('2866');
    expect(formatMacro(result.proteinTarget)).toBe('171');
  });
  it('never returns NaN or Infinity for valid input', () => {
    const result = estimateGoals({ ...female, activityLevel: 'sedentary', goalType: 'fatLoss' });
    for (const value of [result.bmr, result.estimatedTdee, result.calorieTarget, result.proteinTarget]) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });
});

describe('profile validation', () => {
  it('age must be a whole number in a human range', () => {
    expect(parseAge('')).toEqual({ ok: false, error: 'required' });
    expect(parseAge('0')).toEqual({ ok: false, error: 'positive' });
    expect(parseAge('25.5')).toEqual({ ok: false, error: 'wholeNumber' });
    expect(parseAge('5')).toEqual({ ok: false, error: 'unrealistic' });
    expect(parseAge('200')).toEqual({ ok: false, error: 'unrealistic' });
    expect(parseAge('25')).toEqual({ ok: true, value: 25 });
  });
  it('height and weight must be positive and plausible', () => {
    expect(parseHeightCm('0')).toEqual({ ok: false, error: 'positive' });
    expect(parseHeightCm('175.5')).toEqual({ ok: true, value: 175.5 });
    expect(parseWeightKg('')).toEqual({ ok: false, error: 'required' });
    expect(parseWeightKg('90,4')).toEqual({ ok: true, value: 90.4 });
    expect(parseWeightKg('1000')).toEqual({ ok: false, error: 'unrealistic' });
  });
  it('reports every invalid field at once', () => {
    const result = parseProfileTexts({ age: '', heightCm: '0', weightKg: '90' });
    expect(result).toEqual({ ok: false, errors: { age: 'required', heightCm: 'positive' } });
  });
  it('parses stored profiles defensively', () => {
    expect(profileFromJson(null).age).toBeNull();
    expect(profileFromJson('not json').sex).toBeNull();
    const parsed = profileFromJson(JSON.stringify({ age: 30, sex: 'other', heightCm: -1, weightKg: 90, activityLevel: 'moderate', goalType: 'nope' }));
    expect(parsed).toEqual({ age: 30, sex: null, heightCm: null, weightKg: 90, activityLevel: 'moderate', goalType: null });
  });
});
