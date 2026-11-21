# Pending work queue

Read this when the user asks **"what's next?"**. Answer with the top open item (and the rest
in order), then wait for the user's go-ahead. When a task's PR is merged, delete its row and mark its
plan file done. When a new task is agreed, add it here with a plan in `docs/plans/`.
This file must always exist, even when the queue is empty.

| # | Task | Plan | Branch | Status |
|---|---|---|---|---|
| 1 | App icon + splash screen, generated from one SVG (the talking coin); same mark on the splash and the sign-in screen | [`plans/APP_ICON_SPLASH_PLAN.md`](plans/APP_ICON_SPLASH_PLAN.md) | `feat/app-icon-splash` | planned |
| 2 | In-app sign-up with automatic sign-in; remove "create the user in the Firebase console" from docs and code | [`plans/SIGN_UP_PLAN.md`](plans/SIGN_UP_PLAN.md) | `feat/sign-up` | planned (changes the spec — user asked for it) |
| 3 | Theme choice in Profile: Light · Dark · Device (default), instead of always following the phone | [`plans/THEME_SETTING_PLAN.md`](plans/THEME_SETTING_PLAN.md) | `feat/theme-setting` | planned |

Status values: `planned` → `in progress (PR #n)` → removed once merged.
