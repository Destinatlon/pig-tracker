import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { NutritionDraftFields } from '../../components/NutritionDraftFields';
import { useSnackbar } from '../../components/Snackbar';
import { getLibraryItemByVariantId } from '../../db/repositories/productsRepo';
import { LibraryItem, libraryItemDisplayName, recipeIngredientDisplayName } from '../../domain/models';
import { sameNutritionPer100g } from '../../domain/nutrition/calculations';
import { DraftErrors, NutritionDraft, createDraftFromPer100g, createEmptyDraft, validateDraft } from '../../domain/nutrition/draft';
import { RecipeIngredientDraft, nextIngredientKey } from '../../domain/recipes/draft';
import { useI18n } from '../../i18n';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

/** What the sheet was opened for: a blank manual row, a product just picked, or an existing row. */
export type IngredientTarget =
  | { mode: 'new-manual' }
  | { mode: 'new-library'; item: LibraryItem }
  | { mode: 'edit'; ingredient: RecipeIngredientDraft };

interface Props {
  target: IngredientTarget;
  onSave: (ingredient: RecipeIngredientDraft) => void;
  onRemove?: () => void;
  onClose: () => void;
}

function initialDraft(target: IngredientTarget): NutritionDraft {
  if (target.mode === 'new-manual') return createEmptyDraft();
  if (target.mode === 'new-library') return createDraftFromPer100g(libraryItemDisplayName(target.item), target.item, null);
  return createDraftFromPer100g(recipeIngredientDisplayName(target.ingredient), target.ingredient, target.ingredient.weightGrams);
}

function identity(target: IngredientTarget): Pick<RecipeIngredientDraft, 'key' | 'productId' | 'variantId' | 'productName' | 'variantName'> {
  if (target.mode === 'new-library') {
    return {
      key: nextIngredientKey(),
      productId: target.item.productId,
      variantId: target.item.variantId,
      productName: target.item.productName,
      variantName: target.item.isDefault ? null : target.item.variantName,
    };
  }
  if (target.mode === 'edit') {
    const { key, productId, variantId, productName, variantName } = target.ingredient;
    return { key, productId, variantId, productName, variantName };
  }
  return { key: nextIngredientKey(), productId: null, variantId: null, productName: '', variantName: null };
}

/**
 * One ingredient: how much of it goes in, and what that amount is worth. Values are typed for the
 * amount used and normalized to per 100 g by the shared draft, exactly like a day entry.
 */
export function IngredientSheet({ target, onSave, onRemove, onClose }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const snackbar = useSnackbar();
  const [draft, setDraft] = useState<NutritionDraft>(() => initialDraft(target));
  const [errors, setErrors] = useState<DraftErrors>({});

  const base = identity(target);
  const isManual = base.productId === null;
  const title =
    target.mode === 'edit'
      ? recipeIngredientDisplayName(target.ingredient)
      : target.mode === 'new-library'
        ? libraryItemDisplayName(target.item)
        : t('recipe.newIngredient');

  const refresh = async () => {
    if (base.variantId === null) {
      snackbar.show({ message: t('recipe.refreshUnavailable') });
      return;
    }
    const item = await getLibraryItemByVariantId(base.variantId);
    if (!item) {
      snackbar.show({ message: t('recipe.refreshUnavailable') });
      return;
    }
    const current = {
      caloriesPer100g: draft.basis.calories ?? 0,
      proteinPer100g: draft.basis.protein,
      carbsPer100g: draft.basis.carbs,
      fatPer100g: draft.basis.fat,
    };
    if (sameNutritionPer100g(current, item)) {
      snackbar.show({ message: t('recipe.refreshUnchanged') });
      return;
    }
    const weight = target.mode === 'edit' ? target.ingredient.weightGrams : null;
    setDraft(createDraftFromPer100g(draft.name, item, weight));
    snackbar.show({ message: t('recipe.refreshed') });
  };

  const save = () => {
    const result = validateDraft(draft, { requireName: isManual });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onSave({
      ...base,
      productName: isManual ? result.value.name : base.productName,
      weightGrams: result.value.weightGrams,
      ...result.value.per100g,
    });
    onClose();
  };

  return (
    <BottomSheet
      visible
      onRequestClose={onClose}
      title={title}
      footer={
        <>
          <Button title={t('common.cancel')} variant="secondary" onPress={onClose} style={styles.footerButton} />
          <Button title={t('common.done')} onPress={save} style={styles.footerButton} />
        </>
      }
    >
      <NutritionDraftFields
        draft={draft}
        onChange={(next) => {
          setErrors({});
          setDraft(next);
        }}
        errors={errors}
        showName={isManual}
        autoFocusName={isManual}
      />
      <View style={styles.actions}>
        {base.variantId !== null ? (
          <Pressable onPress={refresh} hitSlop={8} accessibilityRole="button" style={styles.link}>
            <Text style={[styles.linkText, { color: colors.accent }]}>{t('recipe.refreshFromLibrary')}</Text>
          </Pressable>
        ) : null}
        {onRemove ? (
          <Pressable
            onPress={() => {
              onRemove();
              onClose();
            }}
            hitSlop={8}
            accessibilityRole="button"
            style={styles.link}
          >
            <Text style={[styles.linkText, { color: colors.danger }]}>{t('recipe.removeIngredient')}</Text>
          </Pressable>
        ) : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  actions: { marginTop: spacing.sm },
  link: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  linkText: { ...typography.bodyStrong },
  footerButton: { flex: 1 },
});
