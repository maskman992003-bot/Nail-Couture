# React Native Migration Plan — Nail Couture

> **Branch:** All migration work happens on the `Mobile` branch (`origin/Mobile`).  
> **Strategy:** Complete migration sprint — port all existing web screens to React Native before real-device testing.  
> **Status:** Phase 5 in progress on `Mobile` — device test + cutover (see [`docs/PHASE5_DEVICE_TEST.md`](docs/PHASE5_DEVICE_TEST.md))

---

## Git workflow

| Item | Detail |
|------|--------|
| **Working branch** | `Mobile` (already created and tracking `origin/Mobile`) |
| **Base branch** | `main` |
| **Rule** | All migration commits go to `Mobile` only — do not commit migration work directly to `main` |
| **When to merge** | After Phase 5 (full device test + parity pass) is complete |
| **PR target** | `Mobile` → `main` |

### Branch commands (reference)

```bash
git checkout Mobile
git pull origin Mobile
# ... do migration work ...
git add .
git commit -m "your message"
git push origin Mobile
```

---

## Problem diagnosis (current web app)

The mobile bottom nav in [`src/components/Sidebar.jsx`](apps/web/src/components/Sidebar.jsx) uses a CSS `overflow-x-auto` container with hidden scrollbars and React Router `<NavLink>` children.

**Why iOS simulator works but Windows does not:**

- iOS Safari applies touch momentum scrolling to overflow regions automatically.
- On Windows (Chrome/Edge), horizontal scroll requires Shift+wheel or a visible scrollbar — but `scrollbar-none` hides it.
- Dragging over `<a>` links often triggers navigation/selection instead of scrolling on Chromium.
- Unlike [`ServiceCategoryBar.jsx`](apps/web/src/components/ServiceCategoryBar.jsx), the bottom nav lacks `touch-action: pan-x`, `overscroll-x-contain`, or mouse/trackpad fallbacks.

**Current stack:** React 19 + Vite + Tailwind ([`package.json`](package.json)). No React Native, Capacitor, or Expo wrapper exists today. `featureFlags.global.mobileApp` is `false` in [`src/constants/featureFlags.js`](apps/web/src/constants/featureFlags.js).

---

## Migration timing — complete migration sprint (agreed approach)

**Start now, but run a full migration sprint — port everything that exists today, then test on real devices with a complete app.**

A half-migrated app with "Coming soon" placeholders is worse than doing it properly:

- No dual UI maintenance (web + partial RN)
- No confusing test surface where some tabs work and others don't
- Cleaner mental model: web = reference, RN = the real product
- Real-device testing happens once, against a complete app

### Complete migration rules

| During migration sprint | Web app role | After migration |
|-------------------------|--------------|-----------------|
| Port ALL existing screens to RN | Frozen reference only (bug fixes OK) | RN is primary; web optional/deprecated |
| Extract logic to `packages/shared` | Source of truth for behavior | Shared by both if web kept |
| Build RN shell, then all screens in order | No new web features | New features built in RN only |
| Device testing at the END of sprint | — | Full parity test on iOS/Android |

### Tradeoff to accept

- **Pro:** One clean cutover, no placeholder app, no maintaining two UIs
- **Con:** Real-device testing starts later (~6–10 weeks) instead of after 1–2 weeks
- **Con:** Any web features added *during* the sprint must be ported immediately or deferred until after cutover

**Rule during sprint:** Freeze new web UI features. Only critical bug fixes on web. All new work goes into RN.

### What "done" looks like

Every screen that exists in web today works in RN:

- All 7 roles (super_admin, owner, partner, admin, cashier, technician, customer)
- All nav items in `navItemsByRole` open real screens
- Lobby drag-drop, schedule grids, reports charts, waiver signature, check-in kiosk
- Scrollable bottom nav works on touch + mouse

Only then: install on real iOS/Android devices and run full regression.

---

## Recommended platform strategy

