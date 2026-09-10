import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { spacing, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { BottomSheet } from './BottomSheet';
import { IconName } from './IconButton';

export interface MenuItem {
  key: string;
  label: string;
  icon?: IconName;
  destructive?: boolean;
  onPress: () => void;
}

interface Props {
  visible: boolean;
  onRequestClose: () => void;
  items: MenuItem[];
  title?: string;
}

/** Overflow (⋮) menu rendered as a small bottom sheet. */
export function MenuSheet({ visible, onRequestClose, items, title }: Props) {
  const { colors } = useTheme();
  return (
    <BottomSheet visible={visible} onRequestClose={onRequestClose} title={title}>
      {items.map((item) => (
        <Pressable
          key={item.key}
          onPress={() => {
            onRequestClose();
            item.onPress();
          }}
          accessibilityRole="menuitem"
          accessibilityLabel={item.label}
          style={({ pressed }) => [styles.item, { opacity: pressed ? 0.6 : 1 }]}
        >
          {item.icon ? (
            <MaterialCommunityIcons name={item.icon} size={22} color={item.destructive ? colors.danger : colors.textSecondary} style={styles.icon} />
          ) : null}
          <Text style={[styles.label, { color: item.destructive ? colors.danger : colors.textPrimary }]}>{item.label}</Text>
        </Pressable>
      ))}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  icon: { marginRight: spacing.md },
  label: { ...typography.body },
});
