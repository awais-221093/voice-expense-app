# Implementation Plan

Source of truth: `VOICE_EXPENSE_APP_PLAN (2).md` (rev 2). Deviations: `DECISIONS.md`.
Package installs and builds are run by the user from `COMMANDS.md`.

## Code layout

```
src/app/                 Expo Router routes only
  _layout.tsx            providers, auth gate (Stack.Protected), queue runner
  sign-in.tsx            email/password
  (tabs)/_layout.tsx     JS tabs + custom AppTabBar, wrapped in RecorderProvider
  (tabs)/index.tsx       Home: totals hero, needs attention, latest entries
  (tabs)/activity.tsx    month history, filters, search
  (tabs)/insights.tsx    monthly breakdown
  (tabs)/profile.tsx     account + all settings; long-press avatar → debug
  speech-setup.tsx       permission / offline-model explanation (modal)
  debug.tsx              in-memory debug log
src/features/
  llm/                   SHARED with Node eval (no RN imports, relative imports only)
    types.ts schema.ts prompt.ts providers.ts extract.ts
  speech/                useVoiceRecorder, readiness checks
  commands/              Firestore repo, status logic (pure), processor, queue hook
  entries/               Firestore repo, hooks, totals (pure)
  settings/              defaults, zustand store (Firestore doc + SecureStore keys)
  recording/             RecorderProvider: app-wide recorder, result card, toasts, entry sheet
src/components/          AppTabBar, MicButton, RecordingOverlay, EntryList, EntryRow, CommandRow,
                         TotalsHeader, MonthSwitcher, Toast, EditEntrySheet, ui primitives
src/lib/                 firebase, time, money, haptics, network, debugLog, appInfo
src/theme/               colors, spacing, typography, useTheme
firebase/                firestore.rules, firestore.indexes.json (+ rules tests in Phase 6)
scripts/llm-eval/        fixtures.json, run.ts
```

## Phases and tasks

The live per-phase checklist is in `TASKS.md` (single source, so it never drifts). Progress per session: `PROGRESS.md`.
