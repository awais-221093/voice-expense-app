# Progress log

Newest first. Each entry: what changed, which branch, how to verify.

## 2026-11-21 — Audit fixes C1–C8

PRs #106–#111 plus `docs/audit-hygiene`, all into `staging`.
- C1 mic ignores presses while stopping · C2 readiness re-checked on press (closes ISSUES #11) · C3 setup → Profile uses `dismissTo` · C4 Profile model field stays in sync · C5 promise rejections handled · C6 queue reruns after a mid-run trigger · C7/C8 stale comments and ISSUES #6.
- Verified: `npm run typecheck` ✓ and `npx expo lint` ✓ on every PR; `npx expo export --platform android` ✓ on the final staging. Not yet run on a device.
- C9: Expo patch updates (#113), expo-doctor 20/20; dev build needs a rebuild. C10: filler log files removed (user OK).

## 2026-11-21 — Post-generation audit: plan, CLAUDE.md, code / UX / product reports

PRs #101–#105 into `staging` (docs only, no code changes).
- `docs/WORKPLAN.md`: phases A–E. `CLAUDE.md`: commit rules, audit workflow, no silent requirement changes.
- `docs/AUDIT.md`: typecheck, lint and the Android bundle export are clean, so there are no compile errors. 10 runtime/hygiene findings (C1–C10); fixes wait for confirmation.
- `docs/UX_AUDIT.md`: 18 findings (U1–U18). `docs/IDEAS.md`: 10 tagged feature proposals (I1–I10).
- Verify: read the four docs; next step is the user choosing which findings to fix.

## 2026-11-13 — Package rename + bottom tab navigation

Branches: `chore/rename-package` → `feat/tab-navigation` (stacked on `chore/install-deps`).
- Android package is now `com.voiceexpense.app` (register this in Firebase).
- Tabs: Home · Activity · [raised mic] · Insights · Profile. Recording, result card, toasts and the edit sheet moved into an app-wide `RecorderProvider`, so the mic works from every tab.
- New: Activity (month history, filters, search), Insights (spent, daily average, in/out/net, category & source bars, per type). Settings moved into Profile.
- Verified: `npm run typecheck` ✓, `npx expo lint` ✓, `npx expo export --platform android` bundles ✓. Not yet run on a device.

## 2026-11-13 — Packages installed, typecheck + lint green

Branch `chore/install-deps` (from `docs/agent-tracking`). User asked the agent to run installs this time.
- Installed everything in COMMANDS §1 (versions in package.json); added `@types/node` + `scripts/tsconfig.json`.
- Fixed RN Firebase v27 type imports; fixed 3 React Compiler lint errors (result card now derived in render).
- ESLint + Prettier configured; sources formatted.
- `npm run typecheck` ✓, `npx expo lint` ✓, `npx expo-doctor` 20/20 ✓.
- Offline smoke test with tsx: parser handles fenced/bare-array/garbage output; fallback after invalid JSON + 401 works.
- Next (user): Firebase setup + `google-services.json` → `npx expo prebuild` → `npx expo run:android --device`; `.env` keys → `npm run eval`.

## 2026-11-13 — Phases 0–4 code written (unverified)

**Branches** (stacked, each from the previous one):
`feat/phase-0-setup` → `feat/llm-extraction` → `feat/settings-store` → `feat/speech` → `feat/firestore-data` → `feat/home-ui`.
`main` holds the initial scaffold; `staging` branches from it. No remote yet, so no PRs (ISSUES #6).

**Done**
- Repo set up: CLAUDE.md (agent + git rules), COMMANDS.md (user-run commands), docs/ (plan, decisions, setup, data model, tasks, issues, assumptions, ideas).
- app.json: Android only, package `com.voiceexpense.app`, RN Firebase / speech / secure-store / build-properties plugins.
- Auth: email sign-in, session gate, splash held until session restored.
- Speech: recorder hook (both modes), readiness checks, setup screen, mic button.
- LLM: shared prompt/parser/client/orchestrator, 42 eval fixtures, `npm run eval`.
- Data: Firestore types, repos, status lifecycle, offline-aware queue, rules, indexes.
- UI: home (totals, list, result card, Undo), edit sheet, settings, debug log.

**Not verified** — packages aren't installed yet, so nothing has been typechecked, linted or run.

**How to verify (user)**
1. COMMANDS §1–3 → send Claude any `tsc` / lint errors.
2. SETUP §1–4, COMMANDS §4–5 → build on phone.
3. Walk through TASKS "U" items for Phases 0–4.
4. COMMANDS §6 → send the eval output.
