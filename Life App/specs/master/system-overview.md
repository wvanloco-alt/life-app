# System Overview: Life App

> **Purpose**: Single authoritative reference for how the Life App works end-to-end — what pages exist, which components power them, which API routes they call, which database tables back those routes, and — critically — the **business rules** that govern how data is read, written, and interpreted across layers. Use this alongside `data-model.md` (table schemas) and `contracts/api-routes.md` (route contracts) for a complete picture.
>
> **How to use this document**: Before speccing or planning any feature that touches scheduling, goals, focus goals, training plans, or date logic — read the **Business Rules & Data Layer Contracts** section. The bugs that hurt most are the ones where the spec describes the UI correctly but silently contradicts one of these rules.
>
> **Last updated**: 2026-06-12. Reflects all features through Goal Overview Section (PR #70), Schedule Bug Fixes (PR #71), and Training Plan Discipline Parity (PRs A–D).

---

## What the App Is

A private personal development app for one person (with invite-only multi-user support). It covers four life areas: calendar / scheduling, activities and fitness tracking, budget management, and goals. A Library provides curated reference material for the sports and topics the user trains in. Everything runs locally or on Railway (SQLite on a persistent volume); there is no cloud sync, no public API, and no mobile app.

---

## Navigation Structure

The sidebar is always visible. Sections:

| Group | Page | Route |
|---|---|---|
| Execution | Today | `/today` |
| Execution | This Week | `/this-week` |
| Planning | Monthly Plan | `/monthly-plan` |
| Life Areas | Activities | `/activities` |
| Life Areas | Budget | `/budget` |
| Life Areas | Goals | `/goals` |
| Life Areas | Habits | `/habits` |
| Library | Tennis | `/library/tennis` |
| Library | Climbing | `/library/climbing` |
| Library | Running | `/library/running` |
| Library | Habit Design | `/library/habit-design` |
| Library | Breathing | `/library/breathing` |
| Library | Budget | `/library/budget` |
| Library | Bookmarks | `/library/bookmarks` |
| Footer | Settings | `/settings` |
| Footer (admin only) | Users | `/admin/users` |

A **"Log big purchase"** icon (shopping bag) lives in the sidebar header. It opens a modal that logs a moment-log entry without leaving any page.

---

## Feature Map

Each entry shows: what the user sees → the primary components → the API routes → the database tables.

---

### Today Dashboard (`/today`)

**What it does**: Shows today's scheduled activities, tracks completions, displays a goal overview section for goals with activities today, and shows a habit completion strip.

**Primary components**:
- `src/components/daily/daily-view.tsx` — main container

**API routes used**:
- `GET /api/activities?date=YYYY-MM-DD` — today's activities
- `GET /api/activities?weekStart=YYYY-MM-DD` — week activities (for carry-forward)
- `PATCH /api/activities/:id` — check off / uncheck (triggers activity-log bridge)
- `DELETE /api/activities/:id` — delete an activity
- `GET /api/weekly-plans/:weekStart/goals` — focus goals for the current week
- `GET /api/training-plans?goalIds=...` — batch fetch training plans for focus goals
- `GET /api/habits` — habits with recent log dates (for strip)
- `POST /api/habit-logs` — mark a habit done
- `DELETE /api/habit-logs` — unmark a habit
- `GET /api/goals?status=active` — all active goals (for activity form)
- `GET /api/roles` — roles (for activity form)
- `GET /api/activity-types` — activity types (for activity form)
- `GET /api/activity-logs?date=YYYY-MM-DD` — logged sessions for today

**Tables**:
- `activities`, `weeklyPlans`, `weeklyFocusGoals`, `goals`, `trainingPlans`, `trainingPhases`, `habits`, `habitLogs`, `activityLogs`, `activityTypes`, `roles`

---

### This Week (`/this-week`)

**What it does**: Shows the current ISO week as a 7-column grid. Allows adding, completing, and deleting activities per day. Shows a goal overview section below the grid. Can trigger schedule generation for the displayed week.

**Primary components**:
- `src/components/monthly-plan/this-week-view.tsx`
- `src/components/shared/goal-overview-section.tsx`

**API routes used**:
- `GET /api/weekly-plans/:weekStart/goals` — focus goals for the displayed week
- `GET /api/goals?status=active` — all active goals (for activity form)
- `GET /api/activities?weekStart=YYYY-MM-DD` — week activities
- `GET /api/recurring-activities` — recurring templates
- `GET /api/roles` — roles
- `GET /api/training-plans?goalIds=...` — batch training plan fetch
- `POST /api/schedule/generate` — generate a schedule proposal
- `POST /api/schedule/apply` — apply a generated proposal

**Tables**:
- `activities`, `weeklyPlans`, `weeklyFocusGoals`, `goals`, `trainingPlans`, `trainingPhases`, `roles`, `recurringActivities`

---

### Monthly Plan (`/monthly-plan`)

**What it does**: Full-month calendar view. The user selects which goals to focus on (stored as the month's canonical focus goals), views scheduled activities, and runs schedule generation. Schedule Preferences dialog allows editing per-goal day/time/session preferences before generating.

**Primary components**:
- `src/components/monthly-plan/weekly-plan-view.tsx`
- `src/components/monthly-plan/schedule-preferences-dialog.tsx`

**API routes used**:
- `GET /api/weekly-plans?week=YYYY-MM-DD` — the month's weekly plan (keyed on first week of month)
- `GET /api/weekly-plans/:weekStart/goals` — focus goals for the month's canonical week
- `POST /api/weekly-plans/:weekStart/goals` — add a focus goal
- `DELETE /api/weekly-plans/:weekStart/goals?goalId=N` — remove a focus goal
- `GET /api/goals?status=active` — all active goals
- `GET /api/activities?month=YYYY-MM` — all activities in the month
- `GET /api/recurring-activities` — recurring templates
- `GET /api/roles` — roles
- `PATCH /api/goals/:id` — update goal preferences (sessionsPerWeek, preferredDays, preferredTimeSlot)
- `GET /api/training-plans?goalIds=...` — batch training plan fetch
- `POST /api/schedule/generate` — generate schedule proposal
- `POST /api/schedule/apply` — apply proposal
- `GET /api/scheduler-settings` — scheduler config

**Tables**:
- `activities`, `weeklyPlans`, `weeklyFocusGoals`, `goals`, `trainingPlans`, `trainingPhases`, `roles`, `schedulerSettings`, `recurringActivities`

---

### Activities (`/activities`)

#### Activities tab (default)

**What it does**: Logs sessions for each activity type. Shows a history with custom metrics.

**Primary components**: `src/components/activities/activities-view.tsx`

**API routes used**:
- `GET /api/activity-types`, `GET /api/activity-logs`
- `POST /api/activity-logs`, `DELETE /api/activity-logs/:id`
- `GET/POST/PATCH/DELETE /api/activity-types` / `api/activity-types/:id`

**Tables**: `activityTypes`, `activityLogs`, `activities`

#### Body Metrics tab

**What it does**: Logs Weight, VO2max, Resting HR. Shows trend charts and interpreted feedback cards against European reference standards.

**Primary components**:
- `src/components/activities/body-metrics-view.tsx`
- `src/components/activities/body-metrics-feedback.tsx`
- `src/lib/body-metrics-guidance.ts` — pure interpretation library (client-side only)

**API routes used**:
- `GET/POST /api/body-metrics`, `PATCH/DELETE /api/body-metrics/:id`
- `GET/PATCH /api/body-profile`

**Tables**: `bodyMetrics`, `userBodyProfiles`

---

### Budget (`/budget`)

**What it does**: Monthly spending tracking with Sethi-style bucket system and moment-log for large purchases.

**Primary components**: `src/components/budget/budget-dashboard.tsx`, `budget-targets-panel.tsx`, `budget-buckets-panel.tsx`, `log-big-purchase-dialog.tsx`

**API routes used**: `GET /api/budget/summary`, `GET/PATCH /api/budget-settings`, `GET/POST /api/spending-categories`, `PATCH/DELETE /api/spending-categories/:id`, `GET/POST /api/planned-expenses`, `DELETE /api/planned-expenses/:id`, `GET/POST /api/moment-logs`, `DELETE /api/moment-logs/:id`

**Tables**: `spendingCategories`, `budgetSettings`, `plannedExpenses`, `momentLogs`

---

### Goals (`/goals`)

**What it does**: Long-term goal management with Eisenhower quadrants, tally/session/metric progress, and training plan periodization.

**Primary components**: `src/components/goals/goals-view.tsx`, `goal-detail.tsx`, `training-plan-view.tsx`

**API routes used**: `GET/POST /api/goals`, `GET/PATCH/DELETE /api/goals/:id`, `GET/POST /api/roles`, `PATCH/DELETE /api/roles/:id`, `POST/DELETE /api/goal-roles`, `GET/POST /api/goal-tallies`, `DELETE /api/goal-tallies/:id`, `GET/POST/PATCH /api/training-plans`, `GET/POST/PATCH/DELETE /api/training-phases`

**Tables**: `goals`, `roles`, `goalRoles`, `weeklyPlans`, `weeklyFocusGoals`, `goalTallies`, `goalSessionPatterns`, `trainingPlans`, `trainingPhases`

---

### Habits (`/habits`)

**What it does**: Daily habit tracking with identity framing (Atomic Habits), 14-day completion strip, and V2 cue/reward/keystone fields.

**Primary components**: `src/components/habits/habits-view.tsx`, `habit-walkthrough-dialog.tsx`, `habit-quick-add-dialog.tsx`

**API routes used**: `GET/POST /api/habits`, `PATCH/DELETE /api/habits/:id`, `POST/DELETE /api/habit-logs`

**Tables**: `habits`, `habitLogs`

---

### Library (`/library/*`)

**What it does**: Read-only curated content by topic. Users bookmark items; admin manages content.

**Tables**: `library_topics`, `library_categories`, `library_items` (shared, no `user_id`), `library_bookmarks` (per-user)

---

### Settings (`/settings`)

**Tables**: `users`, `roles`, `activityTypes`, `schedulerSettings`, `schedulerBlackoutDates`

---

### Admin (`/admin/users`)

**Tables**: `users`

---

## Cross-Feature Interactions

| Interaction | How it works |
|---|---|
| **Goals ↔ Scheduler** | The scheduler reads `goals`, `goalSessionPatterns`, `trainingPlans`, and `schedulerSettings` to generate `activities`. It only schedules goals with `status = 'active'`. |
| **Focus Goals ↔ Monthly / This Week / Today** | All three surfaces share the same `weeklyFocusGoals` rows. See **Business Rule BR-001** for the critical constraint on how focus goals are stored and must be retrieved. |
| **Goals ↔ Training Plans** | One `trainingPlan` per goal (UNIQUE FK). The scheduler uses `trainingPlans.*PreferredDays` — not `goals.preferredDays` — for day scheduling when a plan exists. See **BR-002**. |
| **Goals ↔ Activities (session logging)** | `activityLogs.goalId` optionally links a logged session to a goal for progress counting. |
| **Goals ↔ Roles** | `goalRoles` many-to-many join. The Eisenhower matrix groups goals by primary role. |
| **Activities ↔ Schedule Bridge** | Checking off a scheduled activity (`PATCH /api/activities/:id → isCompleted: true`) creates a linked `activityLog` row via the bridge. `activityLogs.activityId` ↔ `activities.linkedLogId`. |
| **Budget ↔ Sidebar** | Sidebar header fetches `GET /api/budget-settings` on every mount to read `momentThreshold` for the "Log big purchase" trigger. |
| **Habits ↔ Today** | Today renders a habit strip using `GET /api/habits` (which includes `recentLogDates`). Checking a habit calls `POST /api/habit-logs`. |
| **Body Metrics ↔ Body Profile** | `body-metrics-feedback.tsx` reads both `allMetrics` and `profile` together. Without a profile (DOB, sex, height), feedback cards show prompt state instead of computed values. |
| **Goal Deletion Cascade** | Deleting a goal (`DELETE /api/goals/:id`) cascades to: `activities` (scheduled blocks), `weeklyFocusGoals` (focus selections), `trainingPlans` → `trainingPhases`. |

---

## Business Rules & Data Layer Contracts

> This section documents rules that live in code but are **not** visible from the schema alone. Every feature that touches these areas **must** consult these rules before writing a spec or plan. Violating them silently produces wrong behaviour that looks correct in unit tests.

---

### BR-001 — Focus Goals Are a Monthly Concept, Stored on One Week

**Where it matters**: Any feature that reads or writes focus goals (This Week, Today, Monthly Plan, schedule generation, goal overview sections).

Focus goals in this app are selected at the **month** level in the Monthly Plan, not the ISO week level. They are physically stored in `weeklyFocusGoals`, but the `weeklyPlanId` FK always points to the single `weeklyPlan` whose `weekStartDate` equals **`getWeekStartDate(firstDayOfMonth)`** — the Monday of the ISO week that contains the 1st of the month.

```
canonicalWeekKey(month "YYYY-MM") = getWeekStartDate(new Date(month + "-01"))
```

For June 2026: June 1 is a Monday → `weekStartDate = "2026-06-01"`. For a month where the 1st falls mid-week (e.g., July 1 = Wednesday): `weekStartDate = "2026-06-29"` (the preceding Monday).

**Consequence**: Any surface that wants to read focus goals for the current month must use `canonicalWeekKey(currentMonth)`, not `getWeekStartDate(today)`. Querying with the current ISO week will return empty results for every week except the first of the month.

**Files to keep in sync**: `weekly-plan-view.tsx` (writes), `this-week-view.tsx` (reads), `daily-view.tsx` (reads), `schedule/generate/route.ts` (reads).

---

### BR-002 — Scheduler Day-Preference Priority

**Where it matters**: Any feature that edits or displays "preferred days" for a goal with a training plan.

The scheduler (`src/lib/scheduler.ts → getPreferredDaysForSession`) uses **two separate arrays** for day preference when a goal has a training plan:

- `trainingPlans.trainingPreferredDays` — preferred days for training sessions
- `trainingPlans.supplementalPreferredDays` — preferred days for supplemental (gym) sessions

`goals.preferredDays` is **only consulted when the goal has no training plan** (`gs.planSplit` is null).

```
if (!gs.planSplit) → use gs.preferredDays (goal-level)
if (gs.planSplit)  → use planSplit.trainingPreferredDays or supplementalPreferredDays
```

**Consequence**: Writing to `goals.preferredDays` via `PATCH /api/goals/:id` has no effect on scheduling for goals that have a training plan. Any UI that lets users override preferred days for a training-plan goal must `PATCH /api/training-plans/:id` (fields `trainingPreferredDays` and `supplementalPreferredDays`), not `goals.preferredDays`.

**All three sports write `*PreferredDays`** (Training Plan Discipline Parity): tennis and running creation/edit dialogs now populate `trainingPreferredDays` and `supplementalPreferredDays` on POST and PATCH, with defaults derived from `deriveDefaultStructure()`. The climbing-only caveat no longer applies.

**Session-pattern mutual exclusion**: The scheduler ignores `goalSessionPatterns` for any goal that has a training plan (`hasPlan = trainingPlanSplits?.has(goal.id)`). The goal form UI hides the session-pattern editor when `hasTrainingPlan = true` or the "Create Training Plan" checkbox is ticked.

---

### BR-003 — `preferredDays` Encoding: Comma-Separated String

**Where it matters**: Any feature that reads or writes `preferredDays` on goals or training plans.

All `preferredDays` fields are stored as **comma-separated day numbers** (e.g., `"1,3,5"`) where 1 = Monday, 7 = Sunday. **Not** JSON arrays.

- Correct stored value: `"1,3,5"` 
- Wrong stored value: `"[1,3,5]"` (JSON array with brackets — was introduced briefly by a hotfix and reverted in PR #71)

The scheduler parses with `.split(",").map(Number)`. The shared `parsePreferredDays()` helper in `src/lib/dates.ts` tries `JSON.parse` first (for backwards compatibility) then falls back to comma-split. It is imported by both `schedule-preferences-dialog.tsx` and `training-structure-fields.tsx`.

`null` and `""` both mean "no preference — schedule on any available day."

`trainingPlans.trainingPreferredDays` and `supplementalPreferredDays` have a default of `'[]'` in the schema (the old JSON format). These are parsed via `parseDayIds()` in `generate/route.ts`, which uses `JSON.parse`.

---

### BR-004 — Scheduler Only Schedules Active Goals

**Where it matters**: Schedule generation, focus goal management.

`POST /api/schedule/generate` filters focus goals with `eq(goals.status, "active")` in the `INNER JOIN`. A goal with `status = "archived"` or `status = "completed"` that still has a `weeklyFocusGoals` row (e.g., archived after being set as a focus goal) will be silently excluded from generation. Its existing activities on the calendar are untouched.

**Consequence**: Archiving a goal does not automatically remove it from the focus goals list or delete its future scheduled activities. Use Reset or manual deletion to clean up the calendar.

---

### BR-005 — Scheduler Generates the Full Month; `startDate` Clips Output

**Where it matters**: Any feature that passes `startDate` to schedule generation.

`generateSchedule()` in `src/lib/scheduler.ts` is a pure function that always generates activities for the **full calendar month** starting from `monthFirstDay`. It does not support a partial-month start.

The `startDate` constraint is enforced **after** the scheduler returns, by filtering `proposal.activities` to `effectiveDates` (dates ≥ startDate). The scheduler itself never sees the `startDate`.

**Consequence**: The scheduler may produce internally consistent sessions that reference early-month days, all of which get clipped. Do not try to pass `startDate` into the scheduler directly — it will not behave as expected.

The `apply` step deletes existing activities only from `dateRange.start` onwards. Activities before `startDate` that were created in a previous generation run are not deleted. To get a clean slate, use Reset first, then Generate.

---

### BR-006 — Training Phase Active Status

**Where it matters**: Any feature that reads an "active" training phase.

The active training phase for a goal is determined by `trainingPhases.status = 'active'`. **Do not** compute the active phase from date arithmetic (comparing today against `startDate + durationWeeks * 7`). The `status` field is the source of truth. Phase transitions are manual (user presses a button).

```typescript
// ✅ Correct
const activePhase = plan.phases.find((ph) => ph.status === "active");

// ❌ Wrong — do not use
const activePhase = plan.phases.find((ph) => {
  const end = addWeeks(ph.startDate, ph.durationWeeks);
  return today >= ph.startDate && today <= end;
});
```

---

### BR-007 — Activity `sessionType` Values

**Where it matters**: Scheduling, activity display, training plan split logic.

`activities.sessionType` has two values: `'training'` (sport-focused session, gets phase description in title) and `'supplemental'` (gym/cross-training). Both count toward goal progress via `activityTypeId`. Rest/recovery phases cause the scheduler to **skip the goal entirely** — no activities of either type are scheduled.

The split (how many training vs supplemental sessions per week) comes from `trainingPlans.trainingSessionsPerWeek` and `supplementalSessionsPerWeek`. If null, the scheduler uses a `defaultSplit(sessionsPerWeek)` formula.

---

### BR-008 — `weeklyFocusGoals` Has No `user_id`

**Where it matters**: Any query that accesses focus goals or weekly plans.

`weeklyFocusGoals` is a junction table with no `user_id` column. User scoping is always inherited through the `weeklyPlans` JOIN (`weeklyPlans.userId = session.user.id`). Never attempt to add a `user_id` filter directly on `weeklyFocusGoals`.

The same applies to `trainingPhases` (scoped through `trainingPlans`) and `goalRoles` / `goalSessionPatterns` (scoped through `goals`).

---

### BR-009 — Date Encoding Conventions

**Where it matters**: Every feature that handles dates.

| Value | Format | Example | Rule |
|---|---|---|---|
| Calendar dates | ISO `YYYY-MM-DD` string | `"2026-06-09"` | Always. Never use `Date` objects in the DB. |
| "Today" | Client-computed | `new Date().toISOString().slice(0, 10)` | Server never synthesises the user's today. Client sends it. |
| Date arithmetic (DST-safe) | UTC noon | `new Date(date + "T12:00:00Z").getTime()` | Use UTC noon for all date math (add/subtract days, compute week numbers). Avoids DST edge cases. |
| Week start | Monday | `startOfWeek(date, { weekStartsOn: 1 })` | The app uses Mon–Sun weeks throughout. |
| Month key | `YYYY-MM` | `"2026-06"` | Used in `goals.month`, `weeklyPlanView` currentMonth, and `canonicalWeekKey`. |

---

### BR-010 — Schedule Apply: What Gets Deleted

**Where it matters**: Any feature that calls `POST /api/schedule/apply` with `regenerate: true`.

The apply route deletes activities matching **all** of these conditions:
- `goalId IN focusGoalIds` (only activities belonging to the focus goals in the generation run)
- `createdFromLog = false` (never touches log-backed activities)
- `isCompleted = false` (never deletes completed activities)
- `activityDate >= dateRange.start` AND `activityDate <= dateRange.end`

Activities for goals **not** in the current focus set, activities before `dateRange.start`, and all completed activities survive a regeneration run.

---

## Architectural Patterns

These patterns apply consistently across all features. Deviations are bugs, not style.

| Pattern | Rule |
|---|---|
| **Auth** | Every API route calls `auth()` first. No session → 401. |
| **User scoping** | Every query includes `WHERE user_id = session.user.id`. Use `assertOwnership()` for batch ID validation. Junction tables (`weeklyFocusGoals`, `trainingPhases`, `goalRoles`, `goalSessionPatterns`) have no `user_id` — scope via parent JOIN. |
| **Date ownership** | The client computes "today" from browser local time and sends ISO `YYYY-MM-DD` strings. The server trusts what it receives and never synthesises the user's today. |
| **Upserts** | Use Drizzle `insert().onConflictDoUpdate()` for true atomic upserts (e.g. body-profile, budget-settings). SELECT-then-write is a race condition. |
| **Schema migrations** | All changes go through `apply-schema.js` using `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ADD COLUMN IF NOT EXISTS`. Never run `drizzle-kit migrate` in production. |
| **Loading state** | Skeleton layouts that mirror the final layout. `setLoading(true)` at start, `setLoading(false)` in a `finally` block. |
| **Error handling** | Check `res.ok` after every fetch. Show inline errors near the failing field. Never silently swallow API failures. |
| **Parallel fetches** | Use `Promise.all([...])` when a component needs multiple endpoints at once. |
| **Pure business logic** | Algorithms with no I/O (scheduler, periodization, streak computation, body metric interpretation) live in `src/lib/` as pure functions with Vitest test coverage. |
| **Client-side today** | Pass `today` as a parameter to pure functions (`computeStreaks`, `interpretWeight`, etc.) computed client-side via `new Date().toISOString().slice(0, 10)`. |
| **Batch fetches** | Prefer `GET /api/training-plans?goalIds=1,2,3` over N individual fetches. The batch endpoint returns an array of plans with their phases. |
