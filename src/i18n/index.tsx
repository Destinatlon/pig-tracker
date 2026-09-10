import { getLocales } from 'expo-localization';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { setLanguagePreference } from '../db/repositories/settingsRepo';
import { DateNames, describeDate, formatLongDate, formatShortDate } from '../domain/dates';
import { setDecimalSeparator } from '../domain/nutrition/format';
import type { FieldErrorCode } from '../domain/numeric';
import { en } from './en';
import { pluralForm } from './plural';
import { Dictionary, LanguagePreference, Locale, PluralKeyBase, SUPPORTED_LOCALES, TranslationKey } from './types';
import { uk } from './uk';

const dictionaries: Record<Locale, Dictionary> = { en, uk };

export type TranslateParams = Record<string, string | number>;

export interface I18n {
  locale: Locale;
  preference: LanguagePreference;
  setPreference: (preference: LanguagePreference) => Promise<void>;
  t: (key: TranslationKey, params?: TranslateParams) => string;
  tn: (base: PluralKeyBase, count: number, params?: TranslateParams) => string;
  /** Translated validation message for a field label, or undefined when there is no error. */
  fieldError: (fieldLabel: string, code: FieldErrorCode | undefined) => string | undefined;
  dateNames: DateNames;
  longDate: (key: string) => string;
  shortDate: (key: string) => string;
  relativeDate: (key: string) => string;
}

const I18nContext = createContext<I18n | null>(null);

/** The device language, narrowed to a supported locale (English otherwise). */
export function systemLocale(): Locale {
  const code = getLocales()[0]?.languageCode ?? 'en';
  return SUPPORTED_LOCALES.includes(code as Locale) ? (code as Locale) : 'en';
}

export function resolveLocale(preference: LanguagePreference): Locale {
  return preference === 'system' ? systemLocale() : preference;
}

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

export function createTranslator(locale: Locale) {
  const dict = dictionaries[locale];
  const t = (key: TranslationKey, params?: TranslateParams) => interpolate(dict[key] as string, params);
  const tn = (base: PluralKeyBase, count: number, params?: TranslateParams) =>
    interpolate(dict[`${base}_${pluralForm(locale, count)}` as TranslationKey] as string, { count, ...params });
  const dateNames: DateNames = {
    weekdays: dict.weekdays,
    months: dict.months,
    monthsShort: dict.monthsShort,
    today: dict['common.today'],
    yesterday: dict['common.yesterday'],
    tomorrow: dict['common.tomorrow'],
  };
  return { t, tn, dateNames, decimalSeparator: dict.decimalSeparator };
}

interface Props {
  initialPreference: LanguagePreference;
  children: React.ReactNode;
}

export function I18nProvider({ initialPreference, children }: Props) {
  const [preference, setPreferenceState] = useState<LanguagePreference>(initialPreference);
  const locale = resolveLocale(preference);

  const setPreference = useCallback(async (next: LanguagePreference) => {
    setPreferenceState(next);
    await setLanguagePreference(next);
  }, []);

  const value = useMemo<I18n>(() => {
    const { t, tn, dateNames, decimalSeparator } = createTranslator(locale);
    setDecimalSeparator(decimalSeparator);
    return {
      locale,
      preference,
      setPreference,
      t,
      tn,
      fieldError: (fieldLabel, code) => (code ? t(`error.${code}`, { field: fieldLabel }) : undefined),
      dateNames,
      longDate: (key) => formatLongDate(key, dateNames),
      shortDate: (key) => formatShortDate(key, dateNames),
      relativeDate: (key) => describeDate(key, dateNames),
    };
  }, [locale, preference, setPreference]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const i18n = useContext(I18nContext);
  if (!i18n) throw new Error('useI18n must be used inside I18nProvider');
  return i18n;
}
