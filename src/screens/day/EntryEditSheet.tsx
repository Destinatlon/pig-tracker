import React, { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { MenuSheet } from '../../components/MenuSheet';
import { NutritionDraftFields } from '../../components/NutritionDraftFields';
import { updateEntry } from '../../db/repositories/dayEntriesRepo';
import { formatTimeOfDay } from '../../domain/dates';
import { DayEntry, entryDisplayName } from '../../domain/models';
import { createDraftFromPer100g, DraftErrors, NutritionDraft, validateDraft } from '../../domain/nutrition/draft';
import { spacing, typography } from '../../theme/tokens';
import { useI18n } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  entry: DayEntry;
  onClose: () => void;
  onSaved: () => void;
  onCopyToDate: (entry: DayEntry) => void;
  onDelete: (entry: DayEntry) => void;
}

function splitName(entry: DayEntry, typed: string): { productName: string; variantName: string | null } {
  const trimmed = typed.trim();
  if (trimmed === entryDisplayName(entry)) return { productName: entry.productName, variantName: entry.variantName };
  return { productName: trimmed, variantName: null };
}

/** Immediate-edit bottom sheet for one day entry. Saves only on explicit Save. */
export function EntryEditSheet({ entry, onClose, onSaved, onCopyToDate, onDelete }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [draft, setDraft] = useState<NutritionDraft>(() => createDraftFromPer100g(entryDisplayName(entry), entry, entry.weightGrams));
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const change = (next: NutritionDraft) => {
    setDraft(next);
    setDirty(true);
  };

  const requestClose = () => {
    if (!dirty) {
      onClose();
      return;
    }
    Alert.alert(t('common.discardChangesTitle'), undefined, [
      { text: t('common.keepEditing'), style: 'cancel' },
      { text: t('common.discard'), style: 'destructive', onPress: onClose },
    ]);
  };

  const save = async () => {
    if (saving) return;
    const result = validateDraft(draft);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setSaving(true);
    try {
      await updateEntry(entry.id, { ...splitName(entry, result.value.name), weightGrams: result.value.weightGrams, ...result.value.per100g });
      onSaved();
    } catch (error) {
      setSaving(false);
      Alert.alert(t('error.couldNotSave'), String(error));
    }
  };

  return (
    <BottomSheet
      visible
      onRequestClose={requestClose}
      title={t('entry.editTitle')}
      headerRight={<IconButton icon="dots-vertical" accessibilityLabel={t('common.moreActions')} onPress={() => setMenuOpen(true)} />}
      footer={
        <>
          <Button title={t('common.discard')} variant="secondary" onPress={requestClose} style={styles.footerButton} />
          <Button title={t('common.save')} onPress={save} loading={saving} style={styles.footerButton} />
        </>
      }
    >
      <Text style={[styles.meta, { color: colors.textSecondary }]}>{t('entry.addedAt', { time: formatTimeOfDay(entry.createdAt) })}</Text>
      <NutritionDraftFields draft={draft} onChange={change} errors={errors} />
      <MenuSheet
        visible={menuOpen}
        onRequestClose={() => setMenuOpen(false)}
        items={[
          { key: 'copy', label: t('entry.copyToDate'), icon: 'calendar-export', onPress: () => onCopyToDate(entry) },
          { key: 'delete', label: t('common.delete'), icon: 'trash-can-outline', destructive: true, onPress: () => onDelete(entry) },
        ]}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  meta: { ...typography.secondary, marginBottom: spacing.md },
  footerButton: { flex: 1 },
});
