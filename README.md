# Voice Expense

**Log money by talking.** Hold one button, say *"add 100 rupees for eggs from salary"*, let go — done.

A personal Android app for tracking everyday money in Pakistan (PKR) with a single short voice
command instead of forms.

## Why this exists

Most expense trackers fail for one reason: **logging takes too long, so you stop doing it.**
Opening an app, picking a category, typing an amount and a note is 20–30 seconds of friction for
a 100-rupee purchase. After a week, the habit dies and the data is useless.

Real life also isn't just "expenses". Money moves in many ways — lending to a friend, repaying a
loan, paying a committee (BC) installment, putting money into savings — and people describe it the
way they talk: in English, Urdu or a mix (*"kal 500 ka petrol dalwaya cash se"*).

## The idea

Make logging take **under 5 seconds and zero typing**:

1. **Hold the mic and say it** — in English, Urdu or Roman Urdu, as casually as you like.
2. **The phone transcribes it on-device** — fast, private, and it works without internet.
3. **An AI model turns the sentence into records** — one sentence can hold several:
   *"paid 5000 committee and saved 2000 in the bank"* → a committee payment **and** a savings deposit.
4. **It's saved instantly** and appears in your list; a 5-second **Undo** covers mistakes.

No forms, no confirmations. If the AI gets something wrong, tap the entry and fix it.

## What you can record

Every entry has a **type** and a **direction** (money coming to you, or leaving you):

| Type | Money out | Money in | You might say |
|---|---|---|---|
| Expense | spent | — | "1200 for petrol from cash" |
| Savings | put into savings | withdrew from savings | "saved 2000 in the bank" |
| Loan | gave a loan / repaid one | took a loan / got repaid | "gave Ali 5000 loan", "Ali returned 2000" |
| Committee | paid an installment | received the payout | "paid 5000 committee", "got my committee 50000" |
| Other | money out | money in | "received salary 150000" |

It understands spoken numbers (*"twelve hundred"*, *"5k"*, *"1.5 lakh"*, *"dhai sau"*), sources
(*"from salary"*, *"jazzcash"*), categories, and dates (*"yesterday"*, *"kal"*, *"on Monday"*).
Currency is always PKR.

## Principles

- **Least effort.** Open → hold → speak → release. Nothing else is required.
- **Never lose data.** The transcript is saved the moment you stop speaking — even offline, even if
  the app is killed — before the AI is asked anything. Every raw AI response is kept too.
- **Easy to fix.** Any entry can be edited or deleted; the AI's original answer is preserved.
- **Calm and fast.** Big targets, haptics, clear feedback, no clutter.
- **No backend.** Just the app and your own Firebase project. No servers to run or pay for.

## The app

Bottom tabs, with the mic in the middle so recording is one thumb-press away from anywhere:

**Home · Activity · 🎙 · Insights · Profile**

- **Home** — spent today and this month, money in, anything that needs attention (a note that
  couldn't be processed yet), and your latest entries by day.
- **Activity** — full history month by month, with filters (spent, money in, loans, savings,
  committee, needs review) and search.
- **Insights** — where the money went: spending by category and by source, daily average,
  money in vs out, totals per type.
- **Profile** — account and settings: hold-to-talk or tap-to-talk, speech language
  (English / Urdu), sources, categories, AI provider and keys.

## How it works

```
 hold mic ──▶ on-device speech-to-text ──▶ command saved (status: pending)
                                                  │  works offline, survives app kill
                                                  ▼
                                 AI (Groq or OpenRouter) ──▶ { entries: [...] }
                                                  │  validated, one batched write
                                                  ▼
                                 entries in Firestore ──▶ app updates in real time
```

- If you're offline, notes wait in a queue and are processed automatically when you reconnect.
- If the AI fails (bad key, timeout), it retries with backoff, can fall back to the other provider,
  and never silently drops the note — it shows up under *Needs attention* with **Retry** and
  **Fix manually**.

## Privacy
Speech is recognised on-device and **no audio is stored**. Only the transcript text is sent to the
chosen LLM provider and to your own Firebase project. API keys live in Android secure storage.

## Getting started
1. Install and build: [`COMMANDS.md`](COMMANDS.md)
2. Firebase, keys, phone: [`docs/SETUP.md`](docs/SETUP.md)

## Docs
| | |
|---|---|
| Product spec | `VOICE_EXPENSE_APP_PLAN (2).md` |
| Agent guide and git rules | `CLAUDE.md` |
| Tasks / progress / issues | `docs/TASKS.md`, `docs/PROGRESS.md`, `docs/ISSUES.md` |
| Data model (shared with future dashboard) | `docs/DATA_MODEL.md` |
| Decisions and assumptions | `docs/DECISIONS.md`, `docs/ASSUMPTIONS.md` |
