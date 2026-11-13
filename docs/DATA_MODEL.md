# Data model (Firestore)

Shared contract between the mobile app and the future web dashboard. TypeScript source of truth:
`src/features/llm/types.ts` (enums) and `src/features/commands/types.ts`, `src/features/entries/types.ts`.

```
users/{uid}                       (may stay empty)
users/{uid}/settings/app
users/{uid}/commands/{commandId}
users/{uid}/entries/{entryId}
```

## commands/{commandId}
| field | type | notes |
|---|---|---|
| id | string | = doc id |
| transcript | string | **immutable**, non-empty |
| llmAttempts | `{at, provider, model, rawText, error}[]` | **append-only** (one or more per update) |
| status | `pending \| ok \| needs_review \| failed` | created as `pending` |
| statusReason | string \| null | |
| attemptCount | number | processing runs that reached the network |
| nextRetryAt | Timestamp \| null | |
| entryIds | string[] | |
| createdAt | Timestamp | device clock, **immutable** |
| syncedAt | Timestamp \| null | serverTimestamp, audit only |
| updatedAt | Timestamp | |
| dismissedAt | Timestamp \| null (optional) | user hid a failed / entry-less row (DECISIONS #7) |
| meta | `{sttEngine, locale, recordingMode, appVersion}` | `sttEngine`: `on-device` \| `online` |

## entries/{entryId}
| field | type | notes |
|---|---|---|
| id | string | `${commandId}_${index}`; manual fix: `${commandId}_m${ms}` |
| commandId | string \| null | **immutable** |
| type | `expense \| savings \| loan \| committee \| other` | |
| direction | `inflow \| outflow` | `expense` ⇒ `outflow` |
| amount | number > 0 \| null | |
| currency | `"PKR"` | always |
| description, source, category | string \| null | English, lowercase source |
| spentAt | Timestamp | |
| needsReview | boolean | |
| reviewReason | string \| null | |
| confidence | number \| null | |
| edited | boolean | set true on any user edit |
| editedAt | Timestamp \| null | |
| original | object \| null | LLM values; **immutable** |
| deleted | boolean | soft delete only |
| createdAt | Timestamp | **immutable** |
| updatedAt | Timestamp | |

## settings/app
`knownSources, categories, llmProvider, llmModels {groq, openrouter}, fallbackEnabled, sttLocale, allowOnlineSttFallback, recordingMode, silenceTimeoutSec`. API keys are never stored here.

## Rules for any writer (app or dashboard)
- Never change `transcript`, `createdAt`, `commandId`, `original`; never edit/remove `llmAttempts` items.
- Every entry edit sets `edited: true`, `editedAt`, `updatedAt`.
- No hard deletes (rules forbid them).
- New fields must be optional and added to rules + types + this file together.
