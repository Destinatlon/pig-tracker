import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { rangeShape } from '../../domain/goals/range';
import { DayTotals } from '../../domain/nutrition/calculations';
import { formatCalories, formatMacro } from '../../domain/nutrition/format';
import { GoalRange, GoalSettings, MacroKey } from '../../domain/models';
import { spacing, typography } from '../../theme/tokens';
import { useI18n } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  totals: DayTotals;
  goal: GoalSettings | null;
  onWarningPress: () => void;
}

const MACRO_ORDER: readonly MacroKey[] = ['protein', 'carbs', 'fat'];

const NO_RANGE: GoalRange = { minimum: null, maximum: null };

/** Compact numbers-only daily summary. No progress bars by design. */
export function DaySummary({ totals, goal, onWarningPress }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const macroLabel: Record<MacroKey, string> = { protein: t('macro.p'), carbs: t('macro.c'), fat: t('macro.f') };
  const macroName: Record<MacroKey, string> = { protein: t('macro.protein'), carbs: t('macro.carbs'), fat: t('macro.fat') };
  const calorieTarget = goal === null ? null : formatCalories(goal.calories);
  // Only "over" is called out: being under the target mid-day is normal, not a problem.
  const over = goal !== null && totals.calories > goal.calories;
  const anyIncomplete = MACRO_ORDER.some((key) => totals.incomplete[key]);

  const macroA11y = MACRO_ORDER.map((key) => {
    const shape = rangeShape(goal?.[key] ?? NO_RANGE, formatMacro);
    return (
      t('day.macroA11y', {
        macro: macroName[key],
        consumed: formatMacro(totals[key]),
        target: t(`range.${shape.key}A11y`, shape.params),
      }) + (totals.incomplete[key] ? t('day.macroIncompleteA11y') : '')
    );
  }).join('. ');

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
      <View style={styles.textBlock}>
        <Text
          style={[styles.calories, { color: colors.textPrimary }]}
          accessibilityLabel={
            t('day.summaryA11y', { consumed: formatCalories(totals.calories), target: calorieTarget ?? t('range.noneA11y') }) +
            (over ? t('day.summaryOverA11y') : '')
          }
        >
          <Text style={over ? { color: colors.warning, textDecorationLine: 'underline' } : undefined}>{formatCalories(totals.calories)}</Text>
          <Text style={{ color: colors.textSecondary }}>
            {' '}
            / {calorieTarget ?? t('range.none')} {t('common.kcal')}
          </Text>
          {over ? <Text style={[styles.overTag, { color: colors.warning }]}>  {t('day.over')}</Text> : null}
        </Text>
        <Text style={[styles.macros, { color: colors.textSecondary }]} accessibilityLabel={macroA11y}>
          {MACRO_ORDER.map((key, index) => {
            const shape = rangeShape(goal?.[key] ?? NO_RANGE, formatMacro);
            return (
              <Text key={key}>
                {index > 0 ? ' · ' : ''}
                {macroLabel[key]} <Text style={{ color: colors.textPrimary }}>{formatMacro(totals[key])}</Text>
                {totals.incomplete[key] ? <Text style={{ color: colors.warning }}>?</Text> : null}/{t(`range.${shape.key}`, shape.params)}
              </Text>
            );
          })}
        </Text>
      </View>
      {anyIncomplete ? (
        <Pressable
          onPress={onWarningPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('day.incompleteA11y')}
          accessibilityHint={t('day.incompleteHint')}
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
