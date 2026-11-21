# Ideas (not built)

Never build these unasked. Tags: **in plan** = fits the current plan as is · **changes plan** =
adds behaviour the plan doesn't describe (needs your OK) · **changes data model** = new Firestore
fields, so `DATA_MODEL.md` and the future dashboard are affected. Size: S ≈ < 100 lines · M ≈ a few hundred.

## Product improvements and small side features (proposed 2026-11-21)
| # | Idea | Why it helps | Size | Tags |
|---|---|---|---|---|
| I1 | **Test API key** button in Profile: one tiny request per provider, shows ✓ or the reason | Catches a bad key before your first note fails | S | in plan (settings polish) |
| I2 | **Type a note** instead of speaking: a small text field that feeds the same LLM pipeline | Useful in a quiet office, on a noisy road, or when STT mishears a name | S | changes plan; changes data model (`meta.sttEngine: 'typed'`) |
| I3 | **Compare with last month** in Insights: "spent 12 % less than October" plus a per-category ▲▼ | The most-asked question after "how much did I spend" | S | changes plan (small Insights addition) |
| I4 | **Tap a category bar → Activity filtered to it** | Jump from "where it went" straight to the entries | S | changes plan (navigation only) |
| I5 | **Repeat an entry**: long-press a row → "Add again today" | Daily fixed costs (milk, bus fare) without speaking | S | changes plan |
| I6 | **Daily reminder** at a chosen time if nothing was logged today (`expo-notifications`) | Habit building, the main reason logs get abandoned | M | changes plan; new native dependency |
| I7 | **App lock** with fingerprint / device PIN (`expo-local-authentication`) | Money data on a shared or lost phone | S | changes plan; new native dependency |
| I8 | **Monthly budget** with a progress bar on Home | Turns a log into a spending limit | M | changes plan *and* conflicts with DASHBOARD_PLAN "budgets out of scope" |
| I9 | **Per-person loan balances** (who owes whom) | Loans are a first-class type, but there is no balance view yet | M | changes data model (`person` field); DASHBOARD_PLAN lists it as a later idea |
| I10 | Home-screen **widget / quick-settings tile** that starts recording | One tap from anywhere on the phone | M | changes plan; native code via config plugin |

## Developer / diagnostics
- Persist the debug log to a file so it survives app kills.
- Show token usage per LLM attempt in the debug screen.

## Suggested order if you want some
I1 → I3 → I4 → I2: all small, no new native dependencies. I6 and I7 each add a native module,
so they need a new dev build.

## Status
- **I1** done (`feat/test-api-key`): 'Test key' per provider in Profile (pingProvider in the shared llm module).
- **I3** done (`feat/insights-month-compare`): hero line '% less/more than <month> (same days)' and ▲/▼ per category.
- **I4** done (`feat/category-drilldown`): category bars in Insights open Activity filtered to that month + category (route params).
- **I2** done (`feat/type-a-note`): keyboard button on Home → 'Type a note' sheet → same pipeline; meta 'typed' (DATA_MODEL + DECISIONS #21).
- **I5** done (`feat/repeat-entry`): long-press (or TalkBack action) an entry → 'Add again today?' → copy dated now, with Undo.
- **I8** done (`feat/monthly-budget`): settings.monthlyBudget; Home bar '₨X left of ₨Y' / '⚠ over'; Profile field (DATA_MODEL + DECISIONS #22).
- **I9** done (`feat/loan-balances`): entries.person (loans), prompt v2, Person field, Insights 'Loan balances (all time)'; rules updated — deploy them.
- **I6** done (`feat/daily-reminder`): expo-notifications; Profile toggle + 7–10 pm; next 7 days scheduled, today skipped once logged (DECISIONS #24). Needs a dev-build rebuild.
