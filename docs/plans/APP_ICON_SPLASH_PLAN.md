# Plan: app icon + splash screen (generated from one SVG)

Status: **done** (2026-11-25, `feat/app-icon-splash`). Closes `ISSUES.md` #10 and the `TASKS.md` item
"App icon + splash artwork". Branch: `feat/app-icon-splash` → PR into `staging`.

## 1. Concept: "the talking coin"
- **Mark:** a white microphone whose head is a **gold coin** (`#FBBF24`, thin inner rim, three
  short grille lines), with two white sound-wave arcs on each side. Voice + money in one shape.
- **Background:** brand teal `#0F766E` (already in `app.json` and `src/theme`), with a slight
  radial lift in the centre for depth.
- **No currency symbol:** stays crisp at 48 px and doesn't tie the logo to one currency.
- **Monochrome:** the same outline as one flat silhouette with clean cut-outs and no gradients.
  Android 13+ themed icons use it, and min SDK is 33, so every user can see it.
- **The splash and the in-app logo use the exact same artwork** as the icon foreground.

## 2. Generator script (single source of truth)
- `scripts/brand/generate-icons.ts`, run with the existing `tsx` via `npm run icons`.
- The SVG parts (coin, mic body, waves, background) are small string builders, and the script
  puts them together into each variant. Rasterised with **`@resvg/resvg-js`** (dev-only, prebuilt
  binaries, no Python or native toolchain needed on Windows).
- Deterministic output. The generated PNGs are committed (the build reads them), and the
  script can recreate them at any time.
- It also writes a **preview sheet** to the scratchpad (512/192/48 px, circle + squircle masks,
  themed-mono, splash) so the shape can be reviewed and tuned before committing.

| Output (`assets/images/`) | Size | Contents |
|---|---|---|
| `icon.png` | 1024² | Full-bleed teal + mark (legacy / store icon) |
| `android-icon-foreground.png` | 1024² | Transparent; mark inside the 66/108 adaptive safe zone |
| `android-icon-background.png` | 1024² | Teal with radial lift |
| `android-icon-monochrome.png` | 1024² | White silhouette on transparent |
| `splash-icon.png` | 1024² | Transparent mark, same artwork as the foreground |
| `logo.png` | 512² | Same mark for in-app use (sign-in header) |

Remove the unused template leftovers: `assets/expo.icon/` (iOS-only; the app is Android-only),
`assets/images/expo-logo.png`, `assets/images/favicon.png`. Nothing references them.

## 3. Wiring
- `app.json`: keep the icon paths; `adaptiveIcon.backgroundColor` stays teal. For the
  `expo-splash-screen` plugin: teal background, `splash-icon.png`, and an `imageWidth` sized for
  Android 12+'s circular splash crop. Teal in dark mode too, so the brand looks the same.
  - Per AGENTS.md, check the current options (including `dark`) against
    https://docs.expo.dev/versions/v58.0.0/sdk/splash-screen/ before editing.
- `src/app/_layout.tsx` already holds the splash until auth is restored, so no change there.
- `src/app/sign-in.tsx`: show `logo.png` above the "Voice Expense" title.

## 4. Commands for the user (add to `COMMANDS.md`)
```bash
npm i -D @resvg/resvg-js
npm run icons
npm run prebuild:clean      # icons/splash are native resources
npm run android:device      # uninstall first if the launcher keeps the old icon
```

## 5. Commits
1. `build(brand): add the icon generator script and npm run icons`
2. `feat(brand): add the talking-coin app icon, adaptive layers and monochrome icon`
3. `feat(splash): use the brand mark on the splash screen`
4. `feat(sign-in): show the brand logo above the title`
5. `chore(assets): remove unused Expo template icons`
6. `docs: record the icon pipeline (COMMANDS, TASKS, ISSUES #10, PROGRESS)`

## 6. Done when
- The icon reads well in circle, squircle and themed-icon modes. The cold-start splash shows the
  same mark, and so does the sign-in screen.
- `npm run typecheck`, `npx expo lint` and `npx expo export --platform android` are clean.
