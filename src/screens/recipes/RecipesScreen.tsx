import { DrawerActions, useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../components/EmptyState';
import { Fab } from '../../components/Fab';
import { IconButton } from '../../components/IconButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { TextField } from '../../components/TextField';
import { RecipeListItem, listRecipes } from '../../db/repositories/recipesRepo';
import { effectiveRecipePer100g } from '../../domain/recipes/calculations';
import { useI18n } from '../../i18n';
import { DrawerRouteProps } from '../../navigation/types';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { per100gSummary } from './recipeSummary';

/** Search-first list of saved recipes. Tapping one opens the full editor. */
export function RecipesScreen({ navigation }: DrawerRouteProps<'Recipes'>) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<RecipeListItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const requestId = useRef(0);
  const searchRef = useRef('');

  const load = useCallback(async () => {
    const id = ++requestId.current;
    const list = await listRecipes({ search: searchRef.current });
    if (id !== requestId.current) return;
    setItems(list);
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().catch((error) => console.error('Failed to load recipes', error));
    }, [load]),
  );

  const onSearch = (text: string) => {
    setSearch(text);
    searchRef.current = text;
    load().catch(() => undefined);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader
        left={<IconButton icon="menu" accessibilityLabel={t('common.openMenu')} onPress={() => navigation.dispatch(DrawerActions.openDrawer())} />}
        title={t('recipe.title')}
        right={<View style={styles.spacer} />}
      />
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
        renderItem={({ item }) => (
          <RecipeRow item={item} onPress={() => navigation.navigate('RecipeEditor', { recipeId: item.recipe.id })} />
        )}
        ListEmptyComponent={loaded ? <EmptyState message={search.trim() ? t('recipe.noMatching') : t('recipe.empty')} /> : null}
      />
      <Fab onPress={() => navigation.navigate('RecipeEditor', {})} accessibilityLabel={t('recipe.create')} />
    </View>
  );
}

function RecipeRow({ item, onPress }: { item: RecipeListItem; onPress: () => void }) {
  const { colors } = useTheme();
  const { t, tn } = useI18n();
  const per100g = effectiveRecipePer100g(item.recipe, item.ingredients);
  const detail = `${tn('recipe.ingredientCount', item.ingredients.length)} · ${per100gSummary(per100g, t)}`;
  return (
    <Pressable
      onPress={onPress}
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
      {item.recipe.description.trim() ? (
        <Text style={[styles.rowDescription, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.recipe.description}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  spacer: { width: 48 },
  searchBox: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  searchField: { marginBottom: spacing.sm },
  list: { paddingBottom: 96 },
  row: { minHeight: 56, justifyContent: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  rowName: { ...typography.bodyStrong },
  rowDetail: { ...typography.secondary, marginTop: 2 },
  rowDescription: { ...typography.secondary, marginTop: 2, fontStyle: 'italic' },
});
