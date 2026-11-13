# Implementation Plan

Source of truth: `VOICE_EXPENSE_APP_PLAN (2).md` (rev 2). Deviations: `DECISIONS.md`.
Package installs and builds are run by the user from `COMMANDS.md`.

Legend: `[x]` code written · `[ ]` to do · **(device)** needs the user's phone to verify.

## Code layout

```
src/app/                 Expo Router routes only
  _layout.tsx            providers, auth gate (Stack.Protected), queue runner
  sign-in.tsx            email/password
  index.tsx              home: totals, list, mic, result card
  settings.tsx           all settings (gear icon); long-press gear → debug
  speech-setup.tsx       permission / offline-model explanation screen
  debug.tsx              in-memory debug log
src/features/
  llm/                   SHARED with Node eval (no RN imports, relative imports only)
    types.ts schema.ts prompt.ts providers.ts extract.ts
  speech/                useVoiceRecorder, readiness checks
  commands/              Firestore repo, status logic (pure), processor, queue hook
  entries/               Firestore repo, hooks, totals (pure)
  settings/              defaults, zustand store (Firestore doc + SecureStore keys)
src/components/          MicButton, LiveTranscript, EntryRow, CommandRow, TotalsHeader,
                         ResultCard, Snackbar, EditEntrySheet, ui primitives
src/lib/                 firebase, time, money, haptics, network, debugLog, appInfo
src/theme/               colors, spacing, typography, useTheme
firebase/                firestore.rules, firestore.indexes.json (+ rules tests in Phase 6)
scripts/llm-eval/        fixtures.json, run.ts
```

## Phase 0 — Setup
- [x] COMMANDS.md with install/build steps
- [x] app.json: Android package, google-services, RN Firebase + speech + build-properties plugins
- [x] .gitignore: google-services.json, .env
- [x] Remove template screens/components
- [x] Firebase module (`src/lib/firebase.ts`), auth hook, sign-in screen, Stack.Protected gate
- [x] docs/SETUP.md (Firebase project, Android app, auth user, rules deploy, keys, dev build)
- [ ] **(device)** dev build runs, sign-in persists after restart

## Phase 1 — On-device speech
- [x] `useVoiceRecorder`: hold / tap modes, 300 ms min hold, 30 s cap, app-side silence timer,
      continuous mode segment accumulation, interim results
- [x] Readiness check: permissions, on-device support, installed locales, model download trigger
- [x] speech-setup screen (permission denied / model missing / open settings)
- [x] MicButton (pulse, haptics, a11y), LiveTranscript
- [ ] **(device)** both modes work in airplane mode

## Phase 2 — LLM extraction
- [x] Shared types, Zod top-level schema + per-field normaliser (issues → needsReview)
- [x] Prompt with 12 few-shot examples (EN, Urdu script, mixed, multi-entry, all types/directions)
- [x] OpenAI-compatible provider adapter (Groq, OpenRouter), 10 s timeout, 1 retry on transient
- [x] Extraction orchestrator: invalid-JSON retry, fallback provider, outcome classification
- [x] SecureStore keys + settings UI for provider/keys/models/fallback
- [x] 40+ fixtures + `npm run eval` runner
- [ ] **(user)** run eval on both providers, tune prompt to ≥ 90 %

## Phase 3 — Firebase integration
- [x] Command create (fire-and-forget, offline-safe), batched result write, deterministic entry ids
- [x] Firestore rules + indexes
- [x] Realtime hooks: recent entries, month entries, open commands
- [x] Home: totals (expense only), list with pending/failed/needs-review rows, result card + Undo
- [x] Edit sheet: all fields, "Show what I said", soft delete + Undo snackbar
- [x] Retry / Fix manually / Dismiss on failed rows
- [ ] **(device)** end-to-end

## Phase 4 — Offline and reliability
- [x] Processing queue from Firestore `status == "pending"`, triggers: start, foreground, reconnect, retry timer
- [x] Backoff 30 s / 2 min / 10 min / 1 h, give up after 5, immediate fail on 401/403/400
- [x] In-flight set, skip commands with entries, deterministic ids
- [x] Offline chip
- [x] Auto re-queue failed commands once after key/model change
- [ ] **(device)** airplane mode + force kill test

## Phase 5 — Polish
- [ ] App icon / splash artwork
- [ ] Onboarding flow review on device, copy review, reduced-motion check, perf check (< 2 s to card)

## Phase 6 — Hardening
- [ ] Rules unit tests with emulator (`@firebase/rules-unit-testing`)
- [ ] README rewrite, release build steps, DATA_MODEL.md final review
