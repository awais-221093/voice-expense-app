// Shared between the app and scripts/llm-eval. No React Native imports, relative imports only.

export const ENTRY_TYPES = ['expense', 'savings', 'loan', 'committee', 'other'] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

export const DIRECTIONS = ['inflow', 'outflow'] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const PROVIDER_IDS = ['groq', 'openrouter'] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export const DEFAULT_MODELS: Record<ProviderId, string> = {
  groq: 'openai/gpt-oss-20b',
  openrouter: 'openai/gpt-oss-20b',
};

export const DEFAULT_KNOWN_SOURCES = ['salary', 'cash', 'bank', 'committee'];
export const DEFAULT_CATEGORIES = [
  'groceries',
  'food',
  'transport',
  'bills',
  'health',
  'shopping',
  'family',
  'education',
  'other',
];

export interface ExtractionContext {
  transcript: string;
  knownSources: string[];
  categories: string[];
  /** Local time with offset, e.g. 2026-11-13T20:21:00+05:00 */
  nowISO: string;
  /** IANA zone, e.g. Asia/Karachi */
  timeZone: string;
}

/** One normalised entry from the LLM. `spentAt` is a local date `YYYY-MM-DD` or null (= now). */
export interface ParsedEntry {
  type: EntryType;
  direction: Direction;
  amount: number | null;
  description: string | null;
  source: string | null;
  category: string | null;
  spentAt: string | null;
  confidence: number | null;
  /** Reasons this entry needs review (empty = fine). */
  issues: string[];
}

/** Firestore-agnostic attempt record; the repo converts `at` to a Timestamp. */
export interface AttemptRecord {
  at: string;
  provider: ProviderId;
  model: string;
  rawText: string | null;
  error: string | null;
}

export type ExtractionOutcome =
  | { kind: 'parsed'; entries: ParsedEntry[]; notes: string | null }
  | { kind: 'invalid_json'; reason: string }
  /** Network, timeout, 5xx, 429: retry later with backoff. */
  | { kind: 'transient'; reason: string }
  /** 401/403/400, missing key: do not retry automatically. */
  | { kind: 'fatal'; reason: string };

export interface ExtractionResult {
  attempts: AttemptRecord[];
  outcome: ExtractionOutcome;
}
