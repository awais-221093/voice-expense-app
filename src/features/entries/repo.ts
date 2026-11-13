import { Timestamp, updateDoc, writeBatch } from '@react-native-firebase/firestore';

import { logOnFail } from '@/lib/debugLog';
import { db, paths } from '@/lib/firebase';

import type { EntryFields } from './types';

/** User edit: only current fields change; `original` is never touched (rules enforce it too). */
export function updateEntry(uid: string, id: string, fields: EntryFields) {
  const now = Timestamp.now();
  updateDoc(paths.entry(uid, id), {
    ...fields,
    direction: fields.type === 'expense' ? 'outflow' : fields.direction,
    // A human looked at it, so it no longer needs review.
    needsReview: false,
    edited: true,
    editedAt: now,
    updatedAt: now,
  }).catch(logOnFail('update entry'));
}

/** Soft delete / restore (Undo). No hard deletes anywhere. */
export function setEntriesDeleted(uid: string, ids: string[], deleted: boolean) {
  if (!ids.length) return;
  const now = Timestamp.now();
  const batch = writeBatch(db);
  ids.forEach((id) => batch.update(paths.entry(uid, id), { deleted, updatedAt: now }));
  batch.commit().catch(logOnFail(deleted ? 'delete entries' : 'restore entries'));
}
