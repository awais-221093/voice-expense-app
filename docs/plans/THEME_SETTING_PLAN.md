# Plan: in-app theme choice (Light · Dark · Device)

Status: **planned, not started** (2026-11-21). Branch: `feat/theme-setting` → PR into `staging`.

## Goal
The app stops simply following the phone's theme. **Profile → Appearance** offers three options:
**Light**, **Dark** and **Device** (default, which is today's behaviour). The choice applies
straight away, everywhere in the app (sign-in, tabs, sheets, alerts), and it survives restarts.

## Decisions (UX/tech calls, record in `DECISIONS.md`)
- **Stored on this phone in SecureStore** (`theme_mode`), not in Firestore `settings/app`. Same
  pattern as the reminder and app lock. This keeps the Firestore contract (`DATA_MODEL.md`)
  unchanged, and the theme is available **before sign-in**, while the sign-in screen is showing.
  Syncing it across devices would need a contract change and the user's OK.
- **Apply it with React Native's `Appearance.setColorScheme(...)`**, so `useColorScheme()` returns
  the chosen scheme. `useTheme()` in `src/theme/index.ts` and the navigation theme in
  `src/app/_layout.tsx` then switch with **no other code changes**, and native pieces (alerts,
  date pickers) follow too. "Device" resets the override. Check the exact reset value for
  RN 0.88 (`'unspecified'` vs `null`) in the RN docs before coding.
- Keep `app.json` `userInterfaceStyle: "automatic"`; the override needs it.
- Native splash stays teal in both modes (see `APP_ICON_SPLASH_PLAN.md`), so it doesn't depend on this.

## Code
1. `src/features/settings/themeMode.ts` (~30 lines): `type ThemeMode = 'light' | 'dark' | 'system'`,
   `loadThemeMode()` (reads SecureStore, calls `Appearance.setColorScheme`), `setThemeMode(mode)`
   (saves and applies it), and a tiny zustand store or hook so the Profile control shows the
   current value.
2. `src/app/_layout.tsx`: call `loadThemeMode()` while the splash is still held (with the auth
   wait), so the wrong theme never flashes on start.
3. `src/app/(tabs)/profile.tsx`: an "Appearance" row with a 3-segment control
   (Light · Dark · Device) using the existing UI primitives. Accessible labels, with the selected
   state announced.
4. If the root view background is set with `expo-system-ui`, update it to follow the chosen mode.

## Docs
- `DECISIONS.md`: new row (local-only theme, `Appearance` override).
- `TASKS.md`, `PROGRESS.md`; `README.md` Profile bullet mentions "theme".

## Done when
- Each option switches the whole app at once, including sign-in after sign-out.
- After killing and reopening the app, the chosen theme shows with no flash. "Device" follows the
  phone's setting when it changes.
- `npm run typecheck`, `npx expo lint` and `npx expo export --platform android` are clean.
