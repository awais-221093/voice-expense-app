# Assumptions

Made without explicit confirmation. Confirm (move to DECISIONS) or correct.

| # | Assumption | Where it matters |
|---|---|---|
| 2 | Default LLM provider is Groq; OpenRouter is the fallback | settings defaults |
| 3 | Urdu = `ur-PK`; any installed `ur-*` model is acceptable | speech readiness |
| 4 | Roman Urdu "kal" in a spending note means yesterday | prompt |
| 5 | Month/day totals use `spentAt` (so "yesterday" on the 1st counts in last month) | totals |
| 6 | Saving an edit clears `needsReview` (a human checked it) | entries repo |
| 7 | Manual "Fix manually" entries have `edited: true`, `original: null` | commands repo |
| 8 | Tap-mode silence choices 2/3/4/5 s are enough | settings UI |
| 9 | Date editing by ‹ › day steps (no calendar picker) is enough | edit sheet; avoids a date-picker dependency |
| 10 | "Understanding…" waits up to 12 s before showing "Saved — will finish in background" | home result card |
| 11 | Firestore region `asia-south1` (Mumbai) for lowest latency from Pakistan | SETUP |
| 12 | Single Firebase project for dev and real use (personal app) | SETUP |
