# Tasks: Remove Role-Level Scheduling Rules

**Tasks ID**: `role-scheduling-rules-removal`
**Created**: 2026-05-14
**Status**: Draft, pending user approval before implementation
**Source documents**: `scope.md`, `spec.md`, `plan.md`

---

## How to read this file

Tasks are sequential across the whole feature. There is only one PR; there is no parallelism. Within each task, the developer should not start the next task until the current one's acceptance is met.

Each task has:

- An ID (T001 onward, monotonic).
- An action statement (what the developer does).
- Target file(s).
- Acceptance: what the task is done when.
- Blocked-by: task IDs that must complete first.

Tag conventions:

- `[SETUP]`: branch and environment hygiene.
- `[AUDIT]`: read-only inspection that must conclude before code edits begin.
- `[GATES]`: bookkeeping that gates the ship task.
- `[SHIP]`: commit, push, open PR.
- `[VERIFY]`: post-merge production checks.

FR references are inline (FR-001, FR-011, and so on) so every code task traces back to a requirement in `spec.md`.

---

## T001 [SETUP], confirm branch state

- Action: Verify the branch `feat/role-scheduling-rules-removal` is current, working tree clean, and rebased onto `e4c181c` or whatever `upstream/master` is at the moment implementation begins. If master has moved since the rebase on 2026-05-14, `git fetch upstream && git rebase upstream/master`.
- Files: none.
- Acceptance: `git status --short` is empty; `git log --oneline -1` shows one of the doc commits as HEAD; the branch sits on current master.
- Blocked-by: none.

## T002 [AUDIT], pre-implementation safety net audit

- Action: Before touching any code, audit the three guardrails the scope and `plan.md` section 4.6 claim make an explicit role cap unnecessary after removal. For each guardrail, open the file, read the relevant block, and confirm:
  - `goal.sessionsPerWeek` is validated to be in `[1, 7]` at the goal-form layer. Quick path: `src/components/goals/goal-form-standalone.tsx`, search for `sessionsPerWeek` and check input bounds. Also check `src/app/api/goals/route.ts` POST and `src/app/api/goals/[id]/route.ts` PATCH for server-side range validation; flag if absent.
  - `schedulerSettings.maxActivitiesPerDay` is honored in the scheduler's per-day count loop. Quick path: `src/lib/scheduler.ts`, search for `maxActivitiesPerDay`. Confirm it is read on every placement attempt, not only on initial generation.
  - `enforceWeeklySpread` fires the per-goal weekly cap. Quick path: same file, search for `enforceWeeklySpread`. Confirm it consults `goal.sessionsPerWeek` as the cap value.
- Files: read-only audit. No edits.
- Acceptance: written summary in the developer's working notes (not committed) listing the location and current behavior of each of the three guardrails. If any guardrail is missing or weak, STOP and surface the finding before continuing; the spec assumes all three exist and is built on that assumption.
- Blocked-by: T001.

---

## T003, migration in `apply-schema.js` (FR-001, FR-002, FR-014, FR-015)

- Action: In `apply-schema.js`, append two guarded `ALTER TABLE roles DROP COLUMN` statements, one for `max_weekly_occurrences` and one for `min_rest_days`. Use the same pattern as the existing `is_log_entry` rename guard from activities-refactoring Phase 1: read `PRAGMA table_info(roles)`, check whether each column exists, run the ALTER only if it does, log "dropped" or "skipped, already migrated" accordingly. Place the new section near the end of the file so it runs after all prior migrations.
- Files: `apply-schema.js`.
- Acceptance: Two new logical blocks in the file, each idempotent. Local verification (T004) confirms behavior.
- Blocked-by: T002.

## T004, local migration verification

