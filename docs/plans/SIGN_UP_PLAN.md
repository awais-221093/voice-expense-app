# Plan: in-app sign-up with automatic sign-in

Status: **done** (PR #172, 2026-11-25; "Forgot password?" followed in #173). Branch: `feat/sign-up` → PR into `staging`.
Branch from the tip of `feat/app-icon-splash` if that PR is still open (both touch `sign-in.tsx`).

> **Requirement change (user-requested 2026-11-21):** the spec had a single user whose account is
> created in the Firebase console. This changes it to in-app sign-up. Record it as `DECISIONS.md`
> row 28. Note: with sign-up open, anyone who has the APK can create their own account in this
> Firebase project. Their data stays isolated by the owner-only rules, and Spark-plan auth is free.
> To limit it to one person later, turn off *Authentication → Settings → User actions → Enable create (sign-up)*.

## 1. Behaviour
- `createUserWithEmailAndPassword` **signs the new user in by itself**. `onAuthStateChanged`
  fires, and the `Stack.Protected` gate in `src/app/_layout.tsx` switches straight to the tabs.
  There is never a "now sign in" step, and `_layout.tsx` needs no change.
- No rules or data-model change: `firebase/firestore.rules` is owner-only per uid
  (`isOwner(uid)`), and `users/{uid}` may stay empty (`docs/DATA_MODEL.md`).

## 2. Code: one screen, two modes (UX decision)
`src/app/sign-in.tsx` gets a mode toggle, **Sign in ↔ Create account**. That is less code than a
second route, and the email you typed carries over when you switch.
- A ghost button at the bottom: "New here? Create an account" / "Have an account? Sign in".
- Create mode: the button reads "Create account" ("Creating account…" while busy), the password
  field uses `autoComplete="new-password"`, and the subtitle reads "Create your account. You'll
  stay signed in."
- No confirm-password field; the existing show/hide toggle already covers typos.
- `friendlyAuthError` adds:
  - `email-already-in-use` → "An account with this email exists. Sign in instead." (switches to sign-in mode)
  - `weak-password` → "Use at least 6 characters."
  - `invalid-email` → "That email doesn't look right."
  - network errors → the existing no-internet message, worded for both modes.
- Remove the comment "The account is created in the Firebase console."

## 3. Docs cleanup (remove "create the user in the Firebase console")
| File | Change |
|---|---|
| `docs/SETUP.md` §1.4 | Delete "Authentication → Users → Add user…". Replace it with: check that *Authentication → Settings → User actions → Enable create (sign-up)* stays ticked (it's on by default). |
| `docs/SETUP.md` §6 | "Create an account (or sign in) → allow microphone…" |
| `VOICE_EXPENSE_APP_PLAN (2).md` §5 (l.128) | Auth is email/password with in-app sign-up. |
| `VOICE_EXPENSE_APP_PLAN (2).md` Phase 1 (l.353–355) | Sign-in/sign-up screen; drop "create the user" from the setup list. |
| `VOICE_EXPENSE_APP_PLAN (2).md` rules (l.399) | Drop "the sign-in email" from what to ask the user. |
| `docs/IMPLEMENTATION_PLAN.md` l.11 | `sign-in.tsx` → "email/password sign-in + sign-up". |
| `docs/DECISIONS.md` | Row 28: in-app sign-up, with the reason (no console step). |
| `docs/TASKS.md`, `docs/PROGRESS.md` | New items and a dated log entry. Past log entries stay as they are. |

`DASHBOARD_PLAN.md` ("same email/password account") stays correct as written.

## 4. Commits
1. `feat(auth): add create-account mode to the sign-in screen`
2. `feat(auth): explain sign-up errors in plain words`
3. `docs(setup): drop the console user step; accounts are created in the app`
4. `docs(plan): record in-app sign-up (plan, implementation plan, decision 28)`

## 5. Done when
- A new email creates an account and lands on Home with no extra sign-in.
- An existing email shows "sign in instead" and switches the mode.
- After a restart you're still signed in. Sign out → sign in works.
- `npm run typecheck`, `npx expo lint` and `npx expo export --platform android` are clean.
