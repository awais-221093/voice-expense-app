# Voice Expense Tracker — Project Plan (for AGY)

> **How to use this file:** This is the single source of truth for the project. Read it fully. Then **first write your own detailed implementation plan** (`/docs/IMPLEMENTATION_PLAN.md`) breaking the work into tasks, and only after that start building, phase by phase. Where this document says **[DECISION]**, a default is given: follow it unless it proves impossible, and record any deviation in `/docs/DECISIONS.md`.
>
> The future web admin dashboard has its own plan: `DASHBOARD_PLAN.md`. It is **not** built in this project phase, but the data model here must support it.

### Revision 2 — what changed from v1
- Firebase: **React Native Firebase (native SDK)** instead of the Firebase JS SDK, because the JS SDK has no persistent offline cache in React Native (offline writes would be lost if the app is killed).
- Expo **SDK 58** (latest) instead of SDK 57. **Android only** (user device: Android 16).
- One voice command can produce **multiple entries**. New `commands` collection holds the immutable transcript + every LLM response; `entries` holds the parsed records.
- Entry **types**: `expense`, `savings`, `loan`, `committee`, `other`.
- Entry **direction**: `inflow` / `outflow` on every entry (money coming to the user vs leaving the user), e.g. loan taken vs loan given.
- Currency is **always PKR** (no currency setting).
- **In-app edit and soft delete** of entries.
- Recording mode configurable: **press-and-hold (default)** or **tap to start / tap or 3 s silence to stop**.
- Fixed, editable **category list**; LLM output is always **English** whatever language the transcript is in.
- Fixed v1 bugs: invalid settings path, `llmRawJson` set-once rule vs retries, `pending`/`failed` contradiction, offline `serverTimestamp` ordering.

---

## 1. Product Summary

A **personal-use** Android app (single user) that logs money records by **one short voice command**.

The user opens the app, holds one big button, and says something like:

> "Add 100 rupees for eggs from salary."
> "Paid 5000 committee and saved 2000 in the bank."

The app converts the speech to text **on the device**, sends the text to an **open-source LLM (via OpenRouter or Groq)** that extracts one or more structured entries, saves everything to **Firebase**, and shows it in the app. The whole interaction should take **under ~5 seconds of user effort** and zero typing.

### Core principles
1. **Least effort possible.** Open app → hold → speak → release → done. No forms, no confirmations required.
2. **Never lose data.** The raw transcript and every raw LLM response are always saved, even if parsing fails, even offline, even if the app is killed.
3. **Fix mistakes easily.** The user can edit or delete any entry in the app. A future web dashboard (see `DASHBOARD_PLAN.md`) adds bulk review and reports.
4. **Fast and calm UX.** Big targets, clear feedback, haptics, no clutter.
5. **No backend.** The system is only: the mobile app + Firebase. No servers, no Cloud Functions.

