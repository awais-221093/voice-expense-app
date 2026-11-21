// Thin wrapper over expo-notifications for the daily reminder. Failures are logged, never thrown:
// a missed reminder must not break the app.
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { log } from '@/lib/debugLog';
import { localISODate } from '@/lib/time';

import { DEFAULT_REMINDER, type ReminderPrefs } from './plan';

const CHANNEL_ID = 'daily-reminder';
const ID_PREFIX = 'reminder-';
/** Device-local preference (SecureStore), not synced: reminders belong to this phone. */
const PREFS_KEY = 'daily_reminder';

/** Show the reminder even if it fires while the app is open. Call once at startup. */
export function initNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/** Android 13+ only shows the permission prompt once a channel exists, so create it first. */
export async function ensurePermission(): Promise<boolean> {
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Daily reminder',
    // Re-exported via `export *`, which eslint-plugin-import can't follow; tsc confirms it exists.
    // eslint-disable-next-line import/namespace
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Replaces every scheduled reminder with `dates` (other notifications are left alone). */
export async function syncReminders(dates: Date[]) {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(ID_PREFIX))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
    if (!dates.length || !(await Notifications.getPermissionsAsync()).granted) return;
    await Promise.all(
      dates.map((date) =>
        Notifications.scheduleNotificationAsync({
          identifier: `${ID_PREFIX}${localISODate(date)}`,
          content: {
            title: 'Nothing logged today',
            body: 'Hold the mic and say what you spent, e.g. "200 for petrol from cash".',
          },
          // 'bestEffort' (default) needs no exact-alarm permission; a few minutes late is fine.
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date,
            channelId: CHANNEL_ID,
          },
        }),
      ),
    );
  } catch (e) {
    log.error('sync reminders failed', e);
  }
}

interface ReminderState extends ReminderPrefs {
  loaded: boolean;
  set: (prefs: ReminderPrefs) => void;
}

export const useReminderPrefs = create<ReminderState>()((set) => ({
  ...DEFAULT_REMINDER,
  loaded: false,
  set: (prefs) => {
    set(prefs);
    SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(prefs)).catch((e) =>
      log.error('save reminder prefs failed', e),
    );
  },
}));

export function loadReminderPrefs() {
  SecureStore.getItemAsync(PREFS_KEY).then(
    (raw) => {
      const saved = raw ? (JSON.parse(raw) as Partial<ReminderPrefs>) : {};
      useReminderPrefs.setState({ ...DEFAULT_REMINDER, ...saved, loaded: true });
    },
    (e) => {
      log.error('load reminder prefs failed', e);
      useReminderPrefs.setState({ loaded: true });
    },
  );
}
