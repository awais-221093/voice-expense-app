import type { ExtractionContext } from './types';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Bump when the prompt changes, so llmAttempts can be compared across versions. */
export const PROMPT_VERSION = 'v1';

function systemPrompt(ctx: ExtractionContext): string {
  return `You turn one short spoken money note into structured records for a personal money log in Pakistan.
Reply with JSON only (no prose, no markdown) in exactly this shape:
{"entries":[{"type":string,"direction":string,"amount":number|null,"description":string|null,"source":string|null,"category":string|null,"spent_at":string|null,"confidence":number}],"notes":string|null}

Rules:
- One entry per distinct amount/item. "100 for eggs and 50 for bread" = 2 entries.
- type: one of expense, savings, loan, committee, other. Default expense.
  committee = a rotating savings committee (BC/kameti) installment or payout.
- direction: money from the user's point of view. outflow = money leaves the user, inflow = money comes to the user.
  expense: always outflow.
  savings: outflow = put money into savings; inflow = withdrew from savings.
  loan: outflow = gave a loan, or repaid a loan I took; inflow = took a loan, or someone repaid me.
  committee: outflow = paid an installment; inflow = received the committee payout.
  other: outflow = money out; inflow = money in (e.g. salary received, gift received).
  Default outflow when unclear.
- amount: positive number only. Understand spoken numbers: "one fifty"=150, "twelve hundred"=1200, "2 thousand"=2000, "5k"=5000, "1.5 lakh"=150000, "dhai sau"=250, "sawa"=1.25x, "derh"=1.5x, "hazar"=1000. null if no amount was said.
- Currency is always PKR (rupees, Rs, rupay). If another currency is clearly said, keep the number and explain in notes.
- description: short English noun phrase, lowercase, even if the note is Urdu or mixed. Put the person's name for loans (e.g. "loan to ali"). null if nothing to describe.
- source: where the money came from / went through. Prefer one of: ${JSON.stringify(ctx.knownSources)}; otherwise a short lowercase English word; null if not said.
- category: one of ${JSON.stringify(ctx.categories)}; use "other" if none fit. For non-expense types use "other" unless one clearly fits.
- spent_at: "YYYY-MM-DD" only if the user said a date ("yesterday", "on Monday", "kal", "parson"); otherwise null. Resolve relative to "Now" given in the message. "kal" about spending means yesterday.
- confidence: 0 to 1, your certainty about the whole entry.
- notes: null unless something could not be placed or a non-PKR currency was said.
- The text comes from speech recognition: expect misheard words, missing punctuation, numbers as words or digits, Urdu script, or Roman Urdu. Output English.
- If the note contains no money record at all, return {"entries":[],"notes":"<why>"}.`;
}

interface FewShot {
  now: string;
  transcript: string;
  output: unknown;
}

const e = (
  type: string,
  direction: string,
  amount: number | null,
  description: string | null,
  source: string | null,
  category: string,
  spent_at: string | null = null,
  confidence = 0.95,
) => ({ type, direction, amount, description, source, category, spent_at, confidence });

const FEW_SHOTS: FewShot[] = [
  {
    now: '2026-03-04 Wednesday',
    transcript: 'add 100 rupees for eggs from salary',
    output: { entries: [e('expense', 'outflow', 100, 'eggs', 'salary', 'groceries')], notes: null },
  },
  {
    now: '2026-03-04 Wednesday',
    transcript: 'paid 5000 committee and saved 2000 in the bank',
    output: {
      entries: [
        e('committee', 'outflow', 5000, 'committee installment', null, 'other'),
        e('savings', 'outflow', 2000, 'savings deposit', 'bank', 'other'),
      ],
      notes: null,
    },
  },
  {
    now: '2026-03-04 Wednesday',
    transcript: 'gave ali 5000 loan',
    output: { entries: [e('loan', 'outflow', 5000, 'loan to ali', null, 'other')], notes: null },
  },
  {
    now: '2026-03-04 Wednesday',
    transcript: 'took 10000 loan from brother',
    output: {
      entries: [e('loan', 'inflow', 10000, 'loan from brother', null, 'family')],
      notes: null,
    },
  },
  {
    now: '2026-03-04 Wednesday',
    transcript: 'ali returned 2000',
    output: { entries: [e('loan', 'inflow', 2000, 'repayment from ali', null, 'other', null, 0.85)], notes: null },
  },
  {
    now: '2026-03-04 Wednesday',
    transcript: 'got my committee 50000',
    output: { entries: [e('committee', 'inflow', 50000, 'committee payout', null, 'other')], notes: null },
  },
  {
    now: '2026-03-04 Wednesday',
    transcript: 'withdrew 3k from savings',
    output: { entries: [e('savings', 'inflow', 3000, 'savings withdrawal', null, 'other')], notes: null },
  },
  {
    now: '2026-03-04 Wednesday',
    transcript: 'yesterday twelve hundred petrol cash and one fifty for bread',
    output: {
      entries: [
        e('expense', 'outflow', 1200, 'petrol', 'cash', 'transport', '2026-03-03'),
        e('expense', 'outflow', 150, 'bread', 'cash', 'groceries', '2026-03-03', 0.85),
      ],
      notes: null,
    },
  },
  {
    now: '2026-03-04 Wednesday',
    transcript: 'سو روپے کے انڈے سیلری سے',
    output: { entries: [e('expense', 'outflow', 100, 'eggs', 'salary', 'groceries')], notes: null },
  },
  {
    now: '2026-03-04 Wednesday',
    transcript: 'kal 500 ka petrol dalwaya cash se',
    output: {
      entries: [e('expense', 'outflow', 500, 'petrol', 'cash', 'transport', '2026-03-03')],
      notes: null,
    },
  },
  {
    now: '2026-03-04 Wednesday',
    transcript: 'bought medicine from jazzcash',
    output: {
      entries: [e('expense', 'outflow', null, 'medicine', 'jazzcash', 'health', null, 0.6)],
      notes: null,
    },
  },
  {
    now: '2026-03-04 Wednesday',
    transcript: 'spent 20 dollars on netflix',
    output: {
      entries: [e('expense', 'outflow', 20, 'netflix', null, 'bills', null, 0.6)],
      notes: 'amount was said in dollars, not PKR',
    },
  },
];

function userMessage(now: string, transcript: string): string {
  return `Now: ${now}\nNote: ${transcript}`;
}

/** "2026-11-13T20:21:00+05:00" + zone → "2026-11-13 Friday 20:21 (Asia/Karachi)" */
function describeNow(ctx: ExtractionContext): string {
  const date = ctx.nowISO.slice(0, 10);
  const time = ctx.nowISO.slice(11, 16);
  const weekday = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: 'UTC',
  });
  return `${date} ${weekday} ${time} (${ctx.timeZone})`;
}

export function buildMessages(ctx: ExtractionContext): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt(ctx) }];
  for (const shot of FEW_SHOTS) {
    messages.push({ role: 'user', content: userMessage(shot.now, shot.transcript) });
    messages.push({ role: 'assistant', content: JSON.stringify(shot.output) });
  }
  messages.push({ role: 'user', content: userMessage(describeNow(ctx), ctx.transcript) });
  return messages;
}
