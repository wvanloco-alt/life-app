# Life App 2.0 — Session Progress

## 2026-08-11 — Auto-sync on dashboard load

**Branch**: `life-app-2.0`

### What changed

- **`DashboardData` type** (`src/types/index.ts`): added `garminConnected: boolean` and `lastSyncedAt: string | null` as first-class fields (removed the local `DashboardPayload = DashboardData & { garminConnected }` workaround in `dashboard-cards.tsx`)
- **`GET /api/dashboard`** now returns `lastSyncedAt` from `garmin_connections`
- **`dashboard-view.tsx`**: on mount, loads dashboard data, then silently fires `POST /api/garmin/sync` if connected and last sync was > 30 minutes ago. Reloads data after sync completes. Subtitle changes to "Syncing Garmin…" while running — no blocking spinner.

### Verification

- `npm run build` — passes (1 expected warning: `garmin-connect-client` not installed locally — native package, only available in Docker)

### Next task

**T022** — Habits heatmap (year view, positive framing, no guilt states)

---

## 2026-08-10 — Phase 4 complete (Dashboard MVP)

**Branch**: `life-app-2.0` (local only, not pushed)

### What changed

- **T015–T018**: `GET /api/sleep-logs`, `/api/daily-metrics`, `/api/dashboard` (single aggregation); `countDoneInWindow()` in `habit-streaks.ts`.
- **T019–T021**: `/dashboard` page with sleep, calories, activity, and habit cards; loading skeleton; Connect Garmin hints; `/` redirects to dashboard; sidebar Dashboard replaces Today.

### Verification

- `npm run build` — passes
- `npm run test:run` — 383 tests pass

### Phase 4 gate — Wim reviews look & feel

1. Restart dev server if needed
2. Log in → should land on **http://localhost:3000/dashboard**
3. Without Garmin: sleep/calories/activity cards show calm **Connect Garmin** link (habits still show if you have any)
4. With Garmin synced (Docker): metrics populate from synced data
5. Review calm tone, typography, spacing — this is the MVP checkpoint before Phases 5–8

### Next task

**T022** — Phase 5 Habits heatmap

---

## 2026-08-13 — Email digest redesign + Settings refactor

### What changed

**Email template** (`src/lib/email-template.ts`) — full redesign to table-based HTML. Three sections: Yesterday (sleep score/duration + calories + activity as stat rows), Month so far (pill chips: session count, habit days, avg sleep, avg steps), Today's concept (library item card: amber title, serif what, sans how). Amber filled CTA button. Plain text version updated to match.

**Digest assembler** (`src/lib/digest-assembler.ts`) — sleep and activity now always shown together (not either/or). Calories fetched from `daily_metrics`. New `queryMonthlyStats` function. New `queryLibrarySegment` function: matches yesterday's sport names to library topic slugs, prefers bookmarked items, falls back to Habit Design or random non-excluded item.

**Types** (`src/types/index.ts`) — `DigestContent` updated: added `calories`, `activity.names[]`, `monthlyStats`, `librarySegment`. `EmailPreferences` updated: added `excludedLibraryTopics: string[]`.

**Schema** (`src/db/schema.ts` + `apply-schema.js`) — added `excluded_library_topics TEXT` column to `email_preferences`.

**API** (`src/app/api/email-preferences/route.ts`) — GET/PATCH now handle `excludedLibraryTopics` (JSON array of topic slugs).

**Settings** — full tab refactor:
- `settings/layout.tsx`: 6 tabs (Roles, Activity Types, Scheduler, Garmin, Email digest, Password)
- New sub-pages: `/settings/garmin`, `/settings/email`, `/settings/password`
- New component: `PasswordSettings` (extracted from settings-page)
- `settings-page.tsx`: clean 6-card overview, no inline forms

**EmailDigestSettings** — new Library concepts section: per-topic `Switch` toggles, optimistic save to `PATCH /api/email-preferences { excludedLibraryTopics }`.

### Verification
- `npm run build` passes
- Docker rebuilt and tested: cron fires, email received with all new sections
- Topic toggles save correctly; excluded topics absent from next digest

---

## 2026-08-10 — Phase 3 complete (Garmin US1)

Garmin connect/sync + settings UI. See commit `0123f7e`.

---

## 2026-08-10 — Phases 1–2 complete

Foundational schema, crypto, env. See commit `db710ed`.
