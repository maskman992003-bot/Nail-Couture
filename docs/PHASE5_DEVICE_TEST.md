# Phase 5 — Device Test + Cutover

> Branch: `IOS` → PR to `main` when all checks pass.

Phase 5 validates the complete React Native app on real iOS and Android hardware, fixes device-only parity gaps, then cuts over from web-as-primary to RN-as-primary.

---

## 1. One-time setup

### Environment

1. Copy `apps/mobile/.env.example` → `apps/mobile/.env` with your Supabase URL and anon key.
2. From repo root: `npm install`

### EAS (Expo Application Services)

Dev builds are required — Expo Go cannot load native modules (`expo-image-picker`, `react-native-signature-canvas`, etc.).

```bash
cd apps/mobile
npm install -g eas-cli   # if not installed
eas login
eas init                 # links project; writes projectId into app.json
```

### Build dev clients

```bash
# From apps/mobile
npm run build:dev:ios       # installs on registered iPhone via EAS
npm run build:dev:android   # APK for sideload / internal distribution
```

After install, start the dev server:

```bash
npm run start               # expo start --dev-client
```

Scan the QR code from the dev client app on your device (same Wi‑Fi as your machine, or use tunnel: `npx expo start --dev-client --tunnel`).

---

## 2. Test accounts

Use real Supabase test accounts for each role. Log in, confirm home screen + bottom nav match role.

| Role | Login path | Nav item count (approx) |
|------|------------|-------------------------|
| `customer` | Register or customer login | 7 |
| `technician` | Staff login | 4 |
| `cashier` | Staff login | 7 |
| `admin` | Staff login | 11 |
| `owner` | Staff login | 11 |
| `partner` | Staff login | 11 |
| `super_admin` | Staff login | 11 |

---

## 3. Bottom nav scroll matrix

Test on **each role with 6+ tabs** (owner, admin, cashier):

| Scenario | Pass? |
|----------|-------|
| Touch swipe scrolls horizontally (iOS) | ☐ |
| Touch swipe scrolls horizontally (Android) | ☐ |
| Tap tab navigates (no accidental scroll) | ☐ |
| Scroll offset persists after switching tabs | ☐ |
| Badge counts visible on Lobby / Bookings etc. | ☐ |

---

## 4. Role regression checklist

For each role, open **every bottom-nav item** and confirm the screen loads data (not placeholder).

### Customer

| Screen | Loads | Actions work | Realtime | Theme |
|--------|-------|--------------|----------|-------|
| Home | ☐ | ☐ | ☐ | ☐ |
| Profile (edit, prefs) | ☐ | ☐ | — | ☐ |
| Services | ☐ | ☐ | — | ☐ |
| Book (disabled state OK) | ☐ | ☐ | — | ☐ |
| Loyalty | ☐ | ☐ | — | ☐ |
| History | ☐ | ☐ | — | ☐ |
| Settings | ☐ | ☐ | — | ☐ |

### Technician

| Screen | Loads | Actions work | Realtime | Theme |
|--------|-------|--------------|----------|-------|
| Home (queue, in-chair) | ☐ | ☐ | ☐ | ☐ |
| Schedule | ☐ | ☐ | — | ☐ |
| Customers → detail | ☐ | ☐ | — | ☐ |
| Settings | ☐ | ☐ | — | ☐ |

**In-chair panel:** waiver signature, service checklist, **photo upload**.

### Cashier

| Screen | Loads | Actions work | Realtime | Theme |
|--------|-------|--------------|----------|-------|
| Home | ☐ | ☐ | ☐ | ☐ |
| Schedule | ☐ | ☐ | — | ☐ |
| Lobby | ☐ | ☐ | ☐ | ☐ |
| Checkout | ☐ | ☐ | — | ☐ |
| Customers | ☐ | ☐ | — | ☐ |
| Reports | ☐ | ☐ | — | ☐ |
| Settings | ☐ | ☐ | — | ☐ |

### Admin / owner / partner / super_admin

| Screen | Loads | Actions work | Realtime | Theme |
|--------|-------|--------------|----------|-------|
| Home dashboard | ☐ | ☐ | ☐ | ☐ |
| Schedule (team grid) | ☐ | ☐ | — | ☐ |
| Lobby (drag assign) | ☐ | ☐ | ☐ | ☐ |
| Bookings | ☐ | ☐ | ☐ | ☐ |
| Services | ☐ | ☐ | — | ☐ |
| Inventory | ☐ | ☐ | — | ☐ |
| Reports (charts) | ☐ | ☐ | — | ☐ |
| Customers | ☐ | ☐ | — | ☐ |
| Staff | ☐ | ☐ | — | ☐ |
| Salon activity | ☐ | ☐ | ☐ | ☐ |
| Settings | ☐ | ☐ | — | ☐ |

---

## 5. Device-specific flows

| Flow | Where | Pass? |
|------|-------|-------|
| Kiosk check-in + waiver signature | Check-in screen | ☐ |
| Waiver from technician in-chair | Technician home | ☐ |
| Visit photo upload (gallery) | Customer detail → Photos | ☐ |
| Visit photo upload (in-chair) | Technician in-chair brief | ☐ |
| Photo delete (admin) | Customer detail → Photos | ☐ |
| Notification panel + mark read | Header bell | ☐ |
| Logout confirm modal | Header / settings | ☐ |
| Dark / light theme toggle | Settings | ☐ |
| Realtime lobby updates | Two devices, same salon | ☐ |

---

## 6. Known deferred items

| Item | Status |
|------|--------|
| `EditBooking.jsx` online booking edit | Deferred until online booking wizard enabled |
| Windows (`react-native-windows`) | Phase 6 |

Log any new gaps in GitHub issues on `IOS` branch; fix before cutover PR.

---

## 7. Cutover checklist

When all sections above pass on **both iOS and Android**:

- [ ] `featureFlags.global.mobileApp` is `true` in `packages/shared`
- [ ] Document RN as primary dev target in team notes
- [ ] Freeze new web UI features (bug fixes only on web)
- [ ] Open PR: `IOS` → `main`
- [ ] Merge after review
- [ ] Optional: submit preview/production builds via `eas build --profile production`

---

## 8. Quick commands

```bash
# Dev server (after dev client installed)
npm run dev:mobile

# Typecheck mobile (from apps/mobile)
npx tsc --noEmit

# Web reference (unchanged)
npm run dev:web
```
