import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { RadioOption } from '../../components/RadioOption';
import { useSnackbar } from '../../components/Snackbar';
import { NumberField } from '../../components/TextField';
import { getGoalForDate, saveGoalEffectiveFrom } from '../../db/repositories/goalsRepo';
import { getGoalProfile, setGoalProfile } from '../../db/repositories/settingsRepo';
import { todayKey } from '../../domain/dates';
import { GoalProfile } from '../../domain/goals/profile';
import { GoalBound, hasGoal, NO_GOAL, parseBoundText, preferredBound } from '../../domain/goals/range';
import { GoalInput, GoalRange, GoalSettings, MacroKey, MACRO_KEYS, NutrientKey } from '../../domain/models';
import { formatForInput } from '../../domain/nutrition/format';
import { FieldErrorCode, parseRequiredNonNegative } from '../../domain/numeric';
import { useI18n } from '../../i18n';
import { radius, spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { EstimateGoalsSheet, EstimateResult } from './EstimateGoalsSheet';

/** A macro goal is one boundary: a single value plus the direction it is compared in. */
interface MacroState {
  enabled: boolean;
  bound: GoalBound;
  value: string;
}

interface FormState {
  /** One daily calorie target; the statistics screen derives any tolerance around it. */
  calories: string;
  protein: MacroState;
  carbs: MacroState;
  fat: MacroState;
}

function macroStateFrom(range: GoalRange): MacroState {
  const bound = preferredBound(range);
  return { enabled: hasGoal(range), bound, value: formatForInput(range[bound]) };
}

function formFromGoal(goal: GoalSettings): FormState {
  return {
    calories: formatForInput(goal.calories),
    protein: macroStateFrom(goal.protein),
    carbs: macroStateFrom(goal.carbs),
    fat: macroStateFrom(goal.fat),
  };
}

const EMPTY_MACRO: MacroState = { enabled: false, bound: 'minimum', value: '' };

interface Errors {
  calories?: FieldErrorCode;
  macros: Partial<Record<MacroKey, FieldErrorCode>>;
}

/** Daily goals. Saving creates a goal effective from today; earlier days keep their own. */
export function GoalsTab() {
  const { colors } = useTheme();
  const { t, fieldError } = useI18n();
  const insets = useSafeAreaInsets();
  const snackbar = useSnackbar();
  const nutrientLabel: Record<NutrientKey, string> = {
    calories: t('field.calories'),
    protein: t('macro.protein'),
    carbs: t('macro.carbohydrates'),
    fat: t('macro.fat'),
  };
  const boundLabel: Record<GoalBound, string> = { minimum: t('goals.noLessThan'), maximum: t('goals.noMoreThan') };
  const [form, setForm] = useState<FormState>({
    calories: '',
    protein: EMPTY_MACRO,
    carbs: EMPTY_MACRO,
    fat: EMPTY_MACRO,
  });
  const [errors, setErrors] = useState<Errors>({ macros: {} });
  const [loaded, setLoaded] = useState<GoalSettings | null>(null);
  const [saving, setSaving] = useState(false);
  /** Profile for the estimation sheet; loaded on demand, null while the sheet is closed. */
  const [estimating, setEstimating] = useState<GoalProfile | null>(null);

  useEffect(() => {
    getGoalForDate(todayKey())
      .then((goal) => {
        setLoaded(goal);
        setForm(formFromGoal(goal));
      })
      .catch((error) => console.error('Failed to load goals', error));
  }, []);

  const updateCalories = (calories: string) => {
    setForm((current) => ({ ...current, calories }));
    setErrors((current) => ({ ...current, calories: undefined }));
  };

  const updateMacro = (macro: MacroKey, patch: Partial<MacroState>) => {
    setForm((current) => ({ ...current, [macro]: { ...current[macro], ...patch } }));
    setErrors((current) => ({ ...current, macros: { ...current.macros, [macro]: undefined } }));
  };

  const macroRange = (macro: MacroKey): GoalRange | null => {
    const state = form[macro];
    if (!state.enabled) return NO_GOAL;
    const parsed = parseBoundText(state.value, state.bound);
    return parsed.ok ? parsed.value : null;
  };

  /** Parses every nutrient; returns null and shows field errors when anything is invalid. */
  const collect = (): GoalInput | null => {
    const nextErrors: Errors = { macros: {} };
    const calories = parseRequiredNonNegative(form.calories);
    if (!calories.ok) nextErrors.calories = calories.error;
    const macros = {} as Record<MacroKey, GoalRange>;
    for (const macro of MACRO_KEYS) {
      if (!form[macro].enabled) {
        macros[macro] = NO_GOAL;
        continue;
      }
      const parsed = parseBoundText(form[macro].value, form[macro].bound);
      if (parsed.ok) macros[macro] = parsed.value;
      else nextErrors.macros[macro] = parsed.error;
    }
    if (!calories.ok || Object.keys(nextErrors.macros).length > 0) {
      setErrors(nextErrors);
      return null;
    }
    return { calories: calories.value, ...macros };
  };

  const openEstimate = async () => {
    try {
      setEstimating(await getGoalProfile());
    } catch (error) {
      Alert.alert(t('common.somethingWrong'), String(error));
    }
  };

  /**
   * Applies an estimate through the same effective-from-today mechanism as manual saves. Carbs
   * and fat keep whatever the form currently holds; earlier goal rows are untouched.
   */
  const applyEstimate = async ({ profile, calories, protein }: EstimateResult) => {
    const keepMacro = (macro: MacroKey): GoalRange => macroRange(macro) ?? loaded?.[macro] ?? NO_GOAL;
    await setGoalProfile(profile);
    await saveGoalEffectiveFrom(todayKey(), {
      calories,
      protein: protein ?? keepMacro('protein'),
      carbs: keepMacro('carbs'),
      fat: keepMacro('fat'),
    });
    const goal = await getGoalForDate(todayKey());
    setLoaded(goal);
    setForm(formFromGoal(goal));
    setErrors({ macros: {} });
    snackbar.show({ message: t('estimate.applied') });
  };

  const save = async () => {
    if (saving) return;
    const values = collect();
    if (!values) return;
    setSaving(true);
    try {
      await saveGoalEffectiveFrom(todayKey(), values);
      setLoaded(await getGoalForDate(todayKey()));
      snackbar.show({ message: t('goals.saved') });
    } catch (error) {
      Alert.alert(t('goals.couldNotSave'), String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={[styles.estimateBox, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
          <Text style={[styles.estimateHint, { color: colors.textSecondary }]}>{t('goals.estimateHint')}</Text>
          <Button title={t('goals.estimate')} variant="secondary" onPress={openEstimate} disabled={!loaded} />
        </View>

        <NumberField
          label={t('goals.dailyCalories')}
          required
          unit={t('common.kcal')}
          value={form.calories}
          onChangeText={updateCalories}
          error={fieldError(nutrientLabel.calories, errors.calories)}
        />
        <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('goals.caloriesHint')}</Text>

        {MACRO_KEYS.map((macro) => {
          const state = form[macro];
          return (
            <View key={macro} style={[styles.macroRow, { borderTopColor: colors.divider }]}>
              <View style={styles.macroHeader}>
                <Text style={[styles.nutrientLabel, { color: colors.textPrimary }]}>{t('goals.target', { macro: nutrientLabel[macro] })}</Text>
                <Switch
                  value={state.enabled}
                  onValueChange={(enabled) => updateMacro(macro, { enabled })}
                  accessibilityLabel={t('goals.targetEnabledA11y', { macro: nutrientLabel[macro] })}
                  trackColor={{ true: colors.accent, false: colors.divider }}
                />
              </View>
              {state.enabled ? (
                <>
                  <View style={styles.bounds} accessibilityRole="radiogroup" accessibilityLabel={t('goals.boundA11y', { macro: nutrientLabel[macro] })}>
                    <RadioOption
                      variant="inline"
                      label={boundLabel.minimum}
                      selected={state.bound === 'minimum'}
                      onPress={() => updateMacro(macro, { bound: 'minimum' })}
                      accessibilityLabel={t('goals.minA11y', { nutrient: nutrientLabel[macro] })}
                    />
                    <RadioOption
                      variant="inline"
                      label={boundLabel.maximum}
                      selected={state.bound === 'maximum'}
                      onPress={() => updateMacro(macro, { bound: 'maximum' })}
                      accessibilityLabel={t('goals.maxA11y', { nutrient: nutrientLabel[macro] })}
                    />
                  </View>
                  <NumberField
                    unit={t('common.grams')}
                    value={state.value}
                    onChangeText={(value) => updateMacro(macro, { value })}
                    error={fieldError(nutrientLabel[macro], errors.macros[macro])}
                    accessibilityLabel={`${nutrientLabel[macro]}, ${boundLabel[state.bound]}`}
                  />
                </>
              ) : (
                <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('goals.disabledHint')}</Text>
              )}
            </View>
          );
        })}

        {loaded ? (
          <Text style={[styles.history, { color: colors.textSecondary }]}>
            {t('goals.history', { date: loaded.effectiveFrom === '1970-01-01' ? t('goals.theBeginning') : loaded.effectiveFrom })}
          </Text>
        ) : null}
      </ScrollView>
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.divider, paddingBottom: insets.bottom + spacing.md }]}>
        <Button title={t('goals.save')} onPress={save} loading={saving} disabled={!loaded} />
      </View>
      {estimating ? (
        <EstimateGoalsSheet
          initialProfile={estimating}
          currentCalories={loaded?.calories ?? null}
          onClose={() => setEstimating(null)}
          onApply={applyEstimate}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg },
  estimateBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  estimateHint: { ...typography.secondary, marginBottom: spacing.md },
  macroRow: { paddingTop: spacing.md, marginTop: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth },
  macroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginBottom: spacing.xs },
  nutrientLabel: { ...typography.body, flex: 1 },
  bounds: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg, marginBottom: spacing.xs },
  pair: { flexDirection: 'row', gap: spacing.md },
  pairField: { flex: 1 },
  rangeError: { ...typography.label, marginTop: -spacing.sm, marginBottom: spacing.md },
  hint: { ...typography.secondary, marginBottom: spacing.md },
  history: { ...typography.secondary, marginTop: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
});