### Out of scope (this phase)
- Web admin dashboard, charts, reports, CSV export (see `DASHBOARD_PLAN.md`)
- Multi-user support, sharing, social features
- Budgets, account balances (sources are labels only)
- iOS
- Auto-start listening on app open, home-screen widgets, shortcuts
- Any server-side code

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| App | React Native + **Expo SDK 58**, TypeScript, Expo Router |
| Platform | **Android only** (target the user's Android 16 device; min Android 13 / API 33, needed for on-device recognition) |
| Build | **Development build** (EAS or local), not Expo Go (native modules required) |
| Speech-to-text | **On-device**, via the **`expo-speech-recognition`** package |
| LLM | **OpenRouter** or **Groq**, both supported, switchable in settings; called directly from the app with `fetch` |
| Database / Auth | **React Native Firebase** (`@react-native-firebase/app`, `/firestore`, `/auth`), modular API, with its Expo config plugin |
| Secrets on device | `expo-secure-store` |
| Haptics | `expo-haptics` |
| Animations | `react-native-reanimated` |
| Network status | `@react-native-community/netinfo` |
| State | Zustand or React Context (keep it light) |
| Validation | Zod (shared schema for LLM output) |

**Important:** Do not assume library versions or APIs. Check the **Expo SDK 58 docs** (SDK 58 has breaking changes vs 57, including Expo Router), the current `expo-speech-recognition` README, and the React Native Firebase Expo setup guide. Confirm each native library supports SDK 58 before starting; if one does not, record it in `DECISIONS.md` and propose an alternative to the user before downgrading. Install with `npx expo install <pkg>` so versions match the SDK.

Development machine is **Windows**; commands and scripts must work there (PowerShell-friendly, no bash-only scripts).

---

## 3. Architecture

```
[Android app]
   │ 1. user holds mic (or taps, per settings)
   │ 2. expo-speech-recognition (ON-DEVICE) → live + final transcript
   │ 3. create Firestore `command` doc immediately: transcript saved, status "pending"
   │    (native Firestore persists this write locally; survives offline + app kill)
   │ 4. LLM call (OpenRouter or Groq) with the transcript → JSON { entries: [...] }
   │ 5. validate JSON (Zod), normalise
   │ 6. ONE batched write: append LLM attempt to the command, set its status,
   │    create N `entry` docs (deterministic ids)
   ▼
[Firestore] ──realtime listener──▶ [App list updates]
        └──────────────────────────▶ [Future web dashboard]
```

### 3.1 On-device STT — rules
- Use `expo-speech-recognition` with **on-device recognition required** (`requiresOnDeviceRecognition: true`). Use the library's helpers to check on-device support and installed locales before recording.
- **Languages:** English (default) and Urdu, selectable in Settings; only list locales whose offline model is installed. Whatever the STT outputs (English, Urdu script, mixed) is passed to the LLM unchanged; the LLM always replies in English.
- **Never silently fall back to online recognition.** If the device has no offline model for the selected language, show a clear one-time screen explaining how to download it (Android system speech recognition language pack; use the library's model-download trigger if available) with a button to retry. Settings toggle "Allow online recognition if offline model missing" (default **off**).
- Enable **interim results** and show the transcript appearing live while the user speaks.
- **Recording modes** (Settings → "Recording mode"):
  - **Hold to talk (default):** recording runs while the button is held; release ends it. Silence does not end it. Ignore holds shorter than ~300 ms (accidental touch).
  - **Tap to talk:** tap to start; recording ends on a second tap **or** after **3 s of silence** (silence length editable in Settings), whichever comes first.
  - In both modes: hard cap ~30 s (multi-entry commands can be longer).
- Silence detection: request it through the library's Android intent options, but **also implement an app-side silence timer** based on the last interim-result time, because Android's recognizer often ignores custom silence lengths.
- Add the plugin to `app.json`/`app.config` per the library docs and request microphone + speech recognition permissions with friendly explanations.
- **No audio is stored.** Only the transcript text is kept.
- Because STT is on-device, **recording works fully offline**.

### 3.2 LLM providers — rules
- Both providers expose an **OpenAI-compatible Chat Completions API**. Implement one small interface and two adapters:

```ts
interface LlmProvider {
  id: "groq" | "openrouter";
  extractEntries(input: {
    transcript: string;
    knownSources: string[];
    categories: string[];
    nowISO: string;        // with offset, e.g. 2026-11-13T20:21:00+05:00
    timeZone: string;      // device IANA zone, e.g. "Asia/Karachi"
  }): Promise<{ rawText: string; model: string }>;
}
```

- Endpoints (verify in current docs): Groq `https://api.groq.com/openai/v1/chat/completions`, OpenRouter `https://openrouter.ai/api/v1/chat/completions`.
- Settings let the user: choose the active provider, enter each provider's API key, and edit the model name for each. Ship sensible defaults (a small fast instruct model; **verify current model IDs** at build time, since they change).
- Request options: `temperature: 0`, `max_tokens ≈ 400` (multi-entry output), JSON mode (`response_format: { type: "json_object" }`) where the model supports it; the prompt must also demand JSON-only output so it works even when JSON mode is unavailable.
- **[DECISION] Automatic fallback:** Settings toggle "If the primary provider fails, try the other one" (default **on**, only used when both keys are set).
- Timeout ~10 s per call; one retry on network/5xx/429 errors with short backoff.
- **API keys:** entered once in Settings and stored with `expo-secure-store`. Never committed. (`EXPO_PUBLIC_*` env vars may seed dev defaults; anything in the bundle is extractable, accepted only because the app is personal.) `SETUP.md` must tell the user to set a **monthly spending limit** on the OpenRouter key.

### 3.3 Firebase — rules
- **React Native Firebase** with its Expo config plugin; `google-services.json` from the Firebase console (git-ignored). Native Firestore offline persistence is on by default: writes made offline are stored on disk and sent when online, including after an app restart. Verify this in Phase 4.
- Auth: **email/password** sign-in for the single user. Sessions persist natively. No Google sign-in, no anonymous auth (anonymous data is lost on reinstall).
- Security rules restrict all access to the owner UID and enforce data integrity (Section 4).

---

## 4. Data Model (Firestore)

All user data is nested under the user, which keeps rules simple and queries scoped:

```
users/{uid}                       (doc; may stay empty)
users/{uid}/settings/app          (doc)
users/{uid}/commands/{commandId}  (one per voice command)
users/{uid}/entries/{entryId}     (zero or more per command)
```

### `commands/{commandId}` — one per voice command (the immutable record)
```ts
{
  id: string,                     // auto id, generated on device
  transcript: string,             // exact final STT output — immutable
  llmAttempts: Array<{            // append-only, never edited or removed
    at: Timestamp,
    provider: "groq" | "openrouter",
    model: string,
    rawText: string | null,       // exact response text; null if no response
    error: string | null,         // e.g. "timeout", "HTTP 401", "invalid JSON"
  }>,
  status: "pending" | "ok" | "needs_review" | "failed",
  statusReason: string | null,    // e.g. "amount missing", "no internet", "invalid API key"
  attemptCount: number,           // processing attempts (for backoff / give-up)
  nextRetryAt: Timestamp | null,
  entryIds: string[],             // entries created from this command
  createdAt: Timestamp,           // device clock (see Rules)
  syncedAt: Timestamp | null,     // serverTimestamp(), audit only
  updatedAt: Timestamp,
  meta: { sttEngine: "on-device", locale, recordingMode, appVersion }
}
```

### `entries/{entryId}` — the records the app displays and totals
```ts
{
  id: string,                     // deterministic: `${commandId}_${index}`
  commandId: string | null,       // null only for entries created manually from a failed command (see 6.4)
  type: "expense" | "savings" | "loan" | "committee" | "other",
  direction: "inflow" | "outflow", // money coming to the user vs leaving the user (see table below)
  amount: number | null,          // always positive; direction gives the sign
  currency: "PKR",                // always PKR; field kept for future-proofing
  description: string | null,     // English, short, e.g. "eggs"
  source: string | null,          // label, lowercase, prefer knownSources, e.g. "salary"
  category: string | null,        // from the categories list, or "other"
  spentAt: Timestamp,             // default = command createdAt; LLM may infer "yesterday"
  needsReview: boolean,
  reviewReason: string | null,
  confidence: number | null,      // 0–1, from LLM if provided
  edited: boolean,                // true once changed in the app or dashboard
  editedAt: Timestamp | null,
  original: {                     // the LLM's parsed values, set at creation, immutable
    type, direction, amount, description, source, category, spentAt
  } | null,
  deleted: boolean,               // soft delete (Undo, in-app delete)
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Direction meaning per type
Direction is always from the user's point of view: **inflow** = money comes to me, **outflow** = money leaves me.

| Type | outflow | inflow |
|---|---|---|
| `expense` | money spent (**always outflow**) | — |
| `savings` | put money into savings | took money out of savings |
| `loan` | gave a loan, or repaid a loan I took | took a loan, or got a loan I gave paid back |
| `committee` | paid a committee installment | received the committee payout |
| `other` | money out | money in |

Default when unclear: `outflow`. The person involved in a loan (e.g. "Ali") goes in `description`.

### `settings/app`
`{ knownSources: string[], categories: string[], llmProvider, llmModels: {groq, openrouter}, fallbackEnabled, sttLocale, allowOnlineSttFallback, recordingMode: "hold" | "tap", silenceTimeoutSec: 3 }`
(API keys are **not** stored in Firestore, only in SecureStore.)

Defaults: `knownSources` = `["salary", "cash", "bank", "committee"]`; `categories` = `["groceries", "food", "transport", "bills", "health", "shopping", "family", "education", "other"]`. Both editable in Settings.

### Rules
- The **command** is created as soon as the final transcript exists (`status: "pending"`), before the LLM call. Native persistence keeps it on disk if offline.
- After the LLM returns, **one batched write** appends to `llmAttempts`, updates the command status, and creates the entries. Deterministic entry ids (`${commandId}_${index}`) mean a repeated write can never create duplicates.
- **Timestamps:** `createdAt`/`spentAt`/`updatedAt` use the **device clock** (`Timestamp.now()`), so offline entries sort and total correctly immediately. `syncedAt` uses `serverTimestamp()` for audit only.
- `transcript` is immutable. `llmAttempts` is append-only. `entries.original` is immutable once set. Edits change only the current fields and set `edited: true`.
- No hard deletes anywhere; `deleted: true` hides an entry.
- **Firestore security rules** must:
  - allow read/write only when `request.auth.uid == uid`;
  - commands: on create, require non-empty `transcript`, `status == "pending"`, empty `llmAttempts`; on update, forbid changing `transcript`/`createdAt`, and allow `llmAttempts` only to grow by appending (new size = old size + 1 and old items unchanged — verify list slicing support in current rules docs);
  - entries: forbid changing `commandId`, `createdAt`, or `original` after creation; `type` must be one of the five values; `direction` must be `inflow` or `outflow`, and must be `outflow` when `type == "expense"`; `currency == "PKR"`;
  - forbid `delete` on all documents.
  - Rules tests with the Firebase emulator (Phase 6).
- **Indexes:** define in `firestore.indexes.json` the composite indexes the app queries need (e.g. entries by `deleted` + `spentAt`; commands by `status` + `createdAt`).

### Status lifecycle (commands)
| Situation | Result |
|---|---|
| Valid JSON, all entries have an amount | `ok` |
| Valid JSON but an entry has `amount: null`, zero entries returned, or a non-PKR currency was spoken | `needs_review` (entries still created where possible, each flagged `needsReview`) |
| Invalid JSON twice | `needs_review`, reason "invalid JSON", no entries |
| Offline, timeout, 5xx, 429 | stays `pending`, `attemptCount++`, `nextRetryAt` with backoff (30 s, 2 min, 10 min, 1 h…) |
| 5 failed attempts in a row | `failed`, reason recorded |
| 401/403 (bad key), 400 (bad model id) | `failed` immediately with a clear reason (no retry loop) |

`failed` and entry-less `needs_review` commands are retried **only** when the user taps "Retry" on the row, or automatically once after the user changes an API key or model in Settings.

---

## 5. LLM Contract

### Required JSON output
The top level must be an **object** (JSON mode requires it), containing an array:
```json
{
  "entries": [
    {
      "type": "expense",
      "direction": "outflow",
      "amount": 100,
      "description": "eggs",
      "source": "salary",
      "category": "groceries",
      "spent_at": null,
      "confidence": 0.95
    }
  ],
  "notes": null
}
```
- **Multiple entries:** one entry per distinct amount/item. "100 for eggs and 50 for bread" → two entries. "Paid 5000 committee and saved 2000" → one `committee` + one `savings` entry.
- `type`: one of `expense`, `savings`, `loan`, `committee`, `other`. Default `expense` when unclear.
- `direction`: `inflow` or `outflow` from the user's point of view, per the table in Section 4. `expense` is always `outflow`. Examples: "gave Ali 5000 loan" → loan/outflow; "took 10000 loan from brother" → loan/inflow; "Ali returned 2000" → loan/inflow; "got my committee 50000" → committee/inflow; "withdrew 3000 from savings" → savings/inflow. Default `outflow` when unclear.
- `amount`: positive number only (no currency symbols). Handle spoken numbers ("one fifty", "twelve hundred", "2 thousand", "5k", "1.5 lakh").
- Currency is always PKR. If the user clearly says another currency, keep the number, and put the reason in `notes` so the app flags `needs_review`.
- `description`: short, **always English**, even if the transcript is Urdu or mixed.
- `source`: prefer a value from `knownSources`, else a short lowercase English label; `null` if not said.
- `category`: one value from `categories`, else `"other"`.
- `spent_at`: ISO date only if the user said a relative/explicit date ("yesterday", "on Monday"); otherwise `null` (the app uses now). Resolve relative to the given `nowISO` and `timeZone`.
- `notes`: anything the model couldn't place, else `null`.
- Output **JSON only**, no prose, no markdown fences.

### Prompt requirements
- System prompt defines the schema, the rules above, the `knownSources` and `categories` lists, and the current date/time + time zone.
- Include 10–14 **few-shot examples**: English, informal phrasing, Urdu-script and mixed transcripts (output in English), multiple entries, each type, both directions (loan given/taken/repaid, committee paid/received, savings in/out), missing source, missing amount.
- Be tolerant of STT quirks (numbers as words or digits, missing punctuation, mis-heard words).
- Parse with Zod. On invalid JSON: retry **once**; if still invalid → `needs_review` (transcript already saved).

### Prompt/test fixtures
Create `/scripts/llm-eval/fixtures.json` with **at least 40** transcripts and expected outputs: numbers ("twelve hundred", "5k", "1.5 lakh"), multi-entry sentences, every type and both directions, Urdu-script and mixed phrases, unclear sentences, relative dates. Add a Node script (`npm run eval`) that runs them against the configured provider (keys from a local, git-ignored `.env`) and prints a pass/fail table. The prompt and Zod schema live in a shared module used by both the app and this script.

**Pass criteria per fixture:** same number of entries; per entry `type`, `direction`, `amount`, `source`, `category` and `spent_at` match exactly; `description` matches case-insensitively after singular/plural normalisation. Tune until **≥ 90%** pass on both providers.

---

## 6. UX Specification

**Design goal:** the fastest, calmest money logger the user has used. Dark and light mode (follow system). Large touch targets. Smooth 60fps animations.

### 6.1 Home screen (the only main screen)
- **Top:** today's **expense** total (large), this month's expense total in small text beneath. **[DECISION]** Totals count only `type: "expense"`; other types appear in the list with a type chip but are not added to "spent".
- **Bottom-center:** one very large circular **mic button** (thumb-reachable). Label under it matches the mode ("Hold to talk" / "Tap to talk").
- **Between:** recent entries (today first), each row: description, amount, type chip (if not expense), source chip, time. Inflow amounts are shown with a "+" and a distinct (e.g. green) color; outflow amounts plain. Color is never the only signal (screen reader reads "received" / "paid"). Realtime listener, no pull-to-refresh.
- Commands still `pending` show as a placeholder row with the transcript and a subtle spinner. `needs_review` entries show an amber dot. `failed` commands show red with the transcript and a **Retry** button, so nothing ever looks lost.

### 6.2 Recording interaction
- **Hold mode:** press → haptic tick, button pulses, **live transcript** appears, label "Listening…". Release → haptic, spinner, label "Understanding…".
- **Tap mode:** tap → same start feedback; second tap or 3 s silence → same end feedback.
- On success: a result card slides up listing the parsed entries (e.g. "₨100 · eggs · from salary", "₨50 · bread"), success haptic, and a **5-second Undo** (soft-deletes all entries from that command). Auto-dismisses; no confirmation.
- On `needs_review`: card says "Saved — check later" and shows the transcript. No blocking dialogs.
- On failure or no internet: card says "Saved — will process when online".
- Nothing heard (empty transcript): gentle "Didn't catch that, try again"; no command is created.
- Permission denied or no offline speech model: one clear explanation screen with the exact fix and a button to open settings.

### 6.3 Offline behavior
- STT works offline, so the transcript is always captured and saved locally by Firestore.
- A **processing queue** handles `pending` commands, oldest first, whose `nextRetryAt` has passed. It runs on connectivity change (NetInfo), on app foreground, and on app start. It is derived from Firestore (`status == "pending"`), so there is no separate storage to get out of sync.
- **No double processing:** an in-memory "in flight" set prevents parallel processing of the same command; deterministic entry ids make a repeated write harmless; the queue skips commands whose `entryIds` is non-empty.
- Small "Offline — will sync" chip when disconnected.

### 6.4 Editing (in app)
- Tap an entry → bottom sheet with: type, direction (inflow/outflow toggle, hidden and fixed to outflow for `expense`), amount, description, source (pick from list or type), category (pick from list), date. Save sets `edited: true`, `editedAt`. The original LLM values stay in `original`.
- A small "Show what I said" link in the sheet shows the command transcript.
- Delete button in the sheet → soft delete, with a 5-second Undo snackbar.
- For a `failed` or entry-less `needs_review` command: **Retry** (re-run the LLM) or **Fix manually** (opens the same sheet pre-filled with the transcript as description; creates an entry linked to the command).
- Edits are allowed offline (queued by Firestore).

### 6.5 Settings (minimal, via small gear icon)
Recording mode (hold / tap) and silence timeout (tap mode), speech language (English / Urdu, installed models only), allow online STT fallback, known sources (add/remove), categories (add/remove), LLM provider (Groq / OpenRouter), API keys (masked, SecureStore), model names, fallback toggle, sign out. Nothing else. (No currency setting: always PKR.)

### 6.6 Accessibility & polish
Screen reader labels (including hold-to-talk instructions), minimum 48dp targets, respect reduced-motion, large-text friendly, skeleton loading states, empty state hint ("Hold the mic and say: add 100 rupees for eggs from salary"), first-run onboarding that signs in, requests permissions and checks the offline speech model.

---

## 7. Project Structure (suggested)

```
/app                  Expo Router screens (index.tsx, settings.tsx, sign-in.tsx, debug.tsx, _layout.tsx)
/src
  /components         MicButton, LiveTranscript, EntryRow, PendingCommandRow, ResultCard, TotalsHeader, EditEntrySheet
  /features
    /speech           useSpeechRecognition wrapper, recording modes, silence timer, locale/offline-model checks
    /llm              provider interface, groq.ts, openrouter.ts, prompt.ts, schema.ts
    /commands         create command, processing queue, status logic
    /entries          Firestore hooks, edit/soft delete, totals
    /settings         settings store, secure key storage
  /lib                firebase.ts, config.ts, haptics.ts, network.ts, time.ts, debugLog.ts
  /theme              colors, spacing, typography
/scripts/llm-eval     fixtures + runner
/firebase             firestore.rules, firestore.indexes.json, rules tests
/docs                 IMPLEMENTATION_PLAN.md, DECISIONS.md, SETUP.md, DATA_MODEL.md, IDEAS.md
```

---

## 8. Phases and Acceptance Criteria

### Phase 0 — Setup
- Create Expo SDK 58 TypeScript project with Expo Router; ESLint + Prettier; env handling.
- Add React Native Firebase (app, auth, firestore) with its config plugin; email/password sign-in screen.
- `SETUP.md` listing every manual step: create Firebase project, register the Android app, download `google-services.json`, enable Email/Password auth and create the user, deploy rules and indexes, get Groq/OpenRouter keys (with OpenRouter spending limit), install the dev build on the phone.
- **Done when:** app runs as a development build on the user's Android 16 phone, connects to Firebase, and the user can sign in and stays signed in after restart.

### Phase 1 — On-device speech
- Home screen, MicButton with both recording modes, `expo-speech-recognition` wrapper with on-device requirement, permissions, offline-model check, live transcript, app-side silence timer, haptics.
- **Done when:** in both modes, speaking a sentence shows the correct live and final transcript with **airplane mode on**.

### Phase 2 — LLM extraction
- Provider interface + Groq and OpenRouter adapters, prompt, Zod schema (multi-entry), retry, fallback, Settings for provider/keys/models (SecureStore).
- `npm run eval` with ≥ 40 fixtures; tune until ≥ 90% pass on both providers.
- **Done when:** "add 100 rupees for eggs from salary and 50 for bread" yields two correct entries, and "gave Ali 5000 loan" / "took 10000 loan from brother" yield loan entries with the correct direction, from either provider by switching a setting.

### Phase 3 — Firebase integration
- Command-then-batch flow, Firestore rules and indexes, realtime listeners, entry list, pending rows, totals (today/month expenses), result card with Undo, status indicators, edit sheet, soft delete, Retry / Fix manually, empty/loading/error states.
- **Done when:** the end-to-end flow works, entries appear instantly, each command stores its transcript and raw LLM responses, and edits keep the `original` values.

### Phase 4 — Offline and reliability
- Processing queue, backoff and give-up rules, no double processing, network status chip.
- **Done when:** commands spoken in airplane mode, **then the app force-killed**, are still there on restart and are parsed automatically after reconnecting, with no duplicates or losses. A wrong API key produces `failed` with a clear reason, not an endless retry loop.

### Phase 5 — Polish
- Animations, dark mode, accessibility pass, app icon/splash, onboarding, error copy review, performance check.
- **Target:** end of speech → result card in **under ~2 seconds** on a normal connection.

### Phase 6 — Hardening and handoff
- Firestore rules tested with the emulator (owner-only, immutability, append-only attempts, no deletes); confirm no keys or `google-services.json` are committed; README; build instructions for a release APK/AAB (EAS or local).
- Document the schema in `/docs/DATA_MODEL.md` for the future dashboard (including that edits must preserve `transcript`, `llmAttempts` and `original`, and set `edited`).

---

## 9. Non-Functional Requirements
- **Privacy:** speech is processed on-device and no audio is stored; only the transcript text is sent to the chosen LLM provider and to Firebase. Mention this in the README.
- **Security:** API keys in SecureStore only; owner-only Firestore rules with immutability checks; keys and `google-services.json` never committed.
- **Cost:** short prompts, small model, `max_tokens ≈ 400`, `temperature 0`.
- **Reliability:** every voice command results in a saved command, even offline and across app kills. Simple in-app debug log (hidden screen, e.g. long-press the gear icon) to diagnose issues without a backend.
- **Time:** all "today", "month" and relative-date logic uses the device time zone (Asia/Karachi for this user).
- **Code quality:** TypeScript strict mode; shared types; small components; comments only where non-obvious.

---

## 10. Working Agreement for AGY
1. Read this whole document (and skim `DASHBOARD_PLAN.md` for data-model constraints), then write `IMPLEMENTATION_PLAN.md` with tasks per phase **before** coding.
2. Work phase by phase; at the end of each phase, summarise what was done and how to verify it.
3. Do not invent features outside this document. Put ideas in `/docs/IDEAS.md`.
4. When a manual step is needed from the user (Firebase console, API keys, device testing, downloading offline speech packs), stop and list the exact steps in `SETUP.md` rather than guessing.
5. Ask the user only for: `google-services.json` / Firebase setup, Groq/OpenRouter keys, and the sign-in email.
6. Record any deviation from this plan, with the reason, in `DECISIONS.md`.

---

## 11. Future (design for it, don't build it)
- **Web admin dashboard** — see `DASHBOARD_PLAN.md`.
- Account balances per source, budgets, iOS, home-screen widget / quick-launch, auto-listen on open.
