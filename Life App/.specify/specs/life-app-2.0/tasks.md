# Tasks: Life App 2.0

**Input**: `spec.md`, `architecture.md`, `scope.md` in this folder
**Status**: Implemented (merged to `master` 2026-08-13, PRs #94–#108)
**Tests**: Included only for pure logic (per tech-stack rule: periodization, scheduler, pure functions). UI tests optional and skipped.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 = Garmin Sync, US2 = Dashboard, US3 = Habits, US4 = Today's Session, US5 = Budget, US6 = Email Digest

---

## Phase 1: Setup

**Purpose**: Branch, dependencies, environment.

- [x] T001 Create `life-app-2.0` branch from `master` (`git checkout -b life-app-2.0`)
- [x] T002 Install `garmin-connect-client` and `nodemailer` in `Life App/package.json` (via npm, latest versions)
- [x] T003 [P] Add `ENCRYPTION_KEY`, `GMAIL_APP_PASSWORD`, `GMAIL_FROM_ADDRESS`, `CRON_SECRET` to local `.env.local` and document them in `Life App/DEPLOYMENT.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema and shared helpers every story depends on. No user story work until this is done.

- [x] T004 Add to `src/db/schema.ts`: `sleep_logs`, `daily_metrics`, `garmin_connections`, `email_preferences` tables + `activity_logs.garmin_activity_id` column, with indexes per `architecture.md` (unique `(user_id, date)` on sleep_logs and daily_metrics; unique `user_id` on garmin_connections and email_preferences; unique partial index on `garmin_activity_id` where not null)
- [x] T005 Mirror all T004 changes in `apply-schema.js` using `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ADD COLUMN` guards; verify idempotency by running it twice against a fresh scratch DB
- [x] T006 [P] Create `src/lib/crypto.ts` — AES-256-GCM encrypt/decrypt helpers keyed from `ENCRYPTION_KEY`, with round-trip test in `src/lib/__tests__/crypto.test.ts`
- [x] T007 [P] Add TypeScript interfaces (`SleepLog`, `DailyMetrics`, `GarminConnection`, `EmailPreferences`, `DashboardData`) to `src/types/index.ts`

**Checkpoint**: `npm run build` passes with new schema; user stories can begin.

---

## Phase 3: User Story 1 — Garmin Connect & Sync (P1) 🎯 MVP core

**Goal**: A user connects their Garmin account once, then syncs activities, sleep, and daily calories with one tap. No duplicates, password never stored.

**Independent Test**: Connect a real Garmin account in settings, hit "Sync now", verify activities/sleep/calories rows appear in the DB; sync again and verify zero duplicates; sleep score updates if Garmin revised it.

- [x] T008 [P] [US1] Create `src/lib/garmin-mapping.ts` — Garmin activity type → app activityType name mapping (running, tennis, climbing, cycling, fallback "Other"), with test in `src/lib/__tests__/garmin-mapping.test.ts`
- [x] T009 [US1] Create `src/lib/garmin-client.ts` — wrapper around `garmin-connect-client`: login with email/password/MFA → session tokens; restore session from decrypted tokens; fetch activities by date range, daily sleep, daily summary (calories/steps)
- [x] T010 [US1] Create `src/lib/garmin-sync.ts` — pure sync logic: given fetched Garmin data + existing rows, produce inserts/upserts (activity dedup by `garmin_activity_id`, sleep + daily_metrics upsert on `(user_id, date)`, training session auto-completion when mapped type matches a session scheduled today for the same sport), with test in `src/lib/__tests__/garmin-sync.test.ts`
- [x] T011 [US1] Create `POST /api/garmin/connect` in `src/app/api/garmin/connect/route.ts` — takes credentials (+optional MFA code), logs in via garmin-client, stores encrypted tokens + garmin_email in `garmin_connections`, never persists the password; auth-guarded
- [x] T012 [US1] Create `POST /api/garmin/sync` in `src/app/api/garmin/sync/route.ts` — restores session, fetches last 7 days (configurable `?days=`), applies `garmin-sync.ts` logic, updates `last_synced_at`, returns counts; auth-guarded
- [x] T013 [P] [US1] Create `GET /api/garmin/status` (connection status + last sync) and `DELETE` (disconnect, wipe tokens) in `src/app/api/garmin/status/route.ts`; auth-guarded
- [x] T014 [US1] Create `src/components/settings/garmin-connection.tsx` — connect form (email, password, MFA field shown when required), "Connected as …" state, "Sync now" button with result feedback, disconnect; wire into `src/app/settings/page.tsx` section

**Checkpoint**: Garmin data flows into the DB end-to-end for the logged-in user.

---

## Phase 4: User Story 2 — Dashboard (P1) 🎯 MVP completes here

**Goal**: `/dashboard` replaces `/today` as the landing page — sleep, calories, km run, activity count, per-habit last-30-days consistency, glanceable in 5 seconds.

**Independent Test**: Log in → land on `/dashboard` → all five metric groups render from synced data with no manual logging; with no Garmin connection, cards show a calm "Connect Garmin" state, never an error.

- [x] T015 [P] [US2] Create `GET /api/sleep-logs` (`?from=&to=&limit=`) in `src/app/api/sleep-logs/route.ts`; auth-guarded
- [x] T016 [P] [US2] Create `GET /api/daily-metrics` (`?from=&to=`) in `src/app/api/daily-metrics/route.ts`; auth-guarded
- [x] T017 [P] [US2] Add `countDoneInWindow(logDates, days)` helper to `src/lib/habit-streaks.ts` (last-30-days count — deliberately not a streak), with test in `src/lib/__tests__/habit-streaks.test.ts`
- [x] T018 [US2] Create `GET /api/dashboard` in `src/app/api/dashboard/route.ts` — single aggregation per `architecture.md` JSON shape: last night's sleep + week average, yesterday's calories + week daily average, km run this ISO week (Running type), activities count this week, per-habit `doneLast30Days`; auth-guarded
- [x] T019 [US2] Create `src/components/dashboard/dashboard-view.tsx` + child cards `sleep-card.tsx`, `calories-card.tsx`, `activity-card.tsx`, `habit-consistency-card.tsx` — warm/calm design system (Fraunces display, OKLCH palette vars, fade-up motion), positive framing (no-data shows context, never failure)
- [x] T020 [US2] Create thin `src/app/dashboard/page.tsx`; change `/` redirect in `src/app/page.tsx` from `/today` to `/dashboard`; update `src/components/layout/app-sidebar.tsx` (Dashboard as anchor, remove Today entry per nav table in `architecture.md`)
- [x] T021 [US2] Add loading skeleton mirroring the dashboard layout and a "Connect Garmin" empty state (links to settings) in `src/components/dashboard/`

**Checkpoint**: MVP — the app opens to a trophy case fed by Garmin. Deployable.

---

## Phase 5: User Story 3 — Habits Streak Archive (P2)

**Goal**: Habits page shows a year heatmap of wins; missing days are neutral warm-gray; keystone habits subtly highlighted.

**Independent Test**: Open `/habits` → year heatmap renders logged days in warm OKLCH tones, missed days neutral, no red anywhere; keystone habit visually distinct.

- [x] T022 [US3] Extend `GET /api/habits` in `src/app/api/habits/route.ts` with `?since=YYYY-MM-DD` query param for `recentLogDates` (default stays 30 days — existing consumers unaffected)
- [x] T023 [US3] Create `src/components/habits/habit-year-heatmap.tsx` — GitHub-style year grid, warm OKLCH intensity scale via `--palette-*` vars, neutral warm-gray for missing days, `isKeystone` subtle highlight, respects `prefers-reduced-motion`
- [x] T024 [US3] Replace the 7-day strip with the heatmap in the habits page components under `src/components/habits/`, fetching with `?since=` 365 days back

**Checkpoint**: Habits read as an archive of wins, not a checklist.

---

## Phase 6: User Story 4 — Today's Session Card (P2)

**Goal**: One clear card answers "what am I training today?" — phase, week, type, focus, duration, mark-done.

**Independent Test**: With an active training plan, dashboard and goal detail show today's session card with correct phase/week/focus; "Mark done" completes it via the existing flow; Garmin sync of a matching activity auto-completes it (from US1 T010).

- [x] T025 [US4] Today's session derivation implemented in `GET /api/today/sessions` (phase, week, session type, focus, duration from training plan data)
- [x] T026 [US4] Create `src/components/goals/today-session-card.tsx` — structured card with "Mark done" using the existing check-off flow, quiet empty state when nothing is scheduled
- [x] T027 [US4] Surface the card on `/goals` via `today-sessions-section.tsx` (dashboard session card deferred)

**Checkpoint**: Training answers one question clearly; full plan still one tap deeper.

---

## Phase 7: User Story 5 — Budget Quarterly Planning (P3)

> **SUPERSEDED 2026-08-12** — do not implement T028/T029. The budget redesign was specced in full as its own feature: `.specify/specs/budget-forecasting/` (forecast tab, cash flow table, trajectory chart, scenario panel — replaces the planning canvas and `budget-scenarios.ts` planned below). Implement that feature's `tasks.md` instead.

- [ ] ~~T028 [US5] Restructure budget components — superseded by budget-forecasting~~
- [ ] ~~T029 [US5] Scenario modeling UI in `budget-scenarios.ts` — superseded by budget-forecasting~~

---

## Phase 8: User Story 6 — Email Morning Digest (P3)

**Goal**: A warm 07:00 email — yesterday's key metric, today's session, best habit consistency — after syncing every connected user's Garmin data.

**Independent Test**: Call `POST /api/email/send-daily-digest` with the `CRON_SECRET` header → connected users' Garmin data syncs, enabled users receive the email with fresh data and a positive tone; wrong/missing secret → 401; disabled users get nothing.

- [x] T030 [P] [US6] Create `GET`/`PATCH /api/email-preferences` in `src/app/api/email-preferences/route.ts`; auth-guarded, upsert on first PATCH
- [x] T031 [P] [US6] Create `src/lib/digest-assembler.ts` + `src/lib/email-template.ts` — compose daily/weekly digest content and render HTML
- [x] T032 [US6] Create `src/lib/mailer.ts` — Nodemailer transport using `GMAIL_APP_PASSWORD` / `GMAIL_USER`
- [x] T033 [US6] Create `POST /api/cron/morning-digest` in `src/app/api/cron/morning-digest/route.ts` — reject without valid `CRON_SECRET` header; sync Garmin per user; compose + send digest
- [x] T034 [US6] Add email digest settings at `/settings/email` (`email-digest-settings.tsx`)
- [x] T035 [US6] Document Railway cron setup in `Life App/DEPLOYMENT.md` (cron service still configured separately in Railway dashboard)

**Checkpoint**: The app comes to the user every morning with fresh data.

---

## Phase 9: Polish & Cross-Cutting

- [x] T036 Run `npm run build` and `npm run test:run` — fix any TypeScript or test failures
- [x] T037 [P] Update `specs/master/data-model.md` (4 new tables + column), `specs/master/contracts/api-routes.md` (8 new routes), and `specs/master/system-overview.md` (dashboard page map)
- [x] T038 [P] Update `Life App/ROADMAP.md` (2.0 status) and `Life App/progress.md` (what changed, verification evidence)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (P1)** → **Foundational (P2)** → everything else
- **US1 Garmin** blocks the data half of **US2 Dashboard** and the sync step of **US6 Email**
- **US2 Dashboard** provides the page where **US4 Today's Session** card lives (T026/T027 need T019/T020)
- **US3 Habits** and **US5 Budget** are fully independent — can run any time after Foundational
- **Polish** last

### Story Order (single developer, recommended)

US1 → US2 (MVP, deploy) → US3 → US4 → US5 → US6

### Parallel Opportunities

- T003 alongside T001–T002; T006/T007 alongside each other
- Within US1: T008 and T013 parallel to the client/sync chain (T009 → T010 → T011/T012)
- Within US2: T015, T016, T017 all parallel before T018
- Within US6: T030 and T031 parallel before T033
- US3 and US5 can interleave anywhere after Phase 2

---

## Implementation Strategy

**MVP = Phase 1 + 2 + US1 + US2.** That's the moment the app becomes worth opening again: Garmin feeds the trophy case. Deploy and live with it a few days before building US3–US6 — real usage will tell us if the dashboard metrics are the right ones.

Each subsequent story is an independent, deployable increment. Stop at any checkpoint.

**Definition of done per task**: build passes, relevant tests pass, no new linter errors — per `AGENTS.md`.
