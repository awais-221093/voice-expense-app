import type { Timestamp } from '@react-native-firebase/firestore';

import type { ProviderId } from '@/features/llm/types';

export type CommandStatus = 'pending' | 'ok' | 'needs_review' | 'failed';

export interface LlmAttempt {
  at: Timestamp;
  provider: ProviderId;
  model: string;
  rawText: string | null;
  error: string | null;
}

/** users/{uid}/commands/{id} — see docs/DATA_MODEL.md */
export interface Command {
  id: string;
  transcript: string;
  llmAttempts: LlmAttempt[];
  status: CommandStatus;
  statusReason: string | null;
  attemptCount: number;
  nextRetryAt: Timestamp | null;
  entryIds: string[];
  createdAt: Timestamp;
  syncedAt: Timestamp | null;
  updatedAt: Timestamp;
  dismissedAt: Timestamp | null;
  meta: {
    sttEngine: 'on-device' | 'online';
    locale: string;
    recordingMode: 'hold' | 'tap';
    appVersion: string;
  };
}
