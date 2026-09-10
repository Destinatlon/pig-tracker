/**
 * The user's current estimation profile. It is configuration for generating suggestions,
 * not history: historical targets live in goal_settings, and Phase 2 body-weight records
 * will get their own dated table rather than being folded into this object.
 */
import { FieldErrorCode, parseIntegerInRange, parseNumberInRange, ParseResult } from '../numeric';
import { ACTIVITY_LEVELS, ActivityLevel, GOAL_TYPES, GoalType, PROFILE_LIMITS, SEXES, Sex } from './constants';

export interface GoalProfile {
  age: number | null;
  sex: Sex | null;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: ActivityLevel | null;
  goalType: GoalType | null;
}

export const EMPTY_PROFILE: GoalProfile = { age: null, sex: null, heightCm: null, weightKg: null, activityLevel: null, goalType: null };

export function isSex(value: unknown): value is Sex {
  return typeof value === 'string' && (SEXES as readonly string[]).includes(value);
}

export function isActivityLevel(value: unknown): value is ActivityLevel {
  return typeof value === 'string' && (ACTIVITY_LEVELS as readonly string[]).includes(value);
}

export function isGoalType(value: unknown): value is GoalType {
  return typeof value === 'string' && (GOAL_TYPES as readonly string[]).includes(value);
}

/** Text inputs of the estimation form. */
export interface ProfileTexts {
  age: string;
  heightCm: string;
  weightKg: string;
}

export type ProfileField = keyof ProfileTexts;
export type ProfileErrors = Partial<Record<ProfileField, FieldErrorCode>>;

export interface ValidProfileNumbers {
  age: number;
  heightCm: number;
  weightKg: number;
}

export function parseAge(text: string): ParseResult<number> {
  return parseIntegerInRange(text, PROFILE_LIMITS.age.min, PROFILE_LIMITS.age.max);
}

export function parseHeightCm(text: string): ParseResult<number> {
  return parseNumberInRange(text, PROFILE_LIMITS.heightCm.min, PROFILE_LIMITS.heightCm.max);
}

export function parseWeightKg(text: string): ParseResult<number> {
  return parseNumberInRange(text, PROFILE_LIMITS.weightKg.min, PROFILE_LIMITS.weightKg.max);
}

/** Validates all numeric profile fields at once, returning every error rather than the first. */
export function parseProfileTexts(texts: ProfileTexts): { ok: true; value: ValidProfileNumbers } | { ok: false; errors: ProfileErrors } {
  const age = parseAge(texts.age);
  const heightCm = parseHeightCm(texts.heightCm);
  const weightKg = parseWeightKg(texts.weightKg);
  if (age.ok && heightCm.ok && weightKg.ok) {
    return { ok: true, value: { age: age.value, heightCm: heightCm.value, weightKg: weightKg.value } };
  }
  const errors: ProfileErrors = {};
  if (!age.ok) errors.age = age.error;
  if (!heightCm.ok) errors.heightCm = heightCm.error;
  if (!weightKg.ok) errors.weightKg = weightKg.error;
  return { ok: false, errors };
}

/** Parses a stored JSON profile defensively; unknown or malformed fields become null. */
export function profileFromJson(json: string | null): GoalProfile {
  if (!json) return EMPTY_PROFILE;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return EMPTY_PROFILE;
  }
  if (!raw || typeof raw !== 'object') return EMPTY_PROFILE;
  const record = raw as Record<string, unknown>;
  const finitePositive = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null);
  return {
    age: finitePositive(record.age),
    sex: isSex(record.sex) ? record.sex : null,
    heightCm: finitePositive(record.heightCm),
    weightKg: finitePositive(record.weightKg),
    activityLevel: isActivityLevel(record.activityLevel) ? record.activityLevel : null,
    goalType: isGoalType(record.goalType) ? record.goalType : null,
  };
}

export function profileToJson(profile: GoalProfile): string {
  return JSON.stringify(profile);
}
