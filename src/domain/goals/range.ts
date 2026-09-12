/**
 * Pure goal-range logic: validation, comparison and the point-target conversion used when an
 * estimate is applied or an old single target is migrated. No rounding happens here — callers
 * round only at the display boundary.
 */
import { GoalRange } from '../models';
import { FieldErrorCode, ParseResult, parseOptionalNonNegative } from '../numeric';
import { POINT_TARGET_TOLERANCE } from './constants';

export const NO_GOAL: GoalRange = { minimum: null, maximum: null };

export function hasGoal(range: GoalRange): boolean {
  return range.minimum !== null || range.maximum !== null;
}

/** Where a known value sits relative to a range. `noGoal` when neither boundary is configured. */
export type RangePosition = 'noGoal' | 'below' | 'within' | 'above';

/** Equality with either boundary counts as within range. */
export function positionInRange(value: number, range: GoalRange): RangePosition {
  if (!hasGoal(range)) return 'noGoal';
  if (range.minimum !== null && value < range.minimum) return 'below';
  if (range.maximum !== null && value > range.maximum) return 'above';
  return 'within';
}

/**
 * Turns a single target into an explicit +/-10% range. This is a defaulting rule used when
 * applying an estimate and when migrating old point targets; classification never applies a
 * hidden tolerance of its own.
 */
export function pointTargetToRange(target: number | null, tolerance = POINT_TARGET_TOLERANCE): GoalRange {
  if (target === null) return NO_GOAL;
  return { minimum: target * (1 - tolerance), maximum: target * (1 + tolerance) };
}

/** Which side of a range a single entered value is. Macros are edited one boundary at a time. */
export type GoalBound = 'minimum' | 'maximum';

export const GOAL_BOUNDS: readonly GoalBound[] = ['minimum', 'maximum'];

export function rangeForBound(bound: GoalBound, value: number): GoalRange {
  return bound === 'minimum' ? { minimum: value, maximum: null } : { minimum: null, maximum: value };
}

/**
 * The boundary a one-sided editor should show for a stored range. A range that carries both
 * (an applied estimate, or a migrated point target) is edited from its minimum.
 */
export function preferredBound(range: GoalRange): GoalBound {
  return range.minimum === null && range.maximum !== null ? 'maximum' : 'minimum';
}

/** Parses the single value of a one-sided goal. The value is required once the goal is enabled. */
export function parseBoundText(text: string, bound: GoalBound): ParseResult<GoalRange> {
  const parsed = parseOptionalNonNegative(text);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  if (parsed.value === null) return { ok: false, error: 'required' };
  return { ok: true, value: rangeForBound(bound, parsed.value) };
}

/** Guard for values coming from storage or from an estimate. */
export function isValidRange(range: GoalRange, required = false): boolean {
  for (const boundary of [range.minimum, range.maximum]) {
    if (boundary === null) continue;
    if (!Number.isFinite(boundary) || boundary < 0) return false;
  }
  if (required && !hasGoal(range)) return false;
  if (range.minimum !== null && range.maximum !== null && range.minimum > range.maximum) return false;
  return true;
}

const EPSILON = 1e-6;

function sameBoundary(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return a === b;
  return Math.abs(a - b) < EPSILON;
}

export function sameRange(a: GoalRange, b: GoalRange): boolean {
  return sameBoundary(a.minimum, b.minimum) && sameBoundary(a.maximum, b.maximum);
}

/** Which of the four `range.*` messages describes a range, and the values to interpolate. */
export type RangeShapeKey = 'both' | 'min' | 'max' | 'none';

export interface RangeShape {
  key: RangeShapeKey;
  params: Record<string, string>;
}

/**
 * Chooses the display form of a range. The caller supplies the display formatter (calories are
 * whole numbers, macros keep a decimal) and turns the key into a localized string, so no
 * user-facing text is built here.
 */
export function rangeShape(range: GoalRange, format: (value: number) => string): RangeShape {
  const minimum = range.minimum !== null ? format(range.minimum) : null;
  const maximum = range.maximum !== null ? format(range.maximum) : null;
  if (minimum !== null && maximum !== null) return { key: 'both', params: { min: minimum, max: maximum } };
  if (minimum !== null) return { key: 'min', params: { min: minimum } };
  if (maximum !== null) return { key: 'max', params: { max: maximum } };
  return { key: 'none', params: {} };
}

