import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, BackHandler, FlatList, KeyboardAvoidingView, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { applyBulkDayChanges, BulkDayChanges } from '../../db/repositories/dayEntriesRepo';
import { DateKey, DayEntry, entryDisplayName } from '../../domain/models';
import {
  createDraftFromPer100g,
  createEmptyDraft,
  DraftErrors,
  DraftField,
  NutritionDraft,
  updateDraftName,
  updateDraftValue,
  updateDraftWeight,
  validateDraft,
} from '../../domain/nutrition/draft';
import { sanitizeNumericText } from '../../domain/numeric';
import { radius, spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

interface BulkRow {
  key: string;
  /** Existing entry id, or null for a new row. */
  id: number | null;
  original: DayEntry | null;
  draft: NutritionDraft;
  errors: DraftErrors;
}

interface Props {
  date: DateKey;
  entries: DayEntry[];
  onSaved: () => void;
  onCancel: () => void;
}

function splitName(row: BulkRow, typed: string): { productName: string; variantName: string | null } {
  const trimmed = typed.trim();
  if (row.original && trimmed === entryDisplayName(row.original)) {
    return { productName: row.original.productName, variantName: row.original.variantName };
  }
  return { productName: trimmed, variantName: null };
}

/** Whole-day direct edit mode. The entire session is one draft committed only by Save changes. */
export function BulkEditMode({ date, entries, onSaved, onCancel }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<BulkRow[]>(() =>
    entries.map((entry) => ({
      key: `e-${entry.id}`,
      id: entry.id,
      original: entry,
      draft: createDraftFromPer100g(entryDisplayName(entry), entry, entry.weightGrams),
      errors: {},
    })),
  );
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCounter, setNewCounter] = useState(0);

  const requestCancel = useCallback(() => {
    if (!dirty) {
      onCancel();
      return true;
    }
    Alert.alert('Discard unsaved changes?', undefined, [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: onCancel },
    ]);
    return true;
  }, [dirty, onCancel]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', requestCancel);
    return () => subscription.remove();
  }, [requestCancel]);

  const updateRow = (key: string, update: (draft: NutritionDraft) => NutritionDraft) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, draft: update(row.draft), errors: {} } : row)));
    setDirty(true);
  };

  const removeRow = (row: BulkRow) => {
    setRows((current) => current.filter((r) => r.key !== row.key));
    if (row.id !== null) setDeletedIds((current) => [...current, row.id as number]);
    setDirty(true);
  };

  const addRow = () => {
    const index = newCounter + 1;
    setNewCounter(index);
    setRows((current) => [...current, { key: `new-${index}`, id: null, original: null, draft: createEmptyDraft(), errors: {} }]);
    setDirty(true);
  };

  const save = async () => {
    if (saving) return;
    const changes: BulkDayChanges = { updates: [], inserts: [], deletes: deletedIds };
    let hasErrors = false;
    const validated = rows.map((row) => {
      const result = validateDraft(row.draft);
      if (!result.ok) {
        hasErrors = true;
        return { ...row, errors: result.errors };
      }
      const names = splitName(row, result.value.name);
      const patch = { ...names, weightGrams: result.value.weightGrams, ...result.value.per100g };
      if (row.id !== null) changes.updates.push({ id: row.id, patch });
      else changes.inserts.push({ date, productId: null, variantId: null, ...patch });
      return { ...row, errors: {} };
    });
    if (hasErrors) {
      setRows(validated);
      Alert.alert('Check the highlighted rows', 'Every entry needs a name, a weight above zero and calories.');
      return;
    }
    setSaving(true);
    try {
      await applyBulkDayChanges(date, changes);
      onSaved();
    } catch (error) {
      setSaving(false);
      Alert.alert('Could not save changes', String(error));
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.bulkEditBackground }]} behavior="padding">
      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <BulkRowView
            row={item}
            onName={(text) => updateRow(item.key, (d) => updateDraftName(d, text))}
            onWeight={(text) => updateRow(item.key, (d) => updateDraftWeight(d, sanitizeNumericText(text)))}
            onValue={(field, text) => updateRow(item.key, (d) => updateDraftValue(d, field, sanitizeNumericText(text)))}
            onRemove={() => removeRow(item)}
          />
        )}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.textSecondary }]}>No entries. Add one below.</Text>}
      />
      <View style={[styles.addBar, { borderTopColor: colors.divider }]}>
        <Button title="+ Add entry" variant="secondary" compact onPress={addRow} accessibilityLabel="Add entry" />
      </View>
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.divider, paddingBottom: insets.bottom + spacing.md }]}>
        <Button title="Discard" variant="secondary" onPress={requestCancel} style={styles.footerButton} />
        <Button title="Save changes" onPress={save} loading={saving} style={styles.footerButton} />
      </View>
    </KeyboardAvoidingView>
  );
}

