import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SnackbarProvider } from './src/components/Snackbar';
import { getDb } from './src/db/database';
import { getLanguagePreference, getThemePreference, LanguagePreference } from './src/db/repositories/settingsRepo';
import { ThemePreference } from './src/domain/models';
import { I18nProvider } from './src/i18n';
import { RootNavigator } from './src/navigation/RootNavigator';
import { installNotificationHandler } from './src/notifications/reminders';
import { LibrarySaveProvider } from './src/screens/add/LibrarySaveProvider';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';

type Boot = { status: 'loading' } | { status: 'ready'; theme: ThemePreference; language: LanguagePreference } | { status: 'error'; message: string };

export default function App() {
  const [boot, setBoot] = useState<Boot>({ status: 'loading' });

  useEffect(() => {
    installNotificationHandler();
    getDb()
      .then(() => Promise.all([getThemePreference(), getLanguagePreference()]))
      .then(([theme, language]) => setBoot({ status: 'ready', theme, language }))
      .catch((error) => setBoot({ status: 'error', message: String(error) }));
  }, []);

  if (boot.status === 'loading') return <View style={styles.splash} />;
  if (boot.status === 'error') {
    return (
      <View style={styles.error}>
        <Text style={styles.errorTitle}>Could not open the local database / Не вдалося відкрити локальну базу даних</Text>
        <Text style={styles.errorText}>{boot.message}</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <I18nProvider initialPreference={boot.language}>
          <ThemeProvider initialPreference={boot.theme}>
            <ThemedApp />
          </ThemeProvider>
        </I18nProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedApp() {
  const { colors, mode } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <SnackbarProvider>
        <LibrarySaveProvider>
          <RootNavigator />
        </LibrarySaveProvider>
      </SnackbarProvider>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  splash: { flex: 1, backgroundColor: '#F4F6F8' },
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F4F6F8' },
  errorTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8, color: '#1A1F26' },
  errorText: { fontSize: 14, color: '#5C6774', textAlign: 'center' },
});
