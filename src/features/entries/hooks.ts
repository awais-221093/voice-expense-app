import { Timestamp, limit, orderBy, query, where } from '@react-native-firebase/firestore';

import { paths } from '@/lib/firebase';
import { addMonths, startOfDay, startOfMonth } from '@/lib/time';
import { useCollection } from '@/lib/useCollection';

import type { Entry } from './types';

/** Latest non-deleted entries. Index: deleted ASC, spentAt DESC. */
export function useRecentEntries(uid: string | null, max = 100) {
  return useCollection<Entry>(`recent:${uid}:${max}`, () =>
    uid
      ? query(
          paths.entries(uid),
          where('deleted', '==', false),
          orderBy('spentAt', 'desc'),
          limit(max),
        )
      : null,
  );
}

/** Non-deleted entries in the calendar month starting at `monthStart` (same index). */
export function useMonthEntries(uid: string | null, monthStart: Date) {
  return useCollection<Entry>(`month:${uid}:${monthStart.getTime()}`, () =>
    uid
      ? query(
          paths.entries(uid),
          where('deleted', '==', false),
          where('spentAt', '>=', Timestamp.fromDate(monthStart)),
          where('spentAt', '<', Timestamp.fromDate(addMonths(monthStart, 1))),
          orderBy('spentAt', 'desc'),
        )
      : null,
  );
}

/** Entries created from one command — drives the result card. Single-field index only. */
export function useCommandEntries(uid: string, commandId: string | null) {
  return useCollection<Entry>(`cmd:${uid}:${commandId}`, () =>
    commandId ? query(paths.entries(uid), where('commandId', '==', commandId)) : null,
  );
}

/** Totals count only `expense` entries (plan §6.1 DECISION). */
export function expenseTotals(entries: Entry[], now = new Date()) {
  const dayStart = startOfDay(now).getTime();
  const monthStart = startOfMonth(now).getTime();
  let today = 0;
  let month = 0;
  for (const e of entries) {
    if (e.type !== 'expense' || e.amount === null) continue;
    const t = e.spentAt.toMillis();
    if (t >= monthStart) month += e.amount;
    if (t >= dayStart) today += e.amount;
  }
  return { today, month };
}
