/** Centralized numeric parsing for form fields. Negative values are never accepted. */

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

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
export function parseRequiredNonNegative(text: string, label = 'Value'): ParseResult<number> {
  const parsed = parseNumberText(text);
  if (parsed.kind === 'empty') return { ok: false, error: `${label} is required` };
  if (parsed.kind === 'invalid' || parsed.value < 0) return { ok: false, error: `${label} must be a non-negative number` };
  return { ok: true, value: parsed.value };
}

/** Optional: empty maps to null (unknown), never to 0. */
export function parseOptionalNonNegative(text: string, label = 'Value'): ParseResult<number | null> {
  const parsed = parseNumberText(text);
  if (parsed.kind === 'empty') return { ok: true, value: null };
  if (parsed.kind === 'invalid' || parsed.value < 0) return { ok: false, error: `${label} must be a non-negative number` };
  return { ok: true, value: parsed.value };
}

/** Weight must be strictly greater than zero. */
export function parsePositiveWeight(text: string, label = 'Weight'): ParseResult<number> {
  const parsed = parseNumberText(text);
  if (parsed.kind === 'empty') return { ok: false, error: `${label} is required` };
  if (parsed.kind === 'invalid' || !(parsed.value > 0)) return { ok: false, error: `${label} must be greater than zero` };
  return { ok: true, value: parsed.value };
}

export function parseRequiredName(text: string, label = 'Name'): ParseResult<string> {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: false, error: `${label} is required` };
  return { ok: true, value: trimmed };
}
