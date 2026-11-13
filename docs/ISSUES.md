# Open issues

Status: **open** · **blocked (user)** · **verify (device)** · **closed**. Close items by moving them to the bottom with the fix.

| # | Status | Issue | Next step |
|---|---|---|---|
| 3 | verify (device) | Continuous mode on Android: unclear whether each final result is a segment or the full text so far. `mergeSegment` handles both, but check for doubled words. | Speak two sentences with a pause in hold mode. |
| 4 | verify (device) | Exact error when the offline model is missing (assumed `language-not-supported`); readiness pre-check should catch it first. | Remove the Urdu model and try Urdu. |
| 5 | verify | Default model `openai/gpt-oss-20b` on both providers, and OpenRouter's `reasoning` parameter. | `npm run eval`; switch model in Settings if needed. |
| 6 | blocked (user) | No git remote, so PRs into `staging`/`main` can't be opened. | Create a GitHub repo and add it as `origin` (or ask Claude to run `gh repo create`). |
| 7 | open | Firestore rules have no emulator tests yet (Phase 6). | Add `@firebase/rules-unit-testing` tests. |
| 8 | open | Hold-to-talk with TalkBack needs double-tap-and-hold; tap mode is the accessible alternative. | Mention in onboarding (Phase 5). |
| 9 | open | Home list shows the latest 100 entries; open commands are capped at 50. Full history is the dashboard's job. | Revisit if needed. |
| 10 | open | App icon and splash are still Expo defaults (colour updated to teal). | Phase 5 artwork. |
| 11 | verify (device) | If the user releases the mic before the readiness check finished on first launch, the setup screen opens instead of recording. Readiness is cached on focus, so this should only affect the very first press. | Observe on first install. |
| 12 | open | npm 12 blocked postinstall scripts for `@firebase/util`, `protobufjs` (web Firebase SDK, not used on Android) and `esbuild` (tsx still works). | Only act if a build or `npm run eval` fails: `npm install-scripts approve <pkg>`. |

## Closed
| # | Issue | Resolution |
|---|---|---|
| 1 | Code never typechecked/linted | 2026-11-13: packages installed; `npm run typecheck`, `npx expo lint`, `npx expo-doctor` (20/20) all pass. |
| 2 | expo-speech-recognition SDK 58 support | Installed 58.0.1 via `npx expo install`. |