- Action: With `$env:DB_PATH = "./life-app.db"` set (and a backup of the current local DB taken first as `life-app.db.bak`), run `node apply-schema.js`. Confirm both ALTERs log success and the columns are gone (`sqlite3 ./life-app.db "PRAGMA table_info(roles);"` shows the reduced column set). Run `node apply-schema.js` a second time and confirm both log "skipped, already migrated."
- Files: none (read-only verification, plus a local backup copy of the DB).
- Acceptance: Two clean runs; second run is a no-op. The `roles` table has lost the two columns and no other column. The backup `.bak` exists so the dev DB can be restored if the next steps need rollback.
- Blocked-by: T003.

---

## T005, Drizzle schema and TypeScript types (FR-003, FR-004)

- Action:
  - In `src/db/schema.ts`, locate the `roles` table definition. Remove the two field definitions for `max_weekly_occurrences` and `min_rest_days`. Confirm no other Drizzle relation references them.
  - In `src/types/index.ts`, locate the `Role` interface. Remove the `maxWeeklyOccurrences: number` and `minRestDays: number` fields.
- Files: `src/db/schema.ts`, `src/types/index.ts`.
- Acceptance: Both files compile-clean against the rest of the source. `npx tsc --noEmit` at this point will fail with errors in `defaults.ts`, `seed-user-defaults.ts`, `role-form.tsx`, `scheduler.ts`, the route handlers, and the test files. The error list IS the work list for T006 through T013.
- Blocked-by: T004.

---

## T006, defaults and seed (FR-005, FR-006)

- Action:
  - In `src/lib/defaults.ts`, in every entry of `DEFAULT_ROLES`, remove the `maxWeeklyOccurrences` and `minRestDays` properties. Confirm the Athlete entry (which previously shipped `4 / 1` and caused the original bug) no longer carries either field.
  - In `src/lib/seed-user-defaults.ts`, in the role seeding loop, remove any explicit reference to the two fields. If the loop passes the whole `DEFAULT_ROLES` entry through to the POST body, step 1 alone is sufficient; if it picks fields explicitly, drop the two.
- Files: `src/lib/defaults.ts`, `src/lib/seed-user-defaults.ts`.
- Acceptance: Some `tsc` errors from T005 are now resolved (those rooted in these two files). The new-user seed path no longer writes either field.
- Blocked-by: T005.

---

## T007, Roles API surface (FR-007, FR-008, FR-009)

- Action:
  - In `src/app/api/roles/route.ts`:
    - POST handler: remove `maxWeeklyOccurrences` and `minRestDays` from request body destructuring (if explicit) and from the `db.insert(roles).values(...)` payload.
    - GET handler: remove the two explicit projection lines from the `db.select({...})` block (verified at master, lines 19-25: the projection lists each column explicitly; this is not a wildcard select). The two lines to delete are `maxWeeklyOccurrences: roles.maxWeeklyOccurrences,` and `minRestDays: roles.minRestDays,`.
  - In `src/app/api/roles/[id]/route.ts`:
    - PATCH handler: remove the two fields from the request body destructuring and from the update payload (verified at master, lines 44-45).
    - GET handler (if present): if it uses an explicit `db.select({...})` projection, remove the two columns from it; if it uses a wildcard or `getTableColumns` helper, T005's schema change already handles it. Inspect to confirm.
- Files: `src/app/api/roles/route.ts`, `src/app/api/roles/[id]/route.ts`.
- Acceptance: Both route handlers compile clean. More `tsc` errors resolved. A dev-server spot-check of `GET /api/roles` confirms the response body no longer carries `maxWeeklyOccurrences` or `minRestDays`.
- Blocked-by: T006.

---

## T007a, Goals API server-side clamp (FR-016)

