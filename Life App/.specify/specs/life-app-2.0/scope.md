# Life App 2.0 — Scoping Document

> **Status**: Final  
> **Created**: 2026-08-10  
> **Purpose**: Complete record of the scoping conversation — why we're doing this, every decision made, what's in and out, and the reasoning behind each call. This document is the source of truth for scope disputes.

---

## Why We're Doing This

The original Life App stopped being used. The root cause was diagnosed through a scoping conversation on 2026-07-30 and 2026-08-10. Key findings:

**What broke down:**
- **Activities**: Manual logging worked until a few missed days created a backlog. Backlog dread killed the habit entirely. Garmin was tracking everything anyway — the app just wasn't connected to it.
- **Budget**: Daily expense entry was too tedious. Missing a few days meant reconstructing from bank history. Abandoned.
- **Habits**: User stopped keeping up with the habits themselves. The app surfaced that truth as a guilt record rather than a wins archive.
- **Training schedules**: Too noisy. Unclear what to do on any given day. Too much free text, not enough structure. User ended up asking an LLM instead.

**What kept working:**
- Training was still happening (just not logged in the app)
- The underlying features were valued — the user didn't want to start over, they wanted the same features to work better

**Root diagnosis**: The app was a **logger, not a companion**. It waited passively for the user to come to it. Every feature asked "did you do the thing?" — and when the answer was no, the app silently accumulated debt. Nothing celebrated what was done. Nothing made opening the app feel good.

**The design shift**: From "log your life" → "see your life." From task tracker → trophy case.

---

## Scoping Decisions (with Rationale)

Each decision below was made explicitly in conversation. None are assumed.

---

### Decision 1: Keep All Existing Features

**Decision**: All 1.0 features stay. No feature is cut.

**Rationale**: The user loves what's in the app. The problem is not the feature set — it's the UX, the friction, and the missing auto-sync. Cutting features would remove value without solving the actual problem.

**What this means**: Goals, Habits, Budget, Activities, Training Schedules, Library, Admin — all stay. The 2.0 work is redesign and addition, not replacement.

---

### Decision 2: Dashboard Becomes the Homepage

**Decision**: A new `/dashboard` page replaces `/today` as the app's primary entry point.

**Rationale**: The Today page was a schedule view — you opened it to see what to do. The new dashboard is a trophy case — you open it to see how you're doing. These are fundamentally different mental models. The dashboard is the "reason to open the app."

**Dashboard metrics (confirmed):**
- Sleep score (last night, from Garmin)
- Calories burned (yesterday + rolling daily average for the current week)
- Km run this week (from Garmin, filtered to Running activity type)
- Activities count this week (total, from Garmin)
- Per-habit "days done in the last 30" count for each active habit

**Amended 2026-08-10 (review)**: Originally "per-habit streak". Changed because a streak resets to 0 after one missed day — a guilt mechanic in disguise, violating the positive-framing requirement. A last-30-days count stays meaningful and positive after a miss.

**Framing requirement**: Positive only. If data isn't there yet, show context (yesterday's, weekly average) — never show absence as failure. Missing days are neutral, not penalised.

---

### Decision 3: Garmin Auto-Sync Is the Core Infrastructure Change

**Decision**: Add Garmin integration to auto-import activities, sleep, and daily calorie data — via the unofficial Garmin Connect API using the `garmin-connect-client` Node library.

**Rationale**: Manual logging was the single biggest friction point. Activities, sleep scores, and calories are already tracked on the Garmin — the app just wasn't reading them. Connecting Garmin eliminates ~90% of daily data entry. Friends will also join the app if Garmin integration exists.

**Amended 2026-08-10 (review)**: The original plan said "Garmin MCP integration". The MCP server cannot be used in production — it runs locally in Cursor against Wim's account only; the deployed app can't reach it and it can't serve multiple users. It remains a dev tool for exploring Garmin data shapes. The app itself uses `garmin-connect-client` (same unofficial endpoints, callable from Railway, per-user).

**Trade-off explicitly accepted by Wim (2026-08-10)**: The unofficial API is against Garmin's ToS and could break or be rate-limited without notice. The official Health API requires a business developer-program application — not realistic here. Users enter Garmin credentials once at connect time; only session tokens are stored (encrypted at rest), never the password.

**What syncs:**
- Activities (runs, tennis matches, climbing sessions, cycling, etc.)
- Sleep score + duration breakdown (nightly)
- Daily total calories burned

**How deduplication works**: Each Garmin activity has a unique ID. `activity_logs.garmin_activity_id` is added as a nullable column. On sync, any activity with a matching `garmin_activity_id` is skipped. Sleep records instead **upsert** on `(user_id, date)` — Garmin revises sleep scores retroactively, so existing records are updated rather than skipped.

