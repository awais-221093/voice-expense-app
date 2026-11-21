# Code audit — broken code, compile-time and runtime errors

Audited 2026-11-21 on `staging` @ `b1d8cf7`. Scope: every file in `src/`, `scripts/`, `firebase/`,
`app.json`, `eas.json`. No product requirement is changed by any proposed fix.

## Baseline checks
| Check | Result |
|---|---|
| `npm run typecheck` (app + eval script) | ✓ clean |
| `npx expo lint` | ✓ clean |
| `npx expo export --platform android` | ✓ bundle builds (5.3 MB) |
| `npx expo-doctor` | ✗ 1 check: 5 Expo packages one patch behind (see C9) |
| Secrets in git history (`google-services.json`, `.env`, key patterns) | ✓ none found |
| Firestore rules vs. every write in `repo.ts` files | ✓ consistent |
| Composite indexes vs. every query | ✓ consistent |

**No compile-time errors.** The findings below are runtime bugs found by reading the code;
none of them were reproduced on a device yet (no device run has happened so far).

## Findings
Severity: **high** = loses data or breaks a core flow · **medium** = wrong behaviour in a realistic case ·
**low** = robustness / hygiene. Status: open · confirmed · fixed (PR).

| # | Sev | Where | Problem | Proposed fix | Status |
|---|---|---|---|---|---|
| C1 | high | `src/features/recording/RecorderProvider.tsx:109`, `src/components/MicButton.tsx:40` | In hold mode, pressing the mic again while the previous recording is still `stopping` calls `recorder.start()` again. That resets the recorder's refs, so the first recording's late `end` event sees the *new* (empty) session: the first transcript is lost and the new session can end up `idle` while the recogniser runs. | Ignore `start()` unless `phase === 'idle'`. | fixed (`fix/recorder-restart-guard`) |
| C2 | high | `RecorderProvider.tsx:62-70, 110` | Speech readiness is checked only on mount and on app foreground. After the user fixes the problem on the setup screen ("Allow microphone", "Try again" succeeds → `router.back()`), the cached result can still be "not ready", so the next mic press opens the setup screen again. The same stale cache causes ISSUES #11 (first press before the check finished opens setup). | When the cache says not ready, run a fresh check on press. Start recording if it now passes; open setup only if it still fails. | fixed (`fix/speech-readiness-refresh`) |
| C3 | medium | `src/app/speech-setup.tsx:70` | "Open settings" calls `router.replace('/profile')` from the modal. That replaces the modal with a second `(tabs)` navigator on the root stack: a second `RecorderProvider` and recogniser listener, and Back returns to another copy of the tabs. | `router.dismissTo('/profile')`. | open |
| C4 | medium | `src/app/(tabs)/profile.tsx:126-131, 201` | The model field copies `settings.llmModels[p]` into state once, on mount. If Profile mounts before the settings snapshot arrives, or the model changes elsewhere, the field shows a stale value, and focusing then leaving it saves that stale value over the real model. | Remount the field when the stored value changes (`key={value}`). | open |
| C5 | medium | `RecorderProvider.tsx:65`, `speech-setup.tsx:41-50`, `profile.tsx:30,124`, `EditEntrySheet.tsx:67-71` | Several promises have no rejection handler: the readiness check, setup-screen retry, `installedLocales`, `setKey` (SecureStore), "Show what I said" (`getDoc`, which fails offline when the command isn't cached). These cause red-box errors in dev and silent failures in release. | Catch and log via `log` / show a short status; "Show what I said" falls back to "(not available offline)". | open |
| C6 | low | `src/features/commands/queue.ts:70-72` | `run()` returns early while a run is in progress, and that request is dropped. In practice a later snapshot usually re-triggers it, but that's timing-dependent: a command spoken while another is being processed can wait until the next foreground or network change. | Remember "run requested while running" and run once more in `finally`. | open |
| C7 | low | `src/app/debug.tsx:10`, `src/lib/debugLog.ts:1` | Comments say "long-press the gear", but the gear is gone; the debug log opens with a long press on the Profile avatar. | Fix the comments. | open |
| C8 | low | `docs/ISSUES.md` #6 | Says "no git remote, PRs can't be opened". The remote exists and PRs work. | Close the issue. | open |
| C9 | low | `package.json` | `expo-doctor`: `expo`, `expo-dev-client`, `expo-router` (+2) are one patch behind SDK 58's expected versions. | **User command:** `npx expo install --fix` (added to COMMANDS.md). | open |
| C10 | low | `docs/PR_LOG.md`, `docs/pr-log/*.md` (77 files) | PRs #24–#100 only added "housekeeping log" files. Nothing reads them; they're filler that buries real history. | Delete the files in one `chore/` PR. History isn't rewritten. **Needs your OK.** | open |

## Checked and fine (no action)
- Processing queue: no double processing (in-flight ref + `handled` map + deterministic entry ids), offline doesn't burn attempts, and backoff matches the plan (30 s / 2 min / 10 min / 1 h, give up after 5 attempts).
- LLM client: error classification (401/403 fatal, 429/408/5xx transient, Groq `json_validate_failed` as invalid JSON, OpenRouter HTTP-200 errors), timeout via `AbortController`, and fallback order all match plan §3.2 / §4.
- Settings first run writes defaults only after the server confirms the doc is missing, so an offline cache can't overwrite real settings.
- `useCollection` keys snapshots by query key, so switching months never shows the old month's data.
- Totals use `spentAt` and count only `expense` entries (plan §6.1), and the Home month total uses the full month query, not the 100-entry list.
