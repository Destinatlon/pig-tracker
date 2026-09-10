import React from 'react';
import { StyleSheet, View } from 'react-native';
import { DraftErrors, NutritionDraft, Per100gTexts, updateDraftName, updateDraftValue, updateDraftWeight } from '../domain/nutrition/draft';
import { useI18n } from '../i18n';
import { spacing } from '../theme/tokens';
import { NumberField, TextField } from './TextField';

interface DraftProps {
  draft: NutritionDraft;
  onChange: (next: NutritionDraft) => void;
  errors?: DraftErrors;
  showName?: boolean;
  nameLabel?: string;
  autoFocusName?: boolean;
}

/** Name, weight, kcal, protein, carbs, fat entered for the consumed amount. */
export function NutritionDraftFields({ draft, onChange, errors, showName = true, nameLabel, autoFocusName }: DraftProps) {
  const { t, fieldError } = useI18n();
  const name = nameLabel ?? t('field.name');
  return (
    <View>
      {showName ? (
        <TextField
          label={name}
          required
          value={draft.name}
          onChangeText={(text) => onChange(updateDraftName(draft, text))}
          error={fieldError(name, errors?.name)}
          autoFocus={autoFocusName}
          autoCapitalize="sentences"
          returnKeyType="next"
        />
      ) : null}
      <View style={styles.row}>
        <NumberField
          label={t('field.weight')}
          required
          unit={t('common.grams')}
          value={draft.weightText}
          onChangeText={(text) => onChange(updateDraftWeight(draft, text))}
          error={fieldError(t('field.weight'), errors?.weight)}
          containerStyle={styles.half}
        />
        <NumberField
          label={t('field.calories')}
          required
          unit={t('common.kcal')}
          value={draft.texts.calories}
          onChangeText={(text) => onChange(updateDraftValue(draft, 'calories', text))}
          error={fieldError(t('field.calories'), errors?.calories)}
          containerStyle={styles.half}
        />
      </View>
      <View style={styles.row}>
        <NumberField
          label={t('macro.protein')}
          unit={t('common.grams')}
          value={draft.texts.protein}
          onChangeText={(text) => onChange(updateDraftValue(draft, 'protein', text))}
          error={fieldError(t('macro.protein'), errors?.protein)}
          containerStyle={styles.third}
        />
        <NumberField
          label={t('macro.carbs')}
          unit={t('common.grams')}
          value={draft.texts.carbs}
          onChangeText={(text) => onChange(updateDraftValue(draft, 'carbs', text))}
          error={fieldError(t('macro.carbs'), errors?.carbs)}
          containerStyle={styles.third}
        />
        <NumberField
          label={t('macro.fat')}
          unit={t('common.grams')}
          value={draft.texts.fat}
          onChangeText={(text) => onChange(updateDraftValue(draft, 'fat', text))}
          error={fieldError(t('macro.fat'), errors?.fat)}
          containerStyle={styles.third}
        />
      </View>
    </View>
  );
}

interface Per100gProps {
  texts: Per100gTexts;
  onChange: (next: Per100gTexts) => void;
  errors?: DraftErrors;
}

/** kcal, protein, carbs, fat per 100 g for library forms. */
export function Per100gFields({ texts, onChange, errors }: Per100gProps) {
  const { t, fieldError } = useI18n();
  return (
    <View>
      <NumberField
        label={t('field.caloriesPer100g')}
        required
        unit={t('common.kcal')}
        value={texts.calories}
        onChangeText={(calories) => onChange({ ...texts, calories })}
        error={fieldError(t('field.calories'), errors?.calories)}
      />
      <View style={styles.row}>
        <NumberField
          label={t('field.proteinPer100g')}
          unit={t('common.grams')}
          value={texts.protein}
          onChangeText={(protein) => onChange({ ...texts, protein })}
          error={fieldError(t('macro.protein'), errors?.protein)}
          containerStyle={styles.third}
        />
        <NumberField
          label={t('field.carbsPer100g')}
          unit={t('common.grams')}
          value={texts.carbs}
          onChangeText={(carbs) => onChange({ ...texts, carbs })}
          error={fieldError(t('macro.carbs'), errors?.carbs)}
          containerStyle={styles.third}
        />
        <NumberField
          label={t('field.fatPer100g')}
          unit={t('common.grams')}
          value={texts.fat}
          onChangeText={(fat) => onChange({ ...texts, fat })}
          error={fieldError(t('macro.fat'), errors?.fat)}
          containerStyle={styles.third}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  third: { flex: 1 },
});
