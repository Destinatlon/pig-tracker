import { GoalProfile, profileFromJson, profileToJson } from '../../domain/goals/profile';
import { ReminderSettings, ThemePreference } from '../../domain/models';
import { getDb } from '../database';

export const SETTING_KEYS = {
  theme: 'theme',
  language: 'language',
  reminderEnabled: 'reminder_enabled',
  reminderTime: 'reminder_time',
  reminderNotificationId: 'reminder_notification_id',
  goalProfile: 'goal_profile',
} as const;

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string | null }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string | null): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [
    key,
    value,
  ]);
}

export async function getThemePreference(): Promise<ThemePreference> {
  const value = await getSetting(SETTING_KEYS.theme);
  return value === 'light' || value === 'dark' ? value : 'system';
}

export async function setThemePreference(preference: ThemePreference): Promise<void> {
  await setSetting(SETTING_KEYS.theme, preference);
}

export type LanguagePreference = 'system' | 'en' | 'uk';

export async function getLanguagePreference(): Promise<LanguagePreference> {
  const value = await getSetting(SETTING_KEYS.language);
  return value === 'en' || value === 'uk' ? value : 'system';
}

export async function setLanguagePreference(preference: LanguagePreference): Promise<void> {
  await setSetting(SETTING_KEYS.language, preference);
}

const DEFAULT_REMINDER: ReminderSettings = { enabled: false, hour: 21, minute: 0 };

export async function getReminderSettings(): Promise<ReminderSettings> {
  const [enabled, time] = await Promise.all([getSetting(SETTING_KEYS.reminderEnabled), getSetting(SETTING_KEYS.reminderTime)]);
  const match = time ? /^(\d{1,2}):(\d{2})$/.exec(time) : null;
  return {
    enabled: enabled === '1',
    hour: match ? Number(match[1]) : DEFAULT_REMINDER.hour,
    minute: match ? Number(match[2]) : DEFAULT_REMINDER.minute,
  };
}

export async function setReminderSettings(settings: ReminderSettings): Promise<void> {
  await setSetting(SETTING_KEYS.reminderEnabled, settings.enabled ? '1' : '0');
  await setSetting(SETTING_KEYS.reminderTime, `${settings.hour}:${settings.minute < 10 ? '0' : ''}${settings.minute}`);
}

/** Current estimation profile (age, sex, height, weight, activity, goal). Missing fields are null. */
export async function getGoalProfile(): Promise<GoalProfile> {
  return profileFromJson(await getSetting(SETTING_KEYS.goalProfile));
}

export async function setGoalProfile(profile: GoalProfile): Promise<void> {
  await setSetting(SETTING_KEYS.goalProfile, profileToJson(profile));
}
