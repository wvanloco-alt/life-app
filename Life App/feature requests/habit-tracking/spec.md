# Spec: Habit tracking

**Feature ID:** `habit-tracking`
**Status:** Spec. Scope confirmed 2026-05-15; spec drafted 2026-05-15.
**Depends on:** PR #15 (`goal-progress-sessions-fix`) and PR #16 (`role-scheduling-rules-removal`) merging to master. Implementation slot opens once both ship.
**Last updated:** 2026-05-15

---

## Context

A new top-level "Habits" page that tracks lightweight daily behaviors using an identity-first frame from Atomic Habits. Habits coexist with the existing Goals system; no migration. The full design rationale, anti-goals, and decisions are in `scope.md`. The reviewer findings and decisions made in response are in `review.md` (working artifact, not committed). This spec locks the contract.

---

## Decisions locked from scope review

Recorded here so the implementation phase does not have to relitigate.

| Question | Decision | Source |
|---|---|---|
| Whose clock owns "today" for habit logs? | Client computes today's date from browser local time. Server receives an ISO `YYYY-MM-DD` string in every write request and trusts it. | H1 of `review.md`; matches `activity_logs.date` precedent. |
| Date format: storage / wire vs display | Storage and API wire format stay ISO `YYYY-MM-DD`. **Display format is `DD-MM-YYYY`** everywhere the user reads a date. A shared `formatDateForDisplay(iso): string` helper handles the render boundary. App-wide sweep of existing ISO display sites is a tracked follow-up, out of scope for this feature. | User confirmed 2026-05-15. |
| Idempotency response shapes for `POST` / `DELETE /api/habit-logs` | `POST` always returns `201` with the persisted row, regardless of whether the row pre-existed. `DELETE` always returns `204`, regardless of whether the row existed. | H2 of `review.md`; matches `activities-bridge` precedent. |
| Streak computation: where it runs | Computed on the client in v1. `GET /api/habits` returns raw `habit_logs.date` strings for each habit (last 30 days for the strip + streak lookback). The pure `computeStreaks(dates, today)` helper runs in the client, where "today" is known. Server never synthesises the user's "today" for either reads or writes. | H3 of `review-spec-plan-tasks.md`; consistent with the H1 "client owns today" decision applied to the read path as well as the write path. |
| Length caps | `identity` 200, `name` 50, `cue` 200, `minimum_version` 200. Enforced in form (`maxLength`) and in route handler (`return 400` above cap). | S3 of `review.md`; matches roles precedent. |
| "Mark today done" affirmation | An inline subtle affirmation under the strip for 2 seconds, showing the habit's `minimum_version` text verbatim (truncated at 80 chars with ellipsis). Fires only when toggling **today** to done, never on retroactive marking, never on toggling off. Suppressed if `minimum_version` is empty or null. No toast library is installed; the affirmation is a small fading text node, matching the calm-Notion register from `.impeccable.md`. | H1 of `review-spec-plan-tasks.md`. The codebase has no toast primitive; introducing one in this feature is out of scope and the inline pattern is closer to the design language. |
| Archive UX in list view | A collapsible "Show archived habits (N)" toggle appears at the bottom of the list view, hidden when N is 0. Each archived row has a "Restore" action via dropdown menu. | S5 of `review.md`; matches roles precedent. |
| Walkthrough color step | Folded into the review step. Walkthrough is 5 steps, not 6: identity, name, cue, minimum version, review-and-pick-color. | S6 of `review.md`. |
| `display_order` on create | Handler computes `max(displayOrder where userId = ?) + 1`. Client does not supply it. | S9 of `review.md`; matches roles precedent. |
| Drag-to-reorder library | `@dnd-kit/core` + `@dnd-kit/sortable` (new dep). `useSortable` is the textbook pattern for vertical list reorder. `weekly-plan-view.tsx` uses `@dnd-kit/core` directly with `pointerWithin` for its 2D drag-from-pool problem, which is a different use case. Native HTML5 drag in `role-list.tsx` is left as-is; a follow-up may migrate it but that work is out of scope here. | H2 of `review-spec-plan-tasks.md`. |
| Color palette source | Reuse `getRolePalette()` and `getNextRoleColor()` from `src/lib/colors.ts`. Default color on create is a warm amber from the existing palette. No new palette source. | S10 of `review.md`. |
| Empty-state copy phrasing | "Bad days matter more than good days" (matches scope.md principles list). | S8 of `review.md`. |
| Sidebar slot | "Habits" appears in the "Life Areas" nav group in `src/components/layout/app-sidebar.tsx`, after "Goals" (last position in the group). Alphabetical with the rest of that group. Icon: Lucide `Repeat`. | S5 of `review-spec-plan-tasks.md`. |
| Default CTA inversion (empty vs populated) | Empty state primary CTA is the walkthrough; smaller link is "or skip the walkthrough." Populated state primary CTA is the quick add; smaller link is "or walk me through it." This inversion is intentional: the first habit deserves a teaching surface; subsequent habits do not. | S7 of `review-spec-plan-tasks.md`. |

