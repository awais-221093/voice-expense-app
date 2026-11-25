# UX audit

Audited 2026-11-21 from the code (not yet on a device). Each item has the smallest fix.
Tag: **plan** = the plan already asks for it (a gap) · **polish** = within the plan, better execution ·
**changes plan** = needs your OK because it adds behaviour the plan doesn't describe.
Priority: P1 hurts the core "speak → saved" loop · P2 noticeable friction · P3 nice to have.

## Core loop: speak → saved
| # | Pri | Tag | Finding | Smallest fix |
|---|---|---|---|---|
| U1 | P1 | plan | After release, the only feedback is a spinner inside the mic. Plan §6.2 asks for an "Understanding…" label. The overlay shows nothing between the end of speech and the result card, so it feels like nothing happened. | Show an "Understanding…" card with the transcript in `RecordingOverlay` while the watched command is in flight. |
| U2 | P1 | polish | A missing API key only surfaces after you speak: the note fails with "no groq API key". A new user's first note always fails. | Home banner "Add an API key in Profile so notes can be understood", shown while the primary provider has no key. Tapping it opens Profile. |
| U3 | P1 | plan | There's no first-run onboarding (plan §6.6: sign in → permissions → offline model check). The first mic press is what discovers the problems. | Show the existing `speech-setup` screen once after the first sign-in if readiness fails, so it's fixed before the first note. |
| U4 | P2 | polish | Failure reasons are raw strings ("groq: HTTP 429; openrouter: invalid API key (HTTP 401)"). | Map reasons to plain text in `CommandRow` ("Your Groq key was rejected. Check it in Profile"); keep the raw reason on the debug screen. |
| U5 | P2 | polish | A pending command that is backing off says "Saved — will process when online" even when the phone is online (e.g. after a 429). | When online, say "Retrying in 2 min" (from `nextRetryAt`). |
| U6 | P2 | polish | The mic is 64 dp with an 8 dp hitSlop (ISSUES #13). Hold-to-talk needs a confident press, and presses near the edge miss. | Raise the hitSlop to 12–16 dp; check on device before changing the size. |

## Editing and lists
| # | Pri | Tag | Finding | Smallest fix |
|---|---|---|---|---|
| U7 | P2 | polish | The edit sheet has no visible close button, only backdrop or Back. The keyboard can cover Save, because the sheet is a `Modal` with `KeyboardAvoidingView behavior="height"`, which is unreliable inside Android modals. | Add a header row with ✕ and Save. Verify the keyboard on device. |
| U8 | P2 | polish | Changing a date by more than a few days takes many taps on ‹ › (ASSUMPTIONS #9). | Add "Today" and "Yesterday" chips next to the arrows. No new dependency. |
| U9 | P3 | polish | Activity search ignores type ("loan"). | Include `type` in the search fields. |
| U10 | P3 | polish | When several commands fail, "Needs attention" can push the whole list off screen. | Show 3 rows, then "Show N more". |

## Profile / settings
| # | Pri | Tag | Finding | Smallest fix |
|---|---|---|---|---|
| U11 | P2 | polish | One tap on a source or category chip removes it right away, with no undo. Easy to hit by accident while scrolling. | Show an Undo toast after removal (reuses `showToast`). |
| U12 | P2 | polish | Sign out is a single tap. | Confirm with a native `Alert`. |
| U13 | P2 | polish | Saving an API key gives no feedback: the field clears and the placeholder says "Saved". | Short "Key saved" toast; "Remove key" when one is set. |
| U14 | P3 | polish | You can pick a language whose offline model isn't downloaded ("Urdu (not downloaded)"). You find out only when you press the mic. | On select, open `speech-setup` with `model-missing` right away. |

## Accessibility and polish
| # | Pri | Tag | Finding | Smallest fix |
|---|---|---|---|---|
| U15 | P2 | plan | Toasts auto-hide after 5 s. With TalkBack that's often too short to reach Undo. | When a screen reader is on (`AccessibilityInfo`), extend to 10 s. |
| U16 | P3 | plan | Large text: the hero amounts (40 pt) and tab labels (fixed 12 pt) can clip at large font scales. | `adjustsFontSizeToFit` on hero amounts; cap `maxFontSizeMultiplier` on tab labels. |
| U17 | P3 | plan | Loading uses spinners; the plan asks for skeletons. | Simple grey placeholder rows in `EntryList` while loading. |
| U18 | P3 | polish | Sign-in: no show/hide password; Email doesn't move to Password with "Next". | `returnKeyType="next"` + focus the next field; an eye toggle. |

## Audit 2: first run and failures (2026-11-25)

Audited from the code (not yet on a device). Question asked for each screen: when it goes wrong, does the
user see what happened and what to do next? Same tags and priorities as above.

### Speech: the first press of the mic
| # | Pri | Tag | Finding | Smallest fix |
|---|---|---|---|---|
| U19 | P1 | polish | Android's `service-not-allowed` error ("recognizer unavailable") is mapped to `permission` (`useVoiceRecorder.ts:130`). The setup screen then says "Microphone access needed" with "Allow microphone", although the mic is already allowed. "Try again" finds everything ready and closes, and the next press fails the same way: a loop with a wrong message. Likely on phones without Google's speech service. | Map `service-not-allowed` to the `unsupported` problem and say it plainly: "This phone's speech service isn't available." |
| U20 | P1 | polish | The setup screens don't offer the obvious way out. **Unsupported** has "Open settings", which drops you at the top of Profile to find the toggle yourself. **Model missing** never mentions online recognition, so if the download doesn't work you're stuck (`speech-setup.tsx:66-79`). Typing a note isn't offered either. | On both screens add **"Use online recognition"**: it turns the setting on, re-checks and closes. Explain in one line that the voice then goes to Google. Add a **"Type a note instead"** ghost button. |
| U21 | P1 | polish | In hold mode, a press shorter than 300 ms is cancelled **silently** (`useVoiceRecorder.ts:106-108`). A new user's first instinct is to tap the mic, and nothing happens: no sound, no text, no hint. | On a too-short press, show a toast: "Hold the mic while you speak", with "Or switch to Tap to talk in Profile". |
| U22 | P2 | polish | Speech errors other than permission or model show "Speech recognition stopped" plus Android's **raw message** (`RecorderProvider.tsx:135-143`). The most likely cases have clear fixes the user isn't told: `network` (online recognition with no internet), `audio-capture` (mic in use by a call or another app) and `busy`. | Pass the error code through and map it. **network** → "No internet for online recognition. Type the note instead" (action: Type). **audio-capture** → "The microphone is in use by another app". **busy** → "Speech service is busy. Try again in a moment". |
| U23 | P2 | polish | Model download shows the library's raw status: "Download: opened_dialog", "Download: download_scheduled" or "Download: error: …" (`speech-setup.tsx:72`). | Map it. **success** → "Downloaded. Tap Try again". **scheduled** → "Download queued (it may wait for Wi-Fi). Tap Try again when it's done". **dialog** → "Finish in the dialog, then tap Try again". **error** → "Couldn't start the download. Use the steps above". |
| U24 | P3 | polish | On the setup screen, when "Try again" finds a *different* problem (e.g. mic now allowed but model missing), only the new title appears as a status line. The body and buttons still describe the old problem (`speech-setup.tsx:51`). Success closes the screen with no confirmation. | `router.setParams({ problem })` so the whole screen switches. On success, toast "Ready. Hold the mic to talk". |
| U25 | P3 | polish | Some copy is wrong with online recognition on. The permission screen says "Speech is turned into text on your phone". The Profile toggle says "if the offline model is missing", but it also covers phones with no on-device recognition at all, and it doesn't say voice goes to Google. | Permission copy: "…turned into text (on your phone when possible)". Toggle: "Use online recognition when on-device isn't available", with a small note "Your voice is sent to Google for transcription". |

### After a note is spoken
| # | Pri | Tag | Finding | Smallest fix |
|---|---|---|---|---|
| U26 | P1 | polish | When a note fails or needs review, the result card says only **"Saved — check later"** with the transcript: no reason, no action (`RecorderProvider.tsx:327-333`). A first note that hits a rejected key, a wrong model name or "no amount found" gives no clue. The reason is only on the Home row, which you may not be looking at. | Add `describeReason(statusReason)` as a line. For key or model problems, add the action **"Fix"** → Profile. |
| U27 | P2 | polish | **Offline**, a fresh note's row under "Needs attention" shows **"Understanding…" with a spinner** for as long as you stay offline (`CommandRow.tsx:23-28`: `attemptCount === 0` is checked before `online`). The result card a second earlier said "Saved — will process when online". | Check online first. Offline → "Saved — will process when online"; online with 0 attempts → "Understanding…". |

### Loading data
| # | Pri | Tag | Finding | Smallest fix |
|---|---|---|---|---|
| U28 | P2 | polish | When a Firestore listener fails, Home and Activity show the **raw error** ("Could not load entries: [firestore/permission-denied] …", `index.tsx:121`, `activity.tsx:109`). **Insights ignores the error entirely** and shows Rs 0, empty bars and "No open loans" as if they were true (`insights.tsx:33-37`). | One `friendlyLoadError(code)` in `useCollection`: **permission-denied** → "You're signed out or access was refused. Sign in again"; **failed-precondition** → "The database needs an update (index). See the debug log"; anything else → "Couldn't load. Check your connection". Insights shows that message instead of zeros. |

### Sign-in, lock and setup
| # | Pri | Tag | Finding | Smallest fix |
|---|---|---|---|---|
| U29 | P1 | polish | **App lock lock-out.** If the phone's screen lock is removed after the app lock was turned on, `authenticateAsync` can never succeed. The lock screen offers only "Unlock", which keeps failing, and the only way out is clearing app data (`appLock.ts:51-53`, `AppLockGate.tsx:31-44`). A failed or cancelled unlock also shows no message (e.g. too many attempts). Check on a device. | In `unlock()`, if `getEnrolledLevelAsync()` is `NONE`, turn the lock off and say "App lock turned off: this phone has no screen lock". Show a one-line reason under "Unlock" when it fails. |
| U30 | P2 | polish | **First API key.** The Home banner sends you to Profile, but Profile doesn't say where to get a key or that Groq's is free. A pasted key isn't checked, so a typo is found only when the first note fails (`profile.tsx:209-229`). | One line with a link per provider: "Get a free key at console.groq.com/keys". After a key is saved, run the existing **Test key** automatically. |
| U31 | P2 | changes plan | **Forgotten password:** sign-in only says "Email or password is wrong". There's no reset, and the only recovery is the Firebase console. This matters more once in-app sign-up lands (`PENDING.md` #2). | A "Forgot password?" ghost button that calls `sendPasswordResetEmail` for the typed email, then says "Reset link sent to …". Could join the sign-up PR. |
| U32 | P3 | polish | Edit sheet: an invalid amount only turns the field's border red and disables Save, with no text saying why (`EditEntrySheet.tsx:85, 136, 162`). | A small "Enter an amount above 0" line under the field while it's invalid. |

Suggested order: U21 → U19 → U20 → U26 → U29 (P1s), then the P2s.

## Status
- **U1** done (`feat/understanding-card`): 'Understanding…' card with transcript and spinner until the result card replaces it.
- **U2** done (`feat/api-key-banner`): Home banner → Profile while neither the primary nor an enabled fallback provider has a key.
- **U3** done (`feat/first-run-speech-setup`): speech setup opens once on first run if recording isn't ready; permission copy explains TalkBack use (closes ISSUES #8).
- **U4** done (`feat/friendly-failure-reasons`): CommandRow shows plain-language reasons (describeReason); raw reasons stay in Firestore/debug log.
- **U5** done (`feat/retry-countdown`): pending rows that are backing off while online show 'Retrying in N min'.
- **U6** done (`feat/mic-hit-area`): mic hitSlop 8 → 14 dp; circle size unchanged until checked on device (ISSUES #13).
- **U7** done (`feat/edit-sheet-header`): edit sheet has a fixed header (✕ · title · Save); Delete stays at the bottom. Keyboard behaviour still to check on device.
- **U8** done (`feat/date-quick-chips`): Today / Yesterday chips under the ‹ date › stepper.
- **U9** done (`feat/search-by-type`): Activity search also matches the entry type.
- **U10** done (`feat/collapse-attention`): Needs attention shows 3 rows, then 'Show N more' / 'Show less'.
- **U11** done (`feat/list-remove-undo`): removing a source/category shows an Undo toast that restores it in place.
- **U12** done (`feat/sign-out-confirm`): sign out asks for confirmation (native Alert).
- **U13** done (`feat/api-key-feedback`): '<Provider> key saved/removed' toast; 'Remove key' (with confirm) when a key is set.
- **U14** done (`feat/language-model-prompt`): picking a not-downloaded language opens speech setup (model-missing) unless online STT is allowed.
- **U15** done (`feat/screen-reader-toasts`): toasts stay twice as long (10 s default) while a screen reader is on.
- **U16** done (`feat/large-text`): hero amounts (Home, Insights) shrink to fit; tab labels capped at 1.3× font scale.
- **U17** done (`feat/skeleton-rows`): Home and Activity show static skeleton rows while loading (no shimmer, reduced-motion safe).
- **U18** done (`feat/sign-in-fields`): Email 'Next' focuses Password; Password has a show/hide button and 'Go' submits.
