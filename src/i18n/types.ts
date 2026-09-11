import type { en } from './en';

export type Dictionary = { [K in keyof typeof en]: (typeof en)[K] extends readonly string[] ? readonly string[] : string };

/** Keys whose value is a plain string (arrays like month names are accessed separately). */
export type TranslationKey = { [K in keyof Dictionary]: Dictionary[K] extends string ? K : never }[keyof Dictionary];

/** Base of a pluralised key: `${base}_one`, `${base}_few`, `${base}_many` must all exist. */
export type PluralKeyBase = 'day.copiedEntries' | 'recipe.ingredientCount';

export type Locale = 'en' | 'uk';
export type LanguagePreference = 'system' | Locale;

export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'uk'];
export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', uk: 'Українська' };