---

## User stories

### US-1. Create a habit (quick flow)

**As a** user who already knows what habit I want to build,
**I want to** add it without ceremony,
**so that** the act of committing takes less than a minute.

#### Acceptance scenarios

1. **Given** I am on the populated Habits page (one or more habits exist), **when** I click the "+ Add habit" button in the header, **then** a modal dialog opens with all five fields visible at once (identity, name, cue, minimum version, color), with focus on the identity input.
2. **Given** I am in the quick-add modal, **when** I leave the identity input empty and click "Create habit," **then** the dialog stays open and an inline error "Identity is required" appears under the identity input. No request is sent.
3. **Given** I am in the quick-add modal, **when** I leave the name input empty and submit, **then** the dialog stays open and an inline error "Name is required" appears under the name input.
4. **Given** I have typed a valid identity and name and an optional cue and minimum version and selected a color, **when** I click "Create habit," **then** `POST /api/habits` is called with the payload, the dialog closes on `201`, and the new habit appears at the bottom of the list with display order = max + 1.
5. **Given** the route handler receives an identity longer than 200 characters, **when** the server validates the payload, **then** it returns `400 { error: "Identity must be 200 characters or less" }` and the form surfaces the message inline.
6. **Given** I open the quick-add modal and click outside or press Escape, **when** the dialog closes, **then** any partial input is discarded and the modal opens empty the next time.

### US-2. Create a habit (walkthrough flow)

**As a** user who is new to identity-based habits,
**I want to** be guided through the framing one concept at a time,
**so that** I internalise the lens before committing the habit.

#### Acceptance scenarios

1. **Given** I am on the empty Habits page (no habits exist), **when** I click the primary CTA "Walk me through my first habit," **then** the walkthrough dialog opens at step 1 (identity).
2. **Given** I am on the populated Habits page, **when** I click the "or walk me through it" link adjacent to "+ Add habit," **then** the walkthrough dialog opens at step 1.
3. **Given** I am on a walkthrough step that has a required field (1 = identity, 2 = name), **when** I click "Next" without filling it, **then** "Next" is disabled and an inline subtitle becomes a soft red.
4. **Given** I am on a walkthrough step with an optional field (3 = cue, 4 = minimum version), **when** I click "Skip," **then** the step's value is set to empty and the walkthrough advances to the next step.
5. **Given** I am on any walkthrough step beyond step 1, **when** I click "Back," **then** the walkthrough returns to the previous step with my previously entered value still in the input.
6. **Given** I am on step 5 (review), **when** I review my entries and pick a color, **then** clicking "Create habit" submits `POST /api/habits` with the full payload. On `201`, the dialog closes and the new habit appears in the list.
7. **Given** I am on step 5, **when** I click the small "Edit" link next to any reviewed value, **then** the walkthrough jumps back to that step preserving every other answer.

### US-3. Mark a day done or un-done

**As a** user with an active habit,
**I want to** tap a cell in the 14-day strip to mark a day done or un-done,
**so that** logging is a single gesture.

#### Acceptance scenarios

1. **Given** I am on the list view and a habit has no log for today, **when** I tap the rightmost cell of its 14-day strip, **then** the cell fills with the habit's color, `POST /api/habit-logs` fires with `{habitId, date: today_iso}`, and a calm inline affirmation appears under the strip for 2 seconds displaying the habit's `minimum_version` text (if non-empty), then fades.
2. **Given** I tap today's cell when a log row for `(habitId, today)` already exists, **when** the request fires, **then** the server returns `201` with the existing row and the UI shows no error. The cell stays filled.
3. **Given** today's cell is already filled, **when** I tap it again, **then** the cell empties, `DELETE /api/habit-logs` fires with `{habitId, date: today_iso}`, and no affirmation appears.
4. **Given** I tap a past day cell (any of the leftmost 13 cells of the strip), **when** the cell was empty, **then** it fills and the server log appears. No affirmation fires (affirmation is today-only).
5. **Given** I tap a past day cell that was filled, **when** I tap it, **then** the cell empties, the server log is deleted, and any streak readouts that depended on that day are recomputed on the next fetch.
6. **Given** I have just tapped a cell, **when** the network is slow, **then** the cell renders the new state optimistically. If the request fails (HTTP error or network), the cell reverts and a small inline error appears below the strip for that habit only.
7. **Given** I hover over any cell in the 14-day strip, **when** the hover register, **then** a small tooltip shows the date in `DD-MM-YYYY` format.

