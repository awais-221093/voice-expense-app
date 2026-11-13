// Pure monthly summaries for the Insights tab. No Firebase imports — easy to test.
import { ENTRY_TYPES, type EntryType } from '@/features/llm/types';

import type { Entry } from './types';

export interface Flow {
  inflow: number;
  outflow: number;
}

export interface Share {
  label: string;
  amount: number;
  /** 0–1 of the group total. */
  share: number;
}

export interface MonthInsights {
  /** Expense total (the "spent" number used everywhere in the app). */
  spent: number;
  /** All types together, from the user's point of view. */
  total: Flow;
  byType: Record<EntryType, Flow>;
  /** Expenses only, largest first. */
  byCategory: Share[];
  bySource: Share[];
  /** Spent ÷ days elapsed in the month (or days in month for past months). */
  dailyAverage: number;
  /** Entries without an amount or flagged for review — totals may be incomplete. */
  needsReview: number;
}

export function monthInsights(entries: Entry[], monthStart: Date, now = new Date()): MonthInsights {
  const byType = Object.fromEntries(
    ENTRY_TYPES.map((t) => [t, { inflow: 0, outflow: 0 }]),
  ) as Record<EntryType, Flow>;
  const total: Flow = { inflow: 0, outflow: 0 };
  const categories = new Map<string, number>();
  const sources = new Map<string, number>();
  let spent = 0;
  let needsReview = 0;

  for (const e of entries) {
    if (e.needsReview || e.amount === null) needsReview++;
    if (e.amount === null) continue;
    byType[e.type][e.direction] += e.amount;
    total[e.direction] += e.amount;
    if (e.type === 'expense') {
      spent += e.amount;
      add(categories, e.category ?? 'other', e.amount);
      add(sources, e.source ?? 'not said', e.amount);
    }
  }

  return {
    spent,
    total,
    byType,
    byCategory: toShares(categories, spent),
    bySource: toShares(sources, spent),
    dailyAverage: spent / daysCounted(monthStart, now),
    needsReview,
  };
}

function add(map: Map<string, number>, key: string, amount: number) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function toShares(map: Map<string, number>, total: number): Share[] {
  return [...map.entries()]
    .map(([label, amount]) => ({ label, amount, share: total ? amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

function daysCounted(monthStart: Date, now: Date): number {
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const isCurrent =
    now.getFullYear() === monthStart.getFullYear() && now.getMonth() === monthStart.getMonth();
  return isCurrent ? now.getDate() : daysInMonth;
}
