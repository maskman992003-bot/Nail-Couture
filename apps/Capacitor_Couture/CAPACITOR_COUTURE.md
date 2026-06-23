# Capacitor Couture — Native Shell Runbook

Nail Couture ships as a native iOS/Android app by wrapping the existing Vite React build (`apps/web/dist`) in a Capacitor 8 WebView. No UI rewrite required.

**Bundle ID:** `com.nailcouture.app.couture`  
**Web build output:** `apps/web/dist`  
**Native shell:** `apps/Capacitor_Couture`

---

## Generated / modified files

### Capacitor shell (`apps/Capacitor_Couture`)

| File | Purpose |
|------|---------|
| `package.json` | Capacitor 8 deps, sync/open/assets scripts |
| `capacitor.config.ts` | `webDir: '../web/dist'`, splash, status bar, keyboard |
| `assets/` | Source icon + splash for `@capacitor/assets` |
| `ios/` | Xcode project (after `cap add ios`) |
| `android/` | Android Studio project (after `cap add android`) |

### Web bridge (`apps/web/src`)

| File | Purpose |
|------|---------|
| `utils/nativeShell.js` | `isNativeShell()`, blocked routes, root paths |
| `contexts/MobileBridgeContext.jsx` | `MobileBridgeProvider` + context |
| `hooks/useMobileBridge.js` | `useMobileBridge()` hook |
| `components/WebOnly.jsx` | Hides web-only UI in native shell |
| `components/NativeRouteGuard.jsx` | Redirects marketing routes → `/login` or role home |
| `components/NativeShellEffects.jsx` | Splash hide, status bar, Android back button |
| `utils/biometricAuth.js` | Face ID / fingerprint with browser mock fallback |
| `styles/mobile-shell.css` | Safe areas, `touch-action: manipulation`, active states |

### Modified web files

| File | Change |
|------|--------|
| `main.jsx` | `MobileBridgeProvider`, `NativeShellEffects`, `NativeRouteGuard` |
| `index.html` | `viewport-fit=cover` |
| `index.css` | Imports `mobile-shell.css` |
| `vite.config.js` | Comment: keep `base: '/'` for Capacitor |
| `package.json` | `@capacitor/*`, `@aparajita/capacitor-biometric-auth` |
| `App.jsx`, `Services.jsx`, public assessment pages | `WebOnly` wrappers |
| `RouteDocumentTitle.jsx` | Skips SEO helmet in native |
| `TechnicianNotificationBanner.jsx` | Hidden in native |

### Root `package.json` scripts

| Script | Action |
|--------|--------|
| `build:capacitor-couture` | Build web + `cap sync` |
| `sync:capacitor-couture` | Sync only |
| `cap:couture:ios` | Open Xcode |
| `cap:couture:android` | Open Android Studio |

---

## Prerequisites

- **Node.js 22+** (Capacitor 8 requirement)
- Repo root `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (baked in at web build time)
- **Android:** Android Studio Otter+ (2025.2.1+), JDK 17+
- **iOS:** macOS, Xcode 16+, iOS deployment target 15.0+

---

## Terminal commands

### First-time setup

```bash
# From repo root
cd e:/ElGarhy/Automation/Nail-Couture/Nail-Couture

npm install

# Add native platforms (once, from Capacitor_Couture folder)
cd apps/Capacitor_Couture
npx cap add android
npx cap add ios
cd ../..
```

### Build and sync (every web change)

```bash
# From repo root — recommended
npm run build:capacitor-couture
```

Or step by step:

```bash
npm run build -w @nail-couture/web
npm run sync -w @nail-couture/capacitor-couture
```

### Open native IDEs

```bash
npm run cap:couture:android
npm run cap:couture:ios
```

### Live reload during development (optional)

```bash
npm run dev -w @nail-couture/web
```

Temporarily add to `capacitor.config.ts`:

```ts
server: { url: 'http://YOUR_LAN_IP:5173', cleartext: true },
```

Then `npm run sync -w @nail-couture/capacitor-couture`. Remove before store submission.

---

## Launch icons and splash screens

1. Add source images to `apps/Capacitor_Couture/assets/`:
   - `icon.png` — 1024×1024
   - `splash.png` — 2732×2732 (dark background `#121212`)

2. Generate all platform sizes:

```bash
npm run assets:generate -w @nail-couture/capacitor-couture
```

3. Rebuild and sync:

```bash
npm run build:capacitor-couture
```

---

## iOS Face ID

After `cap add ios`, ensure `ios/App/App/Info.plist` contains:

```xml
<key>NSFaceIDUsageDescription</key>
<string>Use Face ID to sign in quickly and securely.</string>
```

---

## Native shell behavior

### Apple Guideline 4.2 (not a repackaged website)

- Public marketing routes (`/`, `/about`, `/lookbook`, etc.) redirect to `/login` or the user's role dashboard.
- `Navbar`, `Footer`, SEO meta, desktop notification banners, and public promos are hidden via `WebOnly`.

### Android back button

On root screens (`/login`, `/register`, role home from `getHomePath`), back exits the app. Elsewhere, back navigates React Router history.

### Biometrics (stub)

```js
import { useBiometricAuth } from './utils/biometricAuth';

const { check, authenticate } = useBiometricAuth();
await check();
await authenticate({ reason: 'Sign in to Nail Couture' });
```

In browser dev tools, calls log a warning and return mock success — no crashes.

### Test native UI gating in browser (no device)

- Visit any URL with `?nativeShell=1`, or
- Set `VITE_MOCK_NATIVE_SHELL=true` in `.env`

---

## Testing without a physical device

| What | How |
|------|-----|
| Layout / responsive | Chrome DevTools device toolbar; throttle to Mid-tier mobile |
| iOS WebKit | Safari Responsive Design Mode |
| Touch / tap delay | DevTools touch emulation; verify `touch-action: manipulation` |
| Safe areas | Notch device preset; inspect `env(safe-area-inset-*)` |
| Bridge mocks | Browser — biometrics mock, `?nativeShell=1` for route guard |
| Lighthouse | Mobile audit for tap targets, overflow, fonts |
| Real native behavior | BrowserStack or Appetize.io after one APK/IPA build |

---

## Store submission notes

- **Apple:** Guideline 4.2 — app opens to login/dashboard, not marketing site.
- **Google Play:** Personal accounts need 12 testers × 14 days minimum (buffer to 15–20).
- **Parallel apps:** `apps/mobile` (Expo) uses `com.nailcouture.app`; this shell uses `com.nailcouture.app.couture`.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| White flash on launch | Splash uses `launchAutoHide: false`; `SplashScreen.hide()` runs after auth bootstrap |
| Broken assets in WebView | Ensure `vite.config.js` uses `base: '/'`, not `'./'` |
| Keyboard covers inputs | `Keyboard: { resize: 'body' }` in capacitor config + `scroll-margin-bottom` on inputs |
| Blank screen after sync | Run `npm run build -w @nail-couture/web` before sync; check `apps/web/dist` exists |