### US-4. See streaks

**As a** user with active habits,
**I want to** see my current streak and my best streak,
**so that** I am encouraged without being shamed by a single miss.

#### Acceptance scenarios

1. **Given** I have a habit with logs on each of the last 7 consecutive days including today, **when** I open the Habits page, **then** the habit's streak readout shows "Current: 7d · Best: 7d".
2. **Given** I have a habit with logs on the last 7 days but no log today (and it is past midnight in my local time), **when** I open the Habits page, **then** the current streak shows the count up to and including yesterday: "Current: 7d · Best: 7d" if today's cell stays untoggled. (See edge case E1 for the precise definition of "current.")
3. **Given** I have a habit where my best streak was 23 days last month and my current streak is 4 days, **when** I open the Habits page, **then** the readout shows "Current: 4d · Best: 23d".
4. **Given** I have a habit with no logs at all, **when** I open the Habits page, **then** the readout shows "Current: 0d · Best: 0d" in muted text.
5. **Given** I retroactively un-toggle a day that was inside my current streak, **when** the next fetch lands, **then** the current streak recomputes from the persisted logs and the readout updates. Best streak is computed from the same persisted logs and may also change.

### US-5. Manage a habit (edit, archive, restore, reorder, delete)

**As a** user whose habits evolve,
**I want to** edit, archive, restore, reorder, and (rarely) hard-delete habits,
**so that** the list stays current to my real life.

#### Acceptance scenarios

1. **Given** I open the kebab menu on a habit row, **when** I click "Edit," **then** the quick-add modal opens pre-filled with the habit's current values and submitting calls `PATCH /api/habits/[id]`.
2. **Given** I am editing an existing habit, **when** the modal is open, **then** an additional "Archive" button appears in the dialog footer. Clicking it calls `PATCH /api/habits/[id]` with `{ isArchived: true }`, closes the modal, and removes the habit from the active list.
3. **Given** I have one or more archived habits, **when** I scroll to the bottom of the list view, **then** a "Show archived habits (N)" toggle appears. Clicking it reveals the archived rows below it.
4. **Given** I open the kebab menu on an archived row, **when** I click "Restore," **then** `PATCH /api/habits/[id]` fires with `{ isArchived: false }` and the habit moves back to the active list at its previous display order.
5. **Given** I drag a habit row, **when** I drop it on a new position, **then** the list re-renders in the new order optimistically, `PUT /api/habits/reorder` fires with `{ order: [...habitIds] }`, and the order is persisted. If the request fails, the list snaps back to the prior order.
6. **Given** I open the kebab menu on a habit row (active or archived), **when** I click "Delete," **then** a confirmation dialog warns "Delete this habit permanently? All check-ins will be lost. This cannot be undone." Confirming calls `DELETE /api/habits/[id]`; the habit and all its logs cascade-delete.

### US-6. Empty state teaches the framing

**As a** first-time visitor to the Habits page,
**I want to** understand the identity-based framing before I create anything,
**so that** my first habit is shaped by the framework rather than by guesswork.

#### Acceptance scenarios

1. **Given** I have zero habits, **when** I open `/habits`, **then** I see three short editorial blocks (Start with who you are becoming. / The minimum version is the real habit. / Do not miss twice.) followed by a primary CTA "Walk me through my first habit" and a smaller link "or skip the walkthrough."
2. **Given** I am on the empty state, **when** I click the skip link, **then** the quick-add modal opens.
3. **Given** I create my first habit, **when** the list re-renders, **then** the editorial blocks disappear and are replaced by the standard populated header (page title, "+ Add habit" button, "or walk me through it" link). The editorial does not return unless every habit is deleted or archived.

---

## Edge cases

### E1. Streak definition (current vs best)

`currentStreak`: the longest run of consecutive days ending on **today or yesterday**, computed in the user's local timezone. Today is included only if a log exists for today. Yesterday is included if a log exists for yesterday and today has no log (so the user does not see "Current: 0d" the moment the clock crosses midnight before they log).

