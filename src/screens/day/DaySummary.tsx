import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DayTotals } from '../../domain/nutrition/calculations';
import { formatCalories, formatMacro, formatTarget } from '../../domain/nutrition/format';
import { GoalSettings, MacroKey } from '../../domain/models';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  totals: DayTotals;
  goal: GoalSettings | null;
  onWarningPress: () => void;
}

const MACRO_LABEL: Record<MacroKey, string> = { protein: 'P', carbs: 'C', fat: 'F' };
const MACRO_ORDER: readonly MacroKey[] = ['protein', 'carbs', 'fat'];

/** Compact numbers-only daily summary. No progress bars by design. */
export function DaySummary({ totals, goal, onWarningPress }: Props) {
  const { colors } = useTheme();
  const over = goal !== null && totals.calories > goal.calories;
  const anyIncomplete = MACRO_ORDER.some((key) => totals.incomplete[key]);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
      <View style={styles.textBlock}>
        <Text style={[styles.calories, { color: colors.textPrimary }]} accessibilityLabel={`${formatCalories(totals.calories)} of ${goal ? formatCalories(goal.calories) : 'unknown'} calories${over ? ', over target' : ''}`}>
          <Text style={over ? { color: colors.warning, textDecorationLine: 'underline' } : undefined}>{formatCalories(totals.calories)}</Text>
          <Text style={{ color: colors.textSecondary }}> / {goal ? formatCalories(goal.calories) : '—'} kcal</Text>
          {over ? <Text style={[styles.overTag, { color: colors.warning }]}>  over</Text> : null}
        </Text>
        <Text style={[styles.macros, { color: colors.textSecondary }]}>
          {MACRO_ORDER.map((key, index) => (
            <Text key={key}>
              {index > 0 ? ' · ' : ''}
              {MACRO_LABEL[key]} <Text style={{ color: colors.textPrimary }}>{formatMacro(totals[key])}</Text>
              {totals.incomplete[key] ? <Text style={{ color: colors.warning }}>?</Text> : null}/{formatTarget(goal?.[key])}
            </Text>
          ))}
        </Text>
      </View>
      {anyIncomplete ? (
        <Pressable
          onPress={onWarningPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Incomplete nutrition information"
          accessibilityHint="Shows which entries are missing macro values"
          style={styles.warning}
        >
          <MaterialCommunityIcons name="alert-circle-outline" size={24} color={colors.warning} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  textBlock: { flex: 1 },
  calories: { ...typography.summary },
  overTag: { ...typography.label },
  macros: { ...typography.body, marginTop: spacing.xs },
  warning: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
