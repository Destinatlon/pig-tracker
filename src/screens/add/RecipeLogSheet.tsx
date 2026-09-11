import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { NutritionDraftFields } from '../../components/NutritionDraftFields';
import { useSnackbar } from '../../components/Snackbar';
import { NumberField } from '../../components/TextField';
import { insertEntry } from '../../db/repositories/dayEntriesRepo';
import { RecipeListItem, touchRecipeUsage } from '../../db/repositories/recipesRepo';
import { DateKey } from '../../domain/models';
import { DraftErrors, NutritionDraft, createDraftFromPer100g, updateDraftWeight, validateDraft } from '../../domain/nutrition/draft';
import { formatCalories, formatMacro, formatWeight } from '../../domain/nutrition/format';
import { calculateRecipeTotals, effectiveRecipePer100g } from '../../domain/recipes/calculations';
import { useI18n } from '../../i18n';
import { per100gSummary } from '../recipes/recipeSummary';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  item: RecipeListItem;
  date: DateKey;
  onClose: () => void;
  onAdded: () => void;
}

/**
 * Logs a portion of a recipe as an ordinary day entry: the recipe's per-100-g values are
 * snapshotted onto the entry, so later recipe edits never change what was already logged.
 */
export function RecipeLogSheet({ item, date, onClose, onAdded }: Props) {
  const { colors } = useTheme();
  const { t, relativeDate, fieldError } = useI18n();
  const snackbar = useSnackbar();
  const per100g = effectiveRecipePer100g(item.recipe, item.ingredients);
  const totals = calculateRecipeTotals(item.ingredients, item.recipe.cookedWeightGrams);
  const [draft, setDraft] = useState<NutritionDraft>(() =>
    createDraftFromPer100g(item.recipe.name, per100g ?? { caloriesPer100g: 0, proteinPer100g: null, carbsPer100g: null, fatPer100g: null }, null),
  );
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [saving, setSaving] = useState(false);

  const calculated = `${draft.texts.calories === '' ? '?' : formatCalories(Number(draft.texts.calories))} ${t('common.kcal')} · ${t('macro.p')} ${valueOrUnknown(draft.texts.protein)} · ${t('macro.c')} ${valueOrUnknown(draft.texts.carbs)} · ${t('macro.f')} ${valueOrUnknown(draft.texts.fat)}`;

  const setWeight = (text: string) => {
    setErrors({});
    setDraft(updateDraftWeight(draft, text));
  };

  const add = async () => {
    if (saving) return;
    const result = validateDraft(draft, { requireName: false });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setSaving(true);
    try {
      await insertEntry({
        date,
        productId: null,
        variantId: null,
        productName: item.recipe.name,
        variantName: null,
        weightGrams: result.value.weightGrams,
        ...result.value.per100g,
      });
      await touchRecipeUsage(item.recipe.id);
      onAdded();
      snackbar.show({ message: t('add.addedTo', { date: relativeDate(date) }) });
    } catch (error) {
      setSaving(false);
      Alert.alert(t('error.couldNotAdd'), String(error));
    }
  };

  if (per100g === null) {
    return (
      <BottomSheet visible onRequestClose={onClose} title={item.recipe.name} footer={<Button title={t('common.close')} onPress={onClose} style={styles.footerButton} />}>
        <Text style={[styles.notice, { color: colors.textSecondary }]}>{t('recipe.noValues')}</Text>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      visible
      onRequestClose={onClose}
      title={t('recipe.logTitle', { name: item.recipe.name })}
      footer={<Button title={t('common.add')} onPress={add} loading={saving} style={styles.footerButton} />}
    >
      <Text style={[styles.per100, { color: colors.textSecondary }]}>
        {t('common.per100g')}: {per100gSummary(per100g, t)}
      </Text>
      {editing ? (
        <NutritionDraftFields
          draft={draft}
          onChange={(next) => {
            setErrors({});
            setDraft(next);
          }}
          errors={errors}
          showName={false}
        />
      ) : (
        <View>
          <NumberField
            label={t('recipe.logWeight')}
            required
            unit={t('common.grams')}
            value={draft.weightText}
            onChangeText={setWeight}
            error={fieldError(t('field.weight'), errors.weight)}
            autoFocus
          />
          {totals.totalWeightGrams > 0 ? (
            <Pressable onPress={() => setWeight(String(totals.totalWeightGrams))} hitSlop={8} accessibilityRole="button" style={styles.link}>
              <Text style={[styles.linkText, { color: colors.accent }]}>{t('recipe.wholeDish', { weight: formatWeight(totals.totalWeightGrams) })}</Text>
            </Pressable>
          ) : null}
          <Text style={[styles.calculated, { color: colors.textPrimary }]} accessibilityLiveRegion="polite">
            {calculated}
          </Text>
          <Pressable onPress={() => setEditing(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('add.editMacrosA11y')} style={styles.link}>
            <Text style={[styles.linkText, { color: colors.accent }]}>{t('add.editMacros')}</Text>
          </Pressable>
        </View>
      )}
      <Text style={[styles.notice, { color: colors.warning }]}>{t('recipe.approximate')}</Text>
    </BottomSheet>
  );
}

function valueOrUnknown(text: string): string {
  return text === '' ? '?' : formatMacro(Number(text));
}

const styles = StyleSheet.create({
  per100: { ...typography.secondary, marginBottom: spacing.md },
  calculated: { ...typography.bodyStrong, marginBottom: spacing.sm },
  notice: { ...typography.secondary, marginTop: spacing.sm },
  link: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  linkText: { ...typography.bodyStrong },
  footerButton: { flex: 1 },
});
