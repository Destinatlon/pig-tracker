import type { Locale } from './types';

export type PluralForm = 'one' | 'few' | 'many';

/** CLDR-style plural category for integer counts. */
export function pluralForm(locale: Locale, count: number): PluralForm {
  const n = Math.abs(Math.trunc(count));
  if (locale === 'uk') {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'one';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
    return 'many';
  }
  return n === 1 ? 'one' : 'many';
}
