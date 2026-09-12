/** Display-only rounding. Never feed these strings back into persisted values. */

let decimalSeparator = '.';

/** Set by the i18n provider; affects display formatting only, never input parsing. */
export function setDecimalSeparator(separator: string): void {
  decimalSeparator = separator;
}

function trimZeros(text: string): string {
  return text.includes('.') ? text.replace(/\.?0+$/, '') : text;
}

function localized(text: string): string {
  return decimalSeparator === '.' ? text : text.replace('.', decimalSeparator);
}

/** Calories are shown as whole numbers. */
export function formatCalories(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '?';
  return String(Math.round(value));
}

/** Macros are shown with at most one decimal place. Unknown values show `?`. */
export function formatMacro(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '?';
  return localized(trimZeros(value.toFixed(1)));
}

/** Weight in grams with at most one decimal place. */
export function formatWeight(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '?';
  return localized(trimZeros(value.toFixed(1)));
}

/** Value used to prefill an editable input: up to two decimals, empty for unknown. */
export function formatForInput(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return trimZeros(value.toFixed(2));
}
