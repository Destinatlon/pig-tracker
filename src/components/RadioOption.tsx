import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { MIN_TOUCH, spacing, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  /** `row` fills the width with the dot on the right; `inline` sits beside its sibling options. */
  variant?: 'row' | 'inline';
  style?: ViewStyle;
}

/** One option of a radio group. Wrap the options in a View with `accessibilityRole="radiogroup"`. */
export function RadioOption({ label, selected, onPress, accessibilityLabel, variant = 'row', style }: Props) {
  const { colors } = useTheme();
  const inline = variant === 'inline';
  const icon = selected ? 'radiobox-marked' : 'radiobox-blank';
  const iconColor = selected ? colors.accent : colors.textSecondary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        inline ? styles.inline : [styles.row, { borderBottomColor: colors.divider }],
        { opacity: pressed ? 0.6 : 1 },
        style,
      ]}
    >
      {inline ? <MaterialCommunityIcons name={icon} size={20} color={iconColor} /> : null}
      <Text style={[styles.label, inline ? styles.inlineLabel : null, { color: colors.textPrimary }]} numberOfLines={2}>
        {label}
      </Text>
      {inline ? null : <MaterialCommunityIcons name={icon} size={22} color={iconColor} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: MIN_TOUCH, paddingRight: spacing.sm },
  label: { ...typography.body },
  inlineLabel: { flexShrink: 1 },
});