- Action: Add a `[1, 7]` clamp on `sessionsPerWeek` in the goals route handlers. Closes the API-direct-write gap the spec review surfaced (a malformed POST with `sessionsPerWeek = 100` would otherwise persist 100).
  - In `src/app/api/goals/route.ts` POST handler: locate the body parse (verified at master, line 96: `sessionsPerWeek: Number(body.sessionsPerWeek ?? 3)`). Replace with:
    ```ts
    const rawSpw = Number(body.sessionsPerWeek ?? 3);
    const sessionsPerWeek = Number.isFinite(rawSpw)
      ? Math.min(7, Math.max(1, Math.round(rawSpw)))
      : 3;
    ```
    Pass `sessionsPerWeek` through to the insert payload. `NaN`, `undefined`, and any non-finite input fall back to the existing default of 3. Negatives, zero, and floats round and clamp to `[1, 7]`.
  - In `src/app/api/goals/[id]/route.ts` PATCH handler: if `body.sessionsPerWeek` is provided, apply the same clamp before adding it to the update payload. If `body.sessionsPerWeek` is `undefined`, do not include it in the update payload (PATCH semantics: missing means "no change").
- Files: `src/app/api/goals/route.ts`, `src/app/api/goals/[id]/route.ts`.
- Acceptance: A POST to `/api/goals` with `sessionsPerWeek: 100` in the body results in a persisted row carrying `sessionsPerWeek = 7`. A POST with `sessionsPerWeek: 0` writes `1`. A POST with no `sessionsPerWeek` writes `3`. PATCH with an out-of-range value clamps; PATCH without the field leaves the prior value untouched. `tsc` clean.
- Blocked-by: T007. (Strictly independent of roles changes; sequenced here so all API edits sit together.)

---

## T008, role-form UI (FR-010)

- Action:
  - In `src/components/roles/role-form.tsx`:
    - Remove the `useState<number>(...)` calls (and any related `useEffect` initializers from `role` prop) for `maxWeeklyOccurrences` and `minRestDays`.
    - Remove the full "Scheduling Rules" section in the form JSX: the section heading, both `<Input type="number">` rows, their `<Label>` elements, and any helper text under them.
    - Remove any references in `handleSubmit` to the two fields in the POST or PATCH body construction.
    - Leave the work-role toggle (`isWorkRole`) and its handler completely untouched.
  - In `src/components/roles/role-list.tsx`: in the local `handleSave` data parameter type (verified at master, lines 46-53), remove `maxWeeklyOccurrences: number;` and `minRestDays: number;` so the parameter type matches the new shape the form passes. No other change in this file.
- Files: `src/components/roles/role-form.tsx`, `src/components/roles/role-list.tsx`.
- Acceptance: Form renders, saves, and loads correctly with the two inputs gone. No empty section, no errant whitespace. Work-role toggle still functions. `tsc` errors rooted in both files are resolved.
- Blocked-by: T007a.

---

## T009, scheduler logic (FR-011, FR-012, FR-013)

This is the largest single task in the feature.

- Action: In `src/lib/scheduler.ts`:
  - Identify every call site of `violatesRestConstraints(roleId, date, roleDaySessions, rolesById)`. Note the count; the scope predicts a single primary site but verify.
  - Remove every call site. The surrounding loop should proceed without the rest-constraint check (no "do nothing" wrapper; just delete the `if` block and its branch).
  - Remove the `violatesRestConstraints` function definition (lines around 245-281 per scope; verify exact location at implementation time).
  - Remove the `roleDaySessions` map construction in `generateSchedule` (lines around 478-492 per scope).
  - Remove the write-back to `roleDaySessions` in `commitSession` (lines around 981-984 per scope).
  - Remove the `roleDaySessions` parameter from every helper that received it. Verified at master, the parameter appears on five function signatures total (lines 248, 571, 661, 754, 917); line 248 is `violatesRestConstraints` itself, so four helpers receive it. Update each signature and each internal call to drop the argument.
  - Check whether `rolesById` is still needed by helpers after `violatesRestConstraints` is gone. If yes, leave it. If no, remove it from the same helper signatures.
  - Sweep for now-unused imports, unused local variables, and unused parameters that the removed code introduced.
