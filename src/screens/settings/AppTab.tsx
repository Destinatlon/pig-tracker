import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ThemePreference } from '../../domain/models';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

const THEMES: { key: ThemePreference; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

export function AppTab() {
  const { colors, preference, setPreference } = useTheme();
  const version = Constants.expoConfig?.version ?? 'unknown';
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.section, { color: colors.textSecondary }]}>Theme</Text>
      {THEMES.map((theme) => {
        const selected = theme.key === preference;
        return (
          <Pressable
            key={theme.key}
            onPress={() => setPreference(theme.key)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`${theme.label} theme`}
            style={({ pressed }) => [styles.row, { borderBottomColor: colors.divider, opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.label, { color: colors.textPrimary }]}>{theme.label}</Text>
            <MaterialCommunityIcons name={selected ? 'radiobox-marked' : 'radiobox-blank'} size={22} color={selected ? colors.accent : colors.textSecondary} />
          </Pressable>
        );
      })}
      <Text style={[styles.section, styles.sectionSpaced, { color: colors.textSecondary }]}>About</Text>
      <View style={[styles.row, { borderBottomColor: colors.divider }]}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>App version</Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{version}</Text>
      </View>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>All data stays on this device. No account, no internet required.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg },
  section: { ...typography.label, textTransform: 'uppercase', marginBottom: spacing.xs },
  sectionSpaced: { marginTop: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth },
  label: { ...typography.body },
  hint: { ...typography.secondary, marginTop: spacing.md },
});
