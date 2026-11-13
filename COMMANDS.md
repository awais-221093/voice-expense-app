# Commands to run

You run these yourself (PowerShell, from the repo root `D:\DEVELOPMENT\RN\voice-expense-app`).
Claude writes the code; this file lists every install/build command the code depends on.
Run them **in order**. Re-run a section only when its note says so.

---

## 1. Install packages (once)

```powershell
# Firebase (native SDK) — Firestore offline cache survives app kill
npx expo install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore

# Native Expo modules used by the app
npx expo install expo-speech-recognition expo-secure-store expo-haptics expo-dev-client expo-build-properties @react-native-community/netinfo @expo/vector-icons

# Pure JS libraries (state + validation)
npx expo install zustand zod

# Dev tools: tsx runs the LLM eval script; prettier for formatting
npm install --save-dev tsx prettier eslint-config-prettier @types/node@24
```

If `npx expo install expo-speech-recognition` picks a version for an older SDK, check
https://github.com/jamsch/expo-speech-recognition for the SDK 58 tag and tell Claude.

## 2. Lint setup (once)

```powershell
npx expo lint          # first run creates eslint.config.js — answer "yes"
```

## 3. Health checks (after every install)

```powershell
npx expo-doctor
npx expo install --fix   # only if expo-doctor reports version mismatches
npm run typecheck        # app + eval script
npx expo lint            # lint
```

## 4. Build and run on your phone (development build)

Prerequisites: `google-services.json` in the repo root (see `docs/SETUP.md`), Android Studio SDK installed,
phone connected over USB with USB debugging on.

```powershell
npx expo prebuild --platform android --clean   # re-run after changing app.json plugins or installing native packages
npx expo run:android --device                  # builds, installs and starts the dev build
```

Later, with only JS changes, just start the dev server:

```powershell
npx expo start --dev-client
```

Alternative (cloud build, no Android Studio needed):

```powershell
npx eas-cli@latest login
npx eas-cli@latest build --profile development --platform android
```

## 5. Firebase rules and indexes

```powershell
npm install -g firebase-tools        # once
firebase login                       # once
firebase use --add                   # once — pick your Firebase project, alias "default"
firebase deploy --only firestore:rules,firestore:indexes   # every time firebase/ files change
```

## 6. LLM prompt evaluation (Phase 2)

Create `.env` in the repo root (git-ignored), e.g.

```
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-...
```

Then:

```powershell
npm run eval                         # runs both providers that have a key
npm run eval -- --provider groq      # one provider only
npm run eval -- --only 5             # first 5 fixtures (quick check)
```
