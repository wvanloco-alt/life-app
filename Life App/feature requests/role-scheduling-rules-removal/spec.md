# Feature Specification: Remove Role-Level Scheduling Rules

**Spec ID**: `role-scheduling-rules-removal`
**Created**: 2026-05-14
**Updated**: 2026-05-14
**Status**: Draft — pending user review before plan phase

---

## Overview

Roles in this app describe *categories of life* (Professional, Athlete, Partner, Learner, Friend, Individual). At some point they also became *scheduling units*: each role carries two fields that constrain how often its goals can be placed on the calendar.

- `roles.max_weekly_occurrences` — caps the number of activities for that role per ISO week.
- `roles.min_rest_days` — forces a gap of N full days between any two activities for that role.

Both fields predate goal-level scheduling. Today, goals own `sessionsPerWeek` (1–7) directly, training plans own a training/supplemental split with dual preferred-day arrays, and the scheduler has a global `maxActivitiesPerDay` plus `enforceWeeklySpread`. The role-level rules are duplicative — and worse, they silently win when they're more restrictive than what the user actually configured on the goal.

This produced a real, traceable bug: a climbing goal set to `sessionsPerWeek = 7` scheduled only 3 sessions/week because the default Athlete role ships with `maxWeeklyOccurrences = 4` and `minRestDays = 1` (`src/lib/defaults.ts:3`). The user didn't know the role-level fields existed. The scheduler honored the role caps over the goal's stated intent. The fix at the time was a one-off "set all my role caps to 7" workaround.

This feature removes those two fields end-to-end: schema, defaults, scheduler logic, API surface, UI, and tests. Goals become the single source of truth for "how often" and "how spaced." Roles become what their name implies — a category of life, not a scheduling constraint.

The work-role flag (`isWorkRole`) stays. It controls *when in the day* a role's activities are scheduled (9–5 work hours vs. evenings/weekends), which is a different concern from *how often*. It is not duplicative of any goal-level setting and earns its place.

---

## User Scenarios & Testing

### User Story 1 — The scheduler honors `goal.sessionsPerWeek` exactly (Priority: P1)

The user has a climbing goal with `sessionsPerWeek = 7`. They click "Generate Schedule" for the month. The scheduler places 7 climbing sessions per ISO week, distributed across the available days. No role-level cap shadows the goal's stated intent.

**Why this priority**: This is the literal bug that motivated the feature. Without this scenario passing, the removal has no observable benefit. P1.

**Independent Test**: On a fresh DB seeded with default roles, create one climbing goal linked to the Athlete role with `sessionsPerWeek = 7` and no training plan, then generate a 4-week schedule. Assert the scheduler proposes 28 climbing sessions (7 × 4 weeks) — not 16 (4 × 4, the old role cap) and not 12 (allowing for the old min-rest gap).

**Acceptance Scenarios**:

1. **Given** a goal with `sessionsPerWeek = 7` linked to a single role, **When** the scheduler runs for one ISO week with no blackouts, **Then** the scheduler proposes exactly 7 sessions for that goal that week.
2. **Given** two goals linked to the same role with `sessionsPerWeek = 4` each, **When** the scheduler runs for one ISO week, **Then** each goal independently targets 4 sessions; the role's identity does not create an implicit shared cap between them.
3. **Given** a goal with `sessionsPerWeek = 5`, **When** the scheduler runs, **Then** consecutive-day placement (e.g., Mon + Tue, or Tue + Wed) is allowed; no implicit rest gap is enforced beyond the per-goal session-pattern feature (which is opt-in via `goal_session_patterns` and unchanged by this work).
4. **Given** the scheduler's existing daily cap (`schedulerSettings.maxActivitiesPerDay`) and weekly-spread setting are unchanged, **When** those settings are at their defaults (4 per day, weekly spread enabled), **Then** the scheduler still respects them — only role-level caps go away.

---

### User Story 2 — Existing users see no change beyond the disappeared form fields (Priority: P1)

A user who has never touched the role-form's "Scheduling Rules" section opens it after the change ships. The "Max Weekly Occurrences" and "Min Rest Days" inputs are gone. Nothing else on the form moved. The work-role toggle is still there. Their existing roles still load, save, and list correctly. Their previously-generated calendar entries are unchanged.

**Why this priority**: Most users never touched these fields. The removal must be invisible to them. P1 because anything visible to "I didn't change anything" users counts as a regression.

**Independent Test**: On a DB carrying the old columns plus a few user-created roles with default values, run the migration. Open the role list — every existing role still appears with name, description, color, and work-role flag intact. Open the role edit dialog — the two number inputs are gone, no broken layout, no errant whitespace. Save the role with no other edits — the API call succeeds and the role is unchanged in the DB.

**Acceptance Scenarios**:

