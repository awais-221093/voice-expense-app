import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

import type { Direction, EntryType } from '@/features/llm/types';

type Timestamp = FirebaseFirestoreTypes.Timestamp;

/** The fields a user (or the LLM) can set. */
export interface EntryFields {
  type: EntryType;
  direction: Direction;
  amount: number | null;
  description: string | null;
  source: string | null;
  category: string | null;
  spentAt: Timestamp;
}

/** users/{uid}/entries/{id} — see docs/DATA_MODEL.md */
export interface Entry extends EntryFields {
  id: string;
  commandId: string | null;
  currency: 'PKR';
  needsReview: boolean;
  reviewReason: string | null;
  confidence: number | null;
  edited: boolean;
  editedAt: Timestamp | null;
  original: EntryFields | null;
  deleted: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
