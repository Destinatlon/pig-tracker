import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../components/EmptyState';
import { TextField } from '../../components/TextField';
import { RecipeListItem, listRecipes } from '../../db/repositories/recipesRepo';
import { DateKey } from '../../domain/models';
import { effectiveRecipePer100g } from '../../domain/recipes/calculations';
import { useI18n } from '../../i18n';
import { per100gSummary } from '../recipes/recipeSummary';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { RecipeLogSheet } from './RecipeLogSheet';

interface Props {
  date: DateKey;
  onDone: () => void;
}

/** Pick a saved recipe and log a portion of it. */
export function RecipesTab({ date, onDone }: Props) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<RecipeListItem[]>([]);
  const [picked, setPicked] = useState<RecipeListItem | null>(null);
  const [loaded, setLoaded] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async (searchText: string) => {
    const id = ++requestId.current;
    const list = await listRecipes({ search: searchText });
    if (id !== requestId.current) return;
    setItems(list);
    setLoaded(true);
  }, []);

  useEffect(() => {
    load('').catch((error) => console.error('Failed to load recipes', error));
  }, [load]);

  const onSearch = (text: string) => {
    setSearch(text);
    load(text).catch(() => undefined);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <TextField
          value={search}
          onChangeText={onSearch}
          placeholder={t('recipe.search')}
          accessibilityLabel={t('recipe.search')}
          autoCorrect={false}
          returnKeyType="search"
          containerStyle={styles.searchField}
        />
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.recipe.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <RecipePickRow item={item} onPress={setPicked} />}
        ListEmptyComponent={loaded ? <EmptyState message={search.trim() ? t('recipe.noMatching') : t('add.noRecipes')} /> : null}
      />
      {picked ? <RecipeLogSheet key={picked.recipe.id} item={picked} date={date} onClose={() => setPicked(null)} onAdded={onDone} /> : null}
    </View>
  );
}

function RecipePickRow({ item, onPress }: { item: RecipeListItem; onPress: (item: RecipeListItem) => void }) {
  const { colors } = useTheme();
  const { t, tn } = useI18n();
  const detail = `${tn('recipe.ingredientCount', item.ingredients.length)} · ${per100gSummary(effectiveRecipePer100g(item.recipe, item.ingredients), t)}`;
  return (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={t('recipe.rowA11y', { name: item.recipe.name, detail })}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.surfaceVariant : colors.surface, borderBottomColor: colors.divider }]}
    >
      <Text style={[styles.rowName, { color: colors.textPrimary }]} numberOfLines={1}>
        {item.recipe.name}
      </Text>
      <Text style={[styles.rowDetail, { color: colors.textSecondary }]} numberOfLines={1}>
        {detail} <Text style={{ color: colors.disabled }}>{t('common.per100gSuffix')}</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBox: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  searchField: { marginBottom: spacing.sm },
  list: { paddingBottom: spacing.xl },
  row: { minHeight: 52, justifyContent: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  rowName: { ...typography.bodyStrong },
  rowDetail: { ...typography.secondary, marginTop: 2 },
});
