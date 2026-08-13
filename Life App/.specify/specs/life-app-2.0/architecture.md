# Life App 2.0 — Architecture Document

> **Status**: Draft  
> **Created**: 2026-08-10  
> **Branch**: `life-app-2.0` (from `master`)  
> **Prerequisite reading**: `spec.md` in this folder

---

## What This Document Is

A concrete technical picture of what changes between 1.0 and 2.0. It maps the delta: new tables, new routes, changed pages, new infrastructure. It does not re-document what stays the same — for that, see the existing `system-overview.md`, `data-model.md`, and `api-routes.md`.

---

## What Does Not Change

These are untouched in 2.0. No rewrites, no new abstractions.

| Area | Status |
|---|---|
| Auth (NextAuth.js v5, JWT, Credentials) | Unchanged |
| All existing API routes | Unchanged |
| Drizzle ORM schema (all existing tables) | Unchanged — 2.0 is additive only |
| Goals feature (V2 hierarchy, tallies, pace) | Unchanged |
| Library feature | Unchanged |
| Admin user management | Unchanged |
| Deployment (Railway, Docker, `apply-schema.js`) | Unchanged |
| Per-user data isolation pattern | Unchanged |
| All existing architectural patterns (auth guard, upserts, parallel fetches, loading skeletons) | Unchanged |

---

## Navigation Changes

Current sidebar has two conceptual groups: **Daily Focus** (Today, Monthly Plan) and **Life Areas** (Activities, Budget, Goals, Habits).

2.0 collapses these into one flat hierarchy with **Dashboard** as the anchor.

| 1.0 Route | 2.0 Route | Change |
|---|---|---|
| `/today` | `/dashboard` | Renamed + completely redesigned as trophy case |
| `/monthly-plan` | `/monthly-plan` | Unchanged (accessible but not the entry point) |
| `/activities` | `/activities` | Unchanged |
| `/budget` | `/budget` | Redesigned UI, same route |
| `/goals` | `/goals` | Unchanged |
| `/habits` | `/habits` | Redesigned UI, same route |
| `/library/*` | `/library/*` | Unchanged |
| `/settings` | `/settings` | + email preferences sub-section added |
| `/admin/users` | `/admin/users` | Unchanged |

`/` continues to redirect — to `/dashboard` instead of `/today`.

---

## New Features: Architecture

---

### 1. Dashboard (`/dashboard`)

