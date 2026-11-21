// Pure scheduling rules for the daily reminder (IDEAS I6). No Expo imports, so it is easy to test.

/** How many days ahead are kept scheduled, so the reminder still fires if the app isn't opened. */
export const DAYS_AHEAD = 7;

export interface ReminderPrefs {
  enabled: boolean;
  /** Local hour, 0–23. */
  hour: number;
}

export const DEFAULT_REMINDER: ReminderPrefs = { enabled: false, hour: 21 };

/**
 * The reminder times to schedule. Local notifications can't check "was anything logged today?"
 * when they fire, so instead today is skipped once something is logged (or the hour has passed),
 * and the plan is rebuilt whenever that changes.
 */
export function planReminders(prefs: ReminderPrefs, loggedToday: boolean, now: Date): Date[] {
  if (!prefs.enabled) return [];
  const dates: Date[] = [];
  for (let day = 0; day < DAYS_AHEAD; day++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, prefs.hour);
    if (day === 0 && (loggedToday || at <= now)) continue;
    dates.push(at);
  }
  return dates;
}