| Platform | Recommendation | Rationale |
|----------|----------------|-----------|
| **iOS + Android** | React Native (Expo dev builds) | Primary salon staff/customer devices; best library ecosystem |
| **Windows** | `react-native-windows` after iOS/Android cutover (Phase 6) | RN Windows lags main RN; validate core app on mobile first |

---

## Target architecture

### Monorepo layout (web frozen as reference during sprint)

```
nail-couture/
  apps/
    web/          # existing Vite app (moved from root)
    mobile/       # new Expo + RN app
  packages/
    shared/       # portable business logic
      utils/      # supabase queries, routes helpers, loyalty, schedule utils
      services/   # kioskService, inventoryService
      constants/  # featureFlags, servicesData
      lib/        # supabase client (env-agnostic)
```

**Port directly (~40%):** [`src/utils/*`](apps/web/src/utils), [`src/services/*`](apps/web/src/services), [`src/lib/supabase.js`](apps/web/src/lib/supabase.js), role helpers in [`src/utils/routes.js`](apps/web/src/utils/routes.js).

**Rewrite (~60%):** All JSX UI, Tailwind classes, DOM APIs, react-router, dnd-kit lobby, schedule CSS grids, signature canvas, Recharts.

### Mobile tech stack

- **Framework:** Expo SDK 52+ with dev builds (not Expo Go for native modules)
- **Navigation:** `@react-navigation/native` — stack + role-aware tab navigator
- **Styling:** NativeWind v4 (reuse Tailwind token names from [`src/index.css`](apps/web/src/index.css) where possible)
- **Storage:** `@react-native-async-storage/async-storage` (replace `localStorage` in [`AuthContext.jsx`](apps/web/src/contexts/AuthContext.jsx), [`ThemeContext.jsx`](apps/web/src/contexts/ThemeContext.jsx))
- **Supabase:** same `@supabase/supabase-js` package
- **Gestures/animation:** `react-native-gesture-handler` + `react-native-reanimated`

### Bottom nav fix (native — solves scroll on all platforms)

Replace the web CSS scroll container with a custom tab bar using RN `ScrollView`:

```tsx
// apps/mobile/src/navigation/ScrollableBottomTabBar.tsx
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  overScrollMode="never"
  contentContainerStyle={{ alignItems: 'center' }}
>
  {navItems.map((item) => (
    <Pressable key={item.id} onPress={() => navigation.navigate(item.screen)}>
      {/* icon + label */}
    </Pressable>
  ))}
</ScrollView>
```

- Use `Pressable` instead of `<NavLink>` — no link-drag conflict
- Horizontal scroll works on iOS, Android, and Windows RN (mouse wheel, touch, trackpad)
- Persist scroll offset with `AsyncStorage` (replaces `sessionStorage` in Sidebar)
- Map existing `navItemsByRole` from [`Sidebar.jsx`](apps/web/src/components/Sidebar.jsx) to screen names in React Navigation

---

## Complete migration sprint (sequential, no placeholders)

Internal order for execution — **no device testing until all phases complete**.

### Phase 0 — Foundation (week 1)

- [x] Restructure repo into monorepo (`apps/web`, `apps/mobile`, `packages/shared`)
- [x] Extract ALL portable code: utils, services, hooks, constants, supabase client
- [x] Scaffold Expo app with NativeWind, React Navigation, AsyncStorage
- [x] Port `AuthContext`, `ThemeContext`, `ClientLogin`, `ProtectedRoute` logic
- [x] Build `ScrollableBottomTabBar` with full `navItemsByRole` mapping
- [x] Build shared RN primitives: `AppModal`, theme tokens, icon set, layout shell

### Phase 1 — Public + customer screens (week 2–3)

