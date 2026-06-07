# Nail Couture — Flutter Shell

Experimental Flutter app, fully isolated from the rest of the monorepo.

## Isolation (won't affect other builds)

| Concern | How it's isolated |
|---------|-------------------|
| npm workspaces | No `package.json` here — `npm install` / `npm run build` at repo root ignore this folder |
| Capacitor | Separate app ID: `com.nailcouture.app.flutter` (Capacitor uses `.capacitor`, Expo uses `.app`) |
| Web / shared JS | Flutter uses Dart only; `@nail-couture/shared` is not imported |
| Dependencies | Managed by `pubspec.yaml` + `flutter pub get`, not npm |

All three mobile variants can be installed side-by-side on one device during development.

## Prerequisites

- [Flutter SDK](https://docs.flutter.dev/get-started/install) (stable channel)
- **Android:** Android Studio + SDK (open `apps/flutter/android` for native Gradle work)
- **iOS:** macOS + Xcode (open `apps/flutter/ios/Runner.xcworkspace`)

## Run

```bash
cd apps/flutter
flutter pub get
flutter run
```

Pick a connected device or emulator when prompted.

### Android Studio

Open this folder (not the repo root):

```
apps/flutter/android
```

Or from repo root after `cd apps/flutter`:

```bash
flutter run
```

### Build release APK (Android)

```bash
cd apps/flutter
flutter build apk --release
```

Output: `build/app/outputs/flutter-apk/app-release.apk`

## Next steps (when building out the app)

1. Add `supabase_flutter` and read credentials from env / `--dart-define`
2. Port business logic from `packages/shared` into Dart (manual rewrite)
3. Match design tokens in `lib/theme/app_colors.dart` with `packages/shared/src/theme/tokens.js`

## App IDs in this repo

| App | ID |
|-----|-----|
| Expo | `com.nailcouture.app` |
| Capacitor | `com.nailcouture.app.capacitor` |
| Flutter | `com.nailcouture.app.flutter` |