`bestStreak`: the longest run of consecutive days anywhere in the habit's history.

Both are computed from the full set of `habit_logs.date` strings for the habit, deduplicated and sorted. Implementation must handle the case where two log rows exist for the same date (defensive; the unique constraint should prevent this, but the algorithm must tolerate it).

### E2. Timezone boundary

The client computes "today" using `new Date()` in the browser's local timezone, then formats as ISO `YYYY-MM-DD`. Two cases:

- A user in CET marking before midnight local time: client sends today's CET date. Server stores it. Correct.
- The same user travels to a different timezone and opens the app: "today" is now the new timezone's date. Their existing logs are still tied to the date they were created on, in whatever timezone that was. This is a known limitation; we are not tracking the source timezone of each log. Acceptable for v1 because the user base is small and travel-day misalignment is rare.

### E3. Leap day

A habit logged every day across February 29 of a leap year has a streak that includes February 29. Streak computation uses string equality on ISO dates and date arithmetic via `new Date(iso + "T00:00:00")`. No special-casing needed because date math handles leap days correctly. A unit test in the plan phase will pin this.

### E4. Daylight saving time transition

The local-time computation of "today" may produce the same calendar date for 25 hours on the DST-fall-back day and 23 hours on the DST-spring-forward day. Habit logs are date-only (no time component), so DST has no effect on the data model. No special-casing.

### E5. Retroactive marking after a long gap

A user with a 30-day-old habit and no logs taps a cell 5 days ago. The log row is created. The next fetch recomputes streaks: `currentStreak = 0` (no consecutive run touching today or yesterday), `bestStreak = 1`. No error or warning is shown; this is normal behavior.

### E6. Optimistic update failure modes

If a `POST /api/habit-logs` returns a 5xx or fails to network, the optimistic cell-fill reverts and a small inline error "Could not save. Tap to retry." appears below the strip for the affected habit. The error clears on the next successful interaction or on a fresh page load.

### E7. Two habits with identical identity

The data model does not enforce identity uniqueness per user. A user may create two habits with the same identity statement (intentional or accidental). The list view renders both. No warning. This is a deliberate non-constraint; uniqueness is for the user to decide.

### E8. Archive then create same name

The data model does not enforce uniqueness on `name` either. A user may archive "Meditate" and create a new "Meditate." Both will exist. Deliberate non-constraint.

### E9. The 14-day strip when the habit is younger than 14 days

The strip always shows 14 cells. Cells for dates before the habit's `created_at` render as visually disabled (lower opacity, no hover tooltip, no tap target). This keeps the strip visually aligned across all habits in the list.

---

## Key entities

### `habits`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PK, auto-increment | |
| `user_id` | TEXT | NOT NULL, FK to `users.id` | Auth scope per constitution. |
| `identity` | TEXT | NOT NULL, max 200 chars | "I am the type of person who..." |
| `name` | TEXT | NOT NULL, max 50 chars | Short label. |
| `cue` | TEXT | nullable, max 200 chars | "After I..." |
| `minimum_version` | TEXT | nullable, max 200 chars | "60 seconds counts" |
| `color` | TEXT | NOT NULL | Hex string, validated server-side using `isValidHexColor`. |
| `display_order` | INTEGER | NOT NULL, default 0 | Server-managed. Client does not supply on POST. |
| `is_archived` | INTEGER | NOT NULL, default 0 | 0 = active, 1 = archived. |
| `created_at` | TEXT | NOT NULL, ISO 8601 datetime | |
| `updated_at` | TEXT | NOT NULL, ISO 8601 datetime | |

### `habit_logs`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PK, auto-increment | |
| `user_id` | TEXT | NOT NULL, FK to `users.id` | |
| `habit_id` | INTEGER | NOT NULL, FK to `habits.id`, ON DELETE CASCADE | |
| `date` | TEXT | NOT NULL, ISO `YYYY-MM-DD` | Presence means "done." |
| `created_at` | TEXT | NOT NULL, ISO 8601 datetime | |

Unique index on `(habit_id, date)` enforces "at most one log per habit per day" at the DB level.

### Migration entries (`apply-schema.js`)

1. `CREATE TABLE IF NOT EXISTS habits (...)` with the columns above.
2. `CREATE TABLE IF NOT EXISTS habit_logs (...)` with the columns above.
3. `CREATE UNIQUE INDEX IF NOT EXISTS habit_logs_habit_date_unique ON habit_logs (habit_id, date)`.

