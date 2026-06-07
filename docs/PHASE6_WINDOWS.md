# Phase 6 — Native Windows (`react-native-windows`)

> Branch: `Mobile`  
> Adds a **native Windows desktop** target alongside iOS/Android. Expo does **not** officially support Windows — this uses manual `react-native-windows` integration.

---

## Prerequisites (Windows PC only)

1. **Visual Studio 2022** (Community or higher)
   - Workload: **Universal Windows Platform development**
   - Workload: **Desktop development with C++**
   - **Windows 11 SDK (10.0.22621)** — required by RNW 0.83 native modules

   Install SDK standalone if missing:
   ```powershell
   winget install Microsoft.WindowsSDK.10.0.22621
   ```

2. **Node.js** 20.19.4+ (matches Expo SDK 56 / RN 0.85)

3. **Environment**
   - Copy `apps/mobile/.env.example` → `apps/mobile/.env` (Supabase URL + anon key)

---

## Version alignment (important)

| Package | Version in repo | Notes |
|---------|-----------------|-------|
| `react-native` | 0.85.3 | Expo SDK 56 |
| `react-native-windows` | 0.83.0 | Latest stable RNW (peers RN ^0.83) |
| Gap | RN 0.85 vs RNW 0.83 | Installed with `--legacy-peer-deps`; watch for native build warnings |

When `react-native-windows` publishes a 0.85-aligned release, upgrade both together.

---

## One-time setup (already done in repo)

The `windows/` folder was generated via:

```bash
cd apps/mobile
npm install react-native-windows@0.83.0 @react-native-community/cli --save-dev --legacy-peer-deps
npx react-native init-windows --overwrite
```

Metro was merged to keep **Expo + NativeWind + monorepo shared package** resolution (`metro.config.js`).

---

## Run on Windows

### Option A — build + launch (starts Metro automatically)

From repo root:

```bash
npm run dev:windows
```

Or from `apps/mobile`:

```bash
npm run windows
```

### Option B — Metro + app separately

Terminal 1:

```bash
npm run start:windows
```

Terminal 2:

```bash
npm run dev:windows
```

Release build:

```bash
cd apps/mobile
npm run windows:release
```

---

## Platform limitations on Windows

Expo native modules are **not** fully supported on RNW. The app includes guards/fallbacks:

| Feature | iOS / Android | Windows |
|---------|---------------|---------|
| Core navigation + Supabase | Yes | Yes (expected) |
| AsyncStorage auth/theme | Yes | Yes |
| Bottom nav horizontal scroll | Touch | Mouse / trackpad / wheel |
| `expo-image-picker` (visit photos) | Yes | **Disabled** — picker returns canceled |
| `expo-linear-gradient` | Yes | **Solid color fallback** (`GoldGradientBadge`, `ScreenGradient`) |
| `expo-clipboard` | Yes | **Fallback** via `setClipboardString()` in `src/platform/clipboard.ts` |
| `react-native-signature-canvas` (waiver) | WebView | Test on device — may work via WebView |
| EAS builds | Yes | **No** — build locally with Visual Studio / MSIX |

Log new gaps as GitHub issues on `Mobile`.

---

## Bottom nav on Windows (parity test)

From the migration testing matrix:

| Scenario | Pass? |
|----------|-------|
| Mouse drag scrolls horizontally | ☐ |
| Trackpad / wheel scrolls horizontally | ☐ |
| Tap tab navigates (no accidental scroll) | ☐ |
| Scroll offset persists after switching tabs | ☐ |
| Lobby drag-assign with mouse | ☐ |

---

## Distribution (future)

- Package with **Visual Studio** → MSIX for sideload or Microsoft Store
- Not available via EAS

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `MSBuild` not found | Install VS 2022 C++ + UWP workloads |
| `Solution file is required` | Ensure `react-native.config.js` sets `solutionFile: 'Mobile.sln'` and nested `project.projectFile` |
| `Project is required but not specified` | Set `project.windows.project.projectFile` (not top-level `projectFile`) in `react-native.config.js` |
| Windows App SDK transitive deps error | Repo root `Directory.Build.props` sets `WindowsAppSDKVerifyTransitiveDependencies=false` |
| `Windows SDK version 10.0.22621.0 was not found` | Install SDK via winget (see Prerequisites) |
| `JSIndexedRAMBundle.cpp` C2665 compile error | **RN 0.85 vs RNW 0.83 mismatch** — wait for RNW 0.85 or use RN 0.83 (breaks Expo 56) |
| `Unable to find vswhere` / no VS release | Install Visual Studio 2022, or run `node_modules/react-native-windows/scripts/rnw-dependencies.ps1` elevated |
| Metro crash when running Windows | Ensure `windows/` is in Metro `blockList` (already in `metro.config.js`) |
| `expo-modules-core` / `EXPO_OS` errors | Some Expo APIs still load at runtime — report screen + stack trace |
| NuGet restore fails | Open `windows/Mobile.sln` in Visual Studio and restore packages |
| Peer dependency warnings on install | Expected until RNW 0.85 ships; use `npm install --legacy-peer-deps` in `apps/mobile` |

---

## Quick commands

```bash
# From repo root
npm run dev:windows          # Build + run Windows app
npm run start:windows        # Metro only (RN bundler)
npm run dev:mobile           # iOS/Android Expo dev client (unchanged)

# Typecheck
cd apps/mobile && npx tsc --noEmit
```
