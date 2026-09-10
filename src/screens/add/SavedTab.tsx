import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Chip } from '../../components/Chip';
import { EmptyState } from '../../components/EmptyState';
import { TextField } from '../../components/TextField';
import { listCategories } from '../../db/repositories/categoriesRepo';
import { listLibrary, listRecentlyUsed } from '../../db/repositories/productsRepo';
import { Category, DateKey, LibraryItem, libraryItemDisplayName } from '../../domain/models';
import { formatCalories, formatMacro } from '../../domain/nutrition/format';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { SavedAddSheet } from './SavedAddSheet';

interface Props {
  date: DateKey;
  onDone: () => void;
}

type Row = { type: 'header'; key: string; title: string } | { type: 'item'; key: string; item: LibraryItem };

/** Search, category chips, recently used, then matching products. */
export function SavedTab({ date, onDone }: Props) {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [recent, setRecent] = useState<LibraryItem[]>([]);
  const [picked, setPicked] = useState<LibraryItem | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async (searchText: string, category: number | null) => {
    const id = ++requestId.current;
    const [cats, items, recentItems] = await Promise.all([listCategories(), listLibrary({ search: searchText, categoryId: category }), listRecentlyUsed(10)]);
    if (id !== requestId.current) return;
    setCategories(cats);
    setLibrary(items);
    setRecent(recentItems);
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

  const rows = useMemo<Row[]>(() => {
    const matchingIds = new Set(library.map((item) => item.variantId));
    const recentMatches = recent.filter((item) => matchingIds.has(item.variantId));
    const recentIds = new Set(recentMatches.map((item) => item.variantId));
    const rest = library.filter((item) => !recentIds.has(item.variantId));
    const result: Row[] = [];
    if (recentMatches.length > 0) {
      result.push({ type: 'header', key: 'h-recent', title: 'Recently used' });
      for (const item of recentMatches) result.push({ type: 'item', key: `r-${item.variantId}`, item });
    }
    if (rest.length > 0) {
      result.push({ type: 'header', key: 'h-all', title: search.trim() ? 'Matching products' : 'All products' });
      for (const item of rest) result.push({ type: 'item', key: `a-${item.variantId}`, item });
    }
    return result;
  }, [library, recent, search]);

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <TextField value={search} onChangeText={onSearch} placeholder="Search saved products" autoCorrect={false} returnKeyType="search" accessibilityLabel="Search saved products" containerStyle={styles.searchField} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipBar} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
        <Chip label="All" selected={categoryId === null} onPress={() => onCategory(null)} />
        {categories.map((category) => (
          <Chip key={category.id} label={category.name} selected={categoryId === category.id} onPress={() => onCategory(category.id)} />
        ))}
      </ScrollView>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        renderItem={({ item: row }) =>
          row.type === 'header' ? (
            <Text style={[styles.header, { color: colors.textSecondary }]}>{row.title}</Text>
          ) : (
            <SavedRow item={row.item} onPress={setPicked} />
          )
        }
        ListEmptyComponent={<EmptyState message={library.length === 0 && !search && categoryId === null ? 'No saved products yet. Add foods manually and save them, or create products from the Products screen.' : 'No matching products'} />}
      />
      {picked ? <SavedAddSheet key={picked.variantId} item={picked} date={date} onClose={() => setPicked(null)} onAdded={onDone} /> : null}
    </View>
  );
}

function SavedRow({ item, onPress }: { item: LibraryItem; onPress: (item: LibraryItem) => void }) {
  const { colors } = useTheme();
  const detail = `${formatCalories(item.caloriesPer100g)} kcal · P ${formatMacro(item.proteinPer100g)} · C ${formatMacro(item.carbsPer100g)} · F ${formatMacro(item.fatPer100g)}`;
  return (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${libraryItemDisplayName(item)}, per 100 grams ${detail}`}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.surfaceVariant : colors.surface, borderBottomColor: colors.divider }]}
    >
      <Text style={[styles.rowName, { color: colors.textPrimary }]} numberOfLines={1}>
        {libraryItemDisplayName(item)}
      </Text>
      <Text style={[styles.rowDetail, { color: colors.textSecondary }]} numberOfLines={1}>
        {detail} <Text style={{ color: colors.disabled }}>/ 100 g</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBox: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  searchField: { marginBottom: spacing.sm },
  chipBar: { flexGrow: 0 },
  chips: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  list: { paddingBottom: spacing.xl },
  header: { ...typography.label, textTransform: 'uppercase', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
  row: { minHeight: 52, justifyContent: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  rowName: { ...typography.bodyStrong },
  rowDetail: { ...typography.secondary, marginTop: 2 },
});
