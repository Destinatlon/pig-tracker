import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { MIN_TOUCH, radius, spacing, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

export type ButtonVariant = 'primary' | 'secondary' | 'text' | 'danger';

interface Props {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
  compact?: boolean;
}

export function Button({ title, onPress, variant = 'primary', disabled, loading, style, accessibilityLabel, compact }: Props) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const background =
    variant === 'primary' ? colors.accent : variant === 'danger' ? colors.danger : variant === 'secondary' ? colors.surfaceVariant : 'transparent';
  const foreground =
    variant === 'primary' ? colors.onAccent : variant === 'danger' ? colors.onDanger : variant === 'text' ? colors.accent : colors.textPrimary;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        { backgroundColor: background, opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1 },
        variant === 'secondary' && { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.divider },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={foreground} /> : <Text style={[styles.label, { color: foreground }]}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: { minHeight: 36, paddingHorizontal: spacing.md },
  label: { ...typography.bodyStrong },
});
