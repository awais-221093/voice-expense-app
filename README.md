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
