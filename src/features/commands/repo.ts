// Firestore writes for commands. Never awaited by UI code: RN Firebase write promises resolve only
// after the server acks, but the local cache (and every listener) updates immediately, even offline.
import {
  Timestamp,
  arrayUnion,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from '@react-native-firebase/firestore';

import type { EntryFields } from '@/features/entries/types';
import type { AttemptRecord } from '@/features/llm/types';
import { appVersion } from '@/lib/appInfo';
import { logOnFail } from '@/lib/debugLog';
import { db, paths } from '@/lib/firebase';
import { dateWithTimeOf } from '@/lib/time';

import type { CommandPlan } from './status';
import type { Command } from './types';

export function createCommand(
  uid: string,
  transcript: string,
  meta: Omit<Command['meta'], 'appVersion'>,
): string {
  const ref = doc(paths.commands(uid));
  const now = Timestamp.now();
  const data: Command = {
    id: ref.id,
    transcript,
    llmAttempts: [],
    status: 'pending',
    statusReason: null,
    attemptCount: 0,
    nextRetryAt: null,
    entryIds: [],
    createdAt: now,
    syncedAt: serverTimestamp() as unknown as Timestamp,
    updatedAt: now,
    dismissedAt: null,
    meta: { ...meta, appVersion },
  };
  setDoc(ref, data).catch(logOnFail('create command'));
  return ref.id;
}

/**
 * One batched write: append attempts, set the status, create entries with deterministic ids
 * (`${commandId}_${index}`), so a repeated write can never create duplicates.
 */
export function commitProcessingResult(uid: string, cmd: Command, attempts: AttemptRecord[], plan: CommandPlan) {
  const now = Timestamp.now();
  const createdAt = cmd.createdAt.toDate();
  const batch = writeBatch(db);

  const entryIds = plan.entries.map((_, i) => `${cmd.id}_${i}`);
  plan.entries.forEach((e, i) => {
    const fields: EntryFields = {
      type: e.type,
      direction: e.direction,
      amount: e.amount,
      description: e.description,
      source: e.source,
      category: e.category,
      spentAt: e.spentAt ? Timestamp.fromDate(dateWithTimeOf(e.spentAt, createdAt)) : cmd.createdAt,
    };
    batch.set(paths.entry(uid, entryIds[i]), {
      id: entryIds[i],
      commandId: cmd.id,
      ...fields,
      currency: 'PKR',
      needsReview: e.needsReview,
      reviewReason: e.reviewReason,
      confidence: e.confidence,
      edited: false,
      editedAt: null,
      original: fields,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    });
  });

  batch.update(paths.command(uid, cmd.id), {
    llmAttempts: [
      ...cmd.llmAttempts,
      ...attempts.map((a) => ({ ...a, at: Timestamp.fromDate(new Date(a.at)) })),
    ],
    status: plan.status,
    statusReason: plan.statusReason,
    attemptCount: plan.attemptCount,
    nextRetryAt: plan.nextRetryAt ? Timestamp.fromMillis(plan.nextRetryAt) : null,
    entryIds,
    updatedAt: now,
  });

  batch.commit().catch(logOnFail('commit processing result'));
}

/** Retry button, or automatic once after a key/model change: back to the normal queue. */
export function requeueCommand(uid: string, id: string) {
  updateDoc(paths.command(uid, id), {
    status: 'pending',
    statusReason: null,
    attemptCount: 0,
    nextRetryAt: null,
    updatedAt: Timestamp.now(),
  }).catch(logOnFail('requeue command'));
}

/** Hide a failed / entry-less row. Nothing is deleted (DECISIONS #7). */
export function dismissCommand(uid: string, id: string) {
  const now = Timestamp.now();
  updateDoc(paths.command(uid, id), { dismissedAt: now, updatedAt: now }).catch(logOnFail('dismiss command'));
}

/** "Fix manually": an entry typed by the user, linked to the command. */
export function createManualEntry(uid: string, cmd: Command, fields: EntryFields) {
  const id = `${cmd.id}_m${Date.now()}`;
  const now = Timestamp.now();
  const batch = writeBatch(db);
  batch.set(paths.entry(uid, id), {
    id,
    commandId: cmd.id,
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
  });
  batch.update(paths.command(uid, cmd.id), { entryIds: arrayUnion(id), updatedAt: now });
  batch.commit().catch(logOnFail('create manual entry'));
}
