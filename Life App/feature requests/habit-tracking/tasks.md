# Tasks: Habit tracking

**Feature ID:** `habit-tracking`
**Source documents:** `scope.md`, `spec.md` (39 FRs, 19 SCs), `plan.md` (4 phases), `review.md` and `review-spec-plan-tasks.md` (working artifacts, not committed).
**Last updated:** 2026-05-15

---

## Cross-task notes

- Every task is tagged with one of: `[SETUP]`, `[AUDIT]`, `[CODE]`, `[TEST]`, `[GATES]`, `[SHIP]`, `[VERIFY]`.
- Tasks within a phase are mostly sequential; sub-orderings are noted explicitly in `Blocked-by`.
- The feature is split across four phased PRs (see `plan.md` section 3). Each phase has its own SHIP and VERIFY tasks.
- All work is paused until PR #15 (`goal-progress-sessions-fix`) and PR #16 (`role-scheduling-rules-removal`) merge. Phase 1 cannot open its branch until then.
- The `feature requests/habit-tracking/` directory's `scope.md`, `spec.md`, `plan.md`, and `tasks.md` are committed in T002 of Phase 1, matching past precedent. The two review artifacts (`review.md` for the scope review, `review-spec-plan-tasks.md` for the spec/plan/tasks review) stay uncommitted.

---

## Phase 1: Foundation (schema, types, helpers, API)

Expected PR: ~7 to 10 commits, ~700 to 900 LoC.

### T001 [SETUP], queue check and branch creation

- Action: Confirm PR #15 and PR #16 are both merged to master. Pull master. Create branch `feat/habit-tracking-foundation` off the latest master.
- Files: none (git).
- Acceptance: `git log --oneline origin/master | head -2` includes the merge commits for #15 and #16; `git branch --show-current` returns `feat/habit-tracking-foundation`; `git status --short` is empty.
- Blocked-by: PR #15 merged AND PR #16 merged.

### T002 [SETUP], commit planning documents

- Action: Add `feature requests/habit-tracking/scope.md`, `spec.md`, `plan.md`, and `tasks.md` to the index. Commit them in a single `docs(habit-tracking): commit planning documents` commit.
- Files: `feature requests/habit-tracking/{scope,spec,plan,tasks}.md`.
- Acceptance: One commit on the branch; `git status --short` is empty (`review.md` remains untracked).
- Blocked-by: T001.

### T003 [CODE], apply-schema.js migration (FR-001, FR-002, FR-003)

- Action: Append three `CREATE` statements to the `createStatements` array in `apply-schema.js`: `habits` table, `habit_logs` table, and unique index `habit_logs_habit_date_unique`. See `plan.md` section 4.1.1 for the exact SQL. Place the new entries near the existing `roles` block.
- Files: `apply-schema.js`.
- Acceptance: File compiles in Node (no syntax errors); the new SQL appears in the array; no other migrations are touched.
- Blocked-by: T002.

### T004 [GATES], local migration verification (idempotency)

- Action: Delete any local `life-app.db`. Run `node apply-schema.js` twice. First run logs `OK` for both new tables and the unique index. Second run logs `OK` (CREATE TABLE IF NOT EXISTS is a no-op when the table already exists, same for the index). Run `node -e "const Database = require('better-sqlite3'); const db = new Database('./life-app.db'); console.log('habits:', db.prepare('PRAGMA table_info(habits)').all().map(c => c.name)); console.log('habit_logs:', db.prepare('PRAGMA table_info(habit_logs)').all().map(c => c.name)); console.log('indexes:', db.prepare('PRAGMA index_list(habit_logs)').all().map(i => i.name));"` and confirm the output.
- Files: none (verification).
- Acceptance: `habits` table reports 11 columns matching `spec.md` "Key entities" exactly. `habit_logs` table reports 5 columns. The unique index `habit_logs_habit_date_unique` is present.
- Blocked-by: T003.

### T005 [CODE], Drizzle schema (FR-004)

- Action: In `src/db/schema.ts`, add two new table definitions: `habits` and `habitLogs`, matching the SQL from T003. Use the same helpers as the rest of the file (`sqliteTable`, `integer({ mode: "boolean" })`, `timestamp()`, `updatedAt()`).
- Files: `src/db/schema.ts`.
- Acceptance: `tsc --noEmit` passes for `schema.ts`. The new tables are exported.
- Blocked-by: T004.

### T006 [CODE], TypeScript types (FR-004)

- Action: In `src/types/index.ts`, export interfaces `Habit`, `HabitLog`, `HabitWithRecentLogs`, and `HabitDraft`. `HabitDraft` is the create-form payload `{ identity, name, cue, minimum_version, color }`. `HabitWithRecentLogs` is `Habit & { recentLogDates: string[] }`, the shape returned by `GET /api/habits`. There is no `HabitWithStreaks` type because streaks are computed client-side (per spec FR-005, FR-014).
- Files: `src/types/index.ts`.
- Acceptance: `tsc --noEmit` clean. The four new types are exported.
- Blocked-by: T005.

