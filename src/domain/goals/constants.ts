/**
 * Tunable constants for the goal estimator. Everything user-visible that depends on a
 * multiplier or percentage reads from here; screens never hard-code these numbers.
 */

export const SEXES = ['male', 'female'] as const;
export type Sex = (typeof SEXES)[number];

export const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'very'] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

/** TDEE = BMR × multiplier. Standard starting values; Phase 2 may calibrate them from observed data. */
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
};

export const GOAL_TYPES = ['maintain', 'slowFatLoss', 'fatLoss', 'slowGain', 'muscleGain', 'custom'] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

/** Goals whose calorie target is derived from TDEE. `custom` is entered by hand. */
export type EstimatedGoalType = Exclude<GoalType, 'custom'>;

/** Fractional adjustment applied to estimated TDEE (−0.2 = 20 % below maintenance). */
export const GOAL_CALORIE_ADJUSTMENTS: Record<EstimatedGoalType, number> = {
  maintain: 0,
  slowFatLoss: -0.125,
  fatLoss: -0.2,
  slowGain: 0.05,
  muscleGain: 0.1,
};

/** Suggested protein in grams per kilogram of current body weight. */
export const GOAL_PROTEIN_PER_KG: Record<EstimatedGoalType, number> = {
  maintain: 1.6,
  slowFatLoss: 1.9,
  fatLoss: 2.0,
  slowGain: 1.6,
  muscleGain: 1.8,
};

/**
 * Fraction applied on each side when a single target becomes a range: an estimate that suggests
 * 2000 kcal is saved as 1800–2200. This is a defaulting rule for estimates and for the migration
 * of old point targets only — classification compares against the stored boundaries exactly.
 */
export const POINT_TARGET_TOLERANCE = 0.1;

/** Plausibility bounds for profile input. Values outside are rejected as typos, not clamped. */
export const PROFILE_LIMITS = {
  age: { min: 10, max: 120 },
  heightCm: { min: 50, max: 300 },
  weightKg: { min: 20, max: 500 },
} as const;
