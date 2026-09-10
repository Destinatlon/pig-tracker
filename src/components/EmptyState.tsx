import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  message: string;
  children?: React.ReactNode;
}

export function EmptyState({ message, children }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: spacing.xl * 2, paddingHorizontal: spacing.xl },
  message: { ...typography.body, textAlign: 'center', marginBottom: spacing.lg },
  actions: { width: '100%', gap: spacing.sm, maxWidth: 320 },
});