### T007 [CODE], date display helper (FR-019)

- Action: In `src/lib/dates.ts`, add the `formatDateForDisplay(iso: string): string` helper per `plan.md` section 4.1.4. Defensive: malformed input returns the input unchanged.
- Files: `src/lib/dates.ts`.
- Acceptance: `tsc --noEmit` clean. The function is exported.
- Blocked-by: T006.

### T008 [TEST], date display helper tests

- Action: Add tests to `src/lib/__tests__/dates.test.ts` (or create the file if it does not exist yet). Three test cases per `plan.md` section 4.1.7: ISO date input, ISO datetime input with offset, malformed input.
- Files: `src/lib/__tests__/dates.test.ts`.
- Acceptance: `npx vitest run src/lib/__tests__/dates.test.ts` passes. All three new tests green.
- Blocked-by: T007.

### T009 [CODE], streak helper (FR-014, FR-015, FR-016)

- Action: Create `src/lib/habit-streaks.ts` exporting `computeStreaks(dates: string[], today: string): { current: number, best: number }`. Implementation per `plan.md` section 4.1.5: normalise to `Set`, walk sorted unique dates for `best`, walk backward from today (or yesterday if today is missing) for `current`.
- Files: `src/lib/habit-streaks.ts`.
- Acceptance: `tsc --noEmit` clean. The function is exported.
- Blocked-by: T008.

### T010 [TEST], streak helper tests (FR-017)

- Action: Create `src/lib/__tests__/habit-streaks.test.ts` covering the nine fixtures listed in `plan.md` section 4.1.7. Include the leap-day fixture and the retroactive-fill fixture explicitly. Use `today = "2026-05-15"` as the fixed "today" for most cases; vary for the "ran a week ago" case.
- Files: `src/lib/__tests__/habit-streaks.test.ts`.
- Acceptance: `npx vitest run src/lib/__tests__/habit-streaks.test.ts` passes. All nine cases green.
- Blocked-by: T009.

### T011 [CODE], habits API routes (FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-013, FR-035, FR-036)

- Action: Create the route files under `src/app/api/habits/`:
  - `route.ts`: `GET` (active list with `recentLogDates` per habit) and `POST` (create with server-computed display_order).
  - `[id]/route.ts`: `PATCH` (update + archive) and `DELETE` (hard delete; cascade is enforced by the DB foreign key from T003).
  - `reorder/route.ts`: `PUT` accepting `{ order: number[] }`.
  
  Every handler: calls `auth()`, returns 401 if no session; scopes by `user_id`; returns 404 for cross-user requests; validates lengths and color format on POST/PATCH; returns 400 with specific messages on validation failure. POST returns 201 with the persisted row; PATCH returns 200 with the updated row; DELETE returns 204; PUT /reorder returns 204.
  
  For `GET /api/habits`, the server returns `recentLogDates: string[]` per habit (deduplicated ISO dates from the last 30 days, sorted ascending). The server does **not** compute `currentStreak`, `bestStreak`, or any "today"-anchored array. Per spec FR-005 and the H3 decision: the client owns "today" and runs `computeStreaks` locally in Phase 2. SQL pattern: `SELECT date FROM habit_logs WHERE habit_id = ? AND date >= date('now', '-30 days') ORDER BY date ASC`.
- Files: `src/app/api/habits/route.ts`, `src/app/api/habits/[id]/route.ts`, `src/app/api/habits/reorder/route.ts`.
- Acceptance: `tsc --noEmit` clean. `curl` smoke test (see T015) exercises every endpoint.
- Blocked-by: T010.

### T012 [CODE], habit-logs API routes (FR-011, FR-012, FR-013, FR-035)

- Action: Create `src/app/api/habit-logs/route.ts` with `POST` and `DELETE`. Both accept `{ habitId, date }` in the body. Both call `auth()`, scope by `user_id`, and validate the date string format (`^\d{4}-\d{2}-\d{2}$` and a valid calendar date). Both return 404 if the habit does not belong to the user.
  
  `POST`: insert the row. On SQLite `UNIQUE constraint failed`, catch the error and fetch the existing row by `(habit_id, date)`. Return 201 with the row in both cases (FR-011).
  
  `DELETE`: run `db.delete(...).where(...)`. Ignore the affected-row count. Return 204 always (FR-012).
- Files: `src/app/api/habit-logs/route.ts`.
- Acceptance: `tsc --noEmit` clean. Both endpoints exist.
- Blocked-by: T011.

### T013 [AUDIT], cross-handler auth and validation sweep (FR-013, FR-035)

