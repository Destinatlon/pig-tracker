import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { MenuSheet } from '../../components/MenuSheet';
import { Per100gFields } from '../../components/NutritionDraftFields';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useSnackbar } from '../../components/Snackbar';
import { NumberField, TextField } from '../../components/TextField';
import { deleteRecipe, getRecipe, saveRecipe } from '../../db/repositories/recipesRepo';
import { LibraryItem, MacroKey, recipeIngredientDisplayName } from '../../domain/models';
import { formatCalories, formatMacro, formatWeight } from '../../domain/nutrition/format';
import { ingredientsMissingMacros } from '../../domain/recipes/calculations';
import {
  RecipeDraft,
  RecipeDraftErrors,
  RecipeIngredientDraft,
  createEmptyRecipeDraft,
  draftPer100g,
  draftTotals,
  isRecipeDraftDirty,
  recipeDraftFrom,
  validateRecipeDraft,
} from '../../domain/recipes/draft';
import { per100gTextsFrom } from '../../domain/nutrition/draft';
import { useI18n } from '../../i18n';
import { RootStackScreenProps } from '../../navigation/types';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { IngredientPickerSheet } from './IngredientPickerSheet';
import { IngredientSheet, IngredientTarget } from './IngredientSheet';

const MACRO_LABEL_KEY: Record<MacroKey, 'macro.protein' | 'macro.carbs' | 'macro.fat'> = {
  protein: 'macro.protein',
  carbs: 'macro.carbs',
  fat: 'macro.fat',
};

type Sheet = { kind: 'none' } | { kind: 'addMenu' } | { kind: 'picker' } | { kind: 'ingredient'; target: IngredientTarget } | { kind: 'recipeMenu' };

