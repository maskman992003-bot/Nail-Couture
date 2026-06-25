# Build on D: drive (save C: space)

Flutter SDK and Android SDK are already on **D:** via `android/local.properties`.

Gradle and Pub caches default to **C:\Users\...** and can fill the system drive. Use the scripts below to keep **all build caches on D:**.

## One-command release build

From PowerShell:

```powershell
cd D:\Test\nail-couture\apps\New_Flutter\scripts
.\build-release.ps1
```

This sets:

| Variable | Location |
|----------|----------|
| `GRADLE_USER_HOME` | `D:\Test\nail-couture\.toolcache\gradle` |
| `PUB_CACHE` | `D:\Test\nail-couture\.toolcache\pub-cache` |
| `TEMP` / `TMP` | `D:\Test\nail-couture\.toolcache\tmp` |

Output APK/AAB paths are unchanged under `apps/New_Flutter/build/`.

## Manual build (same env)

```powershell
. D:\Test\nail-couture\apps\New_Flutter\scripts\env-d-drive.ps1
cd D:\Test\nail-couture\apps\New_Flutter
flutter pub get
flutter build apk --release
flutter build appbundle --release
```

## Free space on C: (optional cleanup)

After switching to D:, you may delete old caches on C: if disk space is tight:

- `C:\Users\<you>\.gradle`
- `C:\Users\<you>\AppData\Local\Pub\Cache`

Only delete these if you will use `env-d-drive.ps1` (or `build-release.ps1`) for future builds.