- Files: `src/lib/scheduler.ts`.
- Acceptance: `npx tsc --noEmit` is clean across the whole project (all errors from T005 should now resolve, modulo the test files handled in T010). The scheduler still compiles. The audit notes from T002 are still valid: the three remaining guardrails (`sessionsPerWeek` 1-7 validation, `maxActivitiesPerDay`, `enforceWeeklySpread`) are unchanged.
- Blocked-by: T008.

---

## T010, scheduler test fixture sweep

- Action: In `src/lib/__tests__/scheduler.test.ts`:
  - In every test fixture that builds a `Role` object, remove the `maxWeeklyOccurrences` and `minRestDays` properties. The TypeScript change in T005 will already have flagged these; this step removes them cleanly.
  - Identify any test whose assertion relied on the role cap producing a specific scheduled count (for example, "this goal placed 4 sessions when sessionsPerWeek was 7 because the role cap was 4"). Adjust the assertion to reflect the new behavior, or rewrite the test if its purpose was specifically to exercise role caps (in which case delete it).
- Files: `src/lib/__tests__/scheduler.test.ts`.
- Acceptance: All Role fixtures in the file have no extra fields. Any assertions that depended on role caps are either rewritten or deleted. Test count may decrease at this point if obsolete tests were deleted.
- Blocked-by: T009.

## T011, new test: SC-001 (`sessionsPerWeek = 7` schedules 7 sessions)

- Action: Add a new test to `src/lib/__tests__/scheduler.test.ts` that asserts SC-001 / Acceptance Scenario 1.1 of `spec.md`: a single goal with `sessionsPerWeek = 7`, no blackouts, no preferred days restriction, default scheduler settings. Run the scheduler for one ISO week. Assert exactly 7 sessions are placed for the goal.
- Files: `src/lib/__tests__/scheduler.test.ts`.
- Acceptance: New test exists and passes. Test failure if a regression silently reintroduces a 1-6 sessions/week cap.
- Blocked-by: T010.

## T012, new test: Acceptance Scenario 1.3 (consecutive-day placement allowed)

- Action: Add a second new test asserting that for a goal with `sessionsPerWeek = 5`, the scheduler is permitted to place sessions on consecutive days (for example, Mon + Tue, Tue + Wed). The test does NOT need to assert consecutive days WILL happen, just that the placement is not blocked by an implicit rest gap. Suggested form: build a goal with no preferred days and `goal_session_patterns` empty, run a week of scheduling, assert at least one pair of consecutive-day placements is possible across multiple runs (or use a deterministic seed that produces consecutive placement and assert the specific layout).
- Files: `src/lib/__tests__/scheduler.test.ts`.
- Acceptance: New test exists and passes. Test failure if a regression reintroduces implicit role-level min-rest behavior.
- Blocked-by: T011.

## T012a, new test: SC-009 (goals API `sessionsPerWeek` clamp)

- Action: Add a focused test for the clamp added in T007a. Suggested placement: `src/app/api/goals/__tests__/route.test.ts` if it exists; otherwise create that file and follow the in-memory-SQLite test pattern used by `src/lib/__tests__/scheduler.test.ts`.
  - Case 1: POST with `sessionsPerWeek = 100` writes `7` (upper clamp).
  - Case 2: POST with `sessionsPerWeek = 0` writes `1` (lower clamp).
  - Case 3: POST with `sessionsPerWeek` absent from the body writes `3` (existing default behavior preserved).
  - Case 4: PATCH with `sessionsPerWeek = 100` writes `7`. PATCH with the field absent leaves the prior value untouched.
- Files: `src/app/api/goals/__tests__/route.test.ts` (new or existing).
- Acceptance: New test exists and passes. SC-009 in `spec.md` is covered.
- Blocked-by: T012.

## T013, role-form test cleanup

- Action: In `src/components/roles/__tests__/role-form.test.tsx`:
  - Remove any test that renders or asserts on the "Max Weekly Occurrences" or "Min Rest Days" inputs. If a test focused specifically on those inputs, delete the test.
  - Verify the existing work-role toggle test remains untouched.
  - Verify the existing "renders empty fields when creating" and "calls onSave with correct data when valid" tests still pass with the new form shape; if their fixtures or assertions reference the removed fields, update them.
