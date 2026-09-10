/**
 * Pure calorie/protein estimation (Mifflin–St Jeor). No rounding happens here: callers round
 * only at the display boundary. Inputs are validated and invalid values throw, so NaN or
 * Infinity can never leak into results.
 */
import { ACTIVITY_MULTIPLIERS, ActivityLevel, EstimatedGoalType, GOAL_CALORIE_ADJUSTMENTS, GOAL_PROTEIN_PER_KG, Sex } from './constants';

export interface BmrInput {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
}

export interface EstimateInput extends BmrInput {
  activityLevel: ActivityLevel;
  goalType: EstimatedGoalType;
}

export interface GoalEstimate {
  bmr: number;
  estimatedTdee: number;
  /** Suggested starting calorie target, full precision. */
  calorieTarget: number;
  /** Suggested protein in grams per day, full precision. */
  proteinTarget: number | null;
}

function assertPositive(name: string, value: number): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number, got ${String(value)}`);
  }
}

/** Basal metabolic rate via Mifflin–St Jeor. */
export function calculateBmr({ sex, age, heightCm, weightKg }: BmrInput): number {
  assertPositive('age', age);
  assertPositive('heightCm', heightCm);
  assertPositive('weightKg', weightKg);
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

/** Estimated total daily energy expenditure: BMR scaled by the activity multiplier. */
export function calculateTdee(bmr: number, activityLevel: ActivityLevel): number {
  assertPositive('bmr', bmr);
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel];
  if (multiplier === undefined) throw new RangeError(`Unknown activity level ${String(activityLevel)}`);
  return bmr * multiplier;
}

/** Applies the goal's percentage adjustment to estimated TDEE. */
export function calculateGoalCalories(tdee: number, goalType: EstimatedGoalType): number {
  assertPositive('tdee', tdee);
  const adjustment = GOAL_CALORIE_ADJUSTMENTS[goalType];
  if (adjustment === undefined) throw new RangeError(`Unknown goal type ${String(goalType)}`);
  return tdee * (1 + adjustment);
}

/** Protein suggestion from current body weight and the goal's g/kg factor. */
export function calculateSuggestedProtein(weightKg: number, goalType: EstimatedGoalType): number {
  assertPositive('weightKg', weightKg);
  const perKg = GOAL_PROTEIN_PER_KG[goalType];
  if (perKg === undefined) throw new RangeError(`Unknown goal type ${String(goalType)}`);
  return weightKg * perKg;
}

/** One-shot estimate used by the UI; every value keeps full precision. */
export function estimateGoals(input: EstimateInput): GoalEstimate {
  const bmr = calculateBmr(input);
  const estimatedTdee = calculateTdee(bmr, input.activityLevel);
  return {
    bmr,
    estimatedTdee,
    calorieTarget: calculateGoalCalories(estimatedTdee, input.goalType),
    proteinTarget: calculateSuggestedProtein(input.weightKg, input.goalType),
  };
}
