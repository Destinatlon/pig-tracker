import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { TextField } from '../../components/TextField';
import { createCategory, deleteCategory, moveCategory, renameCategory } from '../../db/repositories/categoriesRepo';
import { Category } from '../../domain/models';
import { parseRequiredName } from '../../domain/numeric';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  categories: Category[];
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}

/** Add, rename, delete and reorder categories with explicit Up/Down controls. */
export function CategoryManagementSheet({ categories, onClose, onChanged }: Props) {
  const { colors } = useTheme();
  const [newName, setNewName] = useState('');
  const [newError, setNewError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: number; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      await onChanged();
    } catch (error) {
      Alert.alert('Something went wrong', String(error));
    } finally {
      setBusy(false);
    }
  };

  const add = () => {
    const parsed = parseRequiredName(newName, 'Category name');
    if (!parsed.ok) {
      setNewError(parsed.error);
      return;
    }
    setNewError(null);
    run(async () => {
      await createCategory(parsed.value);
      setNewName('');
    });
  };

  const saveRename = () => {
    if (!renaming) return;
    const parsed = parseRequiredName(renaming.name, 'Category name');
    if (!parsed.ok) {
      Alert.alert(parsed.error);
      return;
    }
    const { id } = renaming;
    run(async () => {
      await renameCategory(id, parsed.value);
      setRenaming(null);
    });
  };

  const confirmDelete = (category: Category) => {
    Alert.alert(`Delete "${category.name}"?`, 'Its products will move to Uncategorized.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => run(() => deleteCategory(category.id)) },
    ]);
  };

  const userCategories = categories.filter((c) => !c.isSystem);

  return (
    <BottomSheet visible onRequestClose={onClose} title="Categories" footer={<Button title="Done" onPress={onClose} style={styles.footerButton} />}>
      <View style={styles.addRow}>
        <TextField
          value={newName}
          onChangeText={(text) => {
            setNewName(text);
            setNewError(null);
          }}
          placeholder="New category"
          error={newError}
          containerStyle={styles.addField}
          accessibilityLabel="New category name"
          autoCapitalize="sentences"
          returnKeyType="done"
          onSubmitEditing={add}
        />
        <Button title="Add" variant="secondary" onPress={add} disabled={busy} style={styles.addButton} />
      </View>
      {userCategories.map((category, index) => (
        <View key={category.id} style={[styles.row, { borderBottomColor: colors.divider }]}>
          {renaming?.id === category.id ? (
            <>
              <TextField
                value={renaming.name}
                onChangeText={(name) => setRenaming({ id: category.id, name })}
                containerStyle={styles.renameField}
                accessibilityLabel="Category name"
                autoFocus
                autoCapitalize="sentences"
                returnKeyType="done"
                onSubmitEditing={saveRename}
                compact
              />
              <IconButton icon="check" accessibilityLabel="Save name" onPress={saveRename} color={colors.accent} />
              <IconButton icon="close" accessibilityLabel="Cancel rename" onPress={() => setRenaming(null)} />
            </>
          ) : (
            <>
              <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                {category.name}
              </Text>
              <IconButton icon="pencil-outline" accessibilityLabel={`Rename ${category.name}`} onPress={() => setRenaming({ id: category.id, name: category.name })} size={20} />
              <IconButton icon="arrow-up" accessibilityLabel={`Move ${category.name} up`} disabled={index === 0 || busy} onPress={() => run(() => moveCategory(category.id, 'up'))} size={20} />
              <IconButton
                icon="arrow-down"
                accessibilityLabel={`Move ${category.name} down`}
                disabled={index === userCategories.length - 1 || busy}
                onPress={() => run(() => moveCategory(category.id, 'down'))}
                size={20}
              />
              <IconButton icon="trash-can-outline" accessibilityLabel={`Delete ${category.name}`} onPress={() => confirmDelete(category)} color={colors.danger} size={20} disabled={busy} />
            </>
          )}
        </View>
      ))}
      {categories
        .filter((c) => c.isSystem)
        .map((category) => (
          <View key={category.id} style={[styles.row, { borderBottomColor: colors.divider }]}>
            <Text style={[styles.name, { color: colors.textSecondary }]}>{category.name}</Text>
            <Text style={[styles.builtIn, { color: colors.disabled }]}>built-in</Text>
          </View>
        ))}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  addRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  addField: { flex: 1 },
  addButton: { marginTop: 0 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth },
  name: { ...typography.body, flex: 1 },
  renameField: { flex: 1, marginBottom: 0 },
  builtIn: { ...typography.label },
  footerButton: { flex: 1 },
});