- Action: Re-read every handler from T011 and T012. Verify:
  - Every handler's first action is `const session = await auth(); if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });`.
  - Every database query includes `userId`-scoping (either as a WHERE clause directly or as a precondition check via SELECT).
  - Every "habit does not exist for this user" path returns 404 with a generic error body, not 403 (to avoid leaking existence).
  - Every length-cap and color-format violation returns 400 with a specific message under the convention `{ error: "<field name> must be <constraint>" }`.
- Files: review only, no edits unless an issue is found.
- Acceptance: A short written checklist in the developer's working notes (not committed) confirming each handler passed each check. If any handler fails, fix it before moving on.
- Blocked-by: T012.

### T014 [GATES], Phase 1 verification gates

- Action: Run `npx tsc --noEmit` (must be clean), `npx vitest run` (all tests pass, includes new dates + habit-streaks tests), per-file lint on every file touched in T003 through T012 (no new issues vs master), and the migration idempotency check from T004 one more time.
- Files: none (verification).
- Acceptance: All four gates pass. Capture the test count diff vs master for the PR body.
- Blocked-by: T013.

### T015 [VERIFY], curl smoke for Phase 1

- Action: Start the dev server. Manually exercise each endpoint via `curl`:
  1. `POST /api/habits` with a minimal valid payload returns 201 with the row.
  2. `GET /api/habits` returns an array with the created habit and `recentLogDates: []`.
  3. `POST /api/habit-logs` with today's date returns 201 with the log row. A second identical POST returns 201 with the same row id (idempotency).
  4. `GET /api/habits` now returns `recentLogDates: ["<today>"]` for that habit.
  5. `DELETE /api/habit-logs` with the same body returns 204. `GET /api/habits` returns `recentLogDates: []` again.
  6. `DELETE /api/habit-logs` for a non-existent `(habitId, date)` returns 204 anyway (idempotency).
  7. `POST /api/habits` with `identity` of 250 chars returns 400 with the specific error message.
  8. `POST /api/habits` with `color: "not-a-color"` returns 400.
  9. `PATCH /api/habits/[id]` from a different user's session (or impersonated user_id) returns 404 (and the response body does not reveal whether the id exists).
- Files: none (verification).
- Acceptance: Every step above returns the expected status code and body shape. The API-layer halves of SC-001 (create endpoint works), SC-002 (POST habit-logs increases the date set), SC-003 (DELETE habit-logs decreases the date set), SC-006 (idempotent POST), SC-007 (idempotent DELETE), SC-008 (length cap), SC-009 (color validation), and SC-015 (cross-user 404) are all proven. The UI halves of SC-002 (cell fill + inline affirmation) and SC-003 (cell empty + no affirmation) belong to Phase 2 verification (T029).
- Blocked-by: T014.

### T016 [SHIP], commit per-area, push, open Phase 1 PR

- Action: Stage and commit the work in logical groups. Suggested 7-commit shape:
  1. `docs(habit-tracking): commit planning documents` (already exists from T002).
  2. `feat(habits): add habits and habit_logs schema with unique index (FR-001, FR-002, FR-003)`.
  3. `feat(habits): mirror schema in Drizzle and TypeScript types (FR-004)`.
  4. `feat(dates): add formatDateForDisplay helper with unit tests (FR-019)`.
  5. `feat(habits): add computeStreaks helper with unit tests (FR-014 to FR-017)`.
  6. `feat(api): habits CRUD endpoints with auth scoping and validation (FR-005 to FR-010, FR-013, FR-035, FR-036)`.
  7. `feat(api): idempotent habit-logs POST and DELETE (FR-011, FR-012)`.
  
  Push to origin. Open a PR against `wvanloco-alt:master` titled `feat(habits): foundation: schema, types, helpers, API`. PR body summarises Phase 1 scope, cites `plan.md` section 4.1, calls out that no UI ships in this PR (foundation only; Phase 2 lights up `/habits`), and lists the API-layer halves of SCs proven (SC-001 partial, SC-002 API, SC-003 API, SC-006, SC-007, SC-008, SC-009, SC-015).
- Files: none (git).
- Acceptance: Phase 1 PR is open against `wvanloco-alt:master`; CI is green; PR body explains the phased strategy.
- Blocked-by: T015.

---

## Phase 2: List view, create flows, log toggle

Expected PR: ~8 to 10 commits, ~900 to 1100 LoC. Branches off Phase 1.

### T017 [SETUP], Phase 2 branch

- Action: After Phase 1 PR merges, pull master, create branch `feat/habit-tracking-list-create` off the latest master.
- Files: none (git).
- Acceptance: Branch tip is on a master commit that includes Phase 1's merge.
- Blocked-by: Phase 1 PR merged.

### T018 [CODE], sidebar nav entry (FR-021)

