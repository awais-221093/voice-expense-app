import { useEffect } from 'react';

import { useLatestEntry } from '@/features/entries/hooks';
import { localISODate } from '@/lib/time';
import { useNow } from '@/lib/useNow';

import { loadReminderPrefs, syncReminders, useReminderPrefs } from './notifications';
import { planReminders } from './plan';

/**
 * Keeps the next week of reminders scheduled. Re-plans when the prefs change, when the first
 * entry of the day is logged (today's reminder is dropped), and at midnight. Mount once.
 */
export function useReminderRuntime(uid: string) {
  const { enabled, hour, loaded } = useReminderPrefs();
  const latest = useLatestEntry(uid);
  const today = localISODate(useNow());
  const last = latest.data[0];
  const loggedToday = !!last && localISODate(last.createdAt.toDate()) === today;

  useEffect(() => loadReminderPrefs(), []);

  useEffect(() => {
    if (!loaded || latest.loading) return;
    void syncReminders(planReminders({ enabled, hour }, loggedToday, new Date()));
  }, [loaded, latest.loading, enabled, hour, loggedToday, today]);
}
