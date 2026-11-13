# Open issues

Status: **open** · **blocked (user)** · **verify (device)** · **closed**. Close items by moving them to the bottom with the fix.

| # | Status | Issue | Next step |
|---|---|---|---|
| 1 | blocked (user) | Nothing typechecked/linted/run yet: dependencies not installed. API calls for RN Firebase v27, expo-speech-recognition and Expo SDK 58 were written from current docs but not compiled. | User runs COMMANDS §1–3 and shares errors. |
| 2 | open | `expo-speech-recognition` README lists pins up to SDK 57; SDK 58 support assumed via `npx expo install`. | Check the installed version; if it fails, record in DECISIONS and propose an alternative. |
| 3 | verify (device) | Continuous mode on Android: unclear whether each final result is a segment or the full text so far. `mergeSegment` handles both, but check for doubled words. | Speak two sentences with a pause in hold mode. |
| 4 | verify (device) | Exact error when the offline model is missing (assumed `language-not-supported`); readiness pre-check should catch it first. | Remove the Urdu model and try Urdu. |
| 5 | verify | Default model `openai/gpt-oss-20b` on both providers, and OpenRouter's `reasoning` parameter. | `npm run eval`; switch model in Settings if needed. |
| 6 | blocked (user) | No git remote, so PRs into `staging`/`main` can't be opened. | Create a GitHub repo and add it as `origin` (or ask Claude to run `gh repo create`). |
| 7 | open | Firestore rules have no emulator tests yet (Phase 6). | Add `@firebase/rules-unit-testing` tests. |
| 8 | open | Hold-to-talk with TalkBack needs double-tap-and-hold; tap mode is the accessible alternative. | Mention in onboarding (Phase 5). |
| 9 | open | Home list shows the latest 100 entries; open commands are capped at 50. Full history is the dashboard's job. | Revisit if needed. |
| 10 | open | App icon and splash are still Expo defaults (colour updated to teal). | Phase 5 artwork. |
| 11 | verify (device) | If the user releases the mic before the readiness check finished on first launch, the setup screen opens instead of recording. Readiness is cached on focus, so this should only affect the very first press. | Observe on first install. |
