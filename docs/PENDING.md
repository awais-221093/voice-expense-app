# Pending work queue

Read this when the user asks **"what's next?"**. Answer with the top open item (and the rest
in order), then wait for the user's go-ahead. When a task's PR is merged, delete its row and mark its
plan file done. When a new task is agreed, add it here with a plan in `docs/plans/`.
This file must always exist, even when the queue is empty.

| # | Task | Plan | Branch | Status |
|---|---|---|---|---|

Status values: `planned` → `in progress (PR #n)` → removed once merged.
