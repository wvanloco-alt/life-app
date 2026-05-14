# Implementation Plan: Remove Role-Level Scheduling Rules

**Plan ID**: `role-scheduling-rules-removal`
**Created**: 2026-05-14
**Status**: Draft, pending user approval before tasks.md and implementation
**Source documents**: `scope.md`, `spec.md`

---

## 1. Strategy

Single coherent refactor across schema, types, defaults, API, UI, and scheduler. The 16 functional requirements in `spec.md` are tightly coupled: you cannot drop the schema column without also removing the Drizzle field, the TypeScript field, the scheduler reads, the defaults, the API field, and the UI input. Doing any one piece in isolation breaks `tsc`. FR-016 (the server-side `sessionsPerWeek` clamp on the goals route) is the one piece that is logically independent, but it ships in the same PR because the safety-net rationale is the same.

This is therefore one PR, one branch, one commit set. Unlike `activities-refactoring` which had six genuinely independent phases, there is no useful split here.

The implementation walks the dependency graph from outside in:

1. Migration first (so the DB shape is settled).
2. Schema definitions next (so the type system agrees with the DB).
3. Defaults and seed (so new installs and seed-on-first-login produce the new shape).
4. API surface (so requests and responses no longer carry the fields).
5. UI (so the form does not bind state that no longer exists in the type).
6. Scheduler logic (so the runtime no longer references columns that no longer exist).
7. Tests (so the suite proves the new behavior and removes assertions on the old).

Each step leaves the codebase in a tsc-clean state. Step 5 in particular needs the type changes from step 2 to have already happened, or the form's `useState<number>` initializers will type-fail.

No new abstractions. No "while we're here" cleanups. The scope is the 16 FRs, period.

---

## 2. Verification gates

Each gate must pass before commit:

| Gate | Command | Pass criterion |
|---|---|---|
| Type check | `npx tsc --noEmit` | Clean, zero errors |
| Tests | `npm run test -- --run` | All previously-passing tests still pass; the new scheduler test (SC-001) is added and passes |
| Lint baseline | `npm run lint` | No new error or warning in any file the PR modifies, compared to that file's state on `master` at PR-cut time. The global baseline (41 errors / 12 warnings) is informational |
| Schema migration | `node apply-schema.js` against a local DB copy | Runs cleanly; running it a second time is a no-op (the `PRAGMA table_info` guard short-circuits the ALTERs) |
| Manual smoke | Walkthrough per spec.md Acceptance Scenarios | Handed to user; reviewer confirms |

Two tests are explicitly required by spec:

- A new scheduler test asserting that a single goal with `sessionsPerWeek = 7` actually produces 7 sessions in a no-blackout week (SC-001, Acceptance Scenario 1.1).
- Sweep of existing `scheduler.test.ts` for any test that previously *required* role caps to pass; those need their assertions adjusted (Edge Cases in spec).

The `role-form.test.tsx` file needs its assertions on the two removed inputs deleted, and its work-role toggle test left intact.

---

## 3. Branching and PR strategy

| Item | Value |
|---|---|
| Branch | `feat/role-scheduling-rules-removal` (already exists locally with `scope.md` and `spec.md` commits) |
| Base | `master` (currently `e4c181c`) |
| Commits on branch today | Two: `9cbf1b1` (scope decisions), `9442506` (spec.md draft) |
| Next commits planned | `plan.md` (this file), `tasks.md`, then one or more implementation commits |
| PR title | `feat(scheduler, roles): remove role-level scheduling rules` |
| PR base | `wvanloco-alt:master` |

The feature docs (`scope.md`, `spec.md`, `plan.md`, `tasks.md`) are committed to this branch per the established precedent on `feature requests/`. They ship with the implementation PR.

Commits during implementation can be organized as either one squashed commit or one commit per area (schema, defaults, API, UI, scheduler, tests). The user has historically preferred clear commit boundaries during review; I will go with per-area commits unless directed otherwise.

PR bodies cite `spec.md` and `plan.md` for context (both will be in the diff). Do not cite anything outside the repo.

---

## 4. Per-area implementation plan

Each subsection is the developer's working notes for that step: files, ordered edits, FR references, and the local verification before the next step starts. The exhaustive task breakdown lives in `tasks.md`.

