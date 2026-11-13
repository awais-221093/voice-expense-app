import { z } from 'zod';

import { DIRECTIONS, ENTRY_TYPES, type Direction, type EntryType, type ParsedEntry } from './types';

/**
 * Top-level shape is strict (an object with an `entries` array); individual fields are
 * normalised leniently so one odd field flags the entry for review instead of losing it.
 */
const responseSchema = z.object({
  entries: z.array(z.record(z.string(), z.unknown())),
  notes: z.unknown().optional(),
});

export type ParseResult =
  { ok: true; entries: ParsedEntry[]; notes: string | null } | { ok: false; reason: string };

export interface NormaliseOptions {
  categories: string[];
  /** Local "today" as YYYY-MM-DD, used to sanity-check spent_at. */
  todayISODate: string;
}

export function parseLlmResponse(rawText: string, opts: NormaliseOptions): ParseResult {
  const json = extractJson(rawText);
  if (json === undefined) return { ok: false, reason: 'invalid JSON' };

  // Some models return a bare array despite instructions; accept it.
  const candidate = Array.isArray(json) ? { entries: json } : json;
  const parsed = responseSchema.safeParse(candidate);
  if (!parsed.success) return { ok: false, reason: 'invalid JSON shape' };

  const notes = cleanString(parsed.data.notes);
  const entries = parsed.data.entries.map((e) => normaliseEntry(e, opts));
  return { ok: true, entries, notes };
}

/** Parses JSON, tolerating markdown fences or prose around a single JSON object. */
export function extractJson(rawText: string): unknown {
  const text = rawText.trim();
  try {
    return JSON.parse(text);
  } catch {
    // fall through
  }
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      // fall through
    }
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function normaliseEntry(raw: Record<string, unknown>, opts: NormaliseOptions): ParsedEntry {
  const issues: string[] = [];

  let type = cleanString(raw.type)?.toLowerCase() as EntryType | undefined;
  if (!type || !ENTRY_TYPES.includes(type)) {
    if (raw.type != null) issues.push(`unknown type "${String(raw.type)}"`);
    type = 'expense';
  }

  let direction = cleanString(raw.direction)?.toLowerCase() as Direction | undefined;
  if (!direction || !DIRECTIONS.includes(direction)) direction = 'outflow';
  if (type === 'expense') direction = 'outflow';

  const amount = toAmount(raw.amount);
  if (amount === null) issues.push('amount missing');

  const description = cleanString(raw.description);

  const source = cleanString(raw.source)?.toLowerCase() ?? null;

  // Category is always one of the user's list; anything else (or missing) becomes "other".
  const rawCategory = cleanString(raw.category)?.toLowerCase();
  const category = rawCategory && opts.categories.includes(rawCategory) ? rawCategory : 'other';

  let spentAt = cleanString(raw.spent_at ?? raw.spentAt);
  if (spentAt !== null) {
    const date = spentAt.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isPlausibleDate(date, opts.todayISODate)) {
      issues.push(`unclear date "${spentAt}"`);
      spentAt = null;
    } else {
      spentAt = date;
    }
  }

  let confidence = typeof raw.confidence === 'number' ? raw.confidence : null;
  if (confidence !== null && (confidence < 0 || confidence > 1)) confidence = null;

  return { type, direction, amount, description, source, category, spentAt, confidence, issues };
}

function cleanString(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!s || s.toLowerCase() === 'null') return null;
  return s;
}

function toAmount(v: unknown): number | null {
  let n: number;
  if (typeof v === 'number') n = v;
  else if (typeof v === 'string') n = Number(v.replace(/[^\d.]/g, ''));
  else return null;
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

const DAY_MS = 86_400_000;

function isPlausibleDate(date: string, today: string): boolean {
  const d = Date.parse(`${date}T00:00:00Z`);
  const t = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(d) || Number.isNaN(t)) return false;
  return d <= t + DAY_MS && d >= t - 366 * DAY_MS;
}
