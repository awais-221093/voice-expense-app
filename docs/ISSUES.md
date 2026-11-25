# Open issues

Status: **open** · **blocked (user)** · **verify (device)** · **closed**. Close items by moving them to the bottom with the fix.

| # | Status | Issue | Next step |
|---|---|---|---|
| 3 | verify (device) | Continuous mode on Android: unclear whether each final result is a segment or the full text so far. `mergeSegment` handles both, but check for doubled words. | Speak two sentences with a pause in hold mode. |
| 4 | verify (device) | Exact error when the offline model is missing (assumed `language-not-supported`); readiness pre-check should catch it first. | Remove the Urdu model and try Urdu. |
| 5 | verify | Default model `openai/gpt-oss-20b` on both providers, and OpenRouter's `reasoning` parameter. | `npm run eval`; switch model in Settings if needed. |
| 7 | open | Firestore rules have no emulator tests yet (Phase 6). | Add `@firebase/rules-unit-testing` tests. |
| 9 | open | Home list shows the latest 100 entries; open commands are capped at 50. Full history is the dashboard's job. | Revisit if needed. |
| 10 | blocked (user) | App icon and splash are still Expo defaults (colour updated to teal). Planned in `plans/APP_ICON_SPLASH_PLAN.md`. | Run `npm i -D @resvg/resvg-js`, then ask for the icon task. |
| 15 | verify (device) | UX audit 2 fixes (#159–#174): app lock with the screen lock removed (U29), `service-not-allowed` → service screen (U19), online-recognition switch on the setup screen (U20), sign-up / password reset, theme switch without a flash. | Follow each PR's Verify step. |
| 12 | open | npm 12 blocked postinstall scripts for `@firebase/util`, `protobufjs` (web Firebase SDK, not used on Android) and `esbuild` (tsx still works). | Only act if a build or `npm run eval` fails: `npm install-scripts approve <pkg>`. |
| 13 | verify (device) | Hold-to-talk on the tab-bar mic: the 64 dp button is smaller than the old 112 dp one. hitSlop raised 8 → 14 dp (UX U6). | Try it one-handed; enlarge the circle if presses still miss. |
| 14 | open | Activity/Insights load a whole month per query (no pagination). Fine for personal volume (hundreds of entries). | Revisit only if months get very large. |

## Closed
| # | Issue | Resolution |
|---|---|---|
| 1 | Code never typechecked/linted | 2026-11-13: packages installed; `npm run typecheck`, `npx expo lint`, `npx expo-doctor` (20/20) all pass. |
| 2 | expo-speech-recognition SDK 58 support | Installed 58.0.1 via `npx expo install`. |
| 11 | Releasing the mic before the first readiness check finished opened the setup screen | 2026-11-21: the mic re-checks readiness on press when the cache says not ready (AUDIT C2). |
| 6 | No git remote, so PRs could not be opened | Remote `awais-221093/voice-expense-app` exists; PRs are created and merged with `gh` (AUDIT C8). |
| 8 | Hold-to-talk with TalkBack needs double-tap-and-hold | 2026-11-21: the first-run permission screen explains double-tap-and-hold and the Tap to talk alternative (UX U3). |
