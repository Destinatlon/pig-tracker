import { parseOptionalNonNegative, parsePositiveWeight, parseRequiredNonNegative, sanitizeNumericText } from '../src/domain/numeric';
import { formatCalories, formatForInput, formatMacro, formatWeight } from '../src/domain/nutrition/format';

describe('sanitizeNumericText', () => {
  it('strips signs, letters and extra separators', () => {
    expect(sanitizeNumericText('-12.5')).toBe('12.5');
    expect(sanitizeNumericText('12,5')).toBe('12.5');
    expect(sanitizeNumericText('1.2.3')).toBe('1.23');
    expect(sanitizeNumericText('abc')).toBe('');
  });
});

describe('parsers', () => {
  it('requires calories but allows zero', () => {
    expect(parseRequiredNonNegative('')).toEqual({ ok: false, error: 'required' });
    expect(parseRequiredNonNegative('0')).toEqual({ ok: true, value: 0 });
  });
  it('maps empty optional to null, never 0', () => {
    expect(parseOptionalNonNegative('')).toEqual({ ok: true, value: null });
    expect(parseOptionalNonNegative('  ')).toEqual({ ok: true, value: null });
    expect(parseOptionalNonNegative('2.5')).toEqual({ ok: true, value: 2.5 });
  });
  it('weight must be positive', () => {
    expect(parsePositiveWeight('0')).toEqual({ ok: false, error: 'positive' });
    // A minus sign is stripped by the sanitizer, so negatives cannot be typed in the first place.
    expect(parseRequiredNonNegative('-5')).toEqual({ ok: true, value: 5 });
    expect(parsePositiveWeight('127.5')).toEqual({ ok: true, value: 127.5 });
  });
});

describe('formatting', () => {
  it('rounds only for display', () => {
    expect(formatCalories(129.6)).toBe('130');
    expect(formatMacro(7.75)).toBe('7.8');
    expect(formatMacro(8)).toBe('8');
    expect(formatMacro(null)).toBe('?');
    expect(formatWeight(127.5)).toBe('127.5');
    expect(formatForInput(63.333333)).toBe('63.33');
    expect(formatForInput(null)).toBe('');
  });
});
