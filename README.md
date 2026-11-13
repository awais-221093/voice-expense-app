# Voice Expense

Personal Android app: hold the mic, say *"add 100 rupees for eggs from salary"*, done.
Speech → text **on the phone** → an open-source LLM (Groq or OpenRouter) extracts one or more entries → Firestore.

- Works offline: the transcript is saved locally and processed when the phone is back online.
- Nothing is lost: every transcript and every raw LLM response is kept; entries are soft-deleted only.
- Edit or delete any entry in the app.

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