- [x] [`App.jsx`](apps/web/src/App.jsx), [`Lookbook.jsx`](apps/web/src/components/Lookbook.jsx), [`Services.jsx`](apps/web/src/components/Services.jsx), [`AboutContact.jsx`](apps/web/src/components/AboutContact.jsx) — public stack in `apps/mobile`
- [x] [`ClientLogin.jsx`](apps/web/src/components/ClientLogin.jsx), [`ClientRegister.jsx`](apps/web/src/components/ClientRegister.jsx) — login + register in `apps/mobile`
- [x] [`CheckIn.jsx`](apps/web/src/components/CheckIn.jsx) + [`WaiverModal.jsx`](apps/web/src/components/WaiverModal.jsx) — kiosk check-in + signature waiver in `apps/mobile`
- [x] [`ClientPortal.jsx`](apps/web/src/components/ClientPortal.jsx), [`CustomerProfile.jsx`](apps/web/src/components/CustomerProfile.jsx), [`CustomerServices.jsx`](apps/web/src/components/CustomerServices.jsx)
- [x] [`CustomerBooking.jsx`](apps/web/src/components/CustomerBooking.jsx) — disabled-state port (online booking flag off)
- [x] [`CustomerHistory.jsx`](apps/web/src/components/CustomerHistory.jsx), [`CustomerLoyalty.jsx`](apps/web/src/components/CustomerLoyalty.jsx)
- [ ] [`EditBooking.jsx`](apps/web/src/components/EditBooking.jsx) — deferred until online booking wizard port

### Phase 2 — Staff screens (week 4–5)

- [x] [`Technician.jsx`](apps/web/src/components/Technician.jsx) + entire `technician/*` folder (12 components)
- [x] [`Cashier.jsx`](apps/web/src/components/Cashier.jsx), [`CashierCheckout.jsx`](apps/web/src/components/CashierCheckout.jsx)
- [x] [`TechnicianSchedule.jsx`](apps/web/src/components/TechnicianSchedule.jsx), [`StaffSchedule.jsx`](apps/web/src/components/StaffSchedule.jsx) + `schedule/*` (12 components)
- [x] [`StaffCustomerDetail.jsx`](apps/web/src/components/StaffCustomerDetail.jsx), [`StaffProfile.jsx`](apps/web/src/components/StaffProfile.jsx)

### Phase 3 — Admin screens (week 6–8)

- [x] Role dashboards: [`SuperAdmin.jsx`](apps/web/src/components/SuperAdmin.jsx), [`Admin.jsx`](apps/web/src/components/Admin.jsx) → `AdminHomeScreen.tsx`
- [x] [`AdminLobby.jsx`](apps/web/src/components/AdminLobby.jsx) — PanResponder drag + tap-assign, gesture-handler ready
- [x] [`AdminBookings.jsx`](apps/web/src/components/AdminBookings.jsx), [`AdminServices.jsx`](apps/web/src/components/AdminServices.jsx), [`AdminInventory.jsx`](apps/web/src/components/AdminInventory.jsx)
- [x] [`AdminReports.jsx`](apps/web/src/components/AdminReports.jsx) — SVG bar charts via `react-native-svg`
- [x] [`StaffManagement.jsx`](apps/web/src/components/StaffManagement.jsx), [`SalonActivity.jsx`](apps/web/src/components/SalonActivity.jsx)
- [x] [`CustomerManagementHistory.jsx`](apps/web/src/components/CustomerManagementHistory.jsx) (Phase 2), [`Settings.jsx`](apps/web/src/components/Settings.jsx) → expanded `StaffSettingsScreen.tsx`

### Phase 4 — Shared components + polish (week 9)

- [x] [`ServiceCategoryBar.jsx`](apps/web/src/components/ServiceCategoryBar.jsx), [`VirtualizedTimelineList.jsx`](apps/web/src/components/VirtualizedTimelineList.jsx)
- [x] [`BookingWizard.jsx`](apps/web/src/components/BookingWizard.jsx), [`ScrollSelect.jsx`](apps/web/src/components/ScrollSelect.jsx), [`RefreshmentSelect.jsx`](apps/web/src/components/RefreshmentSelect.jsx)
- [x] Notification panel, logout confirm, badges, realtime subscriptions
- [x] Parity pass: compare every web screen side-by-side with RN
- [x] Phase A: legacy files archived to `Trash_Can/`
- [ ] Phase C (in progress): batch visual parity — public, customer, staff, admin screens

