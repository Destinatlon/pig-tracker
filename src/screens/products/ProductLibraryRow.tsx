import React, { memo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { LibraryItem, libraryItemDisplayName } from '../../domain/models';
import { formatCalories, formatMacro } from '../../domain/nutrition/format';
import { useI18n } from '../../i18n';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  item: LibraryItem;
  onPress: (item: LibraryItem) => void;
}

export const ProductLibraryRow = memo(function ProductLibraryRow({ item, onPress }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const detail = `${formatCalories(item.caloriesPer100g)} ${t('common.kcal')} · ${t('macro.p')} ${formatMacro(item.proteinPer100g)} · ${t('macro.c')} ${formatMacro(item.carbsPer100g)} · ${t('macro.f')} ${formatMacro(item.fatPer100g)}`;
  return (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={t('products.rowA11y', { name: libraryItemDisplayName(item), category: item.categoryName, detail })}
      accessibilityHint={t('products.rowHint')}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.surfaceVariant : colors.surface, borderBottomColor: colors.divider }]}
    >
      <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
        {libraryItemDisplayName(item)}
      </Text>
      <Text style={[styles.detail, { color: colors.textSecondary }]} numberOfLines={1}>
        {detail}
        <Text style={{ color: colors.disabled }}> · {item.categoryName}</Text>
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { minHeight: 52, justifyContent: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  name: { ...typography.bodyStrong },
  detail: { ...typography.secondary, marginTop: 2 },
});