1. **Given** a DB with the old `max_weekly_occurrences` and `min_rest_days` columns populated, **When** the migration runs, **Then** both columns are dropped from the `roles` table; the rest of the row is preserved bit-for-bit.
2. **Given** an existing role with default values (7 / 0), **When** the user opens the role edit dialog after the migration, **Then** the dialog shows name, description, color, and the work-role toggle — no rest-days or max-occurrences inputs and no empty section labelled "Scheduling Rules".
3. **Given** the user saves a role without changing anything, **When** the PATCH `/api/roles/:id` fires, **Then** the request body does not include `maxWeeklyOccurrences` or `minRestDays`, and the server accepts the request without 400.
4. **Given** previously-scheduled activities exist on the calendar, **When** the migration runs, **Then** those activities are not deleted, moved, retyped, or reflagged in any way.

---

### User Story 3 — Users with non-default values silently lose their custom constraints (Priority: P2)

A user (likely one of the friends with admin access) had set `maxWeeklyOccurrences = 5` on their custom "Side Project" role to cap themselves. After the migration, that constraint is gone. The scheduler may now place more than 5 side-project activities per week if the user's goals demand it. No warning is shown.

**Why this priority**: P2 because the destructive behavior is intentional and was explicitly accepted at scope time. The product is invite-only with a small user group, and the user has accepted communicating this manually to the few people affected. The spec must document it precisely so a future maintainer (or the user re-reading this in six months) understands the data was deliberately wiped, not lost to a bug.

**Independent Test**: On a DB where one role has `maxWeeklyOccurrences = 5, minRestDays = 2`, run the migration. Assert the columns no longer exist on the `roles` table (verify via `PRAGMA table_info(roles)`). Assert no other column or row data changed. Assert no migration log entry mentions the discarded values (the destruction is silent by design).

**Acceptance Scenarios**:

1. **Given** any pre-existing role with non-default values, **When** the migration runs, **Then** the columns are dropped and the values are not preserved in any other table, column, or log line.
2. **Given** the user expected the old caps to still apply, **When** the next schedule generation runs, **Then** the scheduler ignores the now-gone fields entirely and the resulting calendar may differ from prior behavior — this is the intended outcome.
3. **Given** the user wants the constraint back, **When** they look in the UI, **Then** they find no UI affordance for it — restoring goal-level rest-day spacing is explicitly deferred to a future, separate feature.

---

## Edge Cases

- **Goal with `sessionsPerWeek = 0`.** Already a no-op for scheduling. Unchanged.
- **Goal in a rest/recovery phase** (training plan).  Scheduler skips the goal entirely. Unchanged.
- **Role linked to zero goals.** Migration runs the same way. Role keeps its remaining fields. No-op.
- **Migration re-run.** `apply-schema.js` is idempotent: the `ALTER TABLE DROP COLUMN` statements are wrapped in a `PRAGMA table_info(roles)` check that returns early when the columns are already gone.
- **Scheduler test fixtures.** Existing `scheduler.test.ts` fixtures that set `maxWeeklyOccurrences` or `minRestDays` on Role objects must be updated to drop those fields. Any test whose assertion *relied* on the cap (e.g., "this goal is capped at 4 per week because of the role, not the goal") needs its assertion changed to reflect the new behavior.
- **Role-form test fixtures.** Tests that assert the form renders or saves the two inputs must be removed. Tests that verify the work-role toggle continues to render must remain.
- **API consumers outside the app.** None known. No external integrations.
- **Seed-on-first-login** (`seedUserDefaults`). New friend signs up after this ships → role seeding writes the reduced field set, scheduler honors `goal.sessionsPerWeek` from day one. No corrective action ever needed.

---

## Requirements

### Functional Requirements