interface RowProps {
  row: BulkRow;
  onName: (text: string) => void;
  onWeight: (text: string) => void;
  onValue: (field: DraftField, text: string) => void;
  onRemove: () => void;
}

function BulkRowView({ row, onName, onWeight, onValue, onRemove }: RowProps) {
  const { colors } = useTheme();
  const { draft, errors } = row;
  const firstError = errors.name ?? errors.weight ?? errors.calories ?? errors.protein ?? errors.carbs ?? errors.fat;
  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: firstError ? colors.danger : colors.divider }]}>
      <View style={styles.line}>
        <InlineInput
          value={draft.name}
          onChangeText={onName}
          placeholder="?"
          accessibilityLabel="Name"
          style={styles.nameInput}
          invalid={!!errors.name}
          autoCapitalize="sentences"
        />
        <Text style={[styles.inlineLabel, { color: colors.textSecondary }]}>weight</Text>
        <InlineInput value={draft.weightText} onChangeText={onWeight} numeric accessibilityLabel="Weight in grams" invalid={!!errors.weight} />
        <Text style={[styles.unit, { color: colors.textSecondary }]}>g</Text>
        <Pressable onPress={onRemove} hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete entry" style={styles.remove}>
          <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>
      <View style={styles.line}>
        <Text style={[styles.inlineLabel, { color: colors.textSecondary }]}>kcal</Text>
        <InlineInput value={draft.texts.calories} onChangeText={(t) => onValue('calories', t)} numeric accessibilityLabel="Calories" invalid={!!errors.calories} />
        <Text style={[styles.inlineLabel, { color: colors.textSecondary }]}>P</Text>
        <InlineInput value={draft.texts.protein} onChangeText={(t) => onValue('protein', t)} numeric accessibilityLabel="Protein" invalid={!!errors.protein} />
        <Text style={[styles.inlineLabel, { color: colors.textSecondary }]}>C</Text>
        <InlineInput value={draft.texts.carbs} onChangeText={(t) => onValue('carbs', t)} numeric accessibilityLabel="Carbs" invalid={!!errors.carbs} />
        <Text style={[styles.inlineLabel, { color: colors.textSecondary }]}>F</Text>
        <InlineInput value={draft.texts.fat} onChangeText={(t) => onValue('fat', t)} numeric accessibilityLabel="Fat" invalid={!!errors.fat} />
      </View>
      {firstError ? <Text style={[styles.error, { color: colors.danger }]}>{firstError}</Text> : null}
    </View>
  );
}

interface InlineInputProps {
  value: string;
  onChangeText: (text: string) => void;
  numeric?: boolean;
  placeholder?: string;
  accessibilityLabel: string;
  invalid?: boolean;
  style?: object;
  autoCapitalize?: 'none' | 'sentences';
}

/** Compact inline field that reads like text until focused. */
function InlineInput({ value, onChangeText, numeric, placeholder = '?', accessibilityLabel, invalid, style, autoCapitalize = 'none' }: InlineInputProps) {
  const { colors } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={invalid ? colors.danger : colors.disabled}
      keyboardType={numeric ? 'decimal-pad' : 'default'}
      inputMode={numeric ? 'decimal' : 'text'}
      autoCapitalize={autoCapitalize}
      accessibilityLabel={accessibilityLabel}
      selectTextOnFocus
      style={[
        styles.inline,
        numeric ? styles.inlineNumeric : null,
        { color: colors.textPrimary, borderBottomColor: invalid ? colors.danger : colors.divider, backgroundColor: colors.surfaceVariant },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  row: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  line: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', minHeight: 40 },
  inlineLabel: { ...typography.label, marginRight: spacing.xs, marginLeft: spacing.sm },
  unit: { ...typography.label, marginLeft: spacing.xs },
  nameInput: { flex: 1, minWidth: 100 },
  inline: {
    ...typography.body,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderRadius: radius.sm,
  },
  inlineNumeric: { minWidth: 56, textAlign: 'right' },
  remove: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  error: { ...typography.label, marginTop: spacing.xs },
  empty: { ...typography.body, textAlign: 'center', padding: spacing.xl },
  addBar: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, alignItems: 'flex-start', borderTopWidth: StyleSheet.hairlineWidth },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerButton: { flex: 1 },
});
