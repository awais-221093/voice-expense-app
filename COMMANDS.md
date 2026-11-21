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

**2026-11-21 (AUDIT C9):** `npx expo install --fix` was run (patch updates incl. native `expo-dev-client`).
Rebuild the dev build once (§4: `npx expo prebuild --platform android --clean` + `npx expo run:android --device`).

## 4. Build and run on your phone (development build)

Prerequisites: `google-services.json` in the repo root (see `docs/SETUP.md`), Android Studio SDK installed,
phone connected over USB with USB debugging on.

```powershell
npx expo prebuild --platform android --clean   # re-run after changing app.json plugins or installing native packages
npx expo run:android --device                  # builds, installs and starts the dev build
```

If Gradle fails with "Failed to install the following SDK components" (e.g. a dropped connection mid-download),
install the package from the command line — no Android Studio needed. Delete the half-downloaded folder first:

```powershell
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\Android\Sdk\platforms\android-37.0", "$env:LOCALAPPDATA\Android\Sdk\.temp" -ErrorAction SilentlyContinue
& "$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat" --install "platforms;android-37.0" "build-tools;37.0.0" "build-tools;36.0.0"
```

Libraries without their own `buildToolsVersion` use AGP's default (36.0.0), hence both build-tools versions.

If a dependency download fails with "Read timed out" (slow/tethered connection), raise Gradle's timeouts once,
machine-wide, in `%USERPROFILE%\.gradle\gradle.properties`, then re-run the build (finished downloads are kept):

```properties
systemProp.org.gradle.internal.http.connectionTimeout=120000
systemProp.org.gradle.internal.http.socketTimeout=300000
systemProp.org.gradle.internal.repository.max.retries=10
systemProp.org.gradle.internal.repository.initial.backoff=2000
```

If a C++ step fails with `ninja: error: mkdir(…): No such file or directory` (seen in `react-native-reanimated`),
a path passed Windows' 260-char limit. AGP uses CMake 3.22.1, whose ninja 1.10.2 ignores long paths even with
`LongPathsEnabled=1`. Swap in ninja 1.12.1 (long-path aware, ships with CMake 4.1.0), keeping a backup:

```powershell
$b = "$env:LOCALAPPDATA\Android\Sdk\cmake\3.22.1\bin"
Copy-Item "$b\ninja.exe" "$b\ninja-1.10.2.exe.bak"
Copy-Item "$env:LOCALAPPDATA\Android\Sdk\cmake\4.1.0\bin\ninja.exe" "$b\ninja.exe" -Force
& "$b\ninja.exe" --version   # 1.12.1
```

Needs `LongPathsEnabled = 1` under `HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem` (admin, then reboot).
No CMake 4.1.0 yet? `sdkmanager --install "cmake;4.1.0"`.

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

## npm shortcuts

| Script | Runs |
|---|---|
| `npm run start:dev` / `start:clear` | Dev server for the dev build (`--clear` resets the Metro cache) |
| `npm run android:device` | Build, install and start on the USB phone |
| `npm run prebuild:android` / `prebuild:clean` | Generate / regenerate `android/` from `app.json` |
| `npm run gradle:clean` | Clean the Gradle build (after native changes or odd build errors) |
| `npm run gradle:stop` | Stop Gradle daemons (frees RAM, releases locked files on Windows) |
| `npm run gradle:release` | Local release APK (`android/app/build/outputs/apk/release/`) |
| `npm run adb:reverse` | Phone reaches Metro on the PC over USB (port 8081) |
| `npm run doctor` / `check` | `expo-doctor` / typecheck + lint |
| `npm run firebase:deploy` | Deploy Firestore rules + indexes (§5) |

## 7. Feature packages (2026-11-21, IDEAS I6/I7)

Already run by Claude; listed so a fresh checkout can reproduce them. Both are native: rebuild the
dev build afterwards (§4).

```powershell
npx expo install expo-notifications          # I6 daily reminder
npx expo install expo-local-authentication   # I7 app lock
npx expo install expo-file-system            # persisted debug log (native)
```
