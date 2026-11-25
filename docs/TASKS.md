# Tasks

Live checklist. `[x]` done · `[~]` code written, needs verification · `[ ]` to do.
Owner: **A** = agent (code), **U** = user (installs, console, phone).

## Phase 0 — Setup
- [x] A  Git repo, `main` + `staging`, branch-per-task workflow (CLAUDE.md)
- [x] A  COMMANDS.md, SETUP.md, planning docs
- [x] A  app.json (Android package, plugins, minSdk 33), eas.json, firebase.json, .gitignore secrets
- [x] A  Remove template demo screens
- [x] A  Theme, UI primitives, Firebase module, auth hook, sign-in, Stack.Protected gate
- [x] A  Install packages (COMMANDS §1–3); typecheck, lint and expo-doctor pass
- [ ] U  Firebase project, Android app, `google-services.json`, auth user (SETUP §1–2)
- [ ] U  Push repo to GitHub (needed for PRs) — see ISSUES #6
- [ ] U  Dev build on phone; sign in; restart app → still signed in

## Phase 1 — On-device speech
- [~] A  useVoiceRecorder (hold/tap, 300 ms min, 30 s cap, silence timer, segment merge)
- [~] A  Readiness check, speech-setup screen, model download trigger
- [~] A  MicButton with pulse, haptics, a11y labels
- [ ] U  Verify both modes in airplane mode (English, then Urdu)

## Phase 2 — LLM extraction
- [x] A  Shared types, parser/normaliser, prompt (12 few-shots)
- [x] A  Provider client (Groq/OpenRouter), extraction orchestrator, fallback
- [x] A  Settings store + SecureStore keys + settings UI
- [x] A  42 fixtures + `npm run eval`
- [ ] U  Run eval on both providers; share output
- [ ] A  Tune prompt until ≥ 90 % on both

## Phase 3 — Firebase integration
- [x] A  Rules + indexes
- [~] A  Command create → batch result write; listeners; home list; totals; result card + Undo
- [~] A  Edit sheet, soft delete + Undo, Retry / Fix manually / Dismiss
- [x] A  Rules + indexes deployed to voice-expense-app-8262a (2026-11-21, CLI with --project; repo not linked)
- [ ] U  End-to-end test on phone

## Phase 4 — Offline and reliability
- [~] A  Queue: start/foreground/reconnect/timer triggers, backoff, give-up, no double processing
- [~] A  Offline chip; re-queue after key/model change
- [ ] U  Airplane mode → speak → force kill → reopen → reconnect: parsed once, no duplicates
- [ ] U  Wrong API key → `failed` with clear reason, no retry loop

## Navigation (user request)
- [x] A  Package renamed to `com.voiceexpense.app`
- [~] A  Bottom tabs with raised centre mic; RecorderProvider for all tabs
- [~] A  Home tab redesign, Activity tab, Insights tab, Profile tab (settings moved)
- [ ] U  Check on device: holding the tab-bar mic feels right; overlay never hides important content

## Phase 5 — Polish
- [ ] A  App icon + splash artwork
- [~] A  Onboarding: first-run permission + model check flow review (speech setup opens once on first run)
- [ ] A  Copy review, reduced-motion and large-text pass
- [ ] U  Measure end-of-speech → result card (< 2 s target)

## Phase 6 — Hardening
- [ ] A  Rules tests with emulator (`@firebase/rules-unit-testing`)
- [ ] A  Unit tests for `schema.ts` and `status.ts` (pure, no device needed)
- [ ] A  README rewrite (privacy note), release build steps
- [ ] U  Confirm no secrets in git history

## Post-generation audit (2026-11-21, see docs/WORKPLAN.md)
- [x] A  Work plan, CLAUDE.md rules, code / UX / product reports
- [x] A  AUDIT C1–C6 runtime fixes; C7–C8 doc hygiene
- [x] A  `npx expo install --fix` (AUDIT C9) — expo-doctor 20/20
- [ ] U  Rebuild the dev build (native `expo-dev-client` changed; COMMANDS §4)
- [x] A  AUDIT C10: filler housekeeping log files removed (user OK 2026-11-21)
- [x] A  UX audit U1–U18 built (#116–#135)
- [x] A  Ideas I1–I10 + developer ideas (#137–#149)
- [ ] U  `npm run prebuild:clean` then rebuild the dev build: new native modules (notifications, local-authentication, file-system) and the launcher-shortcut plugin
- [x] A  Current rules (entries.person, I9) deployed with the indexes
- [ ] U  `npm run eval` on both providers: prompt v2 adds `person` (I9)
- [ ] U  On device: check the UX changes (each PR has a Verify step)
- [ ] U  On device: verify the C1–C6 fixes (each PR has a Verify step)
- [x] A  UX audit 2 (first run and failures) U19–U32 built (#158–#171, #173)
- [x] A  In-app sign-up (#172) and Light / Dark / Device theme (#174)
- [ ] U  `npm i -D @resvg/resvg-js`, then the app icon + splash task (PENDING #1)
- [ ] U  `npm run prebuild:clean` + rebuild: `app.json` permission texts changed (U25)
- [ ] U  On device: check the audit-2 fixes, sign-up and theme (ISSUES #15)