No `ALTER TABLE` statements; this feature adds tables only.

---

## Functional requirements

### Schema and migration

- **FR-001**: A new `habits` table MUST be created with the columns and constraints defined above. The CREATE statement is idempotent (`IF NOT EXISTS`).
- **FR-002**: A new `habit_logs` table MUST be created with the columns and constraints defined above, including the foreign key cascade on `habit_id`.
- **FR-003**: A unique index on `habit_logs (habit_id, date)` MUST be created. Idempotent (`IF NOT EXISTS`).
- **FR-004**: The Drizzle schema in `src/db/schema.ts` MUST mirror both tables. TypeScript types for `Habit` and `HabitLog` are exported from `src/types/index.ts`.

### API

- **FR-005**: `GET /api/habits` returns active habits (where `is_archived = 0`) for the authenticated user, ordered by `display_order` ascending. The response shape is:
  ```ts
  Array<{
    id, userId, identity, name, cue, minimum_version, color,
    displayOrder, isArchived, createdAt, updatedAt,
    recentLogDates: string[]  // ISO YYYY-MM-DD, deduplicated, sorted ascending, capped at the last 30 days
  }>
  ```
  The server returns raw log dates only. It does not compute `currentStreak`, `bestStreak`, or any "today"-anchored array. The client owns "today" (see decisions table H1 and H3) and computes the 14-day strip and the streaks locally using the pure `computeStreaks(dates, today)` helper. The 30-day cap on `recentLogDates` is sufficient for the 14-day strip and for any current-streak that touches today or yesterday; longer best-streak computations use the same window in v1 (revisit if real usage breaks the bound).
- **FR-006**: `GET /api/habits?archived=true` returns archived habits for the authenticated user, same shape as FR-005. `recentLogDates` is still returned so the client can display historical streak readouts on archived rows if desired.
- **FR-007**: `POST /api/habits` creates a habit. Request body: `{ identity, name, cue?, minimum_version?, color }`. Server-side validation:
  - `identity`: required, trimmed length 1-200.
  - `name`: required, trimmed length 1-50.
  - `cue`, `minimum_version`: optional, trimmed, ≤ 200 chars each. Empty strings are stored as `NULL`.
  - `color`: required, must pass `isValidHexColor`.
  - `display_order` is computed server-side as `max(display_order) + 1` for that user; client-supplied values are ignored.
  - Returns `201` with the persisted row.
- **FR-008**: `PATCH /api/habits/[id]` updates a habit. Accepts any subset of `identity, name, cue, minimum_version, color, isArchived, displayOrder`. Same per-field validation as POST. Returns `200` with the updated row. Returns `404` if the habit does not exist for the authenticated user.
- **FR-009**: `DELETE /api/habits/[id]` hard-deletes the habit. The foreign-key cascade removes all `habit_logs` rows. Returns `204`. Returns `404` if the habit does not exist for the authenticated user.
- **FR-010**: `PUT /api/habits/reorder` accepts `{ order: number[] }` and updates `display_order` for each habit in the array (0-indexed). Returns `204`. Validates that every habit id belongs to the authenticated user and is non-archived; otherwise returns `400`.
- **FR-011**: `POST /api/habit-logs` creates a log row. Request body: `{ habitId, date }`. Server-side validation:
  - `habitId`: required, must belong to the authenticated user.
  - `date`: required, must match `^\d{4}-\d{2}-\d{2}$` and be a valid calendar date.
  - On insert collision with the unique index, the server fetches and returns the existing row.
  - Always returns `201` with the persisted row. (Per the idempotency decision in the decisions table: no `200` vs `201` branching.)
- **FR-012**: `DELETE /api/habit-logs` removes a log row. Request body: `{ habitId, date }`. Always returns `204`, even if no row matched. (Per the idempotency decision in the decisions table.)
- **FR-013**: Every route handler MUST scope queries to `WHERE user_id = session.user.id`, called via `auth()` from `@/lib/auth`. A request without a valid session returns `401`.

### Streak computation

- **FR-014**: A pure helper `computeStreaks(dates: string[], today: string): { current: number, best: number }` lives in `src/lib/habit-streaks.ts`. Input: deduplicated ISO date strings (any order) and the client's "today" as ISO. Output: current streak per E1, best streak per E1. The helper is environment-agnostic and is consumed in the client; the server does not call it.
- **FR-015**: `current` is the length of the longest run of consecutive days ending on the supplied `today` or the day before. If the most recent log is older than yesterday, `current = 0`.
- **FR-016**: `best` is the length of the longest run anywhere in the input.
- **FR-017**: `computeStreaks` is unit-tested with fixtures covering: zero logs, single log today, single log a week ago, perfect 30-day run, single miss in the middle, single miss yesterday, leap-day spanning streak, retroactive log filling a gap.