/** Build or edit one recipe. The whole thing is a draft until Save; nothing is written per row. */
export function RecipeEditorScreen({ navigation, route }: RootStackScreenProps<'RecipeEditor'>) {
  const { colors } = useTheme();
  const { t, tn, fieldError } = useI18n();
  const insets = useSafeAreaInsets();
  const snackbar = useSnackbar();
  const recipeId = route.params?.recipeId;
  const [draft, setDraft] = useState<RecipeDraft>(createEmptyRecipeDraft);
  const [original, setOriginal] = useState<RecipeDraft>(createEmptyRecipeDraft);
  const [errors, setErrors] = useState<RecipeDraftErrors>({});
  const [sheet, setSheet] = useState<Sheet>({ kind: 'none' });
  const [loaded, setLoaded] = useState(recipeId === undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (recipeId === undefined) return;
    let active = true;
    getRecipe(recipeId)
      .then((recipe) => {
        if (!active || !recipe) return;
        const next = recipeDraftFrom(recipe);
        setDraft(next);
        setOriginal(next);
        setLoaded(true);
      })
      .catch((error) => Alert.alert(t('recipe.couldNotLoad'), String(error)));
    return () => {
      active = false;
    };
  }, [recipeId, t]);

  const totals = useMemo(() => draftTotals(draft), [draft]);
  const per100g = useMemo(() => draftPer100g(draft), [draft]);
  const incomplete = useMemo(() => ingredientsMissingMacros(draft.ingredients), [draft.ingredients]);

  const update = useCallback((next: RecipeDraft) => {
    setErrors({});
    setDraft(next);
  }, []);

  const upsertIngredient = (ingredient: RecipeIngredientDraft) => {
    const index = draft.ingredients.findIndex((existing) => existing.key === ingredient.key);
    const ingredients =
      index === -1
        ? [...draft.ingredients, ingredient]
        : draft.ingredients.map((existing, i) => (i === index ? ingredient : existing));
    update({ ...draft, ingredients });
  };

  const removeIngredient = (key: string) => {
    update({ ...draft, ingredients: draft.ingredients.filter((ingredient) => ingredient.key !== key) });
  };

  const requestClose = () => {
    if (!isRecipeDraftDirty(draft, original)) {
      navigation.goBack();
      return;
    }
    Alert.alert(t('recipe.discardRecipe'), undefined, [
      { text: t('common.keepEditing'), style: 'cancel' },
      { text: t('common.discard'), style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  const save = async () => {
    if (saving) return;
    const result = validateRecipeDraft(draft);
    if (!result.ok) {
      setErrors(result.errors);
      if (result.problem === 'noValues') Alert.alert(t('recipe.needsIngredients'));
      return;
    }
    setSaving(true);
    try {
      await saveRecipe(result.value);
      snackbar.show({ message: t('recipe.saved') });
      navigation.goBack();
    } catch (error) {
      setSaving(false);
      Alert.alert(t('recipe.couldNotSave'), String(error));
    }
  };

  const remove = () => {
    if (recipeId === undefined) return;
    Alert.alert(t('recipe.deleteTitle', { name: draft.name }), t('recipe.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteRecipe(recipeId)
            .then(() => {
              snackbar.show({ message: t('recipe.deleted') });
              navigation.goBack();
            })
            .catch((error) => Alert.alert(t('recipe.couldNotDelete'), String(error)));
        },
      },
    ]);
  };

  const toggleOverride = (enabled: boolean) => {
    update({
      ...draft,
      overrideEnabled: enabled,
      // Seeding the fields with the calculation gives the user something to correct rather than a blank form.
      overrideTexts: enabled ? per100gTextsFrom(per100g) : draft.overrideTexts,
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader
        left={<IconButton icon="arrow-left" accessibilityLabel={t('common.back')} onPress={requestClose} />}
        title={recipeId === undefined ? t('recipe.newTitle') : t('recipe.editTitle')}
        right={
          recipeId === undefined ? (
            <View style={styles.spacer} />
          ) : (
            <IconButton icon="dots-vertical" accessibilityLabel={t('common.moreActions')} onPress={() => setSheet({ kind: 'recipeMenu' })} />
          )
        }
      />
      {/* The form avoids the keyboard; the sheets below are Modals that bring their own avoider. */}
      <KeyboardAvoidingView style={styles.body} behavior="padding">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} style={{ backgroundColor: colors.background }}>
          {loaded ? (
            <>
              <TextField
                label={t('recipe.name')}
                required
                value={draft.name}
                onChangeText={(name) => update({ ...draft, name })}
                error={fieldError(t('recipe.name'), errors.name)}
                autoCapitalize="sentences"
              />
              <TextField
                label={t('recipe.description')}
                value={draft.description}
                onChangeText={(description) => update({ ...draft, description })}
                placeholder={t('recipe.descriptionPlaceholder')}
                multiline
                numberOfLines={3}
                autoCapitalize="sentences"
              />

              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('recipe.ingredients')}</Text>
              {draft.ingredients.length === 0 ? (
                <Text style={[styles.muted, { color: colors.textSecondary }]}>{t('recipe.noIngredients')}</Text>
              ) : (
                draft.ingredients.map((ingredient) => (
                  <IngredientRow
                    key={ingredient.key}
                    ingredient={ingredient}
                    onPress={() => setSheet({ kind: 'ingredient', target: { mode: 'edit', ingredient } })}
                  />
                ))
              )}
              <Button title={t('recipe.addIngredient')} variant="secondary" onPress={() => setSheet({ kind: 'addMenu' })} style={styles.addButton} />

              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('recipe.yield')}</Text>
              <Text style={[styles.muted, { color: colors.textSecondary }]}>
                {t('recipe.ingredientWeight', { weight: formatWeight(totals.ingredientWeightGrams) })}
              </Text>
              <NumberField
                label={t('recipe.cookedWeight')}
                unit={t('common.grams')}
                value={draft.cookedWeightText}
                onChangeText={(cookedWeightText) => update({ ...draft, cookedWeightText })}
                error={fieldError(t('recipe.cookedWeight'), errors.cookedWeight)}
              />
              <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('recipe.cookedWeightHint')}</Text>

              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('recipe.result')}</Text>
              <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
                <Text style={[styles.resultValues, { color: colors.textPrimary }]}>
                  {per100g === null
                    ? t('common.unknownMacro')
                    : `${formatCalories(per100g.caloriesPer100g)} ${t('common.kcal')} · ${t('macro.p')} ${formatMacro(per100g.proteinPer100g)} · ${t('macro.c')} ${formatMacro(per100g.carbsPer100g)} · ${t('macro.f')} ${formatMacro(per100g.fatPer100g)}`}
                </Text>
                <Text style={[styles.notice, { color: colors.warning }]}>{t('recipe.approximate')}</Text>
                {!draft.overrideEnabled && totals.missing.length > 0 ? (
                  <Text style={[styles.notice, { color: colors.textSecondary }]}>
                    {t('recipe.incompleteMacros', { macros: totals.missing.map((macro) => t(MACRO_LABEL_KEY[macro])).join(', ') })}
                    {incomplete.length > 0 ? ` (${incomplete.map((ingredient) => recipeIngredientDisplayName(ingredient)).join(', ')})` : ''}
                  </Text>
                ) : null}
                {draft.overrideEnabled ? <Text style={[styles.notice, { color: colors.textSecondary }]}>{t('recipe.overrideActive')}</Text> : null}
              </View>

              {draft.overrideEnabled ? (
                <View style={styles.override}>
                  <Per100gFields texts={draft.overrideTexts} onChange={(overrideTexts) => update({ ...draft, overrideTexts })} errors={errors} />
                  <Pressable onPress={() => toggleOverride(false)} hitSlop={8} accessibilityRole="button" style={styles.link}>
                    <Text style={[styles.linkText, { color: colors.accent }]}>{t('recipe.useCalculated')}</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => toggleOverride(true)} hitSlop={8} accessibilityRole="button" style={styles.link}>
                  <Text style={[styles.linkText, { color: colors.accent }]}>{t('recipe.overrideMacros')}</Text>
                </Pressable>
              )}
              <Text style={[styles.hint, { color: colors.textSecondary }]}>{tn('recipe.ingredientCount', draft.ingredients.length)}</Text>
            </>
          ) : null}
        </ScrollView>
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.divider, paddingBottom: insets.bottom + spacing.md }]}>
          <Button title={t('common.discard')} variant="secondary" onPress={requestClose} style={styles.footerButton} />
          <Button title={t('common.save')} onPress={save} loading={saving} style={styles.footerButton} />
        </View>
      </KeyboardAvoidingView>

      {/* Exactly one sheet is mounted at a time. Leaving a hidden Modal mounted next to an open one
          makes Android bounce window focus between them and the open sheet flickers. */}
      {sheet.kind === 'addMenu' ? (
        <MenuSheet
          visible
          onRequestClose={() => setSheet({ kind: 'none' })}
          title={t('recipe.addIngredient')}
          items={[
            { key: 'library', label: t('recipe.addFromLibrary'), icon: 'bookmark-outline', onPress: () => setSheet({ kind: 'picker' }) },
            { key: 'manual', label: t('recipe.addManually'), icon: 'pencil-outline', onPress: () => setSheet({ kind: 'ingredient', target: { mode: 'new-manual' } }) },
          ]}
        />
      ) : null}
      {sheet.kind === 'recipeMenu' && recipeId !== undefined ? (
        <MenuSheet
          visible
          onRequestClose={() => setSheet({ kind: 'none' })}
          items={[{ key: 'delete', label: t('common.delete'), icon: 'trash-can-outline', destructive: true, onPress: remove }]}
        />
      ) : null}
      {sheet.kind === 'picker' ? (
        <IngredientPickerSheet
          onClose={() => setSheet({ kind: 'none' })}
          onPick={(item: LibraryItem) => setSheet({ kind: 'ingredient', target: { mode: 'new-library', item } })}
        />
      ) : null}
      {sheet.kind === 'ingredient' ? (
        <IngredientSheet
          key={sheet.target.mode === 'edit' ? sheet.target.ingredient.key : 'new'}
          target={sheet.target}
          onSave={upsertIngredient}
          onRemove={removeHandler(sheet.target, removeIngredient)}
          onClose={() => setSheet({ kind: 'none' })}
        />
      ) : null}
    </View>
  );
}

