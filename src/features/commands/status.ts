// Pure status rules (plan §4 "Status lifecycle"). No Firebase imports, so it is easy to test.
import type { ExtractionOutcome, ParsedEntry } from '@/features/llm/types';

import type { CommandStatus } from './types';

/** Wait after the 1st, 2nd, 3rd, 4th transient failure. The 5th failure gives up. */
export const BACKOFF_MS = [30_000, 120_000, 600_000, 3_600_000];
export const MAX_ATTEMPTS = 5;

export interface EntryDraft extends ParsedEntry {
  needsReview: boolean;
  reviewReason: string | null;
}

export interface CommandPlan {
  status: CommandStatus;
  statusReason: string | null;
  attemptCount: number;
  /** epoch ms, or null when no automatic retry is planned. */
  nextRetryAt: number | null;
  entries: EntryDraft[];
}

export function planCommandResult(
  outcome: ExtractionOutcome,
  prevAttempts: number,
  now: number,
): CommandPlan {
  const attemptCount = prevAttempts + 1;
  const base = { attemptCount, nextRetryAt: null, entries: [] as EntryDraft[] };

  switch (outcome.kind) {
    case 'parsed': {
      const entries = outcome.entries.map((e) => {
        const reasons = [...e.issues, ...(outcome.notes ? [outcome.notes] : [])];
        return { ...e, needsReview: reasons.length > 0, reviewReason: reasons.join('; ') || null };
      });
      if (!entries.length) {
        return {
          ...base,
          status: 'needs_review',
          statusReason: outcome.notes ?? 'no entries found',
        };
      }
      const flagged = entries.find((e) => e.needsReview);
      return {
        ...base,
        entries,
        status: flagged ? 'needs_review' : 'ok',
        statusReason: flagged?.reviewReason ?? null,
      };
    }
    case 'invalid_json':
      return { ...base, status: 'needs_review', statusReason: outcome.reason };
    case 'fatal':
      return { ...base, status: 'failed', statusReason: outcome.reason };
    case 'transient':
      if (attemptCount >= MAX_ATTEMPTS) {
        return {
          ...base,
          status: 'failed',
          statusReason: `gave up after ${attemptCount} tries: ${outcome.reason}`,
        };
      }
      return {
        ...base,
        status: 'pending',
        statusReason: outcome.reason,
        nextRetryAt: now + BACKOFF_MS[attemptCount - 1],
      };
  }
}
