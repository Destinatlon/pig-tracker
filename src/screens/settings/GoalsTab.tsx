import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { useSnackbar } from '../../components/Snackbar';
import { NumberField } from '../../components/TextField';
import { getGoalForDate, saveGoalEffectiveFrom } from '../../db/repositories/goalsRepo';
import { todayKey } from '../../domain/dates';
import { GoalSettings, MacroKey } from '../../domain/models';
import { formatForInput } from '../../domain/nutrition/format';
import { parseRequiredNonNegative } from '../../domain/numeric';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

interface MacroGoalState {
  enabled: boolean;
  text: string;
}

const MACROS: { key: MacroKey; label: string }[] = [
  { key: 'protein', label: 'Protein' },
  { key: 'carbs', label: 'Carbohydrates' },
  { key: 'fat', label: 'Fat' },
];

/** Daily targets. Saving creates a goal effective from today; earlier days keep their own targets. */
export function GoalsTab() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const snackbar = useSnackbar();
  const [caloriesText, setCaloriesText] = useState('');
  const [macros, setMacros] = useState<Record<MacroKey, MacroGoalState>>({
    protein: { enabled: false, text: '' },
    carbs: { enabled: false, text: '' },
    fat: { enabled: false, text: '' },
  });
  const [errors, setErrors] = useState<Partial<Record<'calories' | MacroKey, string>>>({});
  const [loaded, setLoaded] = useState<GoalSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGoalForDate(todayKey())
      .then((goal) => {
        setLoaded(goal);
        setCaloriesText(formatForInput(goal.calories));
        setMacros({
          protein: { enabled: goal.protein !== null, text: formatForInput(goal.protein) },
          carbs: { enabled: goal.carbs !== null, text: formatForInput(goal.carbs) },
          fat: { enabled: goal.fat !== null, text: formatForInput(goal.fat) },
        });
      })
      .catch((error) => console.error('Failed to load goals', error));
  }, []);

  const save = async () => {
    if (saving) return;
    const nextErrors: typeof errors = {};
    const calories = parseRequiredNonNegative(caloriesText, 'Calories');
    if (!calories.ok) nextErrors.calories = calories.error;
    const values: Record<MacroKey, number | null> = { protein: null, carbs: null, fat: null };
    for (const { key, label } of MACROS) {
      if (!macros[key].enabled) continue;
      const parsed = parseRequiredNonNegative(macros[key].text, label);
      if (!parsed.ok) nextErrors[key] = parsed.error;
      else values[key] = parsed.value;
    }
    if (Object.keys(nextErrors).length > 0 || !calories.ok) {
      setErrors(nextErrors);
      return;
    }
    setSaving(true);
    try {
      await saveGoalEffectiveFrom(todayKey(), { calories: calories.value, ...values });
      snackbar.show({ message: 'Goals saved from today onwards' });
    } catch (error) {
      Alert.alert('Could not save goals', String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <NumberField
          label="Daily calories"
          required
          unit="kcal"
          value={caloriesText}
          onChangeText={(text) => {
            setCaloriesText(text);
            setErrors({});
          }}
          error={errors.calories}
        />
        {MACROS.map(({ key, label }) => (
          <View key={key} style={[styles.macroRow, { borderTopColor: colors.divider }]}>
            <View style={styles.macroHeader}>
              <Text style={[styles.macroLabel, { color: colors.textPrimary }]}>{label} target</Text>
              <Switch
                value={macros[key].enabled}
                onValueChange={(enabled) => {
                  setMacros((current) => ({ ...current, [key]: { ...current[key], enabled } }));
                  setErrors({});
                }}
                accessibilityLabel={`${label} target enabled`}
                trackColor={{ true: colors.accent, false: colors.divider }}
              />
            </View>
            {macros[key].enabled ? (
              <NumberField
                unit="g"
                value={macros[key].text}
                onChangeText={(text) => {
                  setMacros((current) => ({ ...current, [key]: { ...current[key], text } }));
                  setErrors({});
                }}
                error={errors[key]}
                accessibilityLabel={`${label} target in grams`}
              />
            ) : (
              <Text style={[styles.disabledHint, { color: colors.textSecondary }]}>Shown as “/—” in the daily summary.</Text>
            )}
          </View>
        ))}
        {loaded ? (
          <Text style={[styles.history, { color: colors.textSecondary }]}>
            Current targets apply since {loaded.effectiveFrom === '1970-01-01' ? 'the beginning' : loaded.effectiveFrom}. Saving starts a new target from today; earlier days keep theirs.
          </Text>
        ) : null}
      </ScrollView>
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.divider, paddingBottom: insets.bottom + spacing.md }]}>
        <Button title="Save goals" onPress={save} loading={saving} disabled={!loaded} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg },
  macroRow: { paddingTop: spacing.md, marginTop: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth },
  macroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginBottom: spacing.xs },
  macroLabel: { ...typography.body },
  disabledHint: { ...typography.secondary, marginBottom: spacing.md },
  history: { ...typography.secondary, marginTop: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
});