### 4.1 Migration (FR-001, FR-002, FR-014, FR-015)

**File**: `apply-schema.js` (single file).

**Edits**:

1. Append a new section near the end of the file (after the existing `is_log_entry` rename guard and the `default_duration_minutes` ADD COLUMN block from activities-refactoring Phase 1).
2. Two guarded `ALTER TABLE roles DROP COLUMN` statements, one per column. The guard pattern is the same as the existing rename block: read `PRAGMA table_info(roles)`, check whether the column exists, run the ALTER only if it does, otherwise log a "skipped, already migrated" line.
3. Log lines for both ALTERs in the same style as existing migrations: clear, single line, includes the column name.

**Local verification**:

- `node apply-schema.js` against a local DB that still has the old columns. Confirm both ALTERs run and log success.
- `node apply-schema.js` a second time. Confirm both log "skipped, already migrated."
- `sqlite3 ./life-app.db "PRAGMA table_info(roles);"` to confirm the columns are gone and the rest of the row shape is intact.

**Risk**: SQLite version. The `DROP COLUMN` syntax requires SQLite 3.35+. The Railway environment runs better-sqlite3 12.x which bundles a SQLite well past that. Verify by checking `better-sqlite3` version in `package.json` and the bundled SQLite version it ships.

### 4.2 Schema and types (FR-003, FR-004)

**Files**:

- `src/db/schema.ts`
- `src/types/index.ts`

**Edits**:

1. `src/db/schema.ts`: in the `roles` table definition, remove the two `integer().notNull().default(...)` lines for `max_weekly_occurrences` and `min_rest_days`. Confirm no other table or relation references them.
2. `src/types/index.ts`: in the `Role` interface, remove the two `maxWeeklyOccurrences: number` and `minRestDays: number` fields. Confirm nothing in the file synthesizes a `Role` from a partial that would now miss them.

**Local verification**:

- `npx tsc --noEmit`. Expect tsc errors at this point because consumers of the removed fields (`defaults.ts`, `role-form.tsx`, `scheduler.ts`, route handlers, tests) haven't been updated yet. List the errors; they form the work list for the next steps.

### 4.3 Defaults and seed (FR-005, FR-006)

**Files**:

- `src/lib/defaults.ts`
- `src/lib/seed-user-defaults.ts`

**Edits**:

1. `src/lib/defaults.ts`: in every entry of `DEFAULT_ROLES`, remove the `maxWeeklyOccurrences:` and `minRestDays:` properties. The Athlete entry that ships with `4 / 1` is the one that caused the original bug; removing it eliminates the bug at the source.
2. `src/lib/seed-user-defaults.ts`: in the role seeding loop, remove any explicit handling of the two fields. If the loop passes the whole `DEFAULT_ROLES` entry through to the POST body, no further edit is needed beyond step 1; if it picks fields explicitly, drop the two.

**Local verification**:

- Some of the tsc errors from step 4.2 should now be resolved.

### 4.4 API surface (FR-007, FR-008, FR-009)

**Files**:

- `src/app/api/roles/route.ts` (POST list)
- `src/app/api/roles/[id]/route.ts` (PATCH single, GET single)

**Edits**:

1. POST handler: remove `maxWeeklyOccurrences` and `minRestDays` from the body destructuring (if explicit) and from the `db.insert(roles).values(...)` payload. If the handler passes the body through directly, remove the field validations.
2. PATCH handler: same treatment as POST. Confirm the response shape (`db.update(roles).set(...).returning()` or follow-up select) no longer projects the two columns.
3. GET (list and single): the GET in `route.ts` explicitly projects each column in its `db.select({...})` (verified at master, lines 19-25). Remove the `maxWeeklyOccurrences: roles.maxWeeklyOccurrences` and `minRestDays: roles.minRestDays` lines from that projection. Apply the equivalent removal to `[id]/route.ts` if it has an explicit projection; if it uses a wildcard or `getTableColumns` helper, the schema change in 4.2 already handles it.

**Local verification**:

- More tsc errors resolved.
- Spot-check: hit `/api/roles` in dev, confirm the response no longer carries the two fields.

