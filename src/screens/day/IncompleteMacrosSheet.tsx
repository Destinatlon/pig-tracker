import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { DayEntry, entryDisplayName, MacroKey } from '../../domain/models';
import { getMacroCompleteness } from '../../domain/nutrition/calculations';
import { spacing, typography } from '../../theme/tokens';
import { useI18n } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  entries: DayEntry[];
  onClose: () => void;
  onEdit: (entry: DayEntry) => void;
}


/** Lists the entries responsible for incomplete macro totals, each with an explicit Edit button. */
export function IncompleteMacrosSheet({ entries, onClose, onEdit }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const macroNames: Record<MacroKey, string> = { protein: t('macro.protein'), carbs: t('macro.carbs'), fat: t('macro.fat') };
  const affected = getMacroCompleteness(entries);
  return (
    <BottomSheet visible onRequestClose={onClose} title={t('incomplete.title')}>
      <Text style={[styles.intro, { color: colors.textSecondary }]}>{t('incomplete.intro')}</Text>
      {affected.map(({ entry, missing }) => (
        <View key={entry.id} style={[styles.row, { borderBottomColor: colors.divider }]}>
          <View style={styles.text}>
            <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
              {entryDisplayName(entry)}
            </Text>
            <Text style={[styles.missing, { color: colors.textSecondary }]}>{t('incomplete.missing', { list: missing.map((m) => macroNames[m]).join(', ') })}</Text>
          </View>
          <Button title={t('common.edit')} variant="secondary" compact onPress={() => onEdit(entry)} accessibilityLabel={t('incomplete.editA11y', { name: entryDisplayName(entry) })} />
        </View>
      ))}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  intro: { ...typography.secondary, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.sm },
  text: { flex: 1, marginRight: spacing.md },
  name: { ...typography.bodyStrong },
  missing: { ...typography.secondary, marginTop: 2 },
});
