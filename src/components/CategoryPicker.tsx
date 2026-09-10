import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Category } from '../domain/models';
import { useI18n } from '../i18n';
import { radius, spacing, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { BottomSheet } from './BottomSheet';

interface Props {
  categories: Category[];
  selectedId: number | null;
  onSelect: (categoryId: number) => void;
  label?: string;
}

/** A field-like row that opens a simple category chooser. */
export function CategoryPicker({ categories, selectedId, onSelect, label }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const resolvedLabel = label ?? t('field.category');
  const [open, setOpen] = useState(false);
  const selected = categories.find((c) => c.id === selectedId);
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{resolvedLabel}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${resolvedLabel}: ${selected?.name ?? '—'}`}
        accessibilityHint={t('field.chooseCategory')}
        style={[styles.field, { backgroundColor: colors.surfaceVariant, borderColor: colors.divider }]}
      >
        <Text style={[styles.value, { color: colors.textPrimary }]}>{selected?.name ?? t('field.chooseCategory')}</Text>
        <MaterialCommunityIcons name="chevron-down" size={22} color={colors.textSecondary} />
      </Pressable>
      <BottomSheet visible={open} onRequestClose={() => setOpen(false)} title={resolvedLabel}>
        {categories.map((category) => {
          const isSelected = category.id === selectedId;
          return (
            <Pressable
              key={category.id}
              onPress={() => {
                onSelect(category.id);
                setOpen(false);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              style={[styles.option, { borderBottomColor: colors.divider }]}
            >
              <Text style={[styles.optionLabel, { color: colors.textPrimary, fontWeight: isSelected ? '600' : '400' }]}>{category.name}</Text>
              {isSelected ? <MaterialCommunityIcons name="check" size={20} color={colors.accent} /> : null}
            </Pressable>
          );
        })}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: { ...typography.label, marginBottom: spacing.xs },
  field: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: { ...typography.body },
  option: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionLabel: { ...typography.body },
});
