import { DrawerActions, useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { Chip } from '../../components/Chip';
import { EmptyState } from '../../components/EmptyState';
import { Fab } from '../../components/Fab';
import { IconButton } from '../../components/IconButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { TextField } from '../../components/TextField';
import { getUncategorizedCategoryId, listCategories } from '../../db/repositories/categoriesRepo';
import { listLibrary } from '../../db/repositories/productsRepo';
import { Category, LibraryItem } from '../../domain/models';
import { DrawerRouteProps } from '../../navigation/types';
import { spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { CategoryManagementSheet } from './CategoryManagementSheet';
import { ProductCreateSheet } from './ProductCreateSheet';
import { ProductEditSheet } from './ProductEditSheet';
import { ProductLibraryRow } from './ProductLibraryRow';
import { VariantSheet } from './VariantSheet';

type Sheet =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; item: LibraryItem }
  | { kind: 'variant'; productId: number; productName: string }
  | { kind: 'categories' };

/** Search-first flat library of every product and variant. */
export function ProductsScreen({ navigation }: DrawerRouteProps<'Products'>) {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [uncategorizedId, setUncategorizedId] = useState<number | null>(null);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [sheet, setSheet] = useState<Sheet>({ kind: 'none' });
  const requestId = useRef(0);
  const filter = useRef({ search: '', categoryId: null as number | null });

  const load = useCallback(async () => {
    const id = ++requestId.current;
    const [cats, list, uncategorized] = await Promise.all([listCategories(), listLibrary(filter.current), getUncategorizedCategoryId()]);
    if (id !== requestId.current) return;
    setCategories(cats);
    setItems(list);
    setUncategorizedId(uncategorized);
    if (filter.current.categoryId !== null && !cats.some((c) => c.id === filter.current.categoryId)) {
      filter.current = { ...filter.current, categoryId: null };
      setCategoryId(null);
      setItems(await listLibrary(filter.current));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().catch((error) => console.error('Failed to load products', error));
    }, [load]),
  );

  const onSearch = (text: string) => {
    setSearch(text);
    filter.current = { ...filter.current, search: text };
    load().catch(() => undefined);
  };

  const onCategory = (id: number | null) => {
    setCategoryId(id);
    filter.current = { ...filter.current, categoryId: id };
    load().catch(() => undefined);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader
        left={<IconButton icon="menu" accessibilityLabel="Open navigation menu" onPress={() => navigation.dispatch(DrawerActions.openDrawer())} />}
        title="Products"
        right={<IconButton icon="shape-outline" accessibilityLabel="Manage categories" onPress={() => setSheet({ kind: 'categories' })} />}
      />
      <View style={styles.searchBox}>
        <TextField value={search} onChangeText={onSearch} placeholder="Search products" autoCorrect={false} returnKeyType="search" accessibilityLabel="Search products" containerStyle={styles.searchField} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
        <Chip label="All" selected={categoryId === null} onPress={() => onCategory(null)} onLongPress={() => setSheet({ kind: 'categories' })} accessibilityHint="Long press to manage categories" />
        {categories.map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            selected={categoryId === category.id}
            onPress={() => onCategory(category.id)}
            onLongPress={() => setSheet({ kind: 'categories' })}
            accessibilityHint="Long press to manage categories"
          />
        ))}
      </ScrollView>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.variantId)}
        renderItem={({ item }) => <ProductLibraryRow item={item} onPress={(picked) => setSheet({ kind: 'edit', item: picked })} />}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState message={search || categoryId !== null ? 'No matching products' : 'No saved products yet. Tap + to create one.'} />}
      />
      <Fab onPress={() => setSheet({ kind: 'create' })} accessibilityLabel="Create product" />
      {sheet.kind === 'create' && uncategorizedId !== null ? (
        <ProductCreateSheet categories={categories} defaultCategoryId={categoryId ?? uncategorizedId} onClose={() => setSheet({ kind: 'none' })} onCreated={load} />
      ) : null}
      {sheet.kind === 'edit' ? (
        <ProductEditSheet
          key={sheet.item.variantId}
          item={sheet.item}
          categories={categories}
          onClose={() => setSheet({ kind: 'none' })}
          onChanged={load}
          onAddVariant={(item) => setSheet({ kind: 'variant', productId: item.productId, productName: item.productName })}
        />
      ) : null}
      {sheet.kind === 'variant' ? (
        <VariantSheet productId={sheet.productId} productName={sheet.productName} onClose={() => setSheet({ kind: 'none' })} onCreated={load} />
      ) : null}
      {sheet.kind === 'categories' ? <CategoryManagementSheet categories={categories} onClose={() => setSheet({ kind: 'none' })} onChanged={load} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  searchBox: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  searchField: { marginBottom: spacing.sm },
  chips: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  list: { paddingBottom: 96 },
});
