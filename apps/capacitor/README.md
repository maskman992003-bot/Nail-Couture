# Nail Couture — Capacitor Shell

Thin native wrapper around the Vite web app (`apps/web`). Reuses the same React UI without maintaining a separate mobile codebase.

## Prerequisites

- Node 18+
- **Android:** Android Studio + SDK (recommended — bundles JDK 17). CLI builds need a **JDK 17+** install, not just a JRE.
- **iOS:** macOS + Xcode + CocoaPods

## Environment

Supabase credentials are baked in at web build time from the repo root `.env`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Workflow

```bash
# From repo root — build web + sync to native projects
npm run build:capacitor

# Open in native IDE
npm run cap:android
npm run cap:ios
```

After changing web code, rebuild and sync:

```bash
npm run build:capacitor
```

## Bundle ID

`com.nailcouture.app.capacitor` — distinct from the Expo app (`com.nailcouture.app`) so both can be installed side-by-side during development.
