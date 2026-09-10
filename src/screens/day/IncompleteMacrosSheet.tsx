import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { DayEntry, entryDisplayName, MacroKey } from '../../domain/models';
import { getMacroCompleteness } from '../../domain/nutrition/calculations';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  entries: DayEntry[];
  onClose: () => void;
  onEdit: (entry: DayEntry) => void;
}

const MACRO_NAMES: Record<MacroKey, string> = { protein: 'Protein', carbs: 'Carbs', fat: 'Fat' };

/** Lists the entries responsible for incomplete macro totals, each with an explicit Edit button. */
export function IncompleteMacrosSheet({ entries, onClose, onEdit }: Props) {
  const { colors } = useTheme();
  const affected = getMacroCompleteness(entries);
  return (
    <BottomSheet visible onRequestClose={onClose} title="Incomplete nutrition data">
      <Text style={[styles.intro, { color: colors.textSecondary }]}>
        Totals for the macros below only include entries with known values.
      </Text>
      {affected.map(({ entry, missing }) => (
        <View key={entry.id} style={[styles.row, { borderBottomColor: colors.divider }]}>
          <View style={styles.text}>
            <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
              {entryDisplayName(entry)}
            </Text>
            <Text style={[styles.missing, { color: colors.textSecondary }]}>Missing: {missing.map((m) => MACRO_NAMES[m]).join(', ')}</Text>
          </View>
          <Button title="Edit" variant="secondary" compact onPress={() => onEdit(entry)} accessibilityLabel={`Edit ${entryDisplayName(entry)}`} />
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