### Phase 5 — Full device test + cutover (week 10)

- [ ] Install on real iOS + Android devices — see [`docs/PHASE5_DEVICE_TEST.md`](docs/PHASE5_DEVICE_TEST.md)
- [ ] Test all roles, all nav items, scrollable bottom nav, realtime, file upload, signatures
- [ ] Fix parity gaps found on device
- [x] EAS dev-client + `expo-image-picker` wired for visit photo upload
- [x] Set `featureFlags.global.mobileApp: true` (shared package)
- [ ] RN becomes primary development target (after device sign-off)
- [ ] Open PR: `Mobile` → `main`

### Phase 6 — Windows (week 11+)

- [ ] Add `react-native-windows` target
- [ ] Full app validation on Windows touch + mouse

---

## Navigation mapping (77 web routes → RN structure)

Instead of duplicating role-prefixed URLs (`/owner/lobby`, `/admin/lobby`), use **shared screens + role param**:

| Web pattern | RN structure |
|-------------|--------------|
| `/:role/lobby` | `LobbyScreen` (reads `user.role` for RPC caller) |
| `/:role/schedule` | `ScheduleScreen` |
| `/customer/*` | `CustomerStack` |
| Public routes (`/`, `/login`) | `AuthStack` / `PublicStack` |

Reuse [`getHomePath`](apps/web/src/utils/routes.js), [`getSettingsPath`](apps/web/src/utils/routes.js), and `ProtectedRoute` role checks — adapt from URL matching to navigation state.

---

## Key dependency replacements

| Web | React Native |
|-----|--------------|
| react-router-dom | @react-navigation/native |
| Tailwind CSS | NativeWind v4 |
| framer-motion + swiper | reanimated + carousel lib |
| recharts | victory-native |
| @dnd-kit | gesture-handler + Reanimated |
| react-signature-canvas | react-native-signature-canvas |
| @tanstack/react-virtual | @shopify/flash-list |
| createPortal modals | RN Modal |
| localStorage / sessionStorage | AsyncStorage |

---

## Testing matrix (including original scroll bug)

| Scenario | Expected after RN |
|----------|-------------------|
| iOS touch swipe on bottom nav | Scrolls horizontally |
| Android touch swipe | Scrolls horizontally |
| Windows mouse drag on bottom nav | Scrolls horizontally |
| Windows trackpad / wheel | Scrolls horizontally |
| Tap nav item (no drag) | Navigates to screen |
| Drag then release | Scrolls, does NOT navigate |
| Many role tabs (owner: 10+ items) | All reachable via scroll |

---

## Screen parity checklist (every screen must pass before device test)

For each ported screen, verify:

- [ ] Loads with correct role guard
- [ ] Fetches data from Supabase (same queries/RPCs)
- [ ] All buttons/actions work
- [ ] Modals and forms function
- [ ] Realtime updates work (where applicable)
- [ ] Theme (dark/light) renders correctly
- [ ] Bottom nav scroll + navigation works

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Longer before first device test (~10 weeks) | Accepted — testing a complete app is more valuable |
| Web features still in progress | Freeze new web UI during sprint |
| Scope (~80 components) | Sequential phases with parity checklist per screen |
| AdminLobby DnD + schedule grids | Budget extra time in Phase 2–3 |
| RN Windows library gaps | Phase 6 after iOS/Android cutover |
| Custom auth (no Supabase Auth) | Port `localStorage` → AsyncStorage; consider SecureStore for PIN |
| Regression risk | Side-by-side parity checklist before device test |

---

## Execution order

Run the complete sprint sequentially on branch `Mobile` — no stopping for partial device tests:

1. Phase 0: Monorepo + RN foundation (auth, nav, shared primitives)
2. Phase 1: Public + customer (all screens)
3. Phase 2: Staff (all screens + schedule subsystem)
4. Phase 3: Admin (all screens + Lobby DnD + reports)
5. Phase 4: Shared components + parity pass
6. Phase 5: Full device test on iOS/Android → cutover → PR to `main`
7. Phase 6: Windows target
