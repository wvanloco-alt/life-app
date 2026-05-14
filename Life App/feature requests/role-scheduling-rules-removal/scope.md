# Scope: Remove Role-Level Scheduling Rules

**Feature ID:** `role-scheduling-rules-removal`
**Priority:** Medium. Workaround exists (set all role maxes to 7), but the feature is duplicative and silently overrides goal-level intent.
**Status:** Scope confirmed; moving to spec.
**Last updated:** 2026-05-14

**Constitutional note**: The previous blocker, "one feature at a time" while `training-supplemental-split` and `activities-refactoring` were in flight, is now lifted. `training-supplemental-split` Phase 7 unit tests shipped 2026-05-12 (PRs #2, #3). `activities-refactoring` shipped end-to-end 2026-05-13 (PRs #4 through #9) plus the docs sync 2026-05-14 (PR #10). The runway is clear; this feature is now the next slot.

---

## Problem Statement

The Role data model carries two scheduling rules that quietly override what the user actually configured on their goal:

- **`maxWeeklyOccurrences`**: caps the number of activities for that role per ISO week.
- **`minRestDays`**: forces a gap of N full days between any two activities for that role.

These were added when the app had no goal-level scheduling and roles were the primary scheduling unit. The data model has moved on. Goals now own `sessionsPerWeek` and `preferredDays`, and the new training plan model owns the training/supplemental split and dual preferred-day sets. The role-level rules are now duplicative, and worse, they silently win when they're more restrictive than the goal.

This caused a real bug today (2026-05-11): a climbing goal configured at 7 sessions/week scheduled only 3 sessions/week, because the default Athlete role ships with `maxWeeklyOccurrences = 4` and `minRestDays = 1` (`src/lib/defaults.ts:3`). The user didn't know the role-level fields existed. The scheduler honored the role caps over the goal's stated intent.

---

## Goal

Remove role-level scheduling rules entirely. Goals become the single source of truth for "how often" and "how spaced." The role becomes what its name implies, a category of life, not a scheduling constraint.

---

## What We're Removing

### Schema
- `roles.max_weekly_occurrences` column (`src/db/schema.ts:35`)
- `roles.min_rest_days` column (`src/db/schema.ts:36`)

### Code paths
- The entire `violatesRestConstraints()` function in `src/lib/scheduler.ts:245-281`, plus all call sites.
- The `roleDaySessions` map construction that exists solely to feed `violatesRestConstraints()`.
- Both fields on the `Role` interface in `src/types/index.ts`.

### UI
- The "Scheduling Rules" section of the Role edit dialog (`src/components/roles/role-form.tsx:158-180`). The work/professional toggle stays (see "What We're Keeping"); the two number inputs go.
- Form state for `maxWeeklyOccurrences` / `minRestDays` (lines 28-29, 39-43, 66-67, 78-79).

### API
- The two fields drop from POST `/api/roles` (`src/app/api/roles/route.ts:89-90`) and PATCH `/api/roles/[id]` (`src/app/api/roles/[id]/route.ts:44-45`). GET responses no longer include them.

### Defaults
- `DEFAULT_ROLES` entries in `src/lib/defaults.ts:2-7` lose the two fields.
- `seedUserDefaults()` in `src/lib/seed-user-defaults.ts` stops writing them.

### Tests
- `src/components/roles/__tests__/role-form.test.tsx`: assertions on the removed inputs.
- `src/lib/__tests__/scheduler.test.ts`: any test that exercises `maxWeeklyOccurrences` or `minRestDays`. Verify after removal that the suite still proves the scheduler honors `goal.sessionsPerWeek`.

---

## What We're Keeping

- **`roles.isWorkRole`** plus the Work/professional toggle in the role form. Different concern: it controls whether activities for that role get scheduled in 9-5 work hours or evening slots. Earns its place. Not duplicative of any goal-level setting.
- **All other role behavior**: name, description, color, display order, archive, work-role flag.
- **Goal-level `sessionsPerWeek` and `preferredDays`**: these become the only "how often" source of truth.
- **Training plan dual preferred-days**: `trainingPreferredDays` and `supplementalPreferredDays` on `training_plans`, added by the previous feature. These already supersede role-level rules for any goal with a training plan.

---

## What We're Not Building (Now)

- **Goal-level `minRestDays`.** Some users may have meaningfully used the role-level rest constraint (especially for athletic roles). The cleanest answer: kill it for V1. If the gap becomes painful, a separate `goal-rest-spacing` feature can add it back at the right granularity later. Don't migrate the value forward.
- **Cleanup of `goal_session_patterns`.** The subagent's earlier diagnosis pointed at this table as the culprit for today's bug. That was wrong (proven by the role-cap fix), but the table is still a distinct rest-day mechanism that deserves its own scope check eventually. Out of scope here.
- **A user-facing migration notice.** Friends who set custom values will see them disappear. No banner, no warning. The product is for a small group; we'll tell them in person if needed.

---

## Decisions Made

| Question | Decision |
|---|---|
| Keep the work-role toggle? | **Yes.** Different concern from scheduling rules; earns its place. |
| Drop columns from the schema, or leave them dormant? | **Drop the columns.** Confirmed 2026-05-14. SQLite has supported `ALTER TABLE DROP COLUMN` since 3.35; better-sqlite3 ships a current build. Drop both columns idempotently in `apply-schema.js` (guarded by a `PRAGMA table_info` check, matching the `is_log_entry` rename pattern from activities-refactoring Phase 1). |
| Migrate existing custom values to a new home (e.g., a `goal_rest_days` column)? | **No.** Existing values get wiped. If a user actually used non-default values and notices, they re-create the constraint at the goal level once that feature exists. We're not building that feature in V1. |
| Reset role defaults in `DEFAULT_ROLES`? | **Yes, by removing the fields entirely.** The Athlete role's default of `4 / 1 day` (the one that caused the original bug) ceases to exist. |
| Tell friends in advance? | **No automated notice.** User communicates manually with the small invited group. |
| `roleDaySessions` map: does anything else read it? | **No.** Confirmed 2026-05-14 by grepping `scheduler.ts`. Every read is in service of `violatesRestConstraints`; every write (`commitSession` lines 981-984) only matters because of those reads. The entire map (construction at lines 478-492, parameter threading through four helpers plus the function itself for five total signatures, write-back in `commitSession`) comes out with the function. Clean cut. |
| Need an explicit "max 7 per role per ISO week" safety net after removal? | **No, plus a server-side belt.** Goal-form layer enforces `min={1} max={7}` for `sessionsPerWeek`, `schedulerSettings.maxActivitiesPerDay` caps the daily total, and `enforceWeeklySpread` is the per-goal weekly cap. To close the API-direct-write gap noted by the spec review, this feature also clamps `sessionsPerWeek` to `[1, 7]` server-side on POST and PATCH `/api/goals` (FR-016). |
| Test coverage after removal: what proves the scheduler honors `goal.sessionsPerWeek` without the role cap shadowing it? | **Enumerate in spec.md.** Working position: at minimum, (a) a regression test that asserts a goal with `sessionsPerWeek = 7` and no other constraints actually schedules 7 sessions/week (the literal bug the prior scope diagnosed), (b) a test that confirms two activities for the same role on consecutive days is now allowed (no min-rest enforcement), and (c) sweep `scheduler.test.ts` for any test that previously *required* role caps to pass; those need their assertions adjusted. Final list pinned in `spec.md`, acceptance criteria. |
| `apply-schema.js` migration ordering | **Non-issue.** The training-supplemental-split and activities-refactoring migrations are both fully shipped and idempotent; they run as no-ops on subsequent boots. This feature's `ALTER TABLE DROP COLUMN` statements append to the existing ordered list and run cleanly. |

---

## What We're NOT Touching

Explicit non-changes, listed so future maintainers know it was deliberate:

- The `roles` table itself stays. We're removing two columns, not the entity.
- The `goal_session_patterns` table stays. Its rest-day logic is a separate concern (rest after specific session types, not blanket role caps).
- The work-role toggle and its scheduler interaction (`isWorkRole` driving work-hours vs. evening slot selection).
- All goal-level scheduling fields. Untouched.
- The training-supplemental-split feature's dual preferred-days model. Untouched.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| A friend has set a non-default `minRestDays` (e.g., 2 for their Athlete role) and notices the spacing change. | Low (invite-only, small group) | Low (they re-add it manually via `preferredDays`) | Communicate verbally before deploy. |
| Removing `violatesRestConstraints()` breaks an existing scheduler test. | Medium | Low | Update or remove the test. Confirm `goal.sessionsPerWeek` behavior is still covered. |
| `apply-schema.js` `DROP COLUMN` fails in production for some reason (e.g., old SQLite). | Low | High | Test against a copy of the Railway DB before deploying. Confirm SQLite version on Railway. |
| The scheduler relied on `maxWeeklyOccurrences` as an implicit safety net (e.g., to prevent some edge case where a buggy goal generates 1000 sessions). | Low | Medium | Read scheduler carefully during plan phase. Add explicit cap in `generateSchedule` if one is needed. |

---

## Out of Scope (deferred)

- Goal-level rest-day spacing (future feature if needed).
- Cleanup of `goal_session_patterns`.
- Any user-facing UI explaining why scheduling behavior changed.
- Bulk-edit tools for migrating user values.

---

## Next Steps

All scope-level questions are pinned. Ready to move to `spec.md`.

1. ~~User confirms scope, especially the four "Decisions to Make Before Spec" items above.~~ Done 2026-05-14.
2. **Draft `spec.md`**: user stories, acceptance criteria (including the test enumeration deferred above), and the explicit "before/after" behavioral contract for the scheduler.
3. Plan (`plan.md`).
4. Tasks (`tasks.md`).
5. Implement.

---

## Notes for the reviewer

- All code references in this doc were verified against the codebase at the time of original writing (2026-05-11) and re-confirmed against `master` on 2026-05-14 (`roleDaySessions` audit, scheduler line numbers, `defaults.ts` entries; all still accurate).
- The `defaults.ts` Athlete entry of `maxWeeklyOccurrences: 4, minRestDays: 1` is the literal cause of the original 3-sessions/week bug, verified by reading `src/lib/defaults.ts:3` and `src/lib/scheduler.ts:245-281`.
- ~~The previous feature (`training-supplemental-split`) is still in Phase 6/7.~~ Both blocking features (`training-supplemental-split`, `activities-refactoring`) have fully shipped. Constitutional runway is clear.
- The subagent diagnosis file at `Life App/feature requests/training-supplemental-split/scheduler-bug-review.md` is incorrect and pending cleanup (separate from this feature).