### 4.4a Goals API: server-side `sessionsPerWeek` clamp (FR-016)

**Files**:

- `src/app/api/goals/route.ts` (POST)
- `src/app/api/goals/[id]/route.ts` (PATCH)

**Rationale**: With role-level caps gone, `goal.sessionsPerWeek` plus `enforceWeeklySpread` is the only goal-level weekly cap. The client form enforces `min={1} max={7}`, but a direct API call or future buggy client must not be able to write an out-of-range value. The clamp closes that gap.

**Edits**:

1. `route.ts` POST: locate the body parse (currently around line 96: `sessionsPerWeek: Number(body.sessionsPerWeek ?? 3)`). Wrap the conversion in a clamp helper:

   ```ts
   const rawSpw = Number(body.sessionsPerWeek ?? 3);
   const sessionsPerWeek = Number.isFinite(rawSpw)
     ? Math.min(7, Math.max(1, Math.round(rawSpw)))
     : 3;
   ```

   `NaN`, `undefined`, and any non-finite input fall back to the existing default of 3. Negatives, zero, and floats round and clamp to `[1, 7]`. Pass `sessionsPerWeek` to the insert payload.
2. `[id]/route.ts` PATCH: locate the body destructure. If `body.sessionsPerWeek` is provided, apply the same clamp before adding it to the update payload. If `body.sessionsPerWeek` is undefined or missing, do not include it in the update payload (PATCH semantics: missing means "no change").
3. No schema change. The column type is `integer` already; nothing else moves.

**Local verification**:

- Manual: hit POST `/api/goals` in dev with `sessionsPerWeek = 100`. Confirm the persisted row carries `7`, not `100`.
- Unit test (added in step 4.7): POST with `sessionsPerWeek = 100` writes `7`; POST with `sessionsPerWeek = 0` writes `1`; POST with no body field writes `3` (the existing default).

### 4.5 UI: role form (FR-010)

**Files**:

- `src/components/roles/role-form.tsx`
- `src/components/roles/role-list.tsx`

**Edits**:

1. `role-form.tsx`: remove the form state hooks for `maxWeeklyOccurrences` and `minRestDays` (the `useState<number>(...)` calls and any related `useEffect` initializers from props).
2. `role-form.tsx`: remove the whole "Scheduling Rules" section: the section heading, both `<Input type="number">` rows, their `<Label>` elements, and any helper text under them.
3. `role-form.tsx`: remove any references in `handleSubmit` to the two fields in the POST or PATCH body.
4. `role-form.tsx`: leave the work-role toggle (`isWorkRole`) and its handler completely untouched. It is the one piece of "Scheduling Rules" adjacent state that stays.
5. `role-list.tsx`: in the local `handleSave` data parameter type (verified at master, lines 46-53), remove `maxWeeklyOccurrences: number;` and `minRestDays: number;` so the parameter type matches the new shape the form passes. No other change in this file.

**Local verification**:

- tsc clean.
- `npx eslint src/components/roles/role-form.tsx src/components/roles/role-list.tsx` on a per-file diff vs master. Should report no new errors or warnings.

### 4.6 Scheduler (FR-011, FR-012, FR-013)

**File**: `src/lib/scheduler.ts`

This is the biggest single edit in the feature. Order matters because the change touches a function signature that threads through four helpers plus `violatesRestConstraints` itself, five function signatures total.

**Edits**:

1. Identify every call site of `violatesRestConstraints(roleId, date, roleDaySessions, rolesById)`. There should be at most a handful (the scope notes a single primary use site; the spec confirms it).
2. Remove every call site. Replace each with the equivalent "do nothing" path: that is, the surrounding loop now proceeds without the rest-constraint check.
3. Remove the `violatesRestConstraints` function definition (lines around 245-281 per scope).
4. Remove the `roleDaySessions` map construction in `generateSchedule` (lines around 478-492 per scope).
5. Remove the write-back to `roleDaySessions` in `commitSession` (lines around 981-984 per scope).
6. Remove the `roleDaySessions` parameter from every helper that received it. Verified at master, the parameter appears on five function signatures total (lines 248, 571, 661, 754, 917); line 248 is `violatesRestConstraints` itself, so four helpers receive it. Update each signature and each internal call.
7. Remove `rolesById` from helper signatures only if it is no longer used after removing `violatesRestConstraints`. If `rolesById` has other consumers (e.g., role color lookups, work-role checks), leave it in.
8. After the function deletion, sweep for unused imports or unused local variables that the removed code path introduced.

