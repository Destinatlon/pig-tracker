import Constants from 'expo-constants';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RadioOption } from '../../components/RadioOption';
import { ThemePreference } from '../../domain/models';
import { createTranslator, resolveLocale, useI18n } from '../../i18n';
import { LanguagePreference, LOCALE_NAMES, SUPPORTED_LOCALES } from '../../i18n/types';
import { rescheduleReminderIfEnabled } from '../../notifications/reminders';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

const THEMES: ThemePreference[] = ['system', 'light', 'dark'];
const LANGUAGES: LanguagePreference[] = ['system', ...SUPPORTED_LOCALES];

export function AppTab() {
  const { colors, preference, setPreference } = useTheme();
  const i18n = useI18n();
  const { t } = i18n;
  const version = Constants.expoConfig?.version ?? '—';

  const themeLabel = (theme: ThemePreference) => (theme === 'system' ? t('app.themeSystem') : theme === 'light' ? t('app.themeLight') : t('app.themeDark'));
  const languageLabel = (language: LanguagePreference) =>
    language === 'system' ? `${t('app.languageSystem')} (${LOCALE_NAMES[resolveLocale('system')]})` : LOCALE_NAMES[language];

  const changeLanguage = async (language: LanguagePreference) => {
    await i18n.setPreference(language);
    // The scheduled reminder carries fixed text, so refresh it in the new language.
    const next = createTranslator(resolveLocale(language)).t;
    rescheduleReminderIfEnabled({ title: next('reminder.notificationTitle'), body: next('reminder.notificationBody') }).catch(() => undefined);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.section, { color: colors.textSecondary }]}>{t('app.language')}</Text>
      {LANGUAGES.map((language) => (
        <RadioOption
          key={language}
          label={languageLabel(language)}
          accessibilityLabel={t('app.languageA11y', { language: languageLabel(language) })}
          selected={language === i18n.preference}
          onPress={() => changeLanguage(language)}
        />
      ))}
      <Text style={[styles.section, styles.sectionSpaced, { color: colors.textSecondary }]}>{t('app.theme')}</Text>
      {THEMES.map((theme) => (
        <RadioOption
          key={theme}
          label={themeLabel(theme)}
          accessibilityLabel={t('app.themeA11y', { theme: themeLabel(theme) })}
          selected={theme === preference}
          onPress={() => setPreference(theme)}
        />
      ))}
      <Text style={[styles.section, styles.sectionSpaced, { color: colors.textSecondary }]}>{t('app.about')}</Text>
      <View style={[styles.row, { borderBottomColor: colors.divider }]}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{t('app.version')}</Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{version}</Text>
      </View>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('app.privacy')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg },
  section: { ...typography.label, textTransform: 'uppercase', marginBottom: spacing.xs },
  sectionSpaced: { marginTop: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth },
  label: { ...typography.body },
  hint: { ...typography.secondary, marginTop: spacing.md },
});
