# Voice Expense Tracker — Web Dashboard Plan (future phase)

> **Status:** planned, **not** part of the current build. Build it only after the mobile app (`VOICE_EXPENSE_APP_PLAN.md`) is finished. Until then, this file exists so the mobile app's data model stays compatible.
>
> When work starts: read this file and `/docs/DATA_MODEL.md`, write `/docs/DASHBOARD_IMPLEMENTATION_PLAN.md` first, and record deviations in `DECISIONS.md`. Items marked **[CONFIRM]** must be confirmed with the user before building.

---

## 1. Purpose

A personal web dashboard for the same single user to:
- see the **complete history** of all records,
- **review and fix** entries the LLM got wrong, quickly and in bulk,
- see **reports and charts** (monthly totals by type, category and source),
- **export** data.

Same principles as the app: no backend, only Firebase. The dashboard reads and writes the same Firestore data.

### Out of scope
- Multi-user, sharing
- Creating entries by voice (that stays in the app)
- Budgets and account balances (separate future item)

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| App | **[CONFIRM]** React + Vite + TypeScript (static SPA) — default |
| Firebase | Firebase **JS SDK** (works fully on the web, including IndexedDB offline cache) |
| Auth | Same email/password account as the mobile app |
| Hosting | **[CONFIRM]** Firebase Hosting (static, free tier) — default; or run locally only |
| UI | A table component with sorting/filtering, a chart library, and the same color palette as the app |
| Validation | Reuse the shared Zod schemas/types from the mobile project (shared package or copied module) |

Development machine is Windows; scripts must work in PowerShell.

---

## 3. Data (read/write rules)

Uses exactly the collections defined in the app plan:

```
users/{uid}/settings/app
users/{uid}/commands/{commandId}
users/{uid}/entries/{entryId}
```

The dashboard **must**:
- never change `commands.transcript`, never remove or edit items in `commands.llmAttempts`, never change `entries.original`;
- set `edited: true`, `editedAt`, `updatedAt` on every entry edit;
- soft delete only (`deleted: true`); never hard delete;
- use the same entry types: `expense`, `savings`, `loan`, `committee`, `other`, and the same `direction` field (`inflow` / `outflow`; `expense` is always `outflow`); currency always `PKR`;
- work under the existing Firestore security rules (no rule loosening for the dashboard).

New fields the dashboard may need (e.g. `reviewedAt` on entries) must be added to the rules, the app's types and `DATA_MODEL.md` together, as optional fields the app ignores.

---

## 4. Screens

### 4.1 Sign in
Email/password.

### 4.2 Entries (main screen)
- Table: date, type, direction, description, amount, source, category, status flags (needs review, edited, deleted).
- Filters: date range (presets: today, this week, this month, last month, custom), type, direction, source, category, needs review, edited, show deleted.
- Search by description and transcript text.
- Inline editing of type, direction, amount, description, source, category, date.
- Bulk actions: change category, change source, change type, change direction, mark reviewed, soft delete, restore.
- Totals bar for the current filter (inflow, outflow and net per type).

### 4.3 Review queue
- All `needs_review` entries and `failed` / entry-less `needs_review` commands, oldest first.
- Side-by-side view: transcript | each LLM attempt (raw text, provider, model, error) | parsed entries (current vs `original`).
- Actions: fix fields, mark reviewed, create entry from a failed command, soft delete.
- Keyboard shortcuts for fast review (next/previous, save, mark reviewed).

### 4.4 Reports
- Month selector.
- Totals per type (expense, savings, loan, committee, other), each split into inflow, outflow and net.
- Overall money in vs money out for the month.
- Expense breakdown by category and by source.
- Month-over-month trend (last 12 months) per type.
- Daily expense chart for the selected month.
- Loans: total given vs total taken vs repaid (from `direction`). Per-person loan balances need a separate person field and are a later idea, not built here.

### 4.5 Commands log
- Every voice command with its status, transcript, LLM attempts and linked entries. Mainly for debugging the prompt.

### 4.6 Settings
- Edit `knownSources` and `categories` (same doc the app uses).
- **Rename / merge** a source or category across all entries (e.g. merge "grocery" into "groceries"), as a batched update that sets `edited: true`.

### 4.7 Export
- CSV export of the current filter (entries), and a full JSON backup of commands + entries.

---

## 5. Phases and Acceptance Criteria

### D0 — Setup
Project scaffold, Firebase JS SDK config, sign-in, hosting setup (if confirmed), `SETUP.md` steps (register a web app in the same Firebase project, authorized domains).
**Done when:** the user can sign in and see their raw entry count.

### D1 — Entries table
Table, filters, search, inline edit, soft delete/restore, totals bar.
**Done when:** an edit made in the dashboard appears instantly in the mobile app, with `edited: true` and `original` unchanged.

### D2 — Review queue and commands log
Side-by-side review, bulk actions, keyboard shortcuts.
**Done when:** every `needs_review` item can be fixed and cleared without leaving the screen.

### D3 — Reports
Monthly totals, breakdowns, trends, charts.
**Done when:** report totals match a manual sum of the same entries (add a small test).

### D4 — Settings, merge, export
Source/category management, merge tool, CSV and JSON export.
**Done when:** merging two categories updates all affected entries and the export opens correctly in Excel/Google Sheets.

### D5 — Hardening
Rules re-tested with the emulator for dashboard write patterns, README, deploy instructions.

---

## 6. Ideas for later (do not build)
- Budgets per category with monthly alerts.
- Account balances per source.
- Recurring entries (e.g. monthly committee).
- Re-run the latest prompt on old commands to compare results (writes a new `llmAttempts` item, never overwrites).
