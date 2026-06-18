# Nail Couture — Flutter WebView Shell

Full-screen `flutter_inappwebview` wrapper for https://www.nailcouture.net with WebRTC, geolocation, and a `NativeBridge` JavaScript channel for hardware access.

## Isolation

| Concern | How it is isolated |
|---------|-------------------|
| npm workspaces | No `package.json` — root npm scripts ignore this folder |
| Other mobile apps | Bundle ID `com.nailcouture.app.webview` (side-by-side with Expo/Capacitor) |
| Web / shared JS | Dart only; website calls `window.NativeBridge` when embedded |

## Prerequisites

- Flutter SDK (stable)
- Android Studio + SDK for Android builds
- macOS + Xcode for iOS builds

## Run

```bash
cd apps/New_Flutter
flutter pub get
flutter run --dart-define=WEB_URL=https://www.nailcouture.net
```

Override the loaded site:

```bash
flutter run --dart-define=WEB_URL=http://10.0.2.2:5173
```

## NativeBridge (website API)

```javascript
const contacts = await window.NativeBridge.requestContacts();
const saved = await window.NativeBridge.saveImageToGallery(base64OrUrl);
const location = await window.NativeBridge.getLocation();
const sms = await window.NativeBridge.startSmsListener();
```

Placeholder methods return `{ ok: false, stub: true, message: '...' }` until native implementations are wired.

## Platform notes

- **Android:** Manifest includes camera, mic, location, contacts, SMS, and storage permissions. WebView auto-grants camera/mic/geolocation after OS permissions are granted.
- **iOS:** `Info.plist` usage strings are beauty-app specific. `ios/Podfile` enables only CAMERA, MICROPHONE, CONTACTS, LOCATION, and PHOTOS permission_handler macros (all others stripped).
- **WebRTC:** Reliable on Android WebView. iOS `WKWebView` has limited WebRTC; inline media and swipe back/forward gestures are enabled.
- **Back navigation:** Android system back goes WebView history first, then exits the app.

## App IDs in this repo

| App | ID |
|-----|-----|
| Expo | `com.nailcouture.app` |
| Capacitor | `com.nailcouture.app.capacitor` |
| Flutter (placeholder) | `com.nailcouture.app.flutter` |
| Flutter WebView | `com.nailcouture.app.webview` |
