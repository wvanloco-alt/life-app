# Plan: Habit tracking

**Feature ID:** `habit-tracking`
**Status:** Plan. Spec locked 2026-05-15. Plan drafted 2026-05-15.
**Depends on:** PR #15 (`goal-progress-sessions-fix`) and PR #16 (`role-scheduling-rules-removal`) merging to master. No code in this feature lands until both ship.
**Last updated:** 2026-05-15

---

## 1. Strategy

This is the largest feature in flight: two new tables, eight new endpoints, a new top-level page with two creation flows, drag-to-reorder, streak math, and editorial copy that must hold the calm-Notion-like house voice. Shipping it as one PR is reviewable but heavy. Shipping it as a stream of micro-PRs scatters the design intent.

**Decision: four phased PRs, each independently shippable to master.** This mirrors `activities-refactoring` (which shipped as PRs #4 through #9) and respects the constitutional rule of "one feature at a time" by keeping each phase as a focused increment, not a sub-feature.

| Phase | What ships | User-visible after merge |
|---|---|---|
| Phase 1 | Schema, types, pure helpers, API surface, server-side tests. No UI. | Nothing yet. CI proves the foundation is sound. |
| Phase 2 | List view, create flows (quick + walkthrough), 14-day strip toggle, inline affirmation, streak display. | A user can navigate to `/habits`, create a habit, log days, see streaks. This is the first useful PR. |
| Phase 3 | Edit, archive, restore, reorder, hard delete. | A user can manage the lifecycle of any habit. |
| Phase 4 | Empty-state editorial polish, master-docs sync, manual smoke checklist. | Empty state teaches the framing; specs/master is current; feature is documented complete. |

Each phase has its own branch off master, its own PR, and its own verification gates. The next phase rebases onto master after the previous phase merges, so the branches stay short-lived and the diffs stay focused.

Total expected commit count across all four PRs: ~25 to 30 small commits. Total expected lines changed: ~2,500 to 3,500.

---

## 2. Verification gates

Every phase passes all four gates before opening its PR.

| Gate | Command | Pass criterion |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | Exit 0, no errors. |
| Tests | `npx vitest run` | All tests pass. Phase-specific new tests are present (see section 4 per phase). |
| Lint (per-file) | `npx eslint <each file touched in this phase>` | No **new** issues introduced compared to master. Pre-existing issues in unrelated files are not gating. |
| Migration idempotency | `node apply-schema.js` run twice on a fresh DB | First run logs `OK` for new tables and index. Second run logs `SKIP` or `OK` (whatever the existing `CREATE TABLE IF NOT EXISTS` pattern produces). No errors either run. |

For Phase 2 onward, also verify:

- The browser dev tools console shows zero warnings on `/habits` for an empty state and for a populated state with at least one habit.
- The Network tab shows the expected request count for a "tap to toggle" interaction: one request per cell tap, optimistic UI updates before response.

---

## 3. Branching strategy

```
master
 └── feat/habit-tracking-foundation        (Phase 1, ~7 to 10 commits, ~700 to 900 LoC)
      └── feat/habit-tracking-list-create  (Phase 2, ~8 to 10 commits, ~900 to 1100 LoC)
           └── feat/habit-tracking-manage  (Phase 3, ~5 to 7 commits, ~500 to 700 LoC)
                └── feat/habit-tracking-polish (Phase 4, ~3 to 4 commits, ~150 to 250 LoC)
```

Each phase branch is opened off the previous phase's branch (stacked). When Phase N merges, Phase N+1 rebases onto master, opens its PR, and the cycle continues.

The `feature requests/habit-tracking/` directory (scope, spec, plan, tasks) is committed in Phase 1's first commit, matching the precedent set by `activities-refactoring` and `role-scheduling-rules-removal`. `review.md` is not committed (working artifact).

---

## 4. Implementation steps per phase

### Phase 1: Foundation (schema, types, helpers, API)

**Goal:** stand up the data layer and API surface, no UI. After this phase, a curl client can exercise the full CRUD lifecycle.

#### 4.1.1 Migration (`apply-schema.js`)

Add three `CREATE` statements to the `createStatements` array, near the existing `roles` block:

```js
`CREATE TABLE IF NOT EXISTS habits (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id TEXT NOT NULL DEFAULT '',
  identity TEXT NOT NULL,
  name TEXT NOT NULL,
  cue TEXT,
  minimum_version TEXT,
  color TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)`,

`CREATE TABLE IF NOT EXISTS habit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id TEXT NOT NULL DEFAULT '',
  habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`,

`CREATE UNIQUE INDEX IF NOT EXISTS habit_logs_habit_date_unique ON habit_logs (habit_id, date)`,
```

No `ALTER TABLE` statements; this is a tables-only addition. Idempotent by `IF NOT EXISTS`.

#### 4.1.2 Drizzle schema (`src/db/schema.ts`)

Add two new table definitions matching the SQL above. Use the existing helpers (`sqliteTable`, `integer({ mode: "boolean" })`, `timestamp()`, `updatedAt()`).

#### 4.1.3 TypeScript types (`src/types/index.ts`)

Export `Habit` and `HabitLog` interfaces. Add `HabitWithRecentLogs` for the GET response shape (`Habit & { recentLogDates: string[] }`). Add `HabitDraft` for the create-form payload (`{ identity, name, cue, minimum_version, color }`). The client derives `currentStreak`, `bestStreak`, and the strip's `last14Days` view-model from `recentLogDates` plus the client's `today` (Phase 2 section 4.2.3); no server-side derived shape exists.

#### 4.1.4 Date display helper (`src/lib/dates.ts`)

Add a single function:

```ts
export function formatDateForDisplay(iso: string): string {
  // iso is expected as YYYY-MM-DD or full ISO 8601 datetime
  const datePart = iso.slice(0, 10);
  const [y, m, d] = datePart.split("-");
  return `${d}-${m}-${y}`;
}
```

Defensive: if input is malformed, return the input unchanged. Unit-tested.

#### 4.1.5 Streak helper (`src/lib/habit-streaks.ts`, new file)

Pure function `computeStreaks(dates: string[], today: string): { current: number, best: number }`. Signature accepts the deduplicated set of ISO dates from `habit_logs` and the client-supplied "today" as ISO. Implementation:

1. Normalise to a `Set<string>` for O(1) lookups.
2. Sort uniquely into an array.
3. For `best`: walk the sorted array, count the longest run where consecutive elements differ by exactly one day.
4. For `current`: start from `today`. If today is in the set, walk backward counting days. If today is not in the set, check yesterday: if yesterday is in the set, walk backward from yesterday. Else current = 0.

Day-difference computation uses `new Date(iso + "T00:00:00").getTime()` arithmetic divided by `86400000`. Pin in tests to verify leap-day and DST safety.

#### 4.1.6 API routes

Create the following files (all under `src/app/api/`):

- `habits/route.ts`: `GET` (active list), `POST` (create).
- `habits/[id]/route.ts`: `PATCH` (update + archive), `DELETE` (hard delete).
- `habits/reorder/route.ts`: `PUT` (reorder).
- `habit-logs/route.ts`: `POST` (log a day), `DELETE` (un-log a day).

Each handler:

1. Calls `auth()`, returns `401` if no session.
2. Scopes every query by `WHERE user_id = session.user.id`.
3. Returns `404` for cross-user reads or writes (not `403`).
4. Validates lengths and color format on POST and PATCH, returns `400` with a specific message on failure.
5. Returns the persisted row on `POST` (`201`) and `PATCH` (`200`). Returns `204` on `DELETE` and on `PUT /reorder`.

For `GET /api/habits`, the server returns `recentLogDates: string[]` per habit: deduplicated ISO `YYYY-MM-DD` strings from `habit_logs`, sorted ascending, capped at the last 30 days. The server does **not** compute `currentStreak`, `bestStreak`, or any "today"-anchored array. The client owns "today" (per spec FR-005 and the H3 decision in the decisions table) and runs the pure `computeStreaks(recentLogDates, today)` helper locally, where `today` is `new Date().toLocaleDateString("sv-SE")` (or any equivalent ISO format from the browser's local time).

SQL pattern for the recent-logs query: `SELECT date FROM habit_logs WHERE habit_id = ? AND date >= date('now', '-30 days') ORDER BY date ASC`. Or fetch all and slice in-process. Either works at v1 scale.

For `POST /api/habit-logs`, the unique constraint may throw a SQLite `UNIQUE constraint failed` error. Catch it, fetch the existing row, return it with `201` (per spec FR-011: idempotent).

For `DELETE /api/habit-logs`, do a plain `db.delete(habitLogs).where(...)`. Drizzle returns the count of affected rows; ignore it and always return `204`.

For `PUT /api/habits/reorder`, transactional: validate every id, then update each row's `display_order` in the order they appear in the array. If any id is foreign or archived, return `400` and roll back.

#### 4.1.7 Server-side tests (`src/lib/__tests__/`)

- `habit-streaks.test.ts`: covers FR-014 to FR-017. Fixtures:
  - Empty array → `{ current: 0, best: 0 }`.
  - One log = today → `{ current: 1, best: 1 }`.
  - One log = yesterday → `{ current: 1, best: 1 }` (yesterday-only rule).
  - One log = 7 days ago → `{ current: 0, best: 1 }`.
  - 30-day perfect run ending today → `{ current: 30, best: 30 }`.
  - 30-day run that ended a week ago → `{ current: 0, best: 30 }`.
  - 7-day run, 1 miss, 7-day run, all in the past → `{ current: 0, best: 7 }`.
  - Leap-day spanning run (Feb 27, 28, 29, Mar 1, Mar 2 of a leap year) → `{ current: 0, best: 5 }`.
  - Retroactive fill (logs on day 1, 3, 4, then a later log on day 2) → recompute returns `{ best: 4 }` and `current` per today's position.
- `formatDateForDisplay.test.ts` (or inside an existing `dates.test.ts`): covers FR-019. Fixtures:
  - `"2026-05-15"` → `"15-05-2026"`.
  - `"2026-12-31T23:59:00+02:00"` → `"31-12-2026"` (trims to date part).
  - Malformed input `"not-a-date"` → returns `"not-a-date"` unchanged.

No route-handler tests in this codebase yet (precedent: route logic is exercised by manual smoke). Phase 1 does not establish that precedent; the pure helpers are the unit-test boundary.

#### 4.1.8 Verification before opening Phase 1 PR

- `npx tsc --noEmit`: clean.
- `npx vitest run`: all tests pass, includes the two new test files.
- Per-file lint on every touched file: no new issues.
- `node apply-schema.js` twice on a fresh DB: both runs OK, no errors. `PRAGMA table_info(habits)` returns the expected 11 columns; `PRAGMA table_info(habit_logs)` returns the expected 5 columns; `PRAGMA index_list(habit_logs)` includes `habit_logs_habit_date_unique`.
- Curl smoke: `POST /api/habits` with a valid payload returns 201 with the row. `GET /api/habits` returns the row with `recentLogDates: []`. `POST /api/habit-logs` with today's date returns 201. A second identical POST returns 201 again with the same row id (idempotency). `GET /api/habits` now shows `recentLogDates: ["<today>"]`. `DELETE /api/habit-logs` with the same body returns 204 and the next `GET` returns `recentLogDates: []` again.

### Phase 2: List view, create flows, log toggle

**Goal:** wire the API into a usable page. After this phase, the full happy path works.

#### 4.2.1 Nav entry (`src/components/layout/app-sidebar.tsx`)

Add a new entry "Habits" to the `NAV_GROUPS` array, specifically in the "Life Areas" group, after "Goals" (last position; preserves the group's existing alphabetical order: Activities, Budget, Goals, Habits). Lucide `Repeat` icon. Routes to `/habits`. Per spec FR-021.

#### 4.2.2 Page route (`src/app/habits/page.tsx`)

New Next.js route. Server component that fetches the active and archived habits in the same render pass (Drizzle or `fetch("/api/habits")` + `fetch("/api/habits?archived=true")`); match the precedent used by `src/app/goals/page.tsx` and `src/app/roles/page.tsx`.

The server-rendered payload includes `recentLogDates` per habit (per the revised FR-005). Streak math and 14-day strip construction happen client-side in `HabitList` (Phase 2 section 4.2.3) using the client's own "today" from `new Date()` formatted as ISO.

#### 4.2.3 List view (`src/components/habits/habit-list.tsx`)

Client component. Owns the optimistic state for cell toggles. Reads initial state from props (server-rendered). Renders:

- A header section with title "Habits" in Fraunces and, when habits exist, a primary "+ Add habit" button + smaller "or walk me through it" link.
- A vertical stack of `HabitRow` components, one per habit, in `displayOrder`.
- A bottom section: "Show archived habits (N)" collapsible toggle, hidden when N is 0. (Wired in Phase 3, but the slot exists in Phase 2; show a placeholder if needed.)

#### 4.2.4 Habit row (`src/components/habits/habit-row.tsx`)

Renders a single habit:

- Color dot (16px circle, `bg-[color]`).
- Identity statement (`font-display`, Fraunces, ~18-20px). Subtitle is the habit name in Plus Jakarta Sans, muted.
- 14-day strip (`<HabitStrip />`).
- Streak readout: "Current: Xd · Best: Yd" with the digits in JetBrains Mono (`font-mono`) and the rest in Plus Jakarta Sans.

#### 4.2.5 14-day strip (`src/components/habits/habit-strip.tsx`)

Receives `recentLogDates: string[]`, `habitColor`, `habitCreatedAt`, and a `today: string` (ISO) from props (parent computes `today` once per render). Internally builds a 14-element array of ISO dates `[today - 13, today - 12, ..., today]`. For each cell:

- Renders disabled (opacity ~0.3, no hover, no click handler) if the cell's date is before `habitCreatedAt`.
- Otherwise renders filled (`bg-[habitColor]`) when the cell's date is present in `recentLogDates`, calm warm-neutral when not.
- Click handler fires the optimistic toggle.
- Hover renders a tooltip with the date in `DD-MM-YYYY` format via the `formatDateForDisplay` helper.

Use `<button>` for each cell (a11y); style with Tailwind.

#### 4.2.6 Toggle logic and inline affirmation

In the parent `HabitList` (or a custom hook `useHabitToggle`):

1. Pre-flight: compute the optimistic next state (filled to empty or vice versa).
2. Mark the specific cell as "in flight" (per spec FR-026a). The cell is disabled for further taps until the request resolves.
3. Fire the request: `POST /api/habit-logs` for fill, `DELETE /api/habit-logs` for empty.
4. On success: clear the in-flight flag. The optimistic state was correct.
5. On failure (HTTP error or network): revert the cell, clear the in-flight flag, render the inline "Could not save. Tap to retry." error below the strip for the affected habit only.

For the inline affirmation (spec FR-027):

- Trigger condition: the cell being tapped is **today** AND the action is **fill** (not un-fill).
- Content: the habit's `minimum_version` text verbatim, sliced to 80 chars plus an ellipsis if longer.
- Suppress if `minimum_version` is null or empty.
- No toast library. The affirmation is a small `<p>` (or `<span>`) rendered conditionally below the strip on a 2-second timer, with a CSS opacity transition from 1 to 0 over the last ~300ms. Use the muted text color from the design system; no card, no border, no shadow. The visual register is calm-Notion.
- Component lives in `src/components/habits/habit-strip.tsx` next to the inline-error slot, so the same vertical reserved space serves both states (affirmation on success-today-fill, error on failure).

The per-cell in-flight flag (point 2 above) implements spec FR-026a. Pattern: a `Set<string>` of "in-flight cell keys" formatted as `${habitId}:${date}`, kept in `useState` on `HabitList`. The strip reads from this set to decide whether to render a cell as disabled.

#### 4.2.7 Create flows (`src/components/habits/habit-form.tsx`)

A single component that supports two modes via a `mode: "quick" | "walkthrough"` prop.

- **Quick mode**: renders all five fields at once in a single `Dialog`.
- **Walkthrough mode**: renders one field per step (steps 1-5 per spec FR-031); manages an internal `useState<{ step: 1 | 2 | 3 | 4 | 5, draft: HabitDraft }>`. Footer "Back" / "Skip" (where applicable) / "Next" / "Create habit" (only on step 5).

Both modes call the same submit handler that fires `POST /api/habits`.

The color picker is the same component used by `RoleForm` (swatches from `getRolePalette()`). Default selection is the first warm amber in the palette.

Subtitles under each input use the editorial copy in `scope.md:151-154`. No new copy is invented; the spec locked it.

#### 4.2.8 Empty-state placeholder

In Phase 2, the empty state renders **only** the primary CTA "Walk me through my first habit" and the smaller "or skip the walkthrough" link. The three editorial blocks are deferred to Phase 4 (polish) so the layout decisions for them can be locked separately from the functional flow.

#### 4.2.9 Tests added in Phase 2 (required)

The walkthrough state machine is a 5-step flow with Skip on steps 3 and 4, a review step that jumps backward without losing answers, and at least 12 distinct interaction paths. Risk row #3 below flags Back-from-step-5 as a Medium-probability, Medium-impact bug class. Walking the state machine in unit tests is cheap insurance, so Phase 2 includes the test file as a required deliverable, not an optional one.

The test file is `src/components/habits/__tests__/habit-form.test.tsx`, modelled on `src/components/roles/__tests__/role-form.test.tsx`. Required cases:

1. Quick mode renders all five fields.
2. Walkthrough mode starts at step 1 and advances on Next.
3. Required fields (identity on step 1, name on step 2) disable Next when empty.
4. Optional fields (cue on step 3, minimum version on step 4) enable Skip; Skip advances to the next step with the field set to empty.
5. Back from step 5 (review) returns to step 4 with the previously entered value still in the input.
6. Edit link from step 5's review row jumps back to that step preserving every other answer.

#### 4.2.10 Verification before opening Phase 2 PR

All gates from section 2, plus:

- Manual: navigate to `/habits`, see empty state. Click "Walk me through my first habit," walkthrough opens at step 1. Complete the walkthrough, habit appears in the list with streak 0.
- Manual: tap today's cell, cell fills, inline affirmation appears under the strip for 2 seconds reading the `minimum_version` text. Tap again, cell empties, no affirmation.
- Manual: tap a past cell, cell fills, no affirmation.
- Manual: rapid double-tap today's cell within 200ms, only one request fires (the second tap is rejected because the cell is disabled mid-flight per FR-026a).
- Manual: refresh the page, state persists.

### Phase 3: Manage (edit, archive, restore, reorder, delete)

**Goal:** complete the habit lifecycle UI.

#### 4.3.1 Kebab menu on each habit row

Add a `DropdownMenu` with "Edit" and "Delete" actions to `HabitRow` (active state) and "Restore" + "Delete" to the archived row variant. Match the pattern used by `role-list.tsx` for consistency.

#### 4.3.2 Edit flow

Edit reuses the quick-add form with two changes:

- Dialog title becomes "Edit habit."
- Footer adds an "Archive" button between "Cancel" and "Save changes."
- Submit calls `PATCH /api/habits/[id]` instead of `POST /api/habits`.
- Archive button calls `PATCH /api/habits/[id]` with `{ isArchived: true }` and closes the dialog.

#### 4.3.3 Archive section in the list view

Replace the Phase 2 placeholder with the real "Show archived habits (N)" toggle. Implementation:

- Fetches archived habits via `GET /api/habits?archived=true` lazily (on toggle expansion) or eagerly (in the same server-render pass as active habits): the cheaper pattern is eager in the same `page.tsx` data fetch.
- Renders archived rows below the toggle when expanded. Use lower opacity (~0.6) and a strikethrough on the identity statement, matching the `role-list.tsx` archived row visual.
- Each archived row has a kebab menu with "Restore" and "Delete."

#### 4.3.4 Restore action

`PATCH /api/habits/[id]` with `{ isArchived: false }`. The habit returns to the active list. Its `displayOrder` value is preserved (server does not reset it on archive or restore). If two restored habits have the same order or an order that overlaps with active habits, the next reorder by the user resolves it; no automatic re-shuffling.

#### 4.3.5 Delete confirmation

A small `Dialog` with the message: "Delete this habit permanently? All check-ins will be lost. This cannot be undone." Buttons: "Cancel" (default focus) + "Delete" (destructive variant). On confirm, fire `DELETE /api/habits/[id]` and remove the row optimistically. On failure, the row reverts and an inline error appears.

#### 4.3.6 Drag-to-reorder

**Prerequisite**: add `@dnd-kit/sortable` to `package.json` as a Phase 3 first commit. The repo currently has `@dnd-kit/core` and `@dnd-kit/utilities` but not the sortable subpackage. `useSortable` and `SortableContext` are textbook primitives for vertical list reorder and are the right fit here. (See risk row "drag library" below for the reasoning.)

Pattern: wrap the active habit list in a `DndContext` (with `closestCenter` collision detection and `KeyboardSensor` + `PointerSensor`) + `SortableContext` (using `verticalListSortingStrategy`). Each `HabitRow` becomes a `useSortable` consumer that applies `attributes`, `listeners`, `setNodeRef`, and the CSS transform from the hook. On `onDragEnd`, compute the new order array and:

1. Update the local list state optimistically.
2. Fire `PUT /api/habits/reorder` with `{ order: [...habitIds] }`.
3. On failure, revert the list state and surface an inline error at the top of the list.

Note: `src/components/monthly-plan/weekly-plan-view.tsx` uses `@dnd-kit/core` directly with `pointerWithin` collision detection for a 2D drag-from-pool-to-grid problem. That precedent does **not** match this use case; do not mirror its pattern for the habit list. The right precedent here is the canonical `@dnd-kit/sortable` example (vertical list with `verticalListSortingStrategy`).

Keyboard accessibility comes free with `@dnd-kit/sortable`'s `sortableKeyboardCoordinates` helper plus `KeyboardSensor`. Test: Tab to a row, Space to grab, Arrow keys to move, Space to drop.

Archived habits are not reorderable in v1 (spec FR-029). The archived section is rendered outside the `SortableContext`.

#### 4.3.7 Tests added in Phase 3

Optional component-level tests for the dropdown menu actions. No new helper logic to unit-test in this phase.

#### 4.3.8 Verification before opening Phase 3 PR

All gates from section 2, plus:

- Manual: edit a habit, change the identity → list re-renders with the new identity.
- Manual: archive a habit → it disappears from the active list. Click "Show archived habits (1)" → it appears below. Click "Restore" → it returns to the active list.
- Manual: drag a habit to a new position → order persists across a hard refresh. Keyboard test: focus a row, press Space to grab, arrow keys to move, Space to drop.
- Manual: hard-delete a habit with at least one log → confirm dialog opens, "Delete" removes it. After deletion, `SELECT count(*) FROM habit_logs WHERE habit_id = ?` returns 0.

### Phase 4: Empty-state editorial polish and master-docs sync

**Goal:** finish the design intent and sync the master documentation.

#### 4.4.1 Empty-state editorial blocks (`src/components/habits/habit-empty-state.tsx`)

Render the three blocks defined in `scope.md:175-184`:

> **Start with who you are becoming.**
> Habits feel different when you frame them as evidence of identity, not as tasks. "I am the type of person who never misses a meditation" is a story you tell yourself with every check-in. The habit is the proof.

> **The minimum version is the real habit.**
> Most habits fail because the bar is too high. If the normal version is thirty minutes and you only have one today, do one. It still counts. The habit you maintain is more valuable than the habit you idealise.

> **Do not miss twice.**
> Single misses are noise. Two in a row is when a habit dies. The streak is not perfection. It is the discipline of returning the next day.

Layout per `.impeccable.md`:

- Three sibling `<section>` blocks, no card wrappers.
- Headings in Fraunces, ~24px, sentence case.
- Body in Plus Jakarta Sans, ~16px, comfortable line height.
- Generous vertical spacing between blocks (~`mt-12` or larger).
- Below the third block: primary CTA "Walk me through my first habit" + smaller link "or skip the walkthrough."

The empty state vanishes when the user creates their first habit and does not return unless every habit is deleted or archived (spec US-6 scenario 3).

#### 4.4.2 Master-docs sync

Update three files under `specs/master/`:

- **`data-model.md`**: add a `Habit` and `HabitLog` entity to the Mermaid ER diagram (no FK from `habits` to any other table; `habit_logs` FKs to `habits`). Add the column tables matching `spec.md` "Key entities" section.
- **`contracts/api-routes.md`**: add a new "Habits" section after "Roles" with all eight endpoints, request/response examples for each, and a short note on the idempotent `POST` / `DELETE` for habit-logs.
- **`tasks.md`**: append a changelog row dated when Phase 4 lands.

#### 4.4.3 Manual smoke checklist for the implementer

A short Markdown checklist embedded in the Phase 4 PR body listing every spec SC (SC-001 through SC-012, SC-012a, SC-012b, SC-013 through SC-017) and how to verify each. The user runs through the list once after Phase 4 deploys. No automation.

#### 4.4.4 Verification before opening Phase 4 PR

All gates from section 2, plus:

- The empty state renders the three blocks with correct typography (Fraunces for headings, Plus Jakarta Sans for body).
- The blocks disappear after creating the first habit and reappear if every habit is deleted.
- `rg "habits" specs/master/` returns hits in every expected location.

---

## 5. Risk

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Streak math off-by-one bugs around midnight or DST transitions. | Medium. Date arithmetic is a common source of subtle errors. | Low. Visible to user; recoverable by re-fetch. | The 9-fixture unit test in 4.1.7 explicitly covers leap day and timezone boundaries. The helper takes `today` as a parameter (does not infer it from system time), which makes the timezone story tractable. Add more fixtures if a real-user bug surfaces. |
| Optimistic toggle races: the user taps the same cell twice in 200ms, two requests fire, server state ends up wrong. | Medium. Realistic for fast tappers. | Low. Self-correcting on next fetch. | Spec FR-026a: disable the cell during in-flight requests for that specific cell. Implemented per 4.2.6 as a `Set<string>` of in-flight cell keys in `HabitList` state. |
| Walkthrough state machine has a UX bug where Back from step 5 (review) loses entered values. | Medium. State machines are easy to write but hard to write correctly. | Medium. Causes user data loss. | Phase 2 ships the `habit-form.test.tsx` suite as a **required** deliverable (per 4.2.9), with explicit cases for Back-from-step-5 and Edit-link-from-review. |
| Drag library mismatch: implementer follows the wrong precedent (`weekly-plan-view.tsx`) and ends up reinventing transform logic that `@dnd-kit/sortable` provides for free. | Medium. The plan now corrects for this, but the existing precedent file is still in the repo and may mislead. | Medium. More code, harder review, slower implementation. | Spec FR-028 and plan section 4.3.6 prescribe `@dnd-kit/sortable` with `verticalListSortingStrategy`. The Phase 3 first commit adds the dependency. Implementer follows the canonical sortable list pattern, not the `weekly-plan-view.tsx` precedent. |
| The empty-state editorial copy drifts toward self-help cliche when implementer or reviewer edits it. | Medium. House voice is harder than copying source material. | Low. Worst case is the page feels like a wellness app. | Spec FR-034 lists voice rules. Re-evaluate any copy edit against them. |
| The `formatDateForDisplay` helper is added but never used by Phase 4's empty state (which contains no dynamic dates), making FR-019's "app-wide rule" feel half-applied. | Low. Phase 2's 14-day strip tooltip uses it. | Low. Cosmetic. | The follow-up "date-display-sweep" feature (out of scope here) will apply the helper everywhere it belongs. |
| Phase 1 ships with no UI, which makes the PR feel like dead code to a reviewer who doesn't see the plan. | Medium. Reviewers expect visible artefacts. | Low. Slows review by one round of explanation. | The Phase 1 PR body explains the phased strategy and points to plan.md. The migration + types + API ship as a believable foundation, not as orphan code. |
| Inline affirmation positioning conflicts with the inline error positioning in the same vertical slot under the strip. | Low. Both states use the same reserved space. | Low. Visual flicker if they fire near-simultaneously. | The two states are mutually exclusive at the same instant (error = request failed; affirmation = request succeeded for today). Render whichever is current; clear both when the cell is tapped again. |

---

## 6. Execution order

Within each phase, the recommended order minimises `tsc` rework:

**Phase 1**: 4.1.1 migration, then 4.1.4 + 4.1.5 helpers (with tests), then 4.1.2 + 4.1.3 schema/types, then 4.1.6 API routes, then 4.1.7 tests, then 4.1.8 verification.

**Phase 2**: 4.2.1 nav, then 4.2.2 page route, then 4.2.3 list view, then 4.2.4 + 4.2.5 row + strip, then 4.2.7 form (both modes), then 4.2.6 toggle and inline affirmation, then 4.2.8 minimal empty state, then 4.2.9 walkthrough tests, then 4.2.10 verification.

**Phase 3**: add `@dnd-kit/sortable` dep, then 4.3.1 kebab, then 4.3.2 edit, then 4.3.3 archive section, then 4.3.4 restore, then 4.3.5 delete confirm, then 4.3.6 reorder, then 4.3.8 verification.

**Phase 4**: 4.4.1 empty state, then 4.4.2 docs sync, then 4.4.3 smoke checklist, then 4.4.4 verification.

---

## 7. Definition of done

The feature is done when:

- All 39 FRs in `spec.md` are implemented and pass their corresponding SCs.
- All 19 SCs in `spec.md` are manually verified on the deployed app.
- `specs/master/data-model.md`, `specs/master/contracts/api-routes.md`, and `specs/master/tasks.md` are current.
- Four PRs have merged to master in order.
- No new lint or `tsc` issues compared to pre-feature master.
- A user can create a habit, log days, see streaks, archive and restore, reorder, and delete, with no console warnings and no failed requests under normal use.