**Tennis note**: The user confirmed they now track tennis on their Garmin, so manual tennis logging is no longer required. Tennis sessions will sync automatically like any other activity.

---

### Decision 4: Budget Becomes a Quarterly Planning Tool

**Decision**: Redesign the budget feature from a daily expense tracker into a seasonal forecasting tool used 3-4x per year.

**Rationale**: Daily expense entry will never stick — this was proven in 1.0. The user still wants budget capabilities, but for planning and forecasting, not daily tracking. Use case: set fixed monthly costs, set savings goal, model what a large purchase does to the annual savings rate, review progress at month/quarter end.

**What changes:**
- UI restructured around planning sessions (quarterly rhythm), not daily entry
- Daily expense entry still works but is not front-and-center
- The existing FI ladder, bucket targets, and moment log features stay

**What doesn't change:**
- All existing budget tables (`budget_settings`, `spending_categories`, `planned_expenses`, `moment_logs`) — no schema changes
- All existing budget API routes — no changes

**Explicitly rejected**: Bank integration (Plaid, Nordigen). Out of scope for 2.0.

---

### Decision 5: Training Schedules Get a "Today's Session" Card

**Decision**: Add a single clear "Today's Session" card as the primary training view, without removing the full periodization view.

**Rationale**: The user stopped using training schedules because "it is not clear what to do when and how" and "it is mostly just free text fields and noise." The fix is not rebuilding the schedule engine — it's surfacing one clear card that answers "what am I doing today?" The full plan view remains accessible one level deeper.

**All three sports stay**: Climbing, Tennis, Running.

**The Today's Session card shows:**
- Phase name + week number within phase
- Session type (Training vs Supplemental)
- Key focus point (from `sportFocusContent` or `description` — already stored)
- Duration target
- "Mark done" button (existing check-off flow)

**What doesn't change:**
- Periodization engine, phase structure, training plan creation — all unchanged
- All existing training plan tables and routes — unchanged

---

### Decision 6: Habits Become a Streak Archive

**Decision**: Reframe habits from a checklist with a 7-day strip → a wins archive with per-habit last-30-days counts on the dashboard and a year heatmap view.

**Rationale**: The checklist frame asks "did you do it today?" — which feels like guilt when the answer is no. The archive frame says "here's what you've built" — which is motivating. Crucially: missing days are neutral. No red states, no broken streak displays.

**Specific changes:**
- Dashboard shows a "days done in the last 30" count per active habit (not a checklist, and not a streak — see Decision 2 amendment)
- Habits page replaces 7-day strip with a year heatmap (GitHub-style, warm OKLCH palette)
- Missing days = neutral warm-gray — never red, never broken-looking
- Keystone habits get a subtle highlight (using existing `isKeystone` field)

**What doesn't change:**
- Habit creation flow, cue types, identity framing, reward — all unchanged
- All existing habit tables and routes — unchanged
- One small API change: extend `GET /api/habits` to return 365 days of log dates instead of 30, OR add a `?since=` query param for the heatmap

---

### Decision 7: Email Morning Reminder (Free, No External Service)

**Decision**: Add a morning email digest using Nodemailer + Gmail SMTP.

**Rationale**: The user needs a pull mechanism — something that comes to them rather than waiting for them to remember the app. Email was chosen over push notifications as simpler and more reliable. Gmail SMTP is free for this use case (small friend group).

**Email content:**
- Yesterday's key metric (sleep score or most notable activity)
- Today's training session if scheduled
- Best habit consistency highlight
- Single link back to the app

**Tone requirement** (explicitly stated): Warm and positive. "Hey, your week is looking good." Never "did you do this?" or guilt-adjacent copy.

**Technical approach:**
- Nodemailer + Gmail App Password (stored as `GMAIL_APP_PASSWORD` env var)
- A one-shot Railway cron service (curl) calls `POST /api/email/send-daily-digest` at one global time (~07:00 Europe/Brussels) — Railway cron runs containers on a schedule, it doesn't hit endpoints of a running service directly
- The digest endpoint **syncs each connected user's Garmin data first, then sends** — otherwise the 07:00 email would report stale data, since nobody has opened the app yet
- Endpoint protected by `CRON_SECRET` header
- Per-user preferences stored in new `email_preferences` table (enabled only)

**Amended 2026-08-10 (review)**: Per-user `send_time` and `timezone` dropped. Honoring them would require the cron to run every 15 minutes and the endpoint to compute who's due — complexity with no payoff while the whole friend group is in one timezone. Add back if that changes.

---

### Decision 8: Multi-User Stays

