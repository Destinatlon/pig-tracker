import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing, typography } from '../theme/tokens';
import { useI18n } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  visible: boolean;
  /** Called on Android Back and backdrop tap. The caller decides whether closing is allowed. */
  onRequestClose: () => void;
  title?: string;
  /** Optional element rendered at the right of the title (e.g. an overflow menu button). */
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  /** Fixed action bar below the scrolling content. */
  footer?: React.ReactNode;
}

/** Modal-backed bottom sheet. Content scrolls; the footer stays fixed above the keyboard. */
export function BottomSheet({ visible, onRequestClose, title, headerRight, children, footer }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onRequestClose} statusBarTranslucent navigationBarTranslucent>
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.backdrop }]}
          onPress={onRequestClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.avoider} pointerEvents="box-none">
          <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom }]}>
            <View style={[styles.handle, { backgroundColor: colors.divider }]} />
            {title || headerRight ? (
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
                  {title}
                </Text>
                {headerRight}
              </View>
            ) : null}
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.content}
              style={styles.scroll}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
            {footer ? <View style={[styles.footer, { borderTopColor: colors.divider }]}>{footer}</View> : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  avoider: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '92%',
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginTop: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  title: { ...typography.title, flex: 1 },
  scroll: { flexGrow: 0 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
