import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { IconName } from './IconButton';

interface Props {
  icon?: IconName;
  onPress: () => void;
  onLongPress?: () => void;
  /** Long-press delay in ms; the Day screen uses ~2000 ms for bulk edit. */
  delayLongPress?: number;
  accessibilityLabel: string;
  accessibilityHint?: string;
}

export const FAB_SIZE = 56;

export function Fab({ icon = 'plus', onPress, onLongPress, delayLongPress, accessibilityLabel, accessibilityHint }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.fab,
        { backgroundColor: colors.accent, bottom: insets.bottom + spacing.lg, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={28} color={colors.onAccent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