**Decision**: Friend Release (multi-user auth, per-user isolation, admin UI) remains fully intact.

**Rationale**: Friends would use the app if Garmin integration is available. This was explicitly confirmed. Each user connects their own Garmin account, with tokens stored per-user in `garmin_connections`. All per-user data isolation patterns remain unchanged.

---

### Decision 9: New Branch, Not a Rewrite

**Decision**: Life App 2.0 is built on a new branch `life-app-2.0` from `master`. Not a separate codebase.

**Rationale**: All existing code, routes, tables, and patterns are valid and worth keeping. What's needed is additions and UI changes on top of the existing foundation — not a fresh start. Branching from master means 1.0 remains deployable and 2.0 can be tested in parallel.

**Schema strategy**: Additive only. New tables added via `apply-schema.js` with `CREATE TABLE IF NOT EXISTS`. One new column added to an existing table (`activity_logs.garmin_activity_id`) via `ALTER TABLE ADD COLUMN IF NOT EXISTS`. Nothing dropped or renamed.

---

## Feature Scope Summary

| Feature | Type of Change | Schema Change | API Change |
|---|---|---|---|
| Dashboard | New page + new endpoint | No (reads new tables) | New: `GET /api/dashboard` |
| Garmin Sync | New infrastructure | 4 new tables, 1 new column | New: `/api/garmin/*`, `/api/sleep-logs`, `/api/daily-metrics` |
| Email Reminders | New infrastructure | 1 new table | New: `/api/email-preferences`, `/api/email/send-daily-digest` |
| Budget | UI redesign | None | None |
| Training Schedules | UI redesign (Today's Session card) | None | None |
| Habits | UI redesign (heatmap, last-30-days count on dashboard) | None | Minor: extend date window on `GET /api/habits` |
| Goals | No change | None | None |
| Library | No change | None | None |
| Auth / Admin | No change | None | None |
| Deployment | No change | None | None |

---

## Out of Scope (Explicit Decisions)

The following were raised and explicitly rejected or deferred during scoping:

| Item | Decision | Reason |
|---|---|---|
| Bank integration (Plaid/Nordigen) | Out of scope | Complexity vs value. Budget redesign (quarterly planning) solves the actual problem without it. |
| Daily expense tracking as primary budget feature | Removed from primary UI | Proven not to stick in 1.0 |
| Duolingo-style streak mechanics (guilt, broken streaks, bird) | Explicitly rejected | User dislikes guilt mechanics. Positive framing is a hard requirement. |
| Mobile app | Out of scope | Desktop only, unchanged from 1.0 |
| AI chat / agent features | Out of scope | Different feature category, not part of this redesign |
| Strava integration | Out of scope | Garmin covers the use case |
| Public signup | Out of scope | Invite-only model unchanged |
| Removing any 1.0 feature | Out of scope | All features stay |

---

## Design Constraints (Hard Requirements)

These came directly from the user and are non-negotiable:

1. **Positive framing everywhere.** Missing days, incomplete habits, skipped sessions — none of these show as failures. The app never guilts you.
2. **The homepage must be worth opening even when there's nothing to log.** If the only reason to open the app is to log something, we've failed.
3. **"Where life lives" feeling.** Calm, personal, Notion-adjacent. Not a SaaS dashboard, not Strava, not a productivity tool.
4. **Garmin does the logging.** Manual entry should be the exception, not the norm, for physical activity data.
5. **Budget is for planning, not policing.** A few focused sessions a year, not daily maintenance.
6. **Training is "what do I do today", not "here is your 12-week plan."** The plan is accessible but secondary.

---

## Friend-Specific Scope Note

The user confirmed that friends would start using the app if Garmin integration is available. This means:

- Garmin integration must be per-user (each user connects their own account)
- The `garmin_connections` table stores one row per user
- The sync flow is user-scoped — syncing does not affect other users' data
- The existing per-user isolation architecture handles everything else automatically

---

## Open Items at Time of Scoping

None. All scoping questions were resolved before this document was written.

**Resolved 2026-08-10 (review)**: The Garmin MCP server (`user-garmin`) was inspected. It confirms the needed data exists (sleep scores via `get_sleep_data`, daily calories via `get_user_summary`/`get_stats`, activity lists via `get_activities_by_date`) — but it is a local, single-account dev tool and cannot be used by the deployed app. Production integration goes through the `garmin-connect-client` npm library instead (see Decision 3 amendment).

---

## Next Steps

1. ~~Verify Garmin MCP tool capabilities~~ Done 2026-08-10 — see Open Items above
2. Proceed to task breakdown (`tasks.md`) using the speckit-tasks skill
3. Create `life-app-2.0` branch when ready to implement
