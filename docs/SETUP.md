# Manual setup steps

Things only you can do (console clicks, keys, phone). Commands referenced here are in `COMMANDS.md`.

## 1. Firebase project
1. https://console.firebase.google.com → **Add project** (Analytics not needed).
2. **Build → Firestore Database → Create database** → production mode → region close to you (e.g. `asia-south1`).
3. **Build → Authentication → Get started → Email/Password → Enable**.
4. **Authentication → Users → Add user**: your email + a strong password. This is the only account the app uses.

## 2. Register the Android app
1. Project settings → **Add app → Android**.
2. Package name: **`com.voiceexpense.app`** (must match `android.package` in `app.json`; change both together if you want another).
3. Download **`google-services.json`** and put it in the repo root (`D:\DEVELOPMENT\RN\voice-expense-app\google-services.json`). It is git-ignored.
4. SHA-1 is not needed (no Google sign-in).

## 3. Deploy rules and indexes (Firebase console, no CLI)
The Firebase CLI is not linked to this repo; rules and indexes are set by hand in the console.
**Pending task (2026-11-21):** do this before the first device run, and again whenever
`firebase/firestore.rules` or `firebase/firestore.indexes.json` changes.

1. **Rules:** Firestore → **Rules** → replace everything with the contents of
   `firebase/firestore.rules` → **Publish**. (The current version allows the optional loan
   `person` field; without it, new loan entries are rejected.)
2. **Indexes:** Firestore → **Indexes** → **Composite** → **Create index**, scope *Collection*:

   | Collection ID | Fields, in this order |
   |---|---|
   | `entries` | `deleted` Ascending · `spentAt` Descending |
   | `commands` | `entryIds` Ascending · `dismissedAt` Ascending · `createdAt` Descending |

   The third index in `firestore.indexes.json` (`commands`: `status` + `createdAt`) is not
   queried by the app and can be skipped. All other queries use automatic indexes.
3. Indexes take a few minutes to build; lists show a loading state until then. A missing index
   shows up in the debug log (long-press the Profile avatar) with a link that creates it.

CLI alternative, if the project is ever linked: `COMMANDS.md` §5 (`npm run firebase:deploy`).

## 4. LLM API keys
- **Groq:** https://console.groq.com/keys → Create API key.
- **OpenRouter:** https://openrouter.ai/settings/keys → Create key → **set a monthly credit limit** on the key (e.g. $2). Do this — the key lives on the phone.
- Enter keys in the app: gear icon → API keys. They are stored in Android secure storage only, never in Firebase or git.
- For `npm run eval`, also put them in `.env` (git-ignored).

## 5. Phone
1. Android 13+ (yours: Android 16). Settings → About phone → tap Build number 7× → Developer options → **USB debugging on**.
2. Offline speech models: Settings → System → Languages → **Speech / On-device recognition** (name varies by phone; on Pixels it's under *Speech Services by Google → Offline speech recognition*) → download **English (US)** and, if wanted, **Urdu**.
   The app detects missing models and opens the download dialog where Android allows it.
3. Build and install: `COMMANDS.md` §4.

## 6. First run
Sign in → allow microphone + speech recognition → hold the mic and say "add 100 rupees for eggs from salary".