- **FR-001**: Schema MUST drop the `roles.max_weekly_occurrences` column. Drop performed in `apply-schema.js`, guarded by a `PRAGMA table_info(roles)` check so the statement is a no-op on already-migrated databases.
- **FR-002**: Schema MUST drop the `roles.min_rest_days` column. Same migration pattern as FR-001.
- **FR-003**: The Drizzle ORM schema (`src/db/schema.ts`) MUST remove both fields from the `roles` table definition.
- **FR-004**: The TypeScript `Role` interface (`src/types/index.ts`) MUST remove both fields.
- **FR-005**: `DEFAULT_ROLES` (`src/lib/defaults.ts`) MUST remove `maxWeeklyOccurrences` and `minRestDays` from every entry. The seed payload sent to `POST /api/roles` MUST NOT include either field.
- **FR-006**: `seedUserDefaults` (`src/lib/seed-user-defaults.ts`) MUST stop writing both fields.
- **FR-007**: `POST /api/roles` MUST NOT accept either field in its request body. Sending them MUST be silently ignored (additional unknown fields are non-fatal — the existing Drizzle insert ignores extra keys).
- **FR-008**: `PATCH /api/roles/:id` MUST NOT accept either field. Same silent-ignore policy as FR-007.
- **FR-009**: `GET /api/roles` and `GET /api/roles?archived=true` response shapes MUST NOT include either field.
- **FR-010**: The role-form UI (`src/components/roles/role-form.tsx`) MUST remove the "Scheduling Rules" section in full — the two number inputs, their labels, their helper text, the section heading, and the form state hooks that back them. The work-role toggle MUST remain.
- **FR-011**: The scheduler (`src/lib/scheduler.ts`) MUST remove `violatesRestConstraints()` and every call site. The function's call signature is currently `(roleId, date, roleDaySessions, rolesById)`; all four arguments stop being threaded through the call chain.
- **FR-012**: The scheduler MUST remove the `roleDaySessions` map — its construction in `generateSchedule` (lines ~478-492 at the time of writing), its parameter on every helper that currently receives it, and the write-back in `commitSession` (lines ~981-984). This is a self-contained cleanup: nothing else reads the map (verified during scope phase).
- **FR-013**: The scheduler MUST continue to honor `goal.sessionsPerWeek`, `goal.preferredDays`, `goal.preferredTimeSlot`, `goal_session_patterns`, `schedulerSettings.maxActivitiesPerDay`, `schedulerSettings.enforceWeeklySpread`, `schedulerSettings.workDays` / `workStartTime` / `workEndTime`, `scheduler_blackout_dates`, and the training-plan dual preferred-days. All other scheduling behavior is unchanged.
- **FR-014**: Migration MUST be one-way. There is no rollback path. The values destroyed by the column drop are not backed up to any other table, column, or log line.
- **FR-015**: Migration MUST run cleanly against the production Railway database. The `ALTER TABLE DROP COLUMN` statements MUST execute under the same `better-sqlite3` build that production uses; SQLite 3.35+ is required and is already in use.

### Key Entities

- **Role** (modified): The `roles` table loses two columns — `max_weekly_occurrences` and `min_rest_days`. All other columns are unchanged: `id`, `user_id`, `name`, `description`, `color`, `display_order`, `is_archived`, `is_work_role`, `created_at`, `updated_at`. The work-role flag's behavior is unchanged.

No new entities, no new tables, no schema additions.

---

## Success Criteria

- **SC-001**: A user with a `sessionsPerWeek = 7` goal sees 7 sessions/week proposed by the scheduler in a no-blackout week. Verified by unit test in `scheduler.test.ts`.
- **SC-002**: A user opening the role edit dialog after migration sees no "Scheduling Rules" section, no errant whitespace, and a clean save flow. Verified by `role-form.test.tsx` and a manual smoke check.
- **SC-003**: The `roles` table in a freshly-migrated DB shows no `max_weekly_occurrences` or `min_rest_days` columns. Verified by inspecting `PRAGMA table_info(roles)` post-migration.
- **SC-004**: Running `apply-schema.js` twice in a row on the same DB completes successfully and idempotently (second run is a no-op for these two ALTERs).
- **SC-005**: All existing scheduler tests pass after removal — including those that previously exercised `enforceWeeklySpread`, `maxActivitiesPerDay`, `preferredDays`, `preferredTimeSlot`, blackout dates, and session patterns. None of those features regress.
- **SC-006**: `npx tsc --noEmit` is clean.
- **SC-007**: `npm run lint` baseline (41 errors / 12 warnings, all pre-existing in unrelated files) is unchanged.
- **SC-008**: The `Role` interface in `src/types/index.ts` and the `roles` table in `src/db/schema.ts` agree with the migrated DB shape — no drift.

---

## Out of Scope

The following are explicitly NOT part of this feature and are deferred to future work if needed:

- **Goal-level `minRestDays`** — a future `goal-rest-spacing` feature can add per-goal rest spacing at the right granularity. We are NOT migrating role-level rest values forward to goals as part of this work.
- **Cleanup of `goal_session_patterns`** — that table is a separate rest-day mechanism (per-session-type rest, not blanket role caps). Its own scope review is needed before any changes. Out of scope here.
- **User-facing migration notice or banner** — no in-app warning, no email, no toast. The user communicates with the small invited friend group manually.
- **Bulk-edit tools** for migrating user values to a different home. Not built.
- **Cleanup of the `scheduler-bug-review.md` historical doc** that incorrectly diagnosed the original bug as a `goal_session_patterns` issue. That cleanup is its own separate housekeeping task.
- **Refactoring `violatesRestConstraints`'s call sites** to remove the role-cap path but keep some other rest logic. The function is single-purpose; this feature removes it whole.
- **Renaming `roleDaySessions`** to something role-agnostic to preserve any structure. The map ceases to exist; nothing rename-able remains.
- **Adding tests for the work-role toggle** beyond what already exists. The toggle is unchanged; existing coverage is sufficient.
