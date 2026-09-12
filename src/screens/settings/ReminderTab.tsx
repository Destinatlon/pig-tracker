import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { useSnackbar } from '../../components/Snackbar';
import { OptionPicker } from '../../components/OptionPicker';
import {
  getReminderSettings,
  getWeightReminderSettings,
  setReminderSettings,
  setWeightReminderSettings,
} from '../../db/repositories/settingsRepo';
import { formatClock } from '../../domain/dates';
import { ReminderSettings, WeeklyReminderSettings } from '../../domain/models';
import {
  cancelDailyReminder,
  cancelWeightReminder,
  ensureNotificationPermission,
  scheduleDailyReminder,
  scheduleWeightReminder,
  sendTestNotification,
} from '../../notifications/reminders';
import { useI18n } from '../../i18n';
import { radius, spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

/** Two local reminders: the daily food log and the weekly weighing. Changes apply immediately. */
export function ReminderTab() {
  const { colors } = useTheme();
  const { t, dateNames } = useI18n();
  const snackbar = useSnackbar();
  const reminderText = { title: t('reminder.notificationTitle'), body: t('reminder.notificationBody') };
  const weightText = { title: t('reminder.weightTitle'), body: t('reminder.weightBody') };
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [weight, setWeight] = useState<WeeklyReminderSettings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getReminderSettings()
      .then(setSettings)
      .catch((error) => console.error('Failed to load reminder settings', error));
    getWeightReminderSettings()
      .then(setWeight)
      .catch((error) => console.error('Failed to load weight reminder settings', error));
  }, []);

  /** Asks for permission on the way in; returns false when the user has blocked notifications. */
  const allowNotifications = async (): Promise<boolean> => {
    const allowed = await ensureNotificationPermission();
    if (!allowed) {
      Alert.alert(t('reminder.blockedTitle'), t('reminder.blockedBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('reminder.openSettings'), onPress: () => Linking.openSettings() },
      ]);
    }
    return allowed;
  };

  const apply = async (next: ReminderSettings) => {
    if (busy) return;
    setBusy(true);
    try {
      if (next.enabled) {
        if (!(await allowNotifications())) return;
        await scheduleDailyReminder(next.hour, next.minute, reminderText);
      } else {
        await cancelDailyReminder();
      }
      await setReminderSettings(next);
      setSettings(next);
    } catch (error) {
      Alert.alert(t('reminder.couldNotUpdate'), String(error));
    } finally {
      setBusy(false);
    }
  };

  const applyWeight = async (next: WeeklyReminderSettings) => {
    if (busy) return;
    setBusy(true);
    try {
      if (next.enabled) {
        if (!(await allowNotifications())) return;
        await scheduleWeightReminder(next.weekday, next.hour, next.minute, weightText);
      } else {
        await cancelWeightReminder();
      }
      await setWeightReminderSettings(next);
      setWeight(next);
    } catch (error) {
      Alert.alert(t('reminder.couldNotUpdate'), String(error));
    } finally {
      setBusy(false);
    }
  };

  const pickTime = (current: ReminderSettings, onPicked: (hour: number, minute: number) => void) => {
    const value = new Date();
    value.setHours(current.hour, current.minute, 0, 0);
    DateTimePickerAndroid.open({
      value,
      mode: 'time',
      is24Hour: true,
      onChange: (event, picked) => {
        if (event.type === 'set' && picked) onPicked(picked.getHours(), picked.getMinutes());
      },
    });
  };

  const test = async () => {
    try {
      const allowed = await ensureNotificationPermission();
      if (!allowed) {
        Alert.alert(t('reminder.blockedTitle'), t('reminder.blockedBody'));
        return;
      }
      await sendTestNotification(reminderText);
      snackbar.show({ message: t('reminder.testSent') });
    } catch (error) {
      Alert.alert(t('reminder.couldNotTest'), String(error));
    }
  };

  if (!settings || !weight) return <View style={styles.container} />;

  // expo schedules weekly triggers with 1 = Sunday, which is also how `weekdays` is ordered.
  const weekdayOptions = dateNames.weekdays.map((label, index) => ({ key: String(index + 1), label }));

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.row, { borderBottomColor: colors.divider }]}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{t('reminder.daily')}</Text>
        <Switch
          value={settings.enabled}
          onValueChange={(enabled) => apply({ ...settings, enabled })}
          disabled={busy}
          accessibilityLabel={t('reminder.daily')}
          trackColor={{ true: colors.accent, false: colors.divider }}
        />
      </View>
      <Pressable
        onPress={() => pickTime(settings, (hour, minute) => apply({ ...settings, hour, minute }))}
        accessibilityRole="button"
        accessibilityLabel={t('reminder.timeA11y', { time: formatClock(settings.hour, settings.minute) })}
        accessibilityHint={t('reminder.timeHint')}
        style={({ pressed }) => [styles.row, { borderBottomColor: colors.divider, opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={[styles.label, { color: colors.textPrimary }]}>{t('reminder.time')}</Text>
        <Text style={[styles.value, { color: colors.accent, backgroundColor: colors.surfaceVariant }]}>{formatClock(settings.hour, settings.minute)}</Text>
      </Pressable>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('reminder.hint', { body: reminderText.body })}</Text>
      <Button title={t('reminder.test')} variant="secondary" onPress={test} style={styles.test} />

      <View style={[styles.row, styles.weeklyRow, { borderBottomColor: colors.divider }]}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{t('reminder.weekly')}</Text>
        <Switch
          value={weight.enabled}
          onValueChange={(enabled) => applyWeight({ ...weight, enabled })}
          disabled={busy}
          accessibilityLabel={t('reminder.weekly')}
          trackColor={{ true: colors.accent, false: colors.divider }}
        />
      </View>
      {weight.enabled ? (
        <>
          <View style={styles.picker}>
            <OptionPicker
              label={t('reminder.weeklyDay')}
              placeholder={t('reminder.chooseDay')}
              options={weekdayOptions}
              selected={String(weight.weekday)}
              onSelect={(key) => applyWeight({ ...weight, weekday: Number(key) })}
            />
          </View>
          <Pressable
            onPress={() => pickTime(weight, (hour, minute) => applyWeight({ ...weight, hour, minute }))}
            accessibilityRole="button"
            accessibilityLabel={t('reminder.timeA11y', { time: formatClock(weight.hour, weight.minute) })}
            accessibilityHint={t('reminder.timeHint')}
            style={({ pressed }) => [styles.row, { borderBottomColor: colors.divider, opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.label, { color: colors.textPrimary }]}>{t('reminder.time')}</Text>
            <Text style={[styles.value, { color: colors.accent, backgroundColor: colors.surfaceVariant }]}>
              {formatClock(weight.hour, weight.minute)}
            </Text>
          </Pressable>
        </>
      ) : null}
      <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('reminder.weeklyHint', { body: weightText.body })}</Text>
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
  weeklyRow: { marginTop: spacing.xl, borderTopWidth: StyleSheet.hairlineWidth },
  picker: { marginTop: spacing.md },
});
