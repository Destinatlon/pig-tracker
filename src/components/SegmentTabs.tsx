import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

interface Props<T extends string> {
  tabs: readonly { key: T; label: string }[];
  active: T;
  onChange: (key: T) => void;
}

/** Fixed top tabs (Manual | Saved, Goals | Reminder | App). */
export function SegmentTabs<T extends string>({ tabs, active, onChange }: Props<T>) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            style={[styles.tab, { borderBottomColor: selected ? colors.accent : 'transparent' }]}
          >
            <Text style={[styles.label, { color: selected ? colors.accent : colors.textSecondary }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, paddingHorizontal: spacing.sm },
  label: { ...typography.bodyStrong },
});
