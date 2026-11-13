import { Timestamp, limit, orderBy, query, where } from '@react-native-firebase/firestore';

import { paths } from '@/lib/firebase';
import { useCollection } from '@/lib/useCollection';
import { startOfDay, startOfMonth } from '@/lib/time';

import type { Entry } from './types';

const RECENT_LIMIT = 100;

/** Latest non-deleted entries for the list. Index: deleted ASC, spentAt DESC. */
export function useRecentEntries(uid: string | null) {
  return useCollection<Entry>(`recent:${uid}`, () =>
    uid
      ? query(paths.entries(uid), where('deleted', '==', false), orderBy('spentAt', 'desc'), limit(RECENT_LIMIT))
      : null,
  );
}

/** All non-deleted entries this month, for totals. `monthKey` re-subscribes when the month changes. */
export function useMonthEntries(uid: string | null, monthStart: Date) {
  return useCollection<Entry>(`month:${uid}:${monthStart.getTime()}`, () =>
    uid
      ? query(
          paths.entries(uid),
          where('deleted', '==', false),
          where('spentAt', '>=', Timestamp.fromDate(monthStart)),
          orderBy('spentAt', 'desc'),
        )
      : null,
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
