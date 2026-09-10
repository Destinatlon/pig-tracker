import { DrawerContentComponentProps, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '../theme/tokens';
import { useI18n } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';

const logo = require('../../assets/logo-rounded.png');

/** Drawer with the app logo above the standard destination list. */
export function DrawerContent(props: DrawerContentComponentProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  return (
    <DrawerContentScrollView {...props}>
      <View style={[styles.brand, { borderBottomColor: colors.divider }]}>
        <Image source={logo} style={styles.logo} accessibilityIgnoresInvertColors accessibilityLabel={t('nav.appName')} />
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('nav.appName')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('nav.tagline')}</Text>
        </View>
      </View>
      <DrawerItemList {...props} />
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    marginBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logo: { width: 56, height: 56, borderRadius: 14 },
  title: { ...typography.title },
  subtitle: { ...typography.secondary },
});
