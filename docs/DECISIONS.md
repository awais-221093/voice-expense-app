# Decisions and deviations

| # | Topic | Decision | Why |
|---|---|---|---|
| 1 | Route folder | Routes live in `src/app/` (not `/app`) | Project template + AGENTS.md use `src/app`; plan said "suggested". |
| 2 | Default LLM model | `openai/gpt-oss-20b` on both Groq and OpenRouter (editable) | Groq retired Llama 3.x production models in Aug 2026; gpt-oss is Groq's current production model and also available on OpenRouter. Verify IDs at https://console.groq.com/docs/models. |
| 3 | `max_tokens` | 1000 instead of ~400, with `reasoning_effort: "low"` for gpt-oss models | gpt-oss is a reasoning model; reasoning tokens count against the limit and 400 truncates multi-entry output. Still cheap. |
| 4 | Append-only rule | `llmAttempts` may grow by **one or more** items per update (old items unchanged) | One processing run can record several attempts (invalid-JSON retry, transient retry, fallback provider) in the single batched write the plan requires. |
| 5 | Offline attempts | When NetInfo says offline, the queue does not call the LLM and does **not** increment `attemptCount` | Otherwise a long airplane-mode period would burn all 5 attempts and mark commands `failed`. |
| 6 | `notes` from LLM | Any non-null `notes` → command `needs_review`, notes stored as each entry's `reviewReason` | Plan routes non-PKR currency and "couldn't place" info through `notes`; prompt tells the model to keep `notes` null otherwise. |
| 7 | Dismiss failed commands | New optional command field `dismissedAt: Timestamp \| null`; "Dismiss" on a failed / entry-less row hides it from Home | Junk transcripts would otherwise stay red forever. Nothing is deleted; dashboard can still show them. |
| 8 | Retry mechanism | Retry (button or after key/model change) sets status back to `pending`, `attemptCount 0`, `nextRetryAt null`; the normal queue then processes it | One code path for all processing. |
| 9 | Writes are not awaited | Firestore writes are fire-and-forget with error logging | RN Firebase write promises resolve only after the server acks; awaiting would hang the UI offline. Local cache + listeners update instantly. |
| 10 | `spent_at` | LLM returns a date (`YYYY-MM-DD`) only; app combines it with the current local time of day | Keeps sort order natural; plan only needs day-level dates. Dates > 1 day in the future or > 366 days old are rejected (entry flagged). |
| 11 | Debug log | In-memory ring buffer (last 300 lines), not persisted | Avoids an extra storage dependency; enough for live diagnosis. |
| 12 | Min Android | `minSdkVersion 33` via `expo-build-properties` | Plan: on-device recognition + continuous mode need Android 13. |
| 13 | Icons | `@expo/vector-icons` (MaterialCommunityIcons) | Not bundled in this template; small JS-only dependency. |
| 14 | Bottom sheet | Built on RN `Modal` (slide), no extra library | Keeps dependencies minimal. |
| 15 | Open-commands query | Home + queue use one query: `entryIds == []`, `dismissedAt == null`, `createdAt desc`, limit 50 | needs_review commands that have entries would otherwise pile up in a status-based query. `dismissedAt` is written as `null` on create so the equality filter matches. |
| 16 | Tracking docs | TASKS, PROGRESS, ISSUES, ASSUMPTIONS in `docs/`, rules in `CLAUDE.md` | User request for agentic development. |