### Date format (display vs storage)

- **FR-018**: All `date` values written to or read from the database use ISO `YYYY-MM-DD`. All `created_at` / `updated_at` columns use the existing `datetime('now')` convention from `apply-schema.js` (`YYYY-MM-DD HH:MM:SS` in UTC, no offset). This is the codebase-wide convention; the habit-tracking feature does not introduce a new timestamp format. API request and response bodies use the same convention. Internal date arithmetic uses ISO.
- **FR-019**: All user-facing date displays in the Habits feature render in `DD-MM-YYYY` format. A new helper `formatDateForDisplay(iso: string): string` in `src/lib/dates.ts` (or extends the existing `dates.ts` module) handles the conversion. Locations using this helper in v1:
  - 14-day strip tooltips.
  - Future habit detail view (deferred).
  - Streak fixtures in dev tools (if any).
- **FR-020**: The app-wide sweep of existing ISO display sites (Activities, Goals progress views, Body metrics, etc.) is **out of scope for this feature**. A separate "date-display-sweep" feature is tracked in `feature requests/` and will be scoped after habit-tracking ships.

### UI (Habits page)

- **FR-021**: A new top-level nav entry "Habits" appears in the sidebar in the "Life Areas" group of `src/components/layout/app-sidebar.tsx`, immediately after "Goals" (last position in the group, preserving the group's existing alphabetical order). Lucide icon `Repeat`. Route: `/habits`.
- **FR-022**: The Habits page header shows the page title "Habits" in Fraunces and, in the populated state, a primary "+ Add habit" button and a smaller "or walk me through it" link. The populated-state default CTA is the quick-add flow; the walkthrough is the secondary path. (See FR-023a for the rationale on the empty-vs-populated CTA inversion.)
- **FR-023**: In the empty state (no active or archived habits), the header is replaced by the three editorial blocks defined in `scope.md` (lines 175-184) and a primary CTA "Walk me through my first habit" plus a smaller "or skip the walkthrough" link. The empty-state default CTA is the walkthrough; the quick add is the secondary path.
- **FR-023a**: The default-CTA inversion between empty and populated states is intentional: the first habit deserves a teaching surface, so the walkthrough is primary on the empty state; subsequent habits do not need the framing, so the quick add is primary on the populated state. Implementers must preserve this inversion; a future maintainer reading the code without the spec would otherwise assume it is a bug.
- **FR-024**: Each habit row in the list renders:
  - A color dot on the left, 16px circle, filled with `habit.color`.
  - The identity statement as the primary heading: Fraunces, around 18-20px (final size locked in plan), comfortable line height. Truncated with ellipsis at the available column width.
  - The habit name as a subtitle below: Plus Jakarta Sans, smaller, muted color.
  - The 14-day strip to the right of the text: 14 cells in a row, each cell ~24x24px, gap-1, leftmost = 13 days ago, rightmost = today (where "today" is the client's local-time ISO date).
  - The streak readout to the far right: "Current: Xd · Best: Yd" in Plus Jakarta Sans, small.
- **FR-025**: Cells in the 14-day strip use the habit's color when logged, and a calm warm-neutral background when not logged. Cells for dates before `habit.created_at` use a lower opacity and have no hover state or click handler.
- **FR-026**: Tapping a cell toggles the log. The visual change is optimistic; the API request fires asynchronously. On failure (network or 5xx), the cell reverts and a small inline error "Could not save. Tap to retry." renders below the strip for the affected habit.
- **FR-026a**: While a habit-log request is in flight for a given cell, that specific cell is disabled (no further taps registered for the cell, no visual flicker) until the request resolves or fails. This prevents the user from queueing two opposing requests with a rapid double-tap and ending up with the server state out of sync with the optimistic UI. The disable applies per-cell, not per-row or per-habit; other cells in the same strip remain interactive.
- **FR-027**: Tapping the rightmost (today) cell to mark it done triggers a calm inline affirmation under the strip for 2 seconds, containing the habit's `minimum_version` text verbatim, truncated at 80 characters with an ellipsis. The affirmation is a small fading text node (no toast library, no notification primitive). It is suppressed if `minimum_version` is empty or null. No affirmation on retroactive marking; no affirmation on toggling off. The visual register is calm-Notion: muted color, opacity fade, no slide-in.
- **FR-028**: Drag-to-reorder uses `@dnd-kit/core` plus `@dnd-kit/sortable` (a new dependency added in Phase 3). `useSortable` is the textbook pattern for vertical list reorder. On drop, the list re-renders optimistically and `PUT /api/habits/reorder` fires. On failure, the order reverts. Keyboard accessibility (Space to grab, arrows to move, Space to drop) comes free with the sortable keyboard sensor and must be verified.
- **FR-029**: Archived habits live under a collapsible "Show archived habits (N)" toggle at the bottom of the page. The toggle hides itself entirely when N is 0. Each archived row's kebab menu has "Restore" and "Delete" actions. Reordering archived habits is not supported in v1.

### Forms (quick add, walkthrough, edit)

- **FR-030**: The quick-add modal renders all five fields at once: identity (Textarea, 2 rows, `maxLength={200}`), name (Input, `maxLength={50}`), cue (Input, `maxLength={200}`), minimum version (Input, `maxLength={200}`), color picker (matches `RoleForm` palette swatches). Footer: "Cancel" + "Create habit."
- **FR-031**: The walkthrough modal renders one step at a time with footer "Back" + "Skip" (where applicable) + "Next" or "Create habit" (on the final step). Step list per the locked decision in S6: 1 = identity, 2 = name, 3 = cue (skippable), 4 = minimum version (skippable), 5 = review and pick color. The review step shows every previously entered value with a small "Edit" link returning to that step.
- **FR-032**: The edit modal reuses the quick-add component pre-filled with the habit's current values. The dialog title is "Edit habit." A secondary "Archive" button appears in the footer alongside "Cancel" and "Save changes." Archive sets `isArchived: true` via PATCH and closes the modal.
- **FR-033**: All form subtitles use the editorial copy in `scope.md:151-154`. The subtitles are the second of two locations where the framework principles appear (the first being the empty-state copy). No third location is added in v1.

### Editorial voice

- **FR-034**: All user-facing copy in the Habits feature follows the editorial voice rules in `scope.md:186-191`:
  - No reference to source author, book title, or framework name.
  - Tone: calm, declarative, second person.
  - No imperatives framed as advice.
  - No em dashes; use colons or commas.
  - Sentence case headings.
  - No superlatives, no cheerleading, no wrap-up advice paragraphs.

### Auth and validation summary

- **FR-035**: Every habit route and every habit-log route calls `auth()` and rejects with `401` if no session. Every query includes `WHERE user_id = session.user.id`. Cross-user reads or writes return `404` (not `403`) so the existence of another user's habit is not leaked.
- **FR-036**: All length cap violations and color format failures return `400` with a specific, user-facing error string. The form surfaces these strings inline under the relevant input.

---

## Success criteria

### Functional

- **SC-001**: A new user with zero habits visits `/habits`, walks through the walkthrough, creates "I am the type of person who meditates daily / Meditate / After morning coffee / 60 seconds counts / warm amber," and the new habit appears in the list with `currentStreak = 0`, `bestStreak = 0` (both computed in the client from an empty `recentLogDates`).
- **SC-002**: The same user taps today's cell on the new habit. The cell fills with the habit's color, an inline affirmation appears under the strip reading "60 seconds counts" for 2 seconds before fading, and the next computed streak (after `POST /api/habit-logs` succeeds and the client re-runs `computeStreaks`) is `currentStreak = 1`, `bestStreak = 1`.
- **SC-003**: The user taps today's cell again. The cell empties, no affirmation appears, and the next computed streak is `currentStreak = 0`, `bestStreak = 0`.
- **SC-004**: The user creates seven logs across seven consecutive days and confirms the streak readout shows "Current: 7d · Best: 7d."
- **SC-005**: The user retroactively un-logs the middle day of that run. The next client-side recomputation returns `currentStreak = 3` (today minus the run after the gap) and `bestStreak = 3` (the longer of the two new sub-runs).
- **SC-006**: A direct `POST /api/habit-logs` with a date that already has a row returns `201` with the existing row and does not produce a unique-constraint error in the server logs.
- **SC-007**: A direct `DELETE /api/habit-logs` with a non-existent `(habit_id, date)` returns `204`.
- **SC-008**: A direct `POST /api/habits` with `identity` of length 250 returns `400 { error: "Identity must be 200 characters or less" }`.
- **SC-009**: A direct `POST /api/habits` with `color = "not-a-color"` returns `400 { error: "Invalid color format" }`.
- **SC-010**: The user archives a habit, refreshes the page, scrolls to the bottom, clicks "Show archived habits (1)," sees the archived row with a "Restore" action, clicks "Restore," and the habit returns to the active list at the end (its previous `display_order` is preserved).
- **SC-011**: The user drags habit B above habit A. The order persists across a hard refresh. Keyboard reorder (Tab to a row, Space to grab, Arrow keys to move, Space to drop) produces the same result.
- **SC-012**: The user hard-deletes a habit with 30 log rows. After confirmation, `DELETE /api/habits/[id]` returns `204` and a follow-up `SELECT count(*) FROM habit_logs WHERE habit_id = ?` returns 0.
- **SC-012a**: The user double-taps today's cell rapidly (two taps within 200ms). Only one request fires: the second tap is rejected at the UI layer because the cell is disabled until the first request resolves. The final state of the cell matches the user's last intended action (one tap = filled; the second tap is ignored because the cell is disabled mid-flight).
- **SC-012b**: The empty state at `/habits` shows the walkthrough as the primary CTA and "or skip the walkthrough" as the secondary link. The populated state at `/habits` shows the quick add as the primary CTA and "or walk me through it" as the secondary link. The inversion is correct and consistent.

### Date format and display

- **SC-013**: The 14-day strip tooltip on any cell shows the date in `DD-MM-YYYY` format (for example, `15-05-2026`).
- **SC-014**: A `SELECT date FROM habit_logs LIMIT 1` returns an ISO `YYYY-MM-DD` string. No DB row contains a `DD-MM-YYYY` value.

### Authorisation

- **SC-015**: User A's session calling `GET /api/habits/[id]` with user B's habit id returns `404`, not `403`, and the response body does not reveal whether the id exists.

### Performance and correctness

- **SC-016**: `computeStreaks` returns correct results for the leap-day fixture (run spanning February 29 of a leap year).
- **SC-017**: `GET /api/habits` for a user with 20 habits and ~200 logs per habit (4,000 total rows total, ~30 rows per habit returned via the 30-day cap on `recentLogDates`) returns in under 200ms locally. Client-side `computeStreaks` for the same payload completes synchronously without dropping a frame.

---

## Out of scope, restated

- App-wide sweep of date display from ISO to `DD-MM-YYYY` in non-Habit surfaces. Tracked as a separate feature.
- Migration tool from tally-style goals to habits.
- Streak rules other than strict-consecutive. "Never miss twice" is parked for v2.
- Habit detail page with longer history (90 days, charts).
- Reminders, notifications, calendar integration, quadrant assignment, role linkage, goal linkage.
- Citation or attribution of the source framework in product copy.
- Dedicated "principles" or "about" page for the framework.
- Habit categories or tags.
- Migration of `role-list.tsx` from native HTML5 drag to `@dnd-kit`.

---

## Notes for the implementer

- Reuse, don't recreate: `getRolePalette()` and `getNextRoleColor()` from `src/lib/colors.ts`, `isValidHexColor` from the same file, `formatDateForDisplay` (new) lives next to existing date helpers in `src/lib/dates.ts`.
- The server's `recentLogDates` query can use either a SQL `WHERE date >= date('now', '-30 days')` filter or an in-memory slice after fetching all logs per habit. SQL is simpler for the expected scale.
- The 14-day strip dates and the streak counts are computed in the client. The client takes "today" from `new Date()` in the browser's local timezone, formats it as ISO `YYYY-MM-DD`, and passes it to both the strip-building loop and `computeStreaks(recentLogDates, today)`. The server never decides what "today" is.
- The walkthrough multi-step dialog can be a single shadcn `Dialog` component with internal `useState<{ step: number, values: HabitDraft }>` rather than route-based or stack-based navigation. Keep it self-contained.
- The empty-state editorial blocks render as three sibling `<section>` elements with generous vertical spacing. No card wrappers (per `.impeccable.md`: "DON'T: Wrap everything in cards").
- The streak readout uses the JetBrains Mono font for the number portions only (for example, "Current: 7d · Best: 23d" where the digits are mono and the rest is Plus Jakarta Sans). This matches the `.impeccable.md` rule: monospace "only where precision matters."
- The inline affirmation under the strip is a small `<p>` or `<span>` rendered conditionally based on a short-lived state, with a CSS opacity transition. No portal, no fixed positioning, no z-index gymnastics. Two seconds is the entire lifecycle.