/** Only an ingredient that is already in the list can be removed from the sheet. */
function removeHandler(target: IngredientTarget, remove: (key: string) => void): (() => void) | undefined {
  if (target.mode !== 'edit') return undefined;
  const { key } = target.ingredient;
  return () => remove(key);
}

function IngredientRow({ ingredient, onPress }: { ingredient: RecipeIngredientDraft; onPress: () => void }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const consumedCalories = (ingredient.caloriesPer100g * ingredient.weightGrams) / 100;
  const detail = `${formatWeight(ingredient.weightGrams)} ${t('common.grams')} · ${formatCalories(consumedCalories)} ${t('common.kcal')}`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('recipe.rowA11y', { name: recipeIngredientDisplayName(ingredient), detail })}
      style={({ pressed }) => [styles.ingredientRow, { backgroundColor: pressed ? colors.surfaceVariant : colors.surface, borderColor: colors.divider }]}
    >
      <Text style={[styles.ingredientName, { color: colors.textPrimary }]} numberOfLines={1}>
        {recipeIngredientDisplayName(ingredient)}
      </Text>
      <Text style={[styles.ingredientDetail, { color: colors.textSecondary }]} numberOfLines={1}>
        {detail}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  spacer: { width: 48 },
  sectionTitle: { ...typography.label, textTransform: 'uppercase', marginTop: spacing.lg, marginBottom: spacing.sm },
  muted: { ...typography.secondary, marginBottom: spacing.sm },
  hint: { ...typography.secondary, marginTop: spacing.xs },
  addButton: { marginTop: spacing.sm },
  ingredientRow: {
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  ingredientName: { ...typography.bodyStrong },
  ingredientDetail: { ...typography.secondary, marginTop: 2 },
  resultCard: { padding: spacing.md, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  resultValues: { ...typography.bodyStrong },
  notice: { ...typography.secondary, marginTop: spacing.sm },
  override: { marginTop: spacing.md },
  link: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  linkText: { ...typography.bodyStrong },
  footer: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  footerButton: { flex: 1 },
});
