import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { ComponentProps } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { MIN_TOUCH } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Props {
  icon: IconName;
  onPress?: () => void;
  onLongPress?: () => void;
  onPressIn?: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  color?: string;
  size?: number;
  disabled?: boolean;
  style?: ViewStyle;
}

/** A small visual icon with a full-size touch target. */
export function IconButton({ icon, onPress, onLongPress, onPressIn, accessibilityLabel, accessibilityHint, color, size = 24, disabled, style }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.base, { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }, style]}
    >
      <MaterialCommunityIcons name={icon} size={size} color={color ?? colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
});
