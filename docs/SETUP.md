# Manual setup steps

Things only you can do (console clicks, keys, phone). Commands referenced here are in `COMMANDS.md`.

## 1. Firebase project
1. https://console.firebase.google.com → **Add project** (Analytics not needed).
2. **Build → Firestore Database → Create database** → production mode → region close to you (e.g. `asia-south1`).
3. **Build → Authentication → Get started → Email/Password → Enable**.
4. **Authentication → Users → Add user**: your email + a strong password. This is the only account the app uses.

## 2. Register the Android app
1. Project settings → **Add app → Android**.
2. Package name: **`com.awais.voiceexpense`** (must match `android.package` in `app.json`; change both together if you want another).
3. Download **`google-services.json`** and put it in the repo root (`D:\DEVELOPMENT\RN\voice-expense-app\google-services.json`). It is git-ignored.
4. SHA-1 is not needed (no Google sign-in).

## 3. Deploy rules and indexes
`COMMANDS.md` §5. Indexes take a few minutes to build; the app shows a loading state until they are ready.

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
