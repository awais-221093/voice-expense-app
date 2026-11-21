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
