/** Effective-dated goal lookup, kept pure so a whole chart can resolve its goals from one query. */
import { DateKey } from '../models';

export interface EffectiveDated {
  effectiveFrom: DateKey;
}

/**
 * The row in force on a date: the latest one effective on or before it. Rows may arrive in any
 * order. Falls back to the earliest row so a date before the baseline still has a goal.
 */
export function resolveEffective<T extends EffectiveDated>(rows: readonly T[], date: DateKey): T | null {
  let inForce: T | null = null;
  let earliest: T | null = null;
  for (const row of rows) {
    if (earliest === null || row.effectiveFrom < earliest.effectiveFrom) earliest = row;
    if (row.effectiveFrom > date) continue;
    if (inForce === null || row.effectiveFrom > inForce.effectiveFrom) inForce = row;
  }
  return inForce ?? earliest;
}
