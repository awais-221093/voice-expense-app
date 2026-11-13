import { limit, orderBy, query, where } from '@react-native-firebase/firestore';

import { paths } from '@/lib/firebase';
import { useCollection } from '@/lib/useCollection';

import type { Command } from './types';

/**
 * Commands that have no entries and were not dismissed: pending, failed, and entry-less
 * needs_review. These show as placeholder rows and feed the processing queue.
 * Index: entryIds ASC, dismissedAt ASC, createdAt DESC.
 */
export function useOpenCommands(uid: string | null) {
  return useCollection<Command>(`open:${uid}`, () =>
    uid
      ? query(
          paths.commands(uid),
          where('entryIds', '==', []),
          where('dismissedAt', '==', null),
          orderBy('createdAt', 'desc'),
          limit(50),
        )
      : null,
  );
}