- Files: `src/components/roles/__tests__/role-form.test.tsx`.
- Acceptance: File compiles and tests pass. No assertions remain on the removed inputs. Work-role toggle test still passes.
- Blocked-by: Same PR; edit order does not matter. Recommended order: T010 through T013 sequentially for a clean test-suite walk.

---

## T014, final dangling-reference sweep

- Action: Workspace-wide search for any remaining references to the removed names. Use ripgrep or the workspace search:
  ```
  rg "maxWeeklyOccurrences|minRestDays|violatesRestConstraints|roleDaySessions" src/ apply-schema.js
  ```
- Files: read-only sweep.
- Acceptance: Zero hits. Any hit is a dangling reference that needs cleanup; do not advance to T015 until the count is zero.
- Blocked-by: T013.

---

## T015 [GATES], full verification suite

- Action: Run all four gates in order:
  1. `npx tsc --noEmit`.
  2. `npm run test -- --run`.
  3. Per-file lint comparison against `master`. For each modified file, run `npx eslint <file>` on the current branch, then `git stash && npx eslint <file> && git stash pop`, and confirm the per-file output is unchanged (no new errors or warnings introduced).
  4. `node apply-schema.js` against the local DB, twice in a row. Confirm idempotency.
- Files: none (verification only).
- Acceptance: tsc clean; tests all green including the three new tests from T011 (SC-001), T012 (consecutive-day), and T012a (FR-016 clamp); per-file lint identical to master for every modified file; migration idempotent.
- Blocked-by: T014.

---

## T015a, master documentation sync

- Action: Add a minimal sync to the workspace master documents so future maintainers reading `specs/master/` alone see the change. This task ships in the same PR; do NOT split into a separate PR.
  - `specs/master/tasks.md`: append a one-line architecture-changelog row noting the two-column removal and the addition of the goals `sessionsPerWeek` server-side clamp.
  - `specs/master/data-model.md`: in the section that documents the `roles` table, remove `max_weekly_occurrences` and `min_rest_days` from the column list (or annotate them as removed if the doc carries a changelog table).
  - `specs/master/contracts/api-routes.md`: in the `POST /api/goals` and `PATCH /api/goals/[id]` entries, note the `sessionsPerWeek` `[1, 7]` clamp behavior. In the `GET /api/roles` and PATCH/POST entries, note that `maxWeeklyOccurrences` and `minRestDays` are no longer present in the request or response shapes.
  - Depth beyond the above is per-PR developer judgment. If `specs/master/ROADMAP.md` or another master doc already references the removed fields, sweep them too.
- Files: `specs/master/tasks.md`, `specs/master/data-model.md`, `specs/master/contracts/api-routes.md`, and any other master doc that grep surfaces.
- Acceptance: The three named files reflect the new shape. `rg "max_weekly_occurrences|maxWeeklyOccurrences|min_rest_days|minRestDays" specs/master/` returns zero hits, or only hits inside an explicit "removed" changelog entry.
- Blocked-by: T015.

---

## T016 [SHIP], commit and open PR

- Action:
  - Organize the staged work into per-area commits. Suggested grouping (matches plan.md section 4):
    - Commit 1: `apply-schema.js` migration (T003).
    - Commit 2: schema + types (T005).
    - Commit 3: defaults + seed (T006).
    - Commit 4: API routes for roles (T007).
    - Commit 5: API clamp for goals `sessionsPerWeek` (T007a).
    - Commit 6: role-form UI plus role-list.tsx type cleanup (T008).
    - Commit 7: scheduler logic (T009).
    - Commit 8: scheduler tests sweep plus two new tests (T010, T011, T012).
    - Commit 9: goals API clamp test (T012a).
    - Commit 10: role-form test cleanup (T013).
    - Commit 11: master-docs sync (T015a).
  - If the user prefers a single squashed commit at PR time, prepare a squashed merge message instead. Default to per-area until directed otherwise.
  - Push the branch to `origin`.
  - Open a PR against `wvanloco-alt:master` titled `feat(scheduler, roles): remove role-level scheduling rules`.
  - PR body cites `spec.md` and `plan.md` for context (both are in the diff). PR body should call out: the destructive migration, the new server-side `sessionsPerWeek` clamp, the three new tests added (SC-001, consecutive-day, SC-009), the safety-net audit performed in T002, and the manual-smoke verification required post-merge.
