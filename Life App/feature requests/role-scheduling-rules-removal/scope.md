# Scope: Remove Role-Level Scheduling Rules

**Feature ID:** `role-scheduling-rules-removal`
**Priority:** Medium — workaround exists (set all role maxes to 7), but feature is duplicative junk
**Status:** Scoping
**Last updated:** 2026-05-11

---

## Problem Statement

The Role data model carries two scheduling rules that quietly override what the user actually configured on their goal:

- **`maxWeeklyOccurrences`** — caps the number of activities for that role per ISO week.
- **`minRestDays`** — forces a gap of N full days between any two activities for that role.

These were added when the app had no goal-level scheduling and roles were the primary scheduling unit. The data model has moved on. Goals now own `sessionsPerWeek` and `preferredDays`, and the new training plan model owns the training/supplemental split and dual preferred-day sets. The role-level rules are now duplicative — and worse, they silently win when they're more restrictive than the goal.

This caused a real bug today (2026-05-11): a climbing goal configured at 7 sessions/week scheduled only 3 sessions/week, because the default Athlete role ships with `maxWeeklyOccurrences = 4` and `minRestDays = 1` (`src/lib/defaults.ts:3`). The user didn't know the role-level fields existed. The scheduler honored the role caps over the goal's stated intent.

---

## Goal

Remove role-level scheduling rules entirely. Goals become the single source of truth for "how often" and "how spaced." The role becomes what its name implies — a category of life — not a scheduling constraint.

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
- The "Scheduling Rules" section of the Role edit dialog (`src/components/roles/role-form.tsx:158-180`). The work/professional toggle stays — see "What We're Keeping" — but the two number inputs go.
- Form state for `maxWeeklyOccurrences` / `minRestDays` (lines 28-29, 39-43, 66-67, 78-79).

### API
- The two fields drop from POST `/api/roles` (`src/app/api/roles/route.ts:89-90`) and PATCH `/api/roles/[id]` (`src/app/api/roles/[id]/route.ts:44-45`). GET responses no longer include them.

### Defaults
- `DEFAULT_ROLES` entries in `src/lib/defaults.ts:2-7` lose the two fields.
- `seedUserDefaults()` in `src/lib/seed-user-defaults.ts` stops writing them.

### Tests
- `src/components/roles/__tests__/role-form.test.tsx` — assertions on the removed inputs.
- `src/lib/__tests__/scheduler.test.ts` — any test that exercises `maxWeeklyOccurrences` or `minRestDays`. Verify after removal that the suite still proves the scheduler honors `goal.sessionsPerWeek`.

---

## What We're Keeping

- **`roles.isWorkRole`** + the Work/professional toggle in the role form. Different concern — it controls whether activities for that role get scheduled in 9–5 work hours or evening slots. Earns its place. Not duplicative of any goal-level setting.
- **All other role behavior** — name, description, color, display order, archive, work-role flag.
- **Goal-level `sessionsPerWeek` and `preferredDays`** — these become the only "how often" source of truth.
- **Training plan dual preferred-days** — `trainingPreferredDays` and `supplementalPreferredDays` on `training_plans`, added by the previous feature. These already supersede role-level rules for any goal with a training plan.

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
| Drop columns from the schema, or leave them dormant? | **Drop the columns.** SQLite supports `ALTER TABLE DROP COLUMN` since 3.35 (we're on a current better-sqlite3, no version concern). Drop via `apply-schema.js`. |
| Migrate existing custom values to a new home (e.g., a `goal_rest_days` column)? | **No.** Existing values get wiped. If a user actually used non-default values and notices, they re-create the constraint at the goal level once that feature exists. We're not building that feature in V1. |
| Reset role defaults in `DEFAULT_ROLES`? | **Yes — by removing the fields entirely.** The Athlete role's default of `4 / 1 day` (the one that caused today's bug) ceases to exist. |
| Tell friends in advance? | **No automated notice.** User communicates manually with the small invited group. |

---

## Decisions to Make Before Spec

These need explicit answers before `spec.md` is drafted. The scope doc above is the user's first-pass position; the spec round is where these get pinned.

1. **`ALTER TABLE DROP COLUMN` in `apply-schema.js`.** SQLite supports it, but it's irreversible. Worth confirming once-more that we want to drop, not just stop reading. Alternatives:
   - Drop columns. Clean schema. No way back without a re-migration.
   - Leave columns, stop reading them in code. Future cleanup work, but reversible.
   - Drop columns from the Drizzle schema only; let `apply-schema.js` leave them in the DB indefinitely (dead columns). Half-measure, probably not worth it.

2. **The `roleDaySessions` map.** It's built specifically to feed `violatesRestConstraints()`. If we remove the function, the map's construction (in `generateSchedule()` and elsewhere) can also go. Confirm whether anything else reads it.

3. **Test coverage after removal.** What tests do we need to write to prove the scheduler correctly honors `goal.sessionsPerWeek` without the role-level cap shadowing it? Spec should enumerate them.

4. **`apply-schema.js` migration ordering.** If we drop role columns AND the training-supplemental-split migration is still in flight, the order matters. Confirm the previous feature's migrations are fully applied before this one's run.

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

1. User confirms scope, especially the four "Decisions to Make Before Spec" items above.
2. Move to formal spec (`spec.md`) with user stories and acceptance criteria.
3. Plan (`plan.md`).
4. Tasks (`tasks.md`).
5. Implement.

---

## Notes for the reviewer

- All code references in this doc are verified against the current codebase at the time of writing (2026-05-11). No hallucinated paths.
- The `defaults.ts` Athlete entry of `maxWeeklyOccurrences: 4, minRestDays: 1` is the literal cause of today's 3-sessions/week bug — verified by reading `src/lib/defaults.ts:3` and `src/lib/scheduler.ts:245-281`.
- The previous feature (`training-supplemental-split`) is still in Phase 6/7. Per the project's "one feature at a time" constitution, that feature should ideally close out before this one begins implementation. User acknowledged the trade-off; flagging it again here so the spec phase doesn't lose track.
- The subagent diagnosis file at `Life App/feature requests/training-supplemental-split/scheduler-bug-review.md` is incorrect and pending cleanup (separate from this feature).