- Action: In `src/components/layout/app-sidebar.tsx`, add a new entry to the `NAV_GROUPS` array, specifically the "Life Areas" group, after the existing "Goals" entry (last position; preserves the group's alphabetical order Activities → Budget → Goals → Habits). Use the Lucide `Repeat` icon, route `/habits`, title "Habits."
- Files: `src/components/layout/app-sidebar.tsx`.
- Acceptance: `tsc` clean. The entry renders in the sidebar as the last item in the "Life Areas" group. Clicking it navigates to `/habits` (which 404s until T019).
- Blocked-by: T017.

### T019 [CODE], page route at /habits (FR-021)

- Action: Create `src/app/habits/page.tsx` as a server component. Fetch both active and archived habits in the same render pass, matching whichever pattern `src/app/goals/page.tsx` and `src/app/roles/page.tsx` use (direct Drizzle call is preferred for top-level pages in this codebase). Each habit row in the payload includes `recentLogDates: string[]` (deduplicated ISO `YYYY-MM-DD`, last 30 days, sorted ascending). Pass the data to a client `HabitList` component.
- Files: `src/app/habits/page.tsx`.
- Acceptance: Navigating to `/habits` renders an empty state for a user with zero habits, or the populated state with habits sorted by `displayOrder` and `recentLogDates` available for the strip and streak computation.
- Blocked-by: T018.

### T020 [CODE], list view shell (FR-022, FR-023 minimal)

- Action: Create `src/components/habits/habit-list.tsx`. Client component. Receives initial habit data from props. Renders:
  - Header: page title "Habits" in Fraunces; when habits exist, a primary "+ Add habit" button and a smaller "or walk me through it" link; when empty, the minimal Phase 2 empty state (primary CTA only; full editorial deferred to Phase 4 per `plan.md` section 4.2.8).
  - Vertical stack of `HabitRow` components in `displayOrder`.
  - Bottom-of-page placeholder slot for the archived section (filled in Phase 3).
- Files: `src/components/habits/habit-list.tsx`.
- Acceptance: `tsc` clean; the page renders with correct typography in both empty and populated states.
- Blocked-by: T019.

### T021 [CODE], habit row (FR-024, FR-025)

- Action: Create `src/components/habits/habit-row.tsx`. Renders one habit: color dot (16px circle), identity (Fraunces, ~18-20px, truncate with ellipsis on overflow), habit name (Plus Jakarta Sans, muted, smaller), 14-day strip slot (filled by T022), streak readout (digits in JetBrains Mono, rest in Plus Jakarta Sans). The streak values come from running `computeStreaks(recentLogDates, today)` in the parent (T023) and being passed down as props. No interactivity in this task; that arrives in T023.
- Files: `src/components/habits/habit-row.tsx`.
- Acceptance: A single habit renders correctly. Typography matches `.impeccable.md`.
- Blocked-by: T020.

### T022 [CODE], 14-day strip component (FR-024, FR-025, FR-026a)

- Action: Create `src/components/habits/habit-strip.tsx`. Receives `recentLogDates: string[]`, `habitColor`, `habitCreatedAt`, `today: string` (ISO), `inFlightDates: Set<string>` (per FR-026a), `affirmation?: string | null`, `error?: string | null`, and an `onToggle(date: string) => void` callback. Internally builds the 14-element ISO date array `[today - 13, ..., today]`. For each cell:
  - Render disabled (opacity ~0.3, no hover, no click) if the cell's date is before `habitCreatedAt`.
  - Render disabled (no click) if the cell's date is in `inFlightDates`, but keep the optimistic fill state visible.
  - Otherwise render filled (`bg-[habitColor]`) when the cell's date is in `recentLogDates`, calm warm-neutral when not.
  - Hover renders a tooltip with the date in `DD-MM-YYYY` via `formatDateForDisplay`.
  
  Below the strip, render the inline affirmation `<p>` if `affirmation` is non-null (muted text, opacity-fade animation) or the inline error if `error` is non-null. The two states are mutually exclusive at any given instant.
- Files: `src/components/habits/habit-strip.tsx`.
- Acceptance: The strip renders 14 cells. Tooltips show `DD-MM-YYYY`. Pre-creation cells are disabled. In-flight cells reject clicks but keep their optimistic fill. Click handlers fire (`onToggle` is called with the cell's ISO date).
- Blocked-by: T021.

### T023 [CODE], toggle logic, inline affirmation, per-cell in-flight (FR-026, FR-026a, FR-027)

- Action: In `HabitList` (or a custom hook `useHabitToggle`), implement:
  1. State: `recentLogDates` per habit (initial from server props, mutated optimistically); `inFlightCells: Set<string>` keyed `${habitId}:${date}`; `affirmations: Record<habitId, string | null>`; `errors: Record<habitId, string | null>`.
  2. Compute `today` once per render via `new Date().toLocaleDateString("sv-SE")` (ISO `YYYY-MM-DD`).
  3. On cell tap:
     a. If `${habitId}:${date}` is already in `inFlightCells`, no-op (FR-026a guard).
     b. Compute the optimistic next state (toggle the date in/out of `recentLogDates[habitId]`).
     c. Add `${habitId}:${date}` to `inFlightCells`.
     d. If filling AND `date === today` AND `habit.minimum_version` is non-empty: render the inline affirmation by setting `affirmations[habitId]` to the truncated minimum_version (verbatim, sliced to 80 chars + ellipsis). Clear it after 2000ms via `setTimeout`.
     e. Fire `POST /api/habit-logs` (fill) or `DELETE /api/habit-logs` (un-fill).
     f. On success: remove from `inFlightCells`. State already reflects truth.
     g. On HTTP error or network failure: remove from `inFlightCells`, revert `recentLogDates[habitId]`, set `errors[habitId] = "Could not save. Tap to retry."`. Clear affirmation if it was set (because the success it implied did not happen).
  4. Compute streaks per habit by calling `computeStreaks(recentLogDates[habit.id], today)` in the render path and passing the result to `HabitRow`.
  
  No toast library. No portal. The affirmation is a plain `<p>` in the `HabitStrip` component (T022), styled with the design system's muted text color and a CSS opacity transition.
- Files: `src/components/habits/habit-list.tsx` (or new `src/components/habits/use-habit-toggle.ts`).
- Acceptance: Manual: tap today's cell, cell fills, inline affirmation appears under the strip for 2s. Tap again, cell empties, no affirmation. Tap a past cell, cell fills, no affirmation. Tap rapidly twice on the same cell within 200ms: only one request fires. Tap with the network throttled to "offline" in dev tools: cell reverts, inline error appears.
- Blocked-by: T022.

### T024 [CODE], create-habit form, quick mode (FR-030)

- Action: Create `src/components/habits/habit-form.tsx`. Single component accepting `mode: "quick" | "walkthrough"` and `initial?: Habit` (for edit, used in Phase 3). In quick mode: render a `Dialog` with all five fields (identity Textarea 2 rows, name Input, cue Input, minimum version Input, color picker swatches from `getRolePalette()`). Required-field validation matches `spec.md` FR-030: identity 1-200, name 1-50, optional fields 0-200. Submit fires `POST /api/habits` with the trimmed values; success closes the dialog and adds the row to the list optimistically.
- Files: `src/components/habits/habit-form.tsx`.
- Acceptance: `tsc` clean. Manual: click "+ Add habit," fill the five fields, submit, habit appears. Submit without identity, inline error. Submit without name, inline error.
- Blocked-by: T023.

### T025 [CODE], create-habit form, walkthrough mode (FR-031)

- Action: In the same `habit-form.tsx`, add the walkthrough mode. Internal `useState<{ step: 1 | 2 | 3 | 4 | 5, draft: HabitDraft }>`. Steps: 1=identity, 2=name, 3=cue (skippable), 4=minimum version (skippable), 5=review and pick color. Footer dynamically renders Back / Skip / Next / Create habit. Step 5 shows every entered value with a small "Edit" link that jumps back without losing other answers. Submit on step 5 fires `POST /api/habits`.
- Files: `src/components/habits/habit-form.tsx`.
- Acceptance: Manual: open walkthrough, walk through all 5 steps, submit. Test Back navigation from each step preserves earlier values. Test Skip on steps 3 and 4 sets those fields to empty.
- Blocked-by: T024.

### T026 [CODE], wire up form entry points (FR-022, FR-023, FR-023a)

- Action: In `HabitList`, wire:
  - Populated state "+ Add habit" header button: opens quick-mode `HabitForm` (primary; per FR-023a inversion).
  - Populated state "or walk me through it" header link: opens walkthrough-mode `HabitForm` (secondary).
  - Empty state "Walk me through my first habit" CTA: opens walkthrough-mode `HabitForm` (primary; per FR-023a inversion).
  - Empty state "or skip the walkthrough" link: opens quick-mode `HabitForm` (secondary).
  
  The inversion (populated default = quick, empty default = walkthrough) is intentional per FR-023a. Do not "normalise" it.
- Files: `src/components/habits/habit-list.tsx`.
- Acceptance: All four entry points open the correct dialog mode. The empty-vs-populated CTA defaults are inverted as designed.
- Blocked-by: T025.

### T027 [TEST] (required), walkthrough state machine tests

- Action: Create `src/components/habits/__tests__/habit-form.test.tsx`, modelled on `src/components/roles/__tests__/role-form.test.tsx`. Cover, all required:
  1. Quick mode renders all five fields.
  2. Walkthrough mode starts at step 1 and advances on Next.
  3. Required fields (identity on step 1, name on step 2) disable Next when empty.
  4. Optional fields (cue on step 3, minimum version on step 4) enable Skip; Skip advances to the next step with the field set to empty string.
  5. Back from step 5 (review) returns to step 4 with the previously entered minimum-version value still in the input.
  6. Edit link from a review row on step 5 jumps back to the corresponding step preserving every other answer.
  
  The walkthrough state machine has at least 12 distinct interaction paths and is flagged as Medium/Medium risk in `plan.md` section 5. These tests are required, not optional.
- Files: `src/components/habits/__tests__/habit-form.test.tsx`.
- Acceptance: `npx vitest run src/components/habits/__tests__/habit-form.test.tsx` passes. All six test cases green.
- Blocked-by: T026.

### T028 [GATES], Phase 2 verification gates

- Action: Run all four gates from `plan.md` section 2.
- Files: none (verification).
- Acceptance: tsc clean; vitest passes (includes T027); per-file lint no new issues; migration still idempotent.
- Blocked-by: T027.

### T029 [VERIFY], manual smoke for Phase 2

- Action: Run through the manual checks in `plan.md` section 4.2.10:
  - Empty state at `/habits`, walkthrough creates first habit, habit appears with `currentStreak = 0`, `bestStreak = 0` (client-computed).
  - Today's cell tap fills, inline affirmation appears under the strip for 2s. Second tap empties, no affirmation.
  - Past cell tap fills, no affirmation.
  - Rapid double-tap on today's cell within 200ms: only one request fires; cell ends up in the user's last intended state (filled).
  - Refresh persists all state.
  Proves the full UX of SC-001, SC-002, SC-003, SC-012a, SC-012b, SC-013 (DD-MM-YYYY tooltip), and SC-014 (DB stores ISO).
- Files: none.
- Acceptance: Every check passes locally.
- Blocked-by: T028.

### T030 [SHIP], commit, push, open Phase 2 PR

- Action: Commit the work in logical groups (suggested 7 commits matching T018 through T027). Push. Open PR titled `feat(habits): list view, create flows, log toggle`. PR body explains the slice (first useful PR; lights up the happy path) and lists proven SCs.
- Files: none (git).
- Acceptance: Phase 2 PR is open against `wvanloco-alt:master`; CI is green.
- Blocked-by: T029.

---

## Phase 3: Manage (edit, archive, restore, reorder, delete)

Expected PR: ~6 to 8 commits, ~500 to 700 LoC (includes the `@dnd-kit/sortable` install + lockfile diff). Branches off Phase 2.

### T031 [SETUP], Phase 3 branch

- Action: After Phase 2 PR merges, pull master, create branch `feat/habit-tracking-manage` off the latest master.
- Files: none.
- Acceptance: Branch tip includes Phase 2's merge.
- Blocked-by: Phase 2 PR merged.

### T031a [SETUP], add `@dnd-kit/sortable` dependency (FR-028 prerequisite)

- Action: Install `@dnd-kit/sortable` as a runtime dependency. Run `npm install @dnd-kit/sortable` (or the equivalent in the package manager the repo uses; check `package.json` for previous additions to determine the tool). Verify the new entry lands in `package.json` and `package-lock.json` (or `pnpm-lock.yaml` / `yarn.lock`). Commit as `chore(deps): add @dnd-kit/sortable for habit reorder (FR-028)`.
- Files: `package.json`, lockfile.
- Acceptance: `package.json` includes `@dnd-kit/sortable` in `dependencies`. `npm ls @dnd-kit/sortable` (or equivalent) shows the resolved version. `npx tsc --noEmit` still clean.
- Blocked-by: T031.

### T032 [CODE], kebab menu on habit rows (FR-024 extension)

- Action: Add a `DropdownMenu` to the right of the streak readout in `habit-row.tsx`. For active rows: items are "Edit" + "Delete." For archived rows: items are "Restore" + "Delete." Match the dropdown pattern from `role-list.tsx`.
- Files: `src/components/habits/habit-row.tsx`.
- Acceptance: `tsc` clean. Menu opens; items render the correct icons (Pencil, Trash, ArchiveRestore from Lucide).
- Blocked-by: T031.

### T033 [CODE], edit flow (FR-032)

- Action: Wire the kebab "Edit" action to open the existing `HabitForm` in quick mode with `initial` set to the row's habit. Override the dialog title to "Edit habit." Add an "Archive" button to the dialog footer (between Cancel and Save changes) that calls `PATCH /api/habits/[id]` with `{ isArchived: true }`. Submit calls `PATCH /api/habits/[id]` with the diff (or the full payload; match what the existing `role-list.tsx` does).
- Files: `src/components/habits/habit-form.tsx`, `src/components/habits/habit-list.tsx`.
- Acceptance: Manual: open edit, change identity, save: list re-renders with new identity. Click Archive in edit dialog: habit disappears from active list.
- Blocked-by: T032.

### T034 [CODE], archive section in list view (FR-029)

- Action: In `habit-list.tsx`, replace the Phase 2 placeholder slot with the real archive section. Receives `archivedHabits` from props (page-level fetch already grabs both lists in T019). Render a "Show archived habits (N)" button at the bottom of the page; hide it entirely when N is 0. On expand, render archived rows below the toggle. Archived rows use opacity ~0.6 and strikethrough on the identity statement (match `role-list.tsx`).
- Files: `src/components/habits/habit-list.tsx`, possibly `src/app/habits/page.tsx`.
- Acceptance: Manual: archive a habit, scroll to bottom, see "Show archived habits (1)," expand, see the row.
- Blocked-by: T033.

### T035 [CODE], restore action (FR-029)

- Action: Wire the kebab "Restore" action on archived rows to call `PATCH /api/habits/[id]` with `{ isArchived: false }`. On success, move the row from the archived section to the active section optimistically. Preserve the habit's existing `displayOrder` (no client-side re-shuffling).
- Files: `src/components/habits/habit-list.tsx`.
- Acceptance: Manual: archive a habit, expand archived section, click Restore, habit returns to active list.
- Blocked-by: T034.

### T036 [CODE], delete confirmation dialog (FR-009 client-side)

- Action: Create a small `HabitDeleteDialog` component or use a generic confirmation pattern. On kebab "Delete," open a dialog with the message "Delete this habit permanently? All check-ins will be lost. This cannot be undone." Buttons: "Cancel" (default focus) and "Delete" (destructive variant). On confirm, fire `DELETE /api/habits/[id]`, remove the row optimistically. On failure, revert and show an inline error.
- Files: `src/components/habits/habit-list.tsx`, possibly new `src/components/habits/habit-delete-dialog.tsx`.
- Acceptance: Manual: click Delete on a habit with logs, confirm, habit and all its logs are gone. SC-012 proven.
- Blocked-by: T035.

### T037 [CODE], drag-to-reorder with @dnd-kit/sortable (FR-028)

- Action: Use `@dnd-kit/core` (already installed) plus `@dnd-kit/sortable` (added in T031a). Pattern:
  - In `habit-list.tsx`, wrap the active habit list (not the archived section) in a `DndContext` with `closestCenter` collision detection and sensors: `PointerSensor`, `KeyboardSensor` (with `sortableKeyboardCoordinates` from `@dnd-kit/sortable`).
  - Wrap the list inside the `DndContext` with a `SortableContext` using `verticalListSortingStrategy` and pass the array of habit ids as `items`.
  - In `habit-row.tsx`, call `useSortable({ id: habit.id })`. Apply `attributes`, `listeners`, `setNodeRef`, and the CSS transform/transition from the hook to the row's root element.
  - In `DndContext`'s `onDragEnd` handler: compute the new order array via `arrayMove` from `@dnd-kit/sortable`, update the local list state optimistically, fire `PUT /api/habits/reorder` with `{ order: [...habitIds] }`. On failure, revert the local state and show an inline error at the top of the list.
  
  Do **not** mirror `weekly-plan-view.tsx`'s pattern; that file solves a different (2D drag-from-pool) problem. The canonical `@dnd-kit/sortable` vertical-list example is the right reference.
  
  Archived habits remain unsortable (FR-029).
- Files: `src/components/habits/habit-list.tsx`, `src/components/habits/habit-row.tsx`.
- Acceptance: Manual: drag a habit to a new position, order persists across hard refresh. Keyboard test: Tab to a row, Space to grab, Arrow keys to move, Space to drop, order persists.
- Blocked-by: T031a, T036.

### T038 [GATES], Phase 3 verification gates

- Action: All four gates from `plan.md` section 2.
- Files: none.
- Acceptance: All gates pass.
- Blocked-by: T037.

### T039 [VERIFY], manual smoke for Phase 3

- Action: Run through the checks in `plan.md` section 4.3.8. Proves SC-010 (archive + restore), SC-011 (drag-reorder persists), SC-012 (hard delete cascades).
- Files: none.
- Acceptance: All checks pass.
- Blocked-by: T038.

### T040 [SHIP], commit, push, open Phase 3 PR

- Action: Commit the work in logical groups. Suggested 6-commit shape:
  1. `chore(deps): add @dnd-kit/sortable for habit reorder (FR-028)` (already exists from T031a).
  2. `feat(habits): kebab menu actions on habit rows`.
  3. `feat(habits): edit flow reuses HabitForm with archive button (FR-032)`.
  4. `feat(habits): archive section with restore action (FR-029)`.
  5. `feat(habits): hard delete with confirmation dialog (FR-009)`.
  6. `feat(habits): drag-to-reorder with @dnd-kit/sortable and keyboard support (FR-028)`.
  
  Push. Open PR titled `feat(habits): edit, archive, restore, reorder, delete`. PR body lists proven SCs (SC-010, SC-011, SC-012).
- Files: none.
- Acceptance: Phase 3 PR is open against `wvanloco-alt:master`; CI is green.
- Blocked-by: T039.

---

## Phase 4: Empty-state editorial polish and master-docs sync

Expected PR: ~3 to 4 commits, ~150 to 250 LoC. Branches off Phase 3.

### T041 [SETUP], Phase 4 branch

- Action: After Phase 3 PR merges, pull master, create branch `feat/habit-tracking-polish` off the latest master.
- Files: none.
- Acceptance: Branch tip includes Phase 3's merge.
- Blocked-by: Phase 3 PR merged.

### T042 [CODE], empty-state editorial blocks (FR-023, FR-034)

- Action: Create `src/components/habits/habit-empty-state.tsx`. Render the three editorial blocks per `scope.md:175-184` and `plan.md` section 4.4.1. Three sibling `<section>` elements, no card wrappers. Headings in Fraunces ~24px sentence case. Body in Plus Jakarta Sans ~16px comfortable line height. `mt-12` (or larger) between blocks. Below the third block: primary CTA "Walk me through my first habit" + smaller link "or skip the walkthrough." Wire both CTAs to open the existing `HabitForm` in the correct mode.
- Files: `src/components/habits/habit-empty-state.tsx`, `src/components/habits/habit-list.tsx` (swap the Phase 2 minimal empty state for this).
- Acceptance: Manual: with zero habits, the page renders the three blocks with correct typography. Click "Walk me through my first habit" → walkthrough opens. Create a habit → blocks disappear. Delete the habit → blocks return.
- Blocked-by: T041.

### T043 [CODE], master-docs sync (FR-020 follow-up tracking)

- Action: Update three files under `specs/master/`:
  
  - `data-model.md`: add `Habit` and `HabitLog` entities to the Mermaid ER diagram. Add column tables matching `spec.md` "Key entities" (11 columns for habits, 5 for habit_logs). Add a note about the unique index on `(habit_id, date)`.
  - `contracts/api-routes.md`: add a new "Habits" section after the "Roles" section with all eight endpoints (GET, POST, PATCH, DELETE for `/api/habits`, GET for `?archived=true`, PUT for `/api/habits/reorder`, POST + DELETE for `/api/habit-logs`). Include request and response examples. Note the idempotent contract for habit-logs explicitly ("POST always returns 201; DELETE always returns 204").
  - `tasks.md`: append a changelog row dated when this PR ships, summarising the four-phase rollout, the new `formatDateForDisplay` helper, the `computeStreaks` helper, and the DD-MM-YYYY display rule (note that the app-wide sweep of existing ISO display sites is tracked separately).
- Files: `specs/master/data-model.md`, `specs/master/contracts/api-routes.md`, `specs/master/tasks.md`.
- Acceptance: `rg "habits" specs/master/` returns hits in every expected location.
- Blocked-by: T042.

### T044 [GATES], Phase 4 verification gates

- Action: All four gates from `plan.md` section 2.
- Files: none.
- Acceptance: All gates pass.
- Blocked-by: T043.

### T045 [SHIP], commit, push, open Phase 4 PR

- Action: Two or three commits: editorial empty state, master-docs sync, and a final any-stragglers commit if needed. Push. Open PR titled `feat(habits): empty-state editorial polish and master-docs sync`. PR body explains the closing-phase scope and includes the full SC checklist (SC-001 through SC-012, SC-012a, SC-012b, SC-013 through SC-017) for the user's manual smoke after deploy.
- Files: none.
- Acceptance: Phase 4 PR is open against `wvanloco-alt:master`; CI is green.
- Blocked-by: T044.

### T046 [VERIFY], post-deploy manual smoke checklist

- Action: After Phase 4 merges and Railway deploys, run through every SC on the production app: SC-001 through SC-012, SC-012a, SC-012b, SC-013 through SC-017. Most are happy-path UX checks. SC-006, SC-007, SC-008, SC-009, SC-015 require quick curl tests. SC-012a is a rapid double-tap check (the cell-disabled-during-flight behaviour from FR-026a). SC-012b is a structural check of the empty-vs-populated CTA inversion (FR-023a). SC-013 is a tooltip hover. SC-014 is a DB query. SC-017 is a perf check that may or may not be observable depending on data volume.
- Files: none.
- Acceptance: Every SC passes. Any failure is filed as a bug with the SC number for traceability.
- Blocked-by: T045 merged AND Railway deploy confirmed green.

---

## Definition of done (whole feature)

- All four phase PRs merged to master.
- All 39 FRs in `spec.md` implemented.
- All 19 SCs in `spec.md` verified on production (T046).
- `specs/master/data-model.md`, `contracts/api-routes.md`, `tasks.md` are current.
- `Agent13-Onboarding.md` (workspace, not committed) is updated to reflect the shipped feature.
- No new lint or `tsc` issues compared to pre-feature master.
- The user can use the Habits page end to end (create, log, see streaks, manage, drag-reorder) with no console warnings and no failed requests under normal use.