**What it is**: A new page that replaces `/today` as the primary entry point. Unlike Today (which shows today's schedule), Dashboard shows aggregated progress metrics.

**Component**:
- `src/components/dashboard/dashboard-view.tsx` — main container
- Child cards: `SleepCard`, `CaloriesCard`, `ActivityCard`, `HabitConsistencyCard`

**New API endpoint**:

#### `GET /api/dashboard`

Aggregates all dashboard metrics in a single request. Returns:

```json
{
  "sleep": {
    "lastNight": { "date": "2026-08-09", "score": 78, "durationMinutes": 435 },
    "weekAverage": 74
  },
  "calories": {
    "yesterday": 2340,
    "weekDailyAverage": 2180
  },
  "activities": {
    "thisWeek": 4,
    "kmRunThisWeek": 18.4
  },
  "habits": [
    { "id": 1, "name": "Morning run", "color": "#10B981", "doneLast30Days": 22 },
    { "id": 2, "name": "Reading", "color": "#6366F1", "doneLast30Days": 14 }
  ]
}
```

This is a read-only aggregation endpoint. It queries:
- `sleep_logs` for sleep data
- `daily_metrics` for calories
- `activity_logs` for km run this week (filter by activity type = Running, date range = this ISO week)
- `activity_logs` count for activities this week
- `habit_logs` + `habits` for per-habit last-30-days counts (a simple count of log dates in the window — deliberately **not** a streak: a streak resets to 0 on one missed day, which is a guilt mechanic in disguise; "22 of the last 30" stays positive after a miss)

**Key decision**: One endpoint instead of five parallel fetches. Dashboard is the most-loaded page — minimise round trips.

---

### 2. Garmin Integration

**What it does**: Syncs activities, sleep, and daily calorie data from the user's Garmin device into the app's database.

**How the app talks to Garmin**: Via the [`garmin-connect-client`](https://www.npmjs.com/package/garmin-connect-client) npm library (unofficial Garmin Connect API, MIT, actively maintained). The Garmin MCP server connected to this project is a **development tool only** — it runs locally in Cursor against Wim's account and cannot be called by the deployed app, nor serve multiple users.

**Trade-off (explicitly accepted 2026-08-10)**: The unofficial API is against Garmin's ToS. Personal-volume use is tolerated in practice, but Garmin can change endpoints or rate-limit without notice. The official Health API requires a business developer-program application and is not realistic for this project.

#### Sync Flow

```
Sync (user clicks "Sync Garmin", or the morning cron runs it)
  → POST /api/garmin/sync
    → Restore Garmin session from garmin_connections tokens (refresh if needed)
    → Fetch recent activities, sleep, daily summaries via garmin-connect-client
    → For each Garmin activity:
        if activity_logs.garmin_activity_id = <id> already exists → skip
        else → map to activityType + insert into activity_logs
        if the mapped type matches a training session scheduled today
          for the same sport → mark that session done (auto-completion)
    → For each sleep record:
        upsert into sleep_logs (conflict on user_id + date —
        Garmin revises sleep scores retroactively, so always update)
    → For each daily summary:
        upsert into daily_metrics (conflict on user_id + date)
    → Update garmin_connections.last_synced_at
  → Return { activitiesAdded, sleepRecordsUpserted, dailyMetricsUpdated, sessionsAutoCompleted }
```

#### Garmin Activity → ActivityLog Mapping

Garmin activity types need to map to the app's `activityTypes`. This is done via a mapping config (not a table — a constant in `src/lib/garmin-mapping.ts`):

```
"running" → activityType.name = "Running"
"tennis"  → activityType.name = "Tennis"
"climbing" → activityType.name = "Climbing (Gym)" or "Climbing (Outdoor)"
"cycling" → activityType.name = "Cycling" (create if not exists)
```

Unmapped Garmin types are imported as a generic "Other" type. The user can remap or ignore them in settings later (V2 scope).

#### Per-User Garmin Auth

Each user connects their own Garmin account **once**: they enter their Garmin email + password (+ MFA code if their account requires it) in settings. The server logs in via `garmin-connect-client`, receives session tokens, and stores only those tokens — **the password is never persisted**. Subsequent syncs restore the session from tokens; token refresh is handled by the library.

Tokens grant full account access, so they are encrypted at rest with AES-256-GCM using a key from the `ENCRYPTION_KEY` env var.

Until a user connects, the sync button shows "Connect Garmin" instead.

---

### 3. Email Reminders

**Stack**: Nodemailer + Gmail SMTP. No external email service.

**Setup**: One Gmail account acts as the sender. An App Password is generated in Google Account settings and stored as `GMAIL_APP_PASSWORD` env var. The `From` address is configured as `GMAIL_FROM_ADDRESS`.

**Trigger**: Railway cron jobs run a container on a schedule and exit — they don't hit HTTP endpoints of a running service. So the trigger is a tiny one-shot Railway service (a `curl` command with the `CRON_SECRET` header) on a cron schedule (~07:00 Europe/Brussels), calling `POST /api/email/send-daily-digest`. The endpoint rejects requests without the correct `CRON_SECRET` header — not accessible to regular users.

**Sync-then-send**: The digest reports last night's sleep and yesterday's activity — data that only exists if a sync already ran. Nobody has opened the app at 07:00, so the digest endpoint **first runs a Garmin sync for every user with an active connection, then composes and sends the emails**. Side benefit: the dashboard is fresh every morning without anyone pressing the sync button.

**Email content**:
1. Yesterday's key metric (sleep score or most notable activity)
2. Today's training session if one is scheduled (from training plan)
3. Best habit consistency highlight
4. Single CTA link → app homepage

**Template**: Plain HTML, warm tone. Rendered server-side with a minimal template string — no template engine dependency.

---

## Schema Changes (Additive Only)

All changes go through `apply-schema.js` with `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ADD COLUMN IF NOT EXISTS`. Nothing is dropped or renamed.

---

### New Table: `sleep_logs`

Stores nightly sleep data synced from Garmin.

| Column | Type | Description |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| user_id | TEXT NOT NULL | Owner (FK → users.id) |
| date | TEXT NOT NULL | ISO YYYY-MM-DD (the night, not the morning) |
| score | INTEGER | Garmin sleep score (0-100) |
| duration_minutes | INTEGER | Total sleep duration |
| deep_sleep_minutes | INTEGER | Deep sleep phase |
| rem_sleep_minutes | INTEGER | REM phase |
| light_sleep_minutes | INTEGER | Light sleep phase |
| source | TEXT NOT NULL DEFAULT 'garmin' | Data source |
| created_at | TEXT NOT NULL | ISO 8601 |

**Unique index**: `(user_id, date)` — one sleep record per user per night. Sync always **upserts** on this key: Garmin revises sleep scores retroactively, so an existing record is updated, never skipped. This one index handles dedup too — no separate Garmin record ID needed.

---

### New Table: `daily_metrics`

Stores daily aggregates from Garmin (calories, steps). Not per-activity — the daily total.

| Column | Type | Description |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| user_id | TEXT NOT NULL | Owner |
| date | TEXT NOT NULL | ISO YYYY-MM-DD |
| calories_total | INTEGER | Total calories burned (active + resting) |
| calories_active | INTEGER | Active calories only |
| steps | INTEGER | Step count |
| source | TEXT NOT NULL DEFAULT 'garmin' | Data source |
| created_at | TEXT NOT NULL | ISO 8601 |
| updated_at | TEXT NOT NULL | ISO 8601 |

**Unique index**: `(user_id, date)` — upsert on conflict.

---

### New Table: `garmin_connections`

Per-user Garmin session tokens (from `garmin-connect-client` login — not official OAuth).

| Column | Type | Description |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| user_id | TEXT NOT NULL UNIQUE | Owner (one connection per user) |
| session_tokens | TEXT NOT NULL | Session token blob from garmin-connect-client, AES-256-GCM encrypted with `ENCRYPTION_KEY` |
| garmin_email | TEXT | Display only ("Connected as ..."), never the password |
| last_synced_at | TEXT | ISO 8601 — last successful sync time |
| created_at | TEXT NOT NULL | ISO 8601 |
| updated_at | TEXT NOT NULL | ISO 8601 |

---

### New Table: `email_preferences`

Per-user email reminder settings.

| Column | Type | Description |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| user_id | TEXT NOT NULL UNIQUE | Owner |
| enabled | INTEGER NOT NULL DEFAULT 0 | 0 = off, 1 = on |
| created_at | TEXT NOT NULL | ISO 8601 |
| updated_at | TEXT NOT NULL | ISO 8601 |

**Deliberately no per-user send time or timezone.** All users get the digest at one global time (the cron schedule, ~07:00 Europe/Brussels). Everyone in the friend group is in the same timezone; per-user scheduling would force the cron to run every 15 minutes and the endpoint to compute who's due — complexity with no current payoff. Add columns back if a user in another timezone actually joins.

---

### Additive Column: `activity_logs.garmin_activity_id`

```sql
ALTER TABLE activity_logs ADD COLUMN garmin_activity_id TEXT;
```

Used for deduplication during Garmin sync. Null for manually logged activities. A unique index on `(garmin_activity_id)` (where not null) prevents double-imports.

---

## New API Routes

These are net-new. All existing routes remain unchanged.

| Method | Route | Description |
|---|---|---|
| GET | `/api/dashboard` | Aggregated dashboard metrics |
| POST | `/api/garmin/sync` | Trigger Garmin sync for current user |
| GET | `/api/garmin/status` | Last sync time, connection status |
| GET | `/api/sleep-logs` | Sleep history (`?from=` / `?to=` / `?limit=`) |
| GET | `/api/daily-metrics` | Daily calorie/steps data (`?from=` / `?to=`) |
| GET | `/api/email-preferences` | Current user's email preferences |
| PATCH | `/api/email-preferences` | Update email preferences (enabled) |
| POST | `/api/email/send-daily-digest` | Internal cron endpoint (requires `CRON_SECRET` header) |

---

## Redesigned Features: What Changes

These features change only in their UI layer. No data model or API changes.

### Budget (`/budget`)

**What changes**: The page is restructured around a **quarterly review flow** rather than a daily logging interface. The primary UI becomes a planning canvas: set income, set fixed costs, set savings goal, model scenarios. Daily expense entry still works but is no longer front-and-center.

**No API changes.** All existing budget routes stay as-is.

---

### Training Schedules (inside `/goals` + `/activities`)

**What changes**: A "Today's Session" card appears prominently in the Dashboard and on the goal detail page. It reads from the existing `training_phases` table (current active phase) and the `activities` table (today's scheduled training session) and surfaces a single, structured summary.

**Structure of the Today's Session card**:
- Phase name + week number within phase
- Session type (Training / Supplemental)
- Key focus (from `sportFocusContent` or `description`)
- Duration target
- "Mark done" button (existing check-off flow)

The full training plan view (multi-week, phase overview) remains accessible one tap deeper — it's not removed, just deprioritised.

**Auto-completion**: When a Garmin sync imports an activity whose mapped type matches a training session scheduled for the same day and sport, that session is marked done automatically. This lives entirely inside the sync flow (see Garmin Integration) — no changes to training routes.

**No API changes to training routes.**

---

### Habits (`/habits`)

**What changes**:
1. Dashboard shows a per-habit "X of last 30 days" count (not a current streak — streaks reset to 0 on a miss, which violates the positive-framing requirement)
2. The habits page replaces the 7-day strip with a **year heatmap** (GitHub contribution graph style, warm OKLCH palette)
3. Missing days are rendered in a neutral warm-gray — never red, never a "broken" visual state
4. Keystone habits get a subtle highlight (existing `isKeystone` field)

**No API changes.** Log-date data already comes from `GET /api/habits` (`recentLogDates`). The heatmap needs a wider date range — extend `recentLogDates` window from 30 days to 365 days, or add `?since=YYYY-MM-DD` query param to the existing endpoint.

---

## Environment Variables Added

| Variable | Purpose |
|---|---|
| `GMAIL_APP_PASSWORD` | Gmail SMTP app password for Nodemailer (sender account needs 2FA enabled) |
| `GMAIL_FROM_ADDRESS` | Sender address for reminder emails |
| `CRON_SECRET` | Secret header for the internal cron endpoint |
| `ENCRYPTION_KEY` | AES-256-GCM key for encrypting Garmin session tokens at rest |

---

## Implementation Order

The spec-kit process defines the task breakdown. This section only indicates dependencies between the new components.

1. **Schema first** — add new tables via `apply-schema.js`
2. **Garmin sync** — without this, Dashboard has no sleep/calorie data to show
3. **Dashboard API + page** — depends on Garmin sync being in place
4. **Habits heatmap** — independent, can be done any time
5. **Training "Today's Session" card** — independent, reads existing data
6. **Budget UI redesign** — independent
7. **Email reminders** — depends on schema (email_preferences table) **and on Garmin sync**, because the digest endpoint syncs every connected user before sending

---

## What Is Not In Scope For 2.0

- Bank integration (Plaid, Nordigen, or any other)
- AI chat or agent features
- Mobile app
- Public signup
- Strava integration
- Rewriting or migrating existing data
- Changing the deployment infrastructure
