# Trash_Can — archived legacy files

Moved on **2026-06-07** as part of the Full Completion Roadmap (Phase A).

These paths were duplicates or superseded by the monorepo layout. **Do not edit or import from here.**

| Path | Reason |
|------|--------|
| `src/` | Pre-monorepo web copy; live app is `apps/web/src/` |
| `public/` | Duplicate of `apps/web/public/` |
| `apps-web/` | Orphaned utils, services, hooks, and temp files inside the active web app |

Active code lives in:

- `apps/web/` — web (Vercel deploy)
- `apps/mobile/` — React Native (iOS/Android)
- `packages/shared/` — shared business logic
