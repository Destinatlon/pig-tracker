/** Centralized numeric parsing for form fields. Negative values are never accepted. */

/** Machine-readable validation outcome; the UI turns it into a translated message. */
export type FieldErrorCode = 'required' | 'nonNegative' | 'positive' | 'wholeNumber' | 'unrealistic';

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: FieldErrorCode };

/** Keeps only digits and a single decimal separator. Commas become dots. */
export function sanitizeNumericText(text: string): string {
  const normalized = text.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const firstDot = normalized.indexOf('.');
  if (firstDot === -1) return normalized;
  return normalized.slice(0, firstDot + 1) + normalized.slice(firstDot + 1).replace(/\./g, '');
}

export function parseNumberText(text: string): { kind: 'empty' } | { kind: 'invalid' } | { kind: 'value'; value: number } {
  const trimmed = sanitizeNumericText(text.trim());
  if (trimmed === '' || trimmed === '.') return { kind: 'empty' };
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { kind: 'invalid' };
  return { kind: 'value', value };
}

/** Required, may be zero, never negative. Used for calories. */
export function parseRequiredNonNegative(text: string): ParseResult<number> {
  const parsed = parseNumberText(text);
  if (parsed.kind === 'empty') return { ok: false, error: 'required' };
  if (parsed.kind === 'invalid' || parsed.value < 0) return { ok: false, error: 'nonNegative' };
  return { ok: true, value: parsed.value };
}

/** Optional: empty maps to null (unknown), never to 0. */
export function parseOptionalNonNegative(text: string): ParseResult<number | null> {
  const parsed = parseNumberText(text);
  if (parsed.kind === 'empty') return { ok: true, value: null };
  if (parsed.kind === 'invalid' || parsed.value < 0) return { ok: false, error: 'nonNegative' };
  return { ok: true, value: parsed.value };
}

/** Weight must be strictly greater than zero. */
export function parsePositiveWeight(text: string): ParseResult<number> {
  const parsed = parseNumberText(text);
  if (parsed.kind === 'empty') return { ok: false, error: 'required' };
  if (parsed.kind === 'invalid' || !(parsed.value > 0)) return { ok: false, error: 'positive' };
  return { ok: true, value: parsed.value };
}

export function parseRequiredName(text: string): ParseResult<string> {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: false, error: 'required' };
  return { ok: true, value: trimmed };
}

/** Required positive number within a plausibility range (e.g. body weight). Out-of-range values are rejected, not clamped. */
export function parseNumberInRange(text: string, min: number, max: number): ParseResult<number> {
  const parsed = parseNumberText(text);
  if (parsed.kind === 'empty') return { ok: false, error: 'required' };
  if (parsed.kind === 'invalid' || !(parsed.value > 0)) return { ok: false, error: 'positive' };
  if (parsed.value < min || parsed.value > max) return { ok: false, error: 'unrealistic' };
  return { ok: true, value: parsed.value };
}

/** Required whole number within a range (e.g. age). */
export function parseIntegerInRange(text: string, min: number, max: number): ParseResult<number> {
  const parsed = parseNumberInRange(text, min, max);
  if (!parsed.ok) return parsed;
  if (!Number.isInteger(parsed.value)) return { ok: false, error: 'wholeNumber' };
  return parsed;
}
