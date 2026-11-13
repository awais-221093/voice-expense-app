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
| `COMMANDS.md` | Every install/build/deploy command, kept runnable in order |

## Working rules
- **Installs and builds:** by default the user runs them — add the command to `COMMANDS.md` and
  tell the user. Run them yourself only when the user asks (as they did for the first install),
  and still record every command in `COMMANDS.md`. Use `npx expo install` for packages.
- Focus on code, requirement analysis and design. Ask the user when a requirement is unclear —
  but for "it's on you" decisions (e.g. UX choices), decide, explain briefly, and record in `DECISIONS.md`.
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
- Make as many PRs as is sensible: **one task = one branch = one PR**. When the user lists several
  tasks, each gets its own branch and PR.

## Pull request workflow
- **The agent creates every PR itself** with the GitHub CLI, then shares the links.
- **The agent also merges them** from the CLI (`awais-124` has write access; `staging` has no protection
  rules), in creation order: wait until `gh pr view <n> --json mergeable` is `MERGEABLE`, then
  `gh pr merge <n> --merge`. Stop and report on the first conflict or failure. The user may also
  merge some PRs themselves from `awais-221093`; check `gh pr list --state all` before merging.
  Never merge `staging` → `main` without the user asking for a release.
  - CLI path (not on PATH): `"/c/Program Files/GitHub CLI/gh.exe"` in Bash,
    `& "C:\Program Files\GitHub CLI\gh.exe"` in PowerShell. Logged in as **`awais-124`**.
  - Repo: `awais-221093/voice-expense-app` (owner `awais-221093`).
- **Base:** feature PRs target `staging`. Releases are a separate PR `staging` → `main`.
- **Branch from the newest unmerged tip** (the latest open PR's branch) while earlier PRs are still
  open, so every PR contains what it depends on and merges cleanly in creation order. Once
  `staging` has caught up, branch from `staging`.
- PRs are merged **in the order they were created**, always with **"Create a merge commit"**
  (never squash or rebase — that would make the following PRs conflict). Say this in the PR body.
- After creating PRs, check them with `gh pr list --json number,headRefName,mergeable` and report
  any that aren't `MERGEABLE`.
- PR body: short "What" list and a "Verify" step. No attribution lines.
- Never force-push or rewrite history of anything already merged. Before merge, only with the user's OK.

## Project facts
- Android package: **`com.voiceexpense.app`** (must match the Firebase Android app). Android only, min SDK 33.
- Navigation: bottom tabs **Home · Activity · [raised mic] · Insights · Profile** (`src/app/(tabs)/`).
  Settings live in Profile. Recording, result card, toasts and the entry sheet live in
  `RecorderProvider` above the tabs.
- Secrets never go in git: `google-services.json` and `.env` (LLM keys for `npm run eval`) are ignored.
  In the app, API keys live in SecureStore only.
- Dev machine is Windows: no Python; Bash is Git Bash. Prefer Node one-liners for scripted edits.

## Before declaring a task done
1. `npm run typecheck` (app + eval script) and `npx expo lint` — both must be clean.
2. For UI/route changes, `npx expo export --platform android --output-dir <scratchpad>` to prove the bundle builds.
3. Update `docs/TASKS.md`, `PROGRESS.md`, `ISSUES.md` (and `DECISIONS.md` for deviations).
4. Commit, push, create the PR, check it is mergeable, and share the link.
