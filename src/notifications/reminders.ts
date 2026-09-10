import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getSetting, setSetting, SETTING_KEYS } from '../db/repositories/settingsRepo';

const CHANNEL_ID = 'daily-reminder';
const REMINDER_TITLE = 'Pig Tracker';
const REMINDER_BODY = "Don't forget to finish today's food log.";

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
export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  await ensureChannel();
  await cancelDailyReminder();
  const id = await Notifications.scheduleNotificationAsync({
    content: { title: REMINDER_TITLE, body: REMINDER_BODY },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL_ID },
  });
  await setSetting(SETTING_KEYS.reminderNotificationId, id);
}

/** Fires the reminder text immediately so the user can check it works. */
export async function sendTestNotification(): Promise<void> {
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title: REMINDER_TITLE, body: REMINDER_BODY },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: CHANNEL_ID },
  });
}
