import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { FAB_SIZE } from './Fab';

export interface SnackbarOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

interface SnackbarApi {
  show: (options: SnackbarOptions) => void;
  hide: () => void;
}

const SnackbarContext = createContext<SnackbarApi | null>(null);

interface ActiveSnackbar extends SnackbarOptions {
  key: number;
}

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActiveSnackbar | null>(null);
  const counter = useRef(0);

  const hide = useCallback(() => setActive(null), []);
  const show = useCallback((options: SnackbarOptions) => {
    counter.current += 1;
    setActive({ ...options, key: counter.current });
  }, []);

  const api = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <SnackbarContext.Provider value={api}>
      {children}
      {active ? <SnackbarView snackbar={active} onDismiss={hide} /> : null}
    </SnackbarContext.Provider>
  );
}

function SnackbarView({ snackbar, onDismiss }: { snackbar: ActiveSnackbar; onDismiss: () => void }) {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const duration = snackbar.durationMs ?? (snackbar.actionLabel ? 6000 : 3500);

  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [snackbar.key, duration, onDismiss]);

  const background = mode === 'dark' ? '#E6E9EE' : '#2B3138';
  const foreground = mode === 'dark' ? '#1A1F26' : '#FFFFFF';
  const actionColor = mode === 'dark' ? '#2F6BE0' : '#9CC0FF';

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { bottom: insets.bottom + spacing.lg, right: spacing.lg + FAB_SIZE + spacing.sm }]}
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.bar, { backgroundColor: background }]}>
        <Text style={[styles.message, { color: foreground }]} numberOfLines={2}>
          {snackbar.message}
        </Text>
        {snackbar.actionLabel ? (
          <Pressable
            onPress={() => {
              onDismiss();
              snackbar.onAction?.();
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={snackbar.actionLabel}
            style={styles.action}
          >
            <Text style={[styles.actionLabel, { color: actionColor }]}>{snackbar.actionLabel.toUpperCase()}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={{ height: 0, backgroundColor: colors.accent }} />
    </View>
  );
}

export function useSnackbar(): SnackbarApi {
  const api = useContext(SnackbarContext);
  if (!api) throw new Error('useSnackbar must be used inside SnackbarProvider');
  return api;
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: spacing.lg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    minHeight: 48,
    elevation: 6,
  },
  message: { ...typography.body, flex: 1, paddingVertical: spacing.sm },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm, marginLeft: spacing.xs },
  actionLabel: { ...typography.label, fontWeight: '700' },
});
