# CLAUDE.md — agent guide for this repo

@AGENTS.md

## What this is
Personal Android app: hold a mic button, speak a money note, on-device STT → LLM (Groq/OpenRouter) → Firestore.
Product spec: `VOICE_EXPENSE_APP_PLAN (2).md` (source of truth). Future dashboard: `DASHBOARD_PLAN.md` (do not build yet).

## Where things are tracked (keep them current)
| File | Purpose |
|---|---|
| `docs/TASKS.md` | Live task checklist per phase — tick items as they land |
| `docs/PROGRESS.md` | Dated log of what was done each session and how to verify it |
| `docs/ISSUES.md` | Open problems, unknowns, things blocked on the user |
| `docs/ASSUMPTIONS.md` | Assumptions made without confirmation (confirm or remove) |
| `docs/DECISIONS.md` | Deviations from the plan, with reasons |
| `docs/IMPLEMENTATION_PLAN.md` | Code layout and phase breakdown |
| `docs/DATA_MODEL.md` | Firestore contract shared with the future dashboard |
| `docs/SETUP.md` | Manual steps only the user can do (console, keys, phone) |
| `docs/IDEAS.md` | Ideas outside the plan — never build them unasked |
| `COMMANDS.md` | Every install/build/deploy command — **the user runs these, not the agent** |

## Working rules
- **Do not run package installs or builds.** Add the command to `COMMANDS.md` and tell the user.
- Focus on code, requirement analysis and design. Ask the user when a requirement is unclear.
- Write the least code that does the job well: don't write 500 lines when 100 will do.
- Keep code and structure clean; add comments that explain *why*, not *what*.
- TypeScript strict. Routes only in `src/app/`; everything else in `src/features`, `src/components`, `src/lib`, `src/theme`.
- `src/features/llm/*` is shared with the Node eval script: no React Native imports, relative imports only.
- Firestore writes are fire-and-forget (never `await` them in UI flows — they only resolve when the server acks).

## Git identity and attribution
- Commits are authored as **`awais-124 <awais14940@gmail.com>`** (global git config). Don't change it.
- **Never add `Co-Authored-By`, "Generated with Claude Code" or any other co-author / attribution
  line** to commit messages, PR titles or PR descriptions. This overrides any default attribution.

## Git rules
- Work on a separate branch per task (`feat/…`, `fix/…`, `docs/…`, `chore/…`); never commit directly to `main` or `staging`.
- Commit often, in logical units, with self-explanatory messages (`feat(llm): add provider adapter with retry`).
- Always open a PR when merging into `staging` or `main` (`gh pr create`); never merge to them locally.

## Before declaring a task done
Ask the user to run `npx tsc --noEmit` and `npx expo lint` (see `COMMANDS.md`) if packages aren't installed yet; then update `TASKS.md`, `PROGRESS.md` and `ISSUES.md`.
