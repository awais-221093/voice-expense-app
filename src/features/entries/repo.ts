import { Timestamp, doc, setDoc, updateDoc, writeBatch } from '@react-native-firebase/firestore';

import { logOnFail } from '@/lib/debugLog';
import { db, paths } from '@/lib/firebase';

import type { Entry, EntryFields } from './types';

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

/** "Add again today": a copy of the entry dated now. Typed by the user, so no command and no original. */
export function repeatEntry(uid: string, entry: Entry): string {
  const ref = doc(paths.entries(uid));
  const now = Timestamp.now();
  const fields: EntryFields = {
    type: entry.type,
    direction: entry.direction,
    amount: entry.amount,
    description: entry.description,
    source: entry.source,
    category: entry.category,
    spentAt: now,
  };
  setDoc(ref, {
    id: ref.id,
    commandId: null,
    ...fields,
    currency: 'PKR',
    needsReview: false,
    reviewReason: null,
    confidence: null,
    edited: true,
    editedAt: now,
    original: null,
    deleted: false,
    createdAt: now,
    updatedAt: now,
  }).catch(logOnFail('repeat entry'));
  return ref.id;
}
