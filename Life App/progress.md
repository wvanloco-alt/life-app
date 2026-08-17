# Life App 2.0 — Session Progress

## 2026-08-17 — Documentation updated post-merge

**Context**: Life App 2.0 fully merged to `master` and live in production. PR #109 fixed Garmin sync for newer activity type keys (`tennis_v2`).

**Docs updated**: `AGENT-ONBOARDING.md`, `ROADMAP.md`, `specs/master/feature-specs.md`, `specs/master/system-overview.md`, `specs/master/tasks.md`, `.specify/specs/life-app-2.0/spec.md`.

**Key facts for new agents**:
- Default landing page is `/dashboard`, not `/today`
- Garmin issues are contained in `src/lib/garmin-client.ts` + `scripts/patch-garmin.cjs`
- Settings uses tabbed sub-pages under `/settings/*`
- Morning digest cron: `POST /api/cron/morning-digest` with `x-cron-secret` header

---

## 2026-08-14 — Garmin `tennis_v2` sync fix (PR #109)

**Problem**: PR #108's postinstall patch targeted `dist/index.js`, but `garmin-connect-client` v2.0.0 validates `activityType.typeKey` in `dist/types.js`. Tennis activities recorded with `tennis_v2` caused Zod `invalid_enum_value` errors on sync.

**Fix**: Fetch activities via Garmin API directly in `garmin-client.ts` (bypasses library Zod validation). Updated `patch-garmin.cjs` to patch `types.js` as a fallback.

---

## 2026-08-13 — Life App 2.0 shipped to production

**Branch**: `life-app-2.0` merged to `master` via PR #94 → #100

### What shipped

All Life App 2.0 features are now live in production:
- Dashboard as homepage with auto Garmin sync
- Habits year heatmap + X/30 consistency metric
- Today's Session card on Goals page
- Budget forecasting tab (year-at-a-glance, savings trajectory, scenario panel)
- Morning email digest (daily/weekly, library concepts, monthly stats)
- Settings tab refactor (Garmin, Email digest, Password as top-level tabs)

### Deployment fixes required (lessons learned)

Several issues had to be resolved before Railway would build successfully:

1. **Stacked PRs don't auto-land on master** — PRs #89–93 merged into each other's feature branches. Required a final PR #94 from `life-app-2.0` → `master`.
2. **Merge conflict resolution dropped schema columns** — `defaultTrainingDurationMinutes` and `defaultSupplementalDurationMinutes` were lost from `schema.ts` and `types/index.ts` when resolving conflicts with `git checkout --ours`. Fixed in PR #100.
3. **`npm ci` lock file mismatch** — Local npm v11 (Node 24) generates a lockfile incompatible with npm v10 (Node 20 in Docker). Fixed by switching to `npm install` in the Dockerfile (PR #99).
4. **`garmin-connect-client` bundled by Turbopack** — Next.js tried to statically bundle `garmin-connect-client` → `deasync` (native addon). Fixed by adding all three packages to `serverExternalPackages` in `next.config.ts` (PR #100).
5. **Alpine → Debian slim** — `node-libcurl-ja3` (dep of `garmin-connect-client`) needs glibc. Alpine uses musl libc and couldn't run the prebuilt binaries. Switched base image to `node:20-slim`; replaced `su-exec` with `gosu` (PR #97, kept in #100).

### Current state

- `master` is deployed and live
- All Railway env vars set: `ENCRYPTION_KEY`, `CRON_SECRET`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `AUTH_TRUST_HOST`
- Railway cron for morning digest still needs to be configured (separate cron service — see DEPLOYMENT.md)

---

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
