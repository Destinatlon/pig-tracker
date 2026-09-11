import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { NutritionDraftFields } from '../../components/NutritionDraftFields';
import { useSnackbar } from '../../components/Snackbar';
import { insertEntry } from '../../db/repositories/dayEntriesRepo';
import { findLibraryItemsByName } from '../../db/repositories/productsRepo';
import { DateKey, LibraryItem, libraryItemDisplayName } from '../../domain/models';
import { createEmptyDraft, DraftErrors, NutritionDraft, validateDraft } from '../../domain/nutrition/draft';
import { useI18n } from '../../i18n';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { useLibrarySave } from './LibrarySaveProvider';
import { SavedAddSheet } from './SavedAddSheet';

interface Props {
  date: DateKey;
  onDone: () => void;
  onUseSaved: () => void;
}

/** Primary logging flow: name, weight, kcal, P, C, F entered for the consumed amount. */
export function ManualTab({ date, onDone }: Props) {
  const { colors } = useTheme();
  const { t, relativeDate } = useI18n();
  const insets = useSafeAreaInsets();
  const snackbar = useSnackbar();
  const librarySave = useLibrarySave();
  const [draft, setDraft] = useState<NutritionDraft>(createEmptyDraft);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [suggestions, setSuggestions] = useState<LibraryItem[]>([]);
  const [savedPick, setSavedPick] = useState<LibraryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const lookupId = useRef(0);

  const change = (next: NutritionDraft) => {
    setErrors({});
    if (next.name !== draft.name) {
      const id = ++lookupId.current;
      findLibraryItemsByName(next.name)
        .then((items) => {
          if (id === lookupId.current) setSuggestions(items);
        })
        .catch(() => undefined);
    }
    setDraft(next);
  };

  const add = async () => {
    if (saving) return;
    const result = validateDraft(draft);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setSaving(true);
    try {
      const entry = await insertEntry({
        date,
        productId: null,
        variantId: null,
        productName: result.value.name,
        variantName: null,
        weightGrams: result.value.weightGrams,
        ...result.value.per100g,
      });
      onDone();
      snackbar.show({
        message: t('add.addedTo', { date: relativeDate(date) }),
        actionLabel: t('add.saveAsProduct'),
        onAction: () => librarySave.openSaveAsProduct(entry),
      });
    } catch (error) {
      setSaving(false);
      Alert.alert(t('error.couldNotAdd'), String(error));
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView style={styles.container} behavior="padding">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <NutritionDraftFields draft={draft} onChange={change} errors={errors} autoFocusName />
          {suggestions.length > 0 ? (
            <View style={styles.suggestions}>
              <Text style={[styles.suggestionTitle, { color: colors.textSecondary }]}>{t('add.suggestionsTitle')}</Text>
              {suggestions.map((item) => (
                <Pressable
                  key={item.variantId}
                  onPress={() => setSavedPick(item)}
                  accessibilityRole="button"
                  accessibilityLabel={t('add.useSavedA11y', { name: libraryItemDisplayName(item) })}
                  style={({ pressed }) => [styles.suggestion, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <MaterialCommunityIcons name="bookmark-outline" size={18} color={colors.accent} />
                  <Text style={[styles.suggestionLabel, { color: colors.accent }]} numberOfLines={1}>
                    {libraryItemDisplayName(item)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('add.hint')}</Text>
        </ScrollView>
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.divider, paddingBottom: insets.bottom + spacing.md }]}>
          <Button title={t('common.add')} onPress={add} loading={saving} />
        </View>
      </KeyboardAvoidingView>
      {/* Outside the avoider: the sheet is a Modal with its own, and nesting the two makes it oscillate. */}
      {savedPick ? <SavedAddSheet key={savedPick.variantId} item={savedPick} date={date} onClose={() => setSavedPick(null)} onAdded={onDone} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  suggestions: { marginTop: -spacing.xs, marginBottom: spacing.md },
  suggestionTitle: { ...typography.label, marginBottom: spacing.xs },
  suggestion: { flexDirection: 'row', alignItems: 'center', minHeight: 40, gap: spacing.sm },
  suggestionLabel: { ...typography.body, flex: 1 },
  hint: { ...typography.secondary, marginTop: spacing.sm },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
});