- Files: none (git operations).
- Acceptance: PR is open against `wvanloco-alt:master`; CI is green or has only pre-existing failures; the PR body lays out the destructive migration honestly so reviewers cannot miss it.
- Blocked-by: T015a.

---

## T017 [VERIFY], production DB column probe

- Action: After T016 is merged and Railway auto-deploys, SSH or open a Railway query console against the production DB and run `PRAGMA table_info(roles);`. Confirm neither `max_weekly_occurrences` nor `min_rest_days` appears in the result. Confirm all other expected columns (`id`, `user_id`, `name`, `description`, `color`, `display_order`, `is_archived`, `is_work_role`, `created_at`, `updated_at`) are present.
- Files: none (production verification).
- Acceptance: SC-003 of `spec.md` is met. If columns persist, the migration did not run on production; surface the issue immediately rather than declaring done.
- Blocked-by: T016 is merged AND Railway has confirmed a successful deploy.

## T018 [VERIFY], manual smoke walkthrough

- Prerequisites: at least one custom role visible on the role list (the test user normally has the seeded defaults plus any user-created roles); a roughly empty target month with no blackouts and a light pre-existing schedule, so the assertion about 7 sessions per week is not muddied by blackouts or daily-cap interactions.
- Action: On the live Railway URL after the deploy from T017:
  - Open the role list. Confirm every existing role still appears with name, description, color, and work-role flag intact (User Story 2 Acceptance Scenario 2).
  - Open the role edit dialog on any role. Confirm the "Scheduling Rules" section is gone, no empty section heading, no errant whitespace; the work-role toggle still renders and saves (User Story 2 Acceptance Scenarios 2 and 3).
  - Create or pick a goal with `sessionsPerWeek = 7`. Run schedule generation for the next 4 weeks. Confirm 7 sessions per week are proposed for that goal across all 4 weeks, modulo blackouts and daily caps (User Story 1).
- Files: none (production walkthrough).
- Acceptance: All three User Stories' acceptance scenarios pass on production. The user communicates the destructive migration verbally to any friends in the invited group who may have used non-default role values (per scope's "Risks" mitigation).
- Blocked-by: T017.

---

## Cross-task notes

- This is one PR; there are no parallel tracks. Every task blocks the next.
- The dependency chain T005 through T013 produces intentional `tsc` errors between steps. The errors are the work list; do not "fix" them prematurely by introducing temporary stubs.
- The destructive migration (T003) is one-way. The local DB backup taken in T004 is the only recovery path for development data. Production has no rollback for the lost values; this is intentional and accepted at scope.
- No task in this feature touches `goal_session_patterns`, `weekly_focus_goals`, `activity_logs`, or any table outside `roles` and (FR-016) `goals`. The 16 FR list is exhaustive.
- The `scheduler-bug-review.md` historical doc cleanup (mentioned in `scope.md` Notes for reviewer) is NOT part of this feature. Separate housekeeping task.

## Definition of done (feature level)

The feature is done when:

- The PR from T016 is merged into `wvanloco-alt:master`.
- T017 passes (production DB column probe clean).
- T018 passes (three User Stories acceptance scenarios verified on production).
- All nine Success Criteria (SC-001 through SC-009 of `spec.md`) are met.
- The master-docs sync in T015a landed in the same PR.
- The local branch `feat/role-scheduling-rules-removal` and its remote counterpart are deleted.
