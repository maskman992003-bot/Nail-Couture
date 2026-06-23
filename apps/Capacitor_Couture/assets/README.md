# Place source images here for `@capacitor/assets`:

| File | Size | Notes |
|------|------|-------|
| `icon.png` | 1024×1024 | Square app icon, no transparency for iOS |
| `splash.png` | 2732×2732 | Centered logo on brand background (#121212) |

Then run from repo root:

```bash
npm run assets:generate -w @nail-couture/capacitor-couture
npm run build:capacitor-couture
```

You can copy `apps/web/public/apple-touch-icon.png` as a starting point for `icon.png`.
