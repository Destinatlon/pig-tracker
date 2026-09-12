import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  getReminderSettings,
  getSetting,
  getWeightReminderSettings,
  setSetting,
  SETTING_KEYS,
} from '../db/repositories/settingsRepo';

const CHANNEL_ID = 'daily-reminder';
const WEIGHT_CHANNEL_ID = 'weekly-weight-reminder';

export interface ReminderText {
  title: string;
  body: string;
}

let handlerInstalled = false;

/** Shows notifications even while the app is in the foreground (needed for the test button). */
export function installNotificationHandler(): void {
  if (handlerInstalled) return;
  handlerInstalled = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Daily reminder',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'Reminds you to finish your daily food log.',
  });
}

/** Its own channel so the weekly weighing can be silenced without losing the daily log reminder. */
async function ensureWeightChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(WEIGHT_CHANNEL_ID, {
    name: 'Weekly weight check-in',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'Reminds you to weigh yourself once a week.',
  });
}

/** Returns true when notifications are allowed (asking the user if needed). */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function cancelDailyReminder(): Promise<void> {
  const existingId = await getSetting(SETTING_KEYS.reminderNotificationId);
  if (existingId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(existingId);
    } catch {
      // Already gone; nothing to clean up.
    }
    await setSetting(SETTING_KEYS.reminderNotificationId, null);
  }
}

/** Replaces any existing daily reminder with one at the given local time. */
export async function scheduleDailyReminder(hour: number, minute: number, text: ReminderText): Promise<void> {
  await ensureChannel();
  await cancelDailyReminder();
  const id = await Notifications.scheduleNotificationAsync({
    content: { title: text.title, body: text.body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL_ID },
  });
  await setSetting(SETTING_KEYS.reminderNotificationId, id);
}

/** Fires the reminder text immediately so the user can check it works. */
export async function sendTestNotification(text: ReminderText): Promise<void> {
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title: text.title, body: text.body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: CHANNEL_ID },
  });
}

/** Re-schedules the reminder with new text (e.g. after a language change) if it is enabled. */
export async function rescheduleReminderIfEnabled(text: ReminderText): Promise<void> {
  const settings = await getReminderSettings();
  if (settings.enabled) await scheduleDailyReminder(settings.hour, settings.minute, text);
}

export async function cancelWeightReminder(): Promise<void> {
  const existingId = await getSetting(SETTING_KEYS.weightReminderNotificationId);
  if (existingId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(existingId);
    } catch {
      // Already gone; nothing to clean up.
    }
    await setSetting(SETTING_KEYS.weightReminderNotificationId, null);
  }
}

/** Replaces any existing weekly weighing reminder with one on the given weekday and time. */
export async function scheduleWeightReminder(weekday: number, hour: number, minute: number, text: ReminderText): Promise<void> {
  await ensureWeightChannel();
  await cancelWeightReminder();
  const id = await Notifications.scheduleNotificationAsync({
    content: { title: text.title, body: text.body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday, hour, minute, channelId: WEIGHT_CHANNEL_ID },
  });
  await setSetting(SETTING_KEYS.weightReminderNotificationId, id);
}

/** Re-schedules the weekly reminder with new text (e.g. after a language change) if it is enabled. */
export async function rescheduleWeightReminderIfEnabled(text: ReminderText): Promise<void> {
  const settings = await getWeightReminderSettings();
  if (settings.enabled) await scheduleWeightReminder(settings.weekday, settings.hour, settings.minute, text);
}
