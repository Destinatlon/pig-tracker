import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { radius, spacing, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  label: string;
  selected?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  accessibilityHint?: string;
}

export function Chip({ label, selected, onPress, onLongPress, accessibilityHint }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      hitSlop={{ top: 6, bottom: 6 }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.accent : colors.surfaceVariant,
          borderColor: selected ? colors.accent : colors.divider,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text style={[styles.label, { color: selected ? colors.onAccent : colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  label: { ...typography.secondary, fontWeight: '500' },
});
