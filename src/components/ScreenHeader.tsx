import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  left?: React.ReactNode;
  title?: string;
  /** Replaces the plain title when custom centre content is needed (e.g. the Day date control). */
  center?: React.ReactNode;
  right?: React.ReactNode;
  bottom?: React.ReactNode;
}

export function ScreenHeader({ left, title, center, right, bottom }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
      <View style={styles.row}>
        <View style={styles.side}>{left}</View>
        <View style={styles.center}>
          {center ?? (
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {title}
            </Text>
          )}
        </View>
        <View style={[styles.side, styles.right]}>{right}</View>
      </View>
      {bottom}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: spacing.xs },
  side: { minWidth: 48, flexDirection: 'row', alignItems: 'center' },
  right: { justifyContent: 'flex-end' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title },
});
