import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { OptionPicker } from '../../components/OptionPicker';
import { NumberField } from '../../components/TextField';
import { ACTIVITY_LEVELS, ActivityLevel, GOAL_TYPES, GoalType, Sex, SEXES } from '../../domain/goals/constants';
import { estimateGoals, GoalEstimate } from '../../domain/goals/estimation';
import { GoalProfile, parseProfileTexts, ProfileErrors, ProfileTexts } from '../../domain/goals/profile';
import { formatCalories, formatForInput } from '../../domain/nutrition/format';
import { FieldErrorCode, parseOptionalNonNegative, parseRequiredNonNegative } from '../../domain/numeric';
import { useI18n } from '../../i18n';
import type { TranslationKey } from '../../i18n/types';
import { radius, spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

export interface EstimateResult {
  profile: GoalProfile;
  calories: number;
  /** null keeps the protein target the user already has. */
  protein: number | null;
}

interface Props {
  initialProfile: GoalProfile;
  /** Calorie target currently in force; the starting value for a custom goal. */
  currentCalories: number | null;
  onClose: () => void;
  onApply: (result: EstimateResult) => Promise<void>;
}

const ACTIVITY_LABEL_KEYS: Record<ActivityLevel, TranslationKey> = {
  sedentary: 'estimate.activitySedentary',
  light: 'estimate.activityLight',
  moderate: 'estimate.activityModerate',
  very: 'estimate.activityVery',
};

const GOAL_LABEL_KEYS: Record<GoalType, TranslationKey> = {
  maintain: 'estimate.goalMaintain',
  slowFatLoss: 'estimate.goalSlowFatLoss',
  fatLoss: 'estimate.goalFatLoss',
  slowGain: 'estimate.goalSlowGain',
  muscleGain: 'estimate.goalMuscleGain',
  custom: 'estimate.goalCustom',
};

function textsFromProfile(profile: GoalProfile): ProfileTexts {
  return { age: formatForInput(profile.age), heightCm: formatForInput(profile.heightCm), weightKg: formatForInput(profile.weightKg) };
}

/**
 * Compact estimation form. Calculations live in `src/domain/goals`; this component only
 * collects inputs, shows the (display-rounded) result and lets the user edit it before applying.
 */
export function EstimateGoalsSheet({ initialProfile, currentCalories, onClose, onApply }: Props) {
  const { colors } = useTheme();
  const { t, fieldError } = useI18n();
  const [texts, setTexts] = useState<ProfileTexts>(() => textsFromProfile(initialProfile));
  const [sex, setSex] = useState<Sex | null>(initialProfile.sex);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(initialProfile.activityLevel);
  const [goalType, setGoalType] = useState<GoalType | null>(initialProfile.goalType);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [calorieText, setCalorieText] = useState(() => formatForInput(currentCalories));
  const [proteinText, setProteinText] = useState('');
  const [targetErrors, setTargetErrors] = useState<{ calories?: FieldErrorCode; protein?: FieldErrorCode }>({});
  const [saving, setSaving] = useState(false);

  const parsedProfile = useMemo(() => parseProfileTexts(texts), [texts]);
  const profileComplete = parsedProfile.ok && sex !== null && activityLevel !== null && goalType !== null;

  // Maintenance needs everything except the goal; the target additionally needs a non-custom goal.
  const maintenance: number | null = useMemo(() => {
    if (!parsedProfile.ok || sex === null || activityLevel === null) return null;
    return estimateGoals({ ...parsedProfile.value, sex, activityLevel, goalType: 'maintain' }).estimatedTdee;
  }, [parsedProfile, sex, activityLevel]);

  const estimate: GoalEstimate | null = useMemo(() => {
    if (!parsedProfile.ok || sex === null || activityLevel === null || goalType === null || goalType === 'custom') return null;
    return estimateGoals({ ...parsedProfile.value, sex, activityLevel, goalType });
  }, [parsedProfile, sex, activityLevel, goalType]);

  // Suggestions refill the editable targets whenever the inputs change; edits persist until then.
  useEffect(() => {
    if (!estimate) return;
    setCalorieText(formatForInput(Math.round(estimate.calorieTarget)));
    setProteinText(formatForInput(Math.round(estimate.proteinTarget ?? 0)));
    setTargetErrors({});
  }, [estimate]);

  const dirty =
    texts.age !== textsFromProfile(initialProfile).age ||
    texts.heightCm !== textsFromProfile(initialProfile).heightCm ||
    texts.weightKg !== textsFromProfile(initialProfile).weightKg ||
    sex !== initialProfile.sex ||
    activityLevel !== initialProfile.activityLevel ||
    goalType !== initialProfile.goalType;

  const requestClose = () => {
    if (!dirty || saving) {
      onClose();
      return;
    }
    Alert.alert(t('common.discardChangesTitle'), undefined, [
      { text: t('common.keepEditing'), style: 'cancel' },
      { text: t('common.discard'), style: 'destructive', onPress: onClose },
    ]);
  };

  const updateText = (field: keyof ProfileTexts, value: string) => {
    setTexts((current) => ({ ...current, [field]: value }));
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  };

  const apply = async () => {
    if (saving) return;
    if (!parsedProfile.ok) {
      setErrors(parsedProfile.errors);
      return;
    }
    if (sex === null || activityLevel === null || goalType === null) return;
    const calories = parseRequiredNonNegative(calorieText);
    const protein = parseOptionalNonNegative(proteinText);
    if (!calories.ok || !protein.ok) {
      setTargetErrors({ calories: calories.ok ? undefined : calories.error, protein: protein.ok ? undefined : protein.error });
      return;
    }
    setSaving(true);
    try {
      await onApply({
        profile: { ...parsedProfile.value, sex, activityLevel, goalType },
        calories: calories.value,
        protein: protein.value,
      });
      onClose();
    } catch (error) {
      setSaving(false);
      Alert.alert(t('estimate.couldNotApply'), String(error));
    }
  };

  const isCustom = goalType === 'custom';
  const showTargets = profileComplete && (isCustom || estimate !== null);

  return (
    <BottomSheet
      visible
      onRequestClose={requestClose}
      title={t('estimate.title')}
      footer={
        <>
          <Button title={t('common.cancel')} variant="secondary" onPress={requestClose} style={styles.footerButton} />
          <Button title={t('estimate.use')} onPress={apply} loading={saving} disabled={!showTargets} style={styles.footerButton} />
        </>
      }
    >
      <NumberField
        label={t('estimate.age')}
        required
        value={texts.age}
        onChangeText={(text) => updateText('age', text)}
        onBlur={() => {
          if (!parsedProfile.ok && parsedProfile.errors.age) setErrors((current) => ({ ...current, age: parsedProfile.errors.age }));
        }}
        error={fieldError(t('estimate.age'), errors.age)}
      />
      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('estimate.sex')} *</Text>
      <View style={styles.chipRow} accessibilityRole="radiogroup">
        {SEXES.map((option) => (
          <Chip
            key={option}
            label={option === 'male' ? t('estimate.male') : t('estimate.female')}
            selected={sex === option}
            onPress={() => setSex(option)}
          />
        ))}
      </View>
      <View style={styles.pair}>
        <NumberField
          label={t('estimate.height')}
          required
          unit={t('estimate.cm')}
          value={texts.heightCm}
          onChangeText={(text) => updateText('heightCm', text)}
          onBlur={() => {
            if (!parsedProfile.ok && parsedProfile.errors.heightCm) setErrors((current) => ({ ...current, heightCm: parsedProfile.errors.heightCm }));
          }}
          error={fieldError(t('estimate.height'), errors.heightCm)}
          containerStyle={styles.pairField}
        />
        <NumberField
          label={t('estimate.weight')}
          required
          unit={t('estimate.kg')}
          value={texts.weightKg}
          onChangeText={(text) => updateText('weightKg', text)}
          onBlur={() => {
            if (!parsedProfile.ok && parsedProfile.errors.weightKg) setErrors((current) => ({ ...current, weightKg: parsedProfile.errors.weightKg }));
          }}
          error={fieldError(t('estimate.weight'), errors.weightKg)}
          containerStyle={styles.pairField}
        />
      </View>
      <OptionPicker
        label={t('estimate.activity')}
        placeholder={t('estimate.chooseActivity')}
        options={ACTIVITY_LEVELS.map((key) => ({ key, label: t(ACTIVITY_LABEL_KEYS[key]) }))}
        selected={activityLevel}
        onSelect={setActivityLevel}
      />
      <OptionPicker
        label={t('estimate.goal')}
        placeholder={t('estimate.chooseGoal')}
        options={GOAL_TYPES.map((key) => ({ key, label: t(GOAL_LABEL_KEYS[key]) }))}
        selected={goalType}
        onSelect={setGoalType}
      />

      <View style={[styles.results, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>{t('estimate.maintenance')}</Text>
        <Text style={[styles.resultValue, { color: colors.textPrimary }]}>
          {maintenance !== null ? t('estimate.perDay', { value: formatCalories(maintenance) }) : '—'}
        </Text>
        {!showTargets ? <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('estimate.fillIn')}</Text> : null}
      </View>

      {showTargets ? (
        <>
          <NumberField
            label={isCustom ? t('estimate.customCalorieTarget') : t('estimate.calorieTarget')}
            required
            unit={t('common.kcal')}
            value={calorieText}
            onChangeText={(text) => {
              setCalorieText(text);
              setTargetErrors({});
            }}
            error={fieldError(t('field.calories'), targetErrors.calories)}
          />
          <NumberField
            label={isCustom ? t('estimate.customProteinTarget') : t('estimate.proteinTarget')}
            unit={t('common.grams')}
            value={proteinText}
            onChangeText={(text) => {
              setProteinText(text);
              setTargetErrors({});
            }}
            error={fieldError(t('macro.protein'), targetErrors.protein)}
          />
          {isCustom ? <Text style={[styles.hint, styles.hintAbove, { color: colors.textSecondary }]}>{t('estimate.optionalHint')}</Text> : null}
        </>
      ) : null}
      <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>{t('estimate.disclaimer')}</Text>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.label, marginBottom: spacing.xs },
  chipRow: { flexDirection: 'row', marginBottom: spacing.md },
  pair: { flexDirection: 'row', gap: spacing.md },
  pairField: { flex: 1 },
  results: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  resultLabel: { ...typography.label },
  resultValue: { ...typography.summary, marginTop: spacing.xs },
  hint: { ...typography.secondary, marginTop: spacing.xs },
  hintAbove: { marginTop: -spacing.sm, marginBottom: spacing.md },
  disclaimer: { ...typography.secondary, marginTop: spacing.xs },
  footerButton: { flex: 1 },
});
