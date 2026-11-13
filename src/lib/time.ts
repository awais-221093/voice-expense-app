// All "today", "month" and relative-date logic uses the device time zone (plan §9).

export const deviceTimeZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date, "YYYY-MM-DD". */
export function localISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local time with offset, e.g. "2026-11-13T20:21:00+05:00" (what the LLM prompt expects). */
export function localISOWithOffset(d: Date): string {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  return `${localISODate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

export function startOfDay(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** A "YYYY-MM-DD" date said by the user, at the same clock time as `timeOf` (keeps ordering natural). */
export function dateWithTimeOf(isoDate: string, timeOf: Date): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d, timeOf.getHours(), timeOf.getMinutes(), timeOf.getSeconds());
}

export function formatTime(d: Date): string {
  return `${pad(d.getHours() % 12 || 12)}:${pad(d.getMinutes())} ${d.getHours() < 12 ? 'am' : 'pm'}`;
}

export function formatDayHeading(d: Date, now = new Date()): string {
  const days = Math.round((startOfDay(now).getTime() - startOfDay(d).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
