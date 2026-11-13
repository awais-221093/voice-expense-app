# Progress log

Newest first. Each entry: what changed, which branch, how to verify.

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
