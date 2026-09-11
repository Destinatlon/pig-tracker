import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ListBottomSheet } from '../../components/BottomSheet';
import { Chip } from '../../components/Chip';
import { EmptyState } from '../../components/EmptyState';
import { TextField } from '../../components/TextField';
import { listCategories } from '../../db/repositories/categoriesRepo';
import { listLibrary } from '../../db/repositories/productsRepo';
import { Category, LibraryItem, libraryItemDisplayName } from '../../domain/models';
import { formatCalories, formatMacro } from '../../domain/nutrition/format';
import { useI18n } from '../../i18n';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  onPick: (item: LibraryItem) => void;
  onClose: () => void;
}

/** Search the product library for one ingredient. Picking hands the item back to the editor. */
export function IngredientPickerSheet({ onPick, onClose }: Props) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async (searchText: string, category: number | null) => {
    const id = ++requestId.current;
    const [cats, list] = await Promise.all([listCategories(), listLibrary({ search: searchText, categoryId: category })]);
    if (id !== requestId.current) return;
    setCategories(cats);
    setItems(list);
    setLoaded(true);
  }, []);

  useEffect(() => {
    load('', null).catch((error) => console.error('Failed to load library', error));
  }, [load]);

  const onSearch = (text: string) => {
    setSearch(text);
    load(text, categoryId).catch(() => undefined);
  };

  const onCategory = (id: number | null) => {
    setCategoryId(id);
    load(search, id).catch(() => undefined);
  };

  return (
    <ListBottomSheet
      visible
      onRequestClose={onClose}
      title={t('recipe.addFromLibrary')}
      header={
        <View>
          <View style={styles.searchBox}>
            <TextField
              value={search}
              onChangeText={onSearch}
              placeholder={t('add.searchSaved')}
              accessibilityLabel={t('add.searchSaved')}
              autoCorrect={false}
              returnKeyType="search"
              containerStyle={styles.searchField}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipBar} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
            <Chip label={t('add.all')} selected={categoryId === null} onPress={() => onCategory(null)} />
            {categories.map((category) => (
              <Chip key={category.id} label={category.name} selected={categoryId === category.id} onPress={() => onCategory(category.id)} />
            ))}
          </ScrollView>
        </View>
      }
      data={items}
      keyExtractor={(item) => String(item.variantId)}
      renderItem={(item) => <PickerRow item={item} onPress={onPick} />}
      ListEmptyComponent={loaded ? <EmptyState message={search || categoryId !== null ? t('add.noMatching') : t('add.noSavedProducts')} /> : null}
    />
  );
}

function PickerRow({ item, onPress }: { item: LibraryItem; onPress: (item: LibraryItem) => void }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const detail = `${formatCalories(item.caloriesPer100g)} ${t('common.kcal')} · ${t('macro.p')} ${formatMacro(item.proteinPer100g)} · ${t('macro.c')} ${formatMacro(item.carbsPer100g)} · ${t('macro.f')} ${formatMacro(item.fatPer100g)}`;
  return (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={t('add.libraryRowA11y', { name: libraryItemDisplayName(item), detail })}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.surfaceVariant : colors.surface, borderBottomColor: colors.divider }]}
    >
      <Text style={[styles.rowName, { color: colors.textPrimary }]} numberOfLines={1}>
        {libraryItemDisplayName(item)}
      </Text>
      <Text style={[styles.rowDetail, { color: colors.textSecondary }]} numberOfLines={1}>
        {detail} <Text style={{ color: colors.disabled }}>{t('common.per100gSuffix')}</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchBox: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  searchField: { marginBottom: spacing.sm },
  chipBar: { flexGrow: 0 },
  chips: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  row: { minHeight: 52, justifyContent: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  rowName: { ...typography.bodyStrong },
  rowDetail: { ...typography.secondary, marginTop: 2 },
});
