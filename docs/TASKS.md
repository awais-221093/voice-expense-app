# Tasks

Live checklist. `[x]` done · `[~]` code written, needs verification · `[ ]` to do.
Owner: **A** = agent (code), **U** = user (installs, console, phone).

## Phase 0 — Setup
- [x] A  Git repo, `main` + `staging`, branch-per-task workflow (CLAUDE.md)
- [x] A  COMMANDS.md, SETUP.md, planning docs
- [x] A  app.json (Android package, plugins, minSdk 33), eas.json, firebase.json, .gitignore secrets
- [x] A  Remove template demo screens
- [x] A  Theme, UI primitives, Firebase module, auth hook, sign-in, Stack.Protected gate
- [ ] U  Install packages (COMMANDS §1–3), report typecheck/lint errors
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
- [ ] U  Deploy rules + indexes (COMMANDS §5)
- [ ] U  End-to-end test on phone

## Phase 4 — Offline and reliability
- [~] A  Queue: start/foreground/reconnect/timer triggers, backoff, give-up, no double processing
- [~] A  Offline chip; re-queue after key/model change
- [ ] U  Airplane mode → speak → force kill → reopen → reconnect: parsed once, no duplicates
- [ ] U  Wrong API key → `failed` with clear reason, no retry loop

## Phase 5 — Polish
- [ ] A  App icon + splash artwork
- [ ] A  Onboarding: first-run permission + model check flow review
- [ ] A  Copy review, reduced-motion and large-text pass
- [ ] U  Measure end-of-speech → result card (< 2 s target)

## Phase 6 — Hardening
- [ ] A  Rules tests with emulator (`@firebase/rules-unit-testing`)
- [ ] A  Unit tests for `schema.ts` and `status.ts` (pure, no device needed)
- [ ] A  README rewrite (privacy note), release build steps
- [ ] U  Confirm no secrets in git history
