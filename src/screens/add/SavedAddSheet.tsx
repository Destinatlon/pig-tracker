import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { NutritionDraftFields } from '../../components/NutritionDraftFields';
import { useSnackbar } from '../../components/Snackbar';
import { NumberField } from '../../components/TextField';
import { insertEntry } from '../../db/repositories/dayEntriesRepo';
import { DateKey, LibraryItem, libraryItemDisplayName } from '../../domain/models';
import { sameNutritionPer100g } from '../../domain/nutrition/calculations';
import { createDraftFromPer100g, NutritionDraft, DraftErrors, updateDraftWeight, validateDraft } from '../../domain/nutrition/draft';
import { formatCalories, formatMacro } from '../../domain/nutrition/format';
import { useI18n } from '../../i18n';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { useLibrarySave } from './LibrarySaveProvider';

interface Props {
  item: LibraryItem;
  date: DateKey;
  onClose: () => void;
  onAdded: () => void;
}

/** Small sheet: blank weight, live calculated macros, optional override for the consumed amount. */
export function SavedAddSheet({ item, date, onClose, onAdded }: Props) {
  const { colors } = useTheme();
  const { t, relativeDate, fieldError } = useI18n();
  const snackbar = useSnackbar();
  const librarySave = useLibrarySave();
  const [draft, setDraft] = useState<NutritionDraft>(() => createDraftFromPer100g(libraryItemDisplayName(item), item, null));
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [saving, setSaving] = useState(false);

  const calculated = `${draft.texts.calories === '' ? '?' : formatCalories(Number(draft.texts.calories))} ${t('common.kcal')} · ${t('macro.p')} ${valueOrUnknown(draft.texts.protein)} · ${t('macro.c')} ${valueOrUnknown(draft.texts.carbs)} · ${t('macro.f')} ${valueOrUnknown(draft.texts.fat)}`;

  const add = async () => {
    if (saving) return;
    const result = validateDraft(draft, { requireName: false });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setSaving(true);
    try {
      const entry = await insertEntry({
        date,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.isDefault ? null : item.variantName,
        weightGrams: result.value.weightGrams,
        ...result.value.per100g,
      });
      onAdded();
      if (sameNutritionPer100g(result.value.per100g, item)) {
        snackbar.show({ message: t('add.addedTo', { date: relativeDate(date) }) });
      } else {
        snackbar.show({
          message: t('add.addedDifferent'),
          actionLabel: t('add.saveAsVariant'),
          onAction: () => librarySave.openSaveAsVariant(entry, item),
        });
      }
    } catch (error) {
      setSaving(false);
      Alert.alert(t('error.couldNotAdd'), String(error));
    }
  };

  return (
    <BottomSheet visible onRequestClose={onClose} title={libraryItemDisplayName(item)} footer={<Button title={t('common.add')} onPress={add} loading={saving} style={styles.footerButton} />}>
      <Text style={[styles.per100, { color: colors.textSecondary }]}>
        {t('common.per100g')}: {formatCalories(item.caloriesPer100g)} {t('common.kcal')} · {t('macro.p')} {formatMacro(item.proteinPer100g)} · {t('macro.c')} {formatMacro(item.carbsPer100g)} · {t('macro.f')} {formatMacro(item.fatPer100g)}
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
            label={t('field.weight')}
            required
            unit={t('common.grams')}
            value={draft.weightText}
            onChangeText={(text) => {
              setErrors({});
              setDraft(updateDraftWeight(draft, text));
            }}
            error={fieldError(t('field.weight'), errors.weight)}
            autoFocus
          />
          <Text style={[styles.calculated, { color: colors.textPrimary }]} accessibilityLiveRegion="polite">
            {calculated}
          </Text>
          <Pressable onPress={() => setEditing(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('add.editMacrosA11y')} style={styles.link}>
            <Text style={[styles.linkText, { color: colors.accent }]}>{t('add.editMacros')}</Text>
          </Pressable>
        </View>
      )}
    </BottomSheet>
  );
}

function valueOrUnknown(text: string): string {
  return text === '' ? '?' : formatMacro(Number(text));
}

const styles = StyleSheet.create({
  per100: { ...typography.secondary, marginBottom: spacing.md },
  calculated: { ...typography.bodyStrong, marginBottom: spacing.sm },
  link: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  linkText: { ...typography.bodyStrong },
  footerButton: { flex: 1 },
});
