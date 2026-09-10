import React from 'react';
import { StyleSheet, View } from 'react-native';
import { DraftErrors, NutritionDraft, Per100gTexts, updateDraftName, updateDraftValue, updateDraftWeight } from '../domain/nutrition/draft';
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
export function NutritionDraftFields({ draft, onChange, errors, showName = true, nameLabel = 'Name', autoFocusName }: DraftProps) {
  return (
    <View>
      {showName ? (
        <TextField
          label={nameLabel}
          required
          value={draft.name}
          onChangeText={(text) => onChange(updateDraftName(draft, text))}
          error={errors?.name}
          autoFocus={autoFocusName}
          autoCapitalize="sentences"
          returnKeyType="next"
        />
      ) : null}
      <View style={styles.row}>
        <NumberField
          label="Weight"
          required
          unit="g"
          value={draft.weightText}
          onChangeText={(text) => onChange(updateDraftWeight(draft, text))}
          error={errors?.weight}
          containerStyle={styles.half}
        />
        <NumberField
          label="Calories"
          required
          unit="kcal"
          value={draft.texts.calories}
          onChangeText={(text) => onChange(updateDraftValue(draft, 'calories', text))}
          error={errors?.calories}
          containerStyle={styles.half}
        />
      </View>
      <View style={styles.row}>
        <NumberField
          label="Protein"
          unit="g"
          value={draft.texts.protein}
          onChangeText={(text) => onChange(updateDraftValue(draft, 'protein', text))}
          error={errors?.protein}
          containerStyle={styles.third}
        />
        <NumberField
          label="Carbs"
          unit="g"
          value={draft.texts.carbs}
          onChangeText={(text) => onChange(updateDraftValue(draft, 'carbs', text))}
          error={errors?.carbs}
          containerStyle={styles.third}
        />
        <NumberField
          label="Fat"
          unit="g"
          value={draft.texts.fat}
          onChangeText={(text) => onChange(updateDraftValue(draft, 'fat', text))}
          error={errors?.fat}
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
  return (
    <View>
      <NumberField
        label="Calories per 100 g"
        required
        unit="kcal"
        value={texts.calories}
        onChangeText={(calories) => onChange({ ...texts, calories })}
        error={errors?.calories}
      />
      <View style={styles.row}>
        <NumberField
          label="Protein / 100 g"
          unit="g"
          value={texts.protein}
          onChangeText={(protein) => onChange({ ...texts, protein })}
          error={errors?.protein}
          containerStyle={styles.third}
        />
        <NumberField
          label="Carbs / 100 g"
          unit="g"
          value={texts.carbs}
          onChangeText={(carbs) => onChange({ ...texts, carbs })}
          error={errors?.carbs}
          containerStyle={styles.third}
        />
        <NumberField
          label="Fat / 100 g"
          unit="g"
          value={texts.fat}
          onChangeText={(fat) => onChange({ ...texts, fat })}
          error={errors?.fat}
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
