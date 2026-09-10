import { en } from '../src/i18n/en';
import { pluralForm } from '../src/i18n/plural';
import { uk } from '../src/i18n/uk';

describe('dictionaries', () => {
  it('uk covers every en key with the same placeholders', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      const source = en[key];
      const target = uk[key];
      expect(target).toBeDefined();
      if (typeof source === 'string') {
        const placeholders = (source.match(/\{\w+\}/g) ?? []).sort();
        expect((String(target).match(/\{\w+\}/g) ?? []).sort()).toEqual(placeholders);
      } else {
        expect((target as readonly string[]).length).toBe(source.length);
      }
    }
  });
});

describe('pluralForm', () => {
  it('follows Ukrainian rules', () => {
    expect([1, 21, 101].map((n) => pluralForm('uk', n))).toEqual(['one', 'one', 'one']);
    expect([2, 3, 4, 22, 24].map((n) => pluralForm('uk', n))).toEqual(['few', 'few', 'few', 'few', 'few']);
    expect([0, 5, 11, 12, 14, 19, 25, 100].map((n) => pluralForm('uk', n))).toEqual(['many', 'many', 'many', 'many', 'many', 'many', 'many', 'many']);
  });
  it('follows English rules', () => {
    expect(pluralForm('en', 1)).toBe('one');
    expect(pluralForm('en', 0)).toBe('many');
    expect(pluralForm('en', 2)).toBe('many');
  });
});