**Local verification**:

- tsc clean. Expect this step to produce most of the satisfaction: the remaining tsc errors from 4.2 should now all resolve.
- Run `npm run test -- --run` and observe which scheduler tests now fail. Some will fail because they previously relied on role caps; their assertions need updating in step 4.7. Some may pass already.

**Constitutional safety check** (per scope's Decisions Made, "No explicit max 7 per role per ISO week safety net"):

- Confirm `goal.sessionsPerWeek` is validated to be 1-7 at the goal-form layer. Spot-check `src/components/goals/goal-form-standalone.tsx` for the constraint.
- Confirm `schedulerSettings.maxActivitiesPerDay` is honored after the removal. Trace the per-day count in `generateSchedule`.
- Confirm `enforceWeeklySpread` (the per-goal weekly cap) still fires. Trace its read in the same function.

If any of these three guardrails is missing or broken after the removal, file a follow-up task. The scope says no explicit role cap is needed because these three together prevent runaway placement; that assertion needs to be true after the change.

### 4.7 Tests (Edge Cases in spec, FR-016 verification)

**Files**:

- `src/lib/__tests__/scheduler.test.ts`
- `src/components/roles/__tests__/role-form.test.tsx`
- A new or existing test for the goals route (see step 3 below for placement).

**Edits**:

1. `scheduler.test.ts`:
   - In every test fixture that builds a `Role` object, remove the `maxWeeklyOccurrences` and `minRestDays` properties. The TypeScript change in 4.2 will already have made these "extra properties not on type" errors; this step removes them cleanly.
   - Identify any test whose assertion *relied* on the cap (for example, asserts "this goal placed 4 sessions when sessionsPerWeek was 7 because the role cap was 4"). Adjust the assertion to reflect the new behavior or rewrite the test.
   - Add a new test asserting SC-001: `sessionsPerWeek = 7` produces 7 sessions in a single ISO week with no blackouts. Place it next to the existing weekly-spread tests.
   - Add a second test asserting consecutive-day placement is now allowed (Acceptance Scenario 1.3).
2. `role-form.test.tsx`:
   - Remove the test that renders or asserts on the `Max Weekly Occurrences` and `Min Rest Days` inputs.
   - Leave the work-role toggle test as-is.
3. Goals API clamp test (FR-016, SC-009):
   - If a goals route test file exists (e.g., `src/app/api/goals/__tests__/route.test.ts`), add the case there. If not, add a focused unit test that invokes the POST handler directly against an in-memory SQLite, asserts that POSTing `sessionsPerWeek = 100` writes `7`, `sessionsPerWeek = 0` writes `1`, and an absent field writes `3` (the existing default).
   - One PATCH equivalent: PATCH with `sessionsPerWeek = 100` writes `7`; PATCH with no `sessionsPerWeek` leaves the prior value untouched.

**Local verification**:

- `npm run test -- --run` should now pass green with the three new tests added (SC-001, consecutive-day, FR-016 clamp) and zero pre-existing tests failing.

### 4.8 Final sweep

After all six functional steps, do a workspace-wide grep for the two removed names:

```
rg "maxWeeklyOccurrences|minRestDays|violatesRestConstraints|roleDaySessions" src/ apply-schema.js
```

Expect zero hits. Any hit means a dangling reference that needs cleanup.

---

## 5. Risk and rollback

### Per-area risk

| Area | Risk | Worst case | Mitigation |
|---|---|---|---|
| Migration | `DROP COLUMN` failure on Railway production DB | Migration aborts, DB stays at old shape, app still runs because the new code does not require the columns to be absent (Drizzle ignores extras on read) | Test against a copy of the Railway DB before deploy. If the ALTER fails, the app continues to work; the cleanup can be re-tried later |
| Drizzle and types | A consumer of the removed fields is missed | tsc fails | The "tsc tells you what's left" iteration in steps 4.2-4.6 catches them |
| Scheduler | A test that incidentally depends on the role cap silently passes after removal (instead of explicitly failing) | The scheduler behaves differently for that scenario; user notices later | The new SC-001 test plus the consecutive-day test cover the most visible regressions. Manual smoke covers the rest |
| Migration data loss | A user with custom `maxWeeklyOccurrences = 5` or similar loses the value | The user re-creates the constraint at the goal level once that future feature exists | This is intentional and was explicitly accepted at scope time (`scope.md` Decisions Made). Communicate verbally to the small invited group |
| Constitutional safety net | Some edge case lets the scheduler place runaway sessions after the role caps are gone | A single goal could produce more sessions than expected | Pre-implementation audit of the three guardrails (`sessionsPerWeek` validated 1-7, `maxActivitiesPerDay`, `enforceWeeklySpread`). Section 4.6 includes the check |

### Rollback path

If the implementation lands and a critical regression appears, the rollback is one revert PR: `git revert <merge-commit>`. The migration's destructive nature means the column values cannot be restored, but the schema column itself comes back (the revert reinstates the Drizzle definition and the API surface; running `apply-schema.js` after the revert is a no-op because the old code does not contain the ALTER statements). Old values are gone permanently regardless of revert; users would need to re-enter custom values they had set.

This is acceptable because the destructive behavior was explicitly accepted at scope time and the invited user group is small.

### What's deliberately NOT mitigated

- The destructive column drop. Intentional.
- A user-facing migration notice. Intentional. Verbal communication only.
- A `goal_session_patterns` audit. Out of scope per `scope.md`.
- The `scheduler-bug-review.md` historical doc cleanup. Separate housekeeping task.

---

## 6. Execution order and milestones

Linear sequence, one developer, one branch:

1. **Migration** (4.1). Verify locally on a copy of the Railway DB. Commit.
2. **Schema and types** (4.2). Expect intentional tsc errors at this checkpoint; do not commit until step 7 lands.
3. **Defaults and seed** (4.3). Some tsc errors resolve.
4. **API surface for roles** (4.4). More tsc errors resolve.
5. **API clamp for goals** (4.4a). FR-016 server-side clamp on `sessionsPerWeek`. Independent of the roles changes; can land in the same per-area commit or its own.
6. **UI** (4.5). More tsc errors resolve.
7. **Scheduler** (4.6). Remaining tsc errors resolve. Run the scheduler safety-net audit. Commit if doing per-area commits; otherwise stage and continue.
8. **Tests** (4.7). Add the three new tests (SC-001 scheduler, consecutive-day scheduler, FR-016 clamp); sweep existing assertions. Tests should now pass green.
9. **Final sweep** (4.8). Grep for dangling references. Stage everything. Commit.
10. **All gates** (section 2). Run tsc, tests, lint per-file, apply-schema.js idempotency.
11. **PR** (section 3). Push, open PR against `wvanloco-alt:master`.

The user verifies manually per spec.md Acceptance Scenarios after merge. No production-deploy verification task is added beyond the manual smoke checklist; the feature is back-end behavior plus form-field removal, both verifiable in a single dev session.

---

## 7. Definition of done

The feature is done when:

- All 16 functional requirements are met and visible in the diff.
- All nine success criteria pass (SC-001 through SC-009).
- The PR is merged into `wvanloco-alt:master`.
- The user has verified the three User Stories' acceptance scenarios in a manual smoke pass.
- The Railway production DB has been migrated, confirmed by a one-time SQL probe after deploy: `PRAGMA table_info(roles);` shows neither `max_weekly_occurrences` nor `min_rest_days`.
- The user has communicated the destructive migration to any friends in the invited group who may have used non-default values.

The branch is then deleted (local and remote).

Documentation sync to `specs/master/` ships as an explicit task in the same PR (see `tasks.md`, T015a). At minimum: a one-line row in `specs/master/tasks.md` (architecture changelog), a note in `specs/master/data-model.md` that the `roles` table dropped two columns, and a note in `specs/master/contracts/api-routes.md` that goals POST/PATCH now clamp `sessionsPerWeek` to `[1, 7]` server-side. Depth beyond that is per-PR developer judgment.
