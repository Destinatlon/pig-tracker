import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, spacing, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { BottomSheet } from './BottomSheet';

export interface PickerOption<T extends string> {
  key: T;
  label: string;
}

interface Props<T extends string> {
  label: string;
  options: readonly PickerOption<T>[];
  selected: T | null;
  onSelect: (key: T) => void;
  /** Shown in the field while nothing is selected and as the accessibility hint. */
  placeholder: string;
}

/** A field-like row that opens a single-choice bottom sheet (same pattern as the category picker). */
export function OptionPicker<T extends string>({ label, options, selected, onSelect, placeholder }: Props<T>) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.key === selected);
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? '—'}`}
        accessibilityHint={placeholder}
        style={[styles.field, { backgroundColor: colors.surfaceVariant, borderColor: colors.divider }]}
      >
        <Text style={[styles.value, { color: current ? colors.textPrimary : colors.disabled }]}>{current?.label ?? placeholder}</Text>
        <MaterialCommunityIcons name="chevron-down" size={22} color={colors.textSecondary} />
      </Pressable>
      <BottomSheet visible={open} onRequestClose={() => setOpen(false)} title={label}>
        {options.map((option) => {
          const isSelected = option.key === selected;
          return (
            <Pressable
              key={option.key}
              onPress={() => {
                onSelect(option.key);
                setOpen(false);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={option.label}
              style={[styles.option, { borderBottomColor: colors.divider }]}
            >
              <Text style={[styles.optionLabel, { color: colors.textPrimary, fontWeight: isSelected ? '600' : '400' }]}>{option.label}</Text>
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
  value: { ...typography.body, flex: 1 },
  option: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionLabel: { ...typography.body },
});
