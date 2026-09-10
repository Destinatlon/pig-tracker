import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { useSnackbar } from '../../components/Snackbar';
import { getReminderSettings, setReminderSettings } from '../../db/repositories/settingsRepo';
import { formatClock } from '../../domain/dates';
import { ReminderSettings } from '../../domain/models';
import { cancelDailyReminder, ensureNotificationPermission, scheduleDailyReminder, sendTestNotification } from '../../notifications/reminders';
import { radius, spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

/** One local daily reminder: on/off, time, and a test button. Changes apply immediately. */
export function ReminderTab() {
  const { colors } = useTheme();
  const snackbar = useSnackbar();
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getReminderSettings()
      .then(setSettings)
      .catch((error) => console.error('Failed to load reminder settings', error));
  }, []);

  const apply = async (next: ReminderSettings) => {
    if (busy) return;
    setBusy(true);
    try {
      if (next.enabled) {
        const allowed = await ensureNotificationPermission();
        if (!allowed) {
          Alert.alert('Notifications are blocked', 'Allow notifications for Pig Tracker in Android settings to use the reminder.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open settings', onPress: () => Linking.openSettings() },
          ]);
          return;
        }
        await scheduleDailyReminder(next.hour, next.minute);
      } else {
        await cancelDailyReminder();
      }
      await setReminderSettings(next);
      setSettings(next);
    } catch (error) {
      Alert.alert('Could not update reminder', String(error));
    } finally {
      setBusy(false);
    }
  };

  const pickTime = () => {
    if (!settings) return;
    const value = new Date();
    value.setHours(settings.hour, settings.minute, 0, 0);
    DateTimePickerAndroid.open({
      value,
      mode: 'time',
      is24Hour: true,
      onChange: (event, picked) => {
        if (event.type === 'set' && picked) apply({ ...settings, hour: picked.getHours(), minute: picked.getMinutes() });
      },
    });
  };

  const test = async () => {
    try {
      const allowed = await ensureNotificationPermission();
      if (!allowed) {
        Alert.alert('Notifications are blocked', 'Allow notifications for Pig Tracker in Android settings.');
        return;
      }
      await sendTestNotification();
      snackbar.show({ message: 'Test notification sent' });
    } catch (error) {
      Alert.alert('Could not send test notification', String(error));
    }
  };

  if (!settings) return <View style={styles.container} />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.row, { borderBottomColor: colors.divider }]}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>Daily reminder</Text>
        <Switch
          value={settings.enabled}
          onValueChange={(enabled) => apply({ ...settings, enabled })}
          disabled={busy}
          accessibilityLabel="Daily reminder"
          trackColor={{ true: colors.accent, false: colors.divider }}
        />
      </View>
      <Pressable
        onPress={pickTime}
        accessibilityRole="button"
        accessibilityLabel={`Reminder time ${formatClock(settings.hour, settings.minute)}`}
        accessibilityHint="Opens the time picker"
        style={({ pressed }) => [styles.row, { borderBottomColor: colors.divider, opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={[styles.label, { color: colors.textPrimary }]}>Time</Text>
        <Text style={[styles.value, { color: colors.accent, backgroundColor: colors.surfaceVariant }]}>{formatClock(settings.hour, settings.minute)}</Text>
      </Pressable>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>"Don't forget to finish today's food log." is sent every day at this time. No internet needed.</Text>
      <Button title="Test notification" variant="secondary" onPress={test} style={styles.test} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth },
  label: { ...typography.body },
  value: { ...typography.bodyStrong, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, overflow: 'hidden' },
  hint: { ...typography.secondary, marginTop: spacing.md },
  test: { marginTop: spacing.xl, alignSelf: 'flex-start' },
});
