# Tasks: Training vs. Supplemental Session Split

**Spec**: `Life App/feature requests/training-supplemental-split/spec.md`
**Plan**: `Life App/feature requests/training-supplemental-split/plan.md`
**Status**: **Phases 1–4 implemented** (2026-05-11). Phases 5–7 pending — see unchecked tasks below.
**Last updated**: 2026-05-11 (documentation sync)

---

## Overview

V1 scope: **climbing only**. Tennis and running content rollouts are deferred to V1.1 and V1.2. The schema, scheduler, and UI changes ship universally in V1; only climbing content gets restructured into three layers.

**Estimated effort**: 6–9 focused sessions. Counting honestly:
- Phase 1: 1 session (schema + migration + types).
- Phase 2: 1 session (climbing content emission).
- Phase 3: 2 sessions (scheduler logic, after the split into sub-tasks).
- Phase 4: 1–2 sessions (dialog UI, validation, edit mode).
- Phase 5: 1 session (visual treatment across all enumerated render sites).
- Phase 6: 0.5 session (activity edit form field).
- Phase 7: 1 session (unit tests + manual walkthrough + documentation propagation).

This estimate exists to set expectations, not to commit. Ship to learn, not to be right.

**Critical finding from grounding** (see `plan.md` "Architecture-Critical Finding"): climbing phase content is already structured as three layers in `src/lib/training/periodization.ts`. We are saving an existing structure into three columns, not rewriting content.

---

## Phase 1: Schema & Migration (foundation)

**Purpose**: Add the new columns and backfill existing rows. Everything else depends on this.

**⚠️ Do not start Phase 2 until the migration runs cleanly against both a fresh DB and a copy of production data.**

- [x] **T001** Add new columns to `training_plans` in `src/db/schema.ts`:
  ```ts
  trainingSessionsPerWeek: integer("training_sessions_per_week"),
  supplementalSessionsPerWeek: integer("supplemental_sessions_per_week"),
  trainingPreferredDays: text("training_preferred_days").default("[]"),
  supplementalPreferredDays: text("supplemental_preferred_days").default("[]"),
  ```

- [x] **T002** Add new columns to `training_phases` in `src/db/schema.ts`:
  ```ts
  sportFocusContent: text("sport_focus_content"),
  supplementalContent: text("supplemental_content"),
  mentalGameContent: text("mental_game_content"),
  ```

- [x] **T003** Add `session_type` column to `activities` in `src/db/schema.ts`:
  ```ts
  sessionType: text("session_type").notNull().default("training"),
  ```

- [x] **T004** Add `ALTER TABLE` statements to `apply-schema.js` in the existing alter-statements pattern. The `run()` helper handles the "duplicate column" case. Statements:
  ```js
  `ALTER TABLE training_plans ADD COLUMN training_sessions_per_week INTEGER`,
  `ALTER TABLE training_plans ADD COLUMN supplemental_sessions_per_week INTEGER`,
  `ALTER TABLE training_plans ADD COLUMN training_preferred_days TEXT DEFAULT '[]'`,
  `ALTER TABLE training_plans ADD COLUMN supplemental_preferred_days TEXT DEFAULT '[]'`,
  `ALTER TABLE training_phases ADD COLUMN sport_focus_content TEXT`,
  `ALTER TABLE training_phases ADD COLUMN supplemental_content TEXT`,
  `ALTER TABLE training_phases ADD COLUMN mental_game_content TEXT`,
  `ALTER TABLE activities ADD COLUMN session_type TEXT NOT NULL DEFAULT 'training'`,
  ```

- [x] **T005** Add backfill UPDATE to `apply-schema.js` immediately after the alter statements. Idempotent — only updates rows where the values are NULL:
  ```js
  db.exec(`
    UPDATE training_plans
    SET
      training_sessions_per_week = (
        SELECT g.sessions_per_week - MIN(2, MAX(0, g.sessions_per_week - 2))
        FROM goals g WHERE g.id = training_plans.goal_id
      ),
      supplemental_sessions_per_week = (
        SELECT MIN(2, MAX(0, g.sessions_per_week - 2))
        FROM goals g WHERE g.id = training_plans.goal_id
      )
    WHERE training_sessions_per_week IS NULL
       OR supplemental_sessions_per_week IS NULL;
  `);
  ```
  Test this against a copy of the production DB before deploying.

- [x] **T006** Update `src/types/index.ts` with the new types:
  ```ts
  export type SessionType = "training" | "supplemental";
  ```
  Extend the `TrainingPlan` interface with `trainingSessionsPerWeek`, `supplementalSessionsPerWeek`, `trainingPreferredDays: number[]`, `supplementalPreferredDays: number[]`.
  Extend the `TrainingPhase` interface with `sportFocusContent`, `supplementalContent`, `mentalGameContent` (all optional strings).
  Extend the `Activity` interface with `sessionType: SessionType`.

- [x] **T007** Add a pure helper for the default formula. Put it in `src/lib/training/periodization.ts` (or a new `src/lib/training/split.ts` if cleaner):
  ```ts
  export function defaultSplit(sessionsPerWeek: number): {
    training: number;
    supplemental: number;
  } {
    const supplemental = Math.min(2, Math.max(0, sessionsPerWeek - 2));
    return { training: sessionsPerWeek - supplemental, supplemental };
  }
  ```

**Checkpoint**: Run the app locally. Open SQLite (`Life App/local.db`) and verify all new columns exist. Verify existing training plans now have non-NULL `training_sessions_per_week` and `supplemental_sessions_per_week` that match the default formula. No app behavior should have changed. ✓

---

## Phase 2: Climbing Content Emission

**Purpose**: When climbing phases are generated, write each content layer to its own column. Tennis and running unchanged — fallback to `description`.

- [x] **T008** Refactor `buildClimbingPhaseDescription` in `src/lib/training/periodization.ts`:
  - Introduce a new exported function `buildClimbingPhaseContent(phaseType, discipline, level): { sportFocusContent, supplementalContent, mentalGameContent }`. Returns the three layer strings directly from `PHASE_CONTENT[phaseType]` with the same beginner-override logic the existing function uses.
  - Keep `buildClimbingPhaseDescription` as a thin wrapper that calls `buildClimbingPhaseContent` and concatenates the three strings (preserves the legacy `description` column for tennis/running/legacy code paths).

- [x] **T009** Update phase generation in `src/lib/training/periodization.ts` (the function that produces `GeneratedPhase[]`):
  - For climbing, call `buildClimbingPhaseContent` and include `sportFocusContent`, `supplementalContent`, `mentalGameContent` on each returned phase.
  - The legacy `description` field stays populated (wrapper).
  - Tennis and running emit only `description` — no change.

- [x] **T010** Update `POST /api/training-plans/route.ts`:
  - When inserting rows into `training_phases`, write all four fields (`description`, `sport_focus_content`, `supplemental_content`, `mental_game_content`) for climbing plans.
  - Tennis and running plans write only `description` (no change).
  - Accept new request body fields: `trainingSessionsPerWeek`, `supplementalSessionsPerWeek`, `trainingPreferredDays`, `supplementalPreferredDays`.
  - Validate `trainingSessionsPerWeek + supplementalSessionsPerWeek === goal.sessionsPerWeek`. Return 400 with a clear error message on mismatch.

- [x] **T011** Extend `POST /api/training-plans/refresh-descriptions/route.ts`:
  - For each climbing phase, additionally write `sport_focus_content`, `supplemental_content`, `mental_game_content` using `buildClimbingPhaseContent`.
  - Tennis and running phases unchanged.

- [x] **T012** Add or update `PATCH /api/training-plans/[id]/route.ts`:
  - Accept `trainingSessionsPerWeek`, `supplementalSessionsPerWeek`, `trainingPreferredDays`, `supplementalPreferredDays` in the request body.
  - Apply the same validation as POST.
  - Scope by `userId` via `auth()`.

- [x] **T013** Audit `POST /api/training-plans/[id]/restart/route.ts`. Identify every `UPDATE` / `INSERT` / `DELETE` against `training_plans` rows during restart. If any path touches the new split or preferred-days columns, modify the logic so the split is preserved (FR-009). Add a regression test in `src/lib/__tests__/training-supplemental-split.test.ts` that:
  1. Inserts a training plan with `sessionsPerWeek = 3` and a manually-edited split (1 + 2, not the default 2 + 1).
  2. Calls the restart logic (or the underlying service function).
  3. Asserts the split values on the restarted plan are unchanged (1 + 2).

**Checkpoint**: Delete an existing climbing training plan locally. Create a new one with the API or UI. Inspect `training_phases` in SQLite — each row should have non-NULL `sport_focus_content`, `supplemental_content`, `mental_game_content`. Tennis/running plans should have only `description` populated for these columns (NULL). ✓

---

## Phase 3: Scheduler Logic

**Purpose**: The scheduler honors the configured split and tags each session correctly.

- [x] **T014** Extend types in `src/lib/scheduler.ts`:
  ```ts
  export interface TrainingPhaseInfo {
    // existing fields...
    sportFocusContent?: string;
    supplementalContent?: string;
    mentalGameContent?: string;
  }

  export interface ProposedActivity {
    // existing fields...
    sessionType: "training" | "supplemental";
  }

  export interface TrainingPlanSplit {
    trainingSessionsPerWeek: number;
    supplementalSessionsPerWeek: number;
    trainingPreferredDays: number[];
    supplementalPreferredDays: number[];
  }
  ```

- [x] **T015** Update `POST /api/schedule/generate/route.ts`:
  - Fetch the training plan's split fields and preferred days for each focus goal that has a plan.
  - Build a `Map<goalId, TrainingPlanSplit>` (analogous to the existing `trainingPhaseMap`).
  - Populate `TrainingPhaseInfo` with the three content layers from `training_phases` rows.
  - Pass the split map as a new parameter to `generateSchedule`.

**T016 is split into four sub-tasks. The scheduler is the highest-risk module in the codebase — small, independently testable steps reduce the blast radius of any one mistake.**

- [x] **T016a** Compute weekly target counts. Add a pure helper (in `src/lib/scheduler.ts` or `src/lib/training/split.ts`) that takes a `TrainingPlanSplit` and an ISO week and returns `{ trainingCount, supplementalCount }`. Pure, unit-testable. No scheduler state.

- [x] **T016b** Day-picking logic for **training** sessions. Extend the existing preferred-days logic in `generateSchedule()` to operate on `trainingPreferredDays`. When the array is empty or all preferred days are already used/blacked-out, fall back to the existing "any available day" path. Place training sessions first in the per-week loop.

- [x] **T016c** Day-picking logic for **supplemental** sessions. Use `supplementalPreferredDays`. **Training takes priority on any day appearing in both sets** — supplemental can only land on a day already used by training if no other day is available (same fallback path). Place supplemental sessions after training in the per-week loop.

- [x] **T016d** Tag each `ProposedActivity` with the correct `sessionType` based on which placement loop produced it. Goals without a training plan default to `sessionType: "training"` (preserves existing behavior).

- [x] **T017** Update `commitSession()` in `src/lib/scheduler.ts` (~line 758 in current code):
  ```ts
  let notes: string | undefined;
  if (gs.trainingPhase) {
    if (sessionType === "training" && gs.trainingPhase.sportFocusContent) {
      notes = gs.trainingPhase.sportFocusContent;
      if (gs.trainingPhase.mentalGameContent) {
        notes += `\n\n${gs.trainingPhase.mentalGameContent}`;
      }
    } else if (sessionType === "supplemental" && gs.trainingPhase.supplementalContent) {
      notes = gs.trainingPhase.supplementalContent;
    } else if (gs.trainingPhase.description) {
      notes = gs.trainingPhase.description;
    }
    if (gs.trainingPhase.limitationNotes) {
      notes = (notes ?? "") + `\n\n[PHYSICAL LIMITATIONS]\n${gs.trainingPhase.limitationNotes}`;
    }
  } else if (gs.goal.description) {
    notes = gs.goal.description;
  }
  ```
  The proposed activity carries `sessionType` so the consumer can persist it.

- [x] **T018** Update `POST /api/schedule/apply/route.ts`:
  - When inserting into `activities`, persist `sessionType` from each `ProposedActivity` on the new `session_type` column.
  - Existing fields unchanged.

- [x] **T019** Update `PATCH /api/activities/[id]/route.ts` (or equivalent activity-update route):
  - Accept optional `sessionType` field in the request body.
  - Persist if provided. No validation beyond enum check (`"training"` | `"supplemental"`).

**Checkpoint**: Create a climbing goal with `sessionsPerWeek = 3`. Create a training plan with split 2 + 1. Generate a schedule for a 4-week month. Inspect the activities — exactly 8 should have `session_type = 'training'` and 4 should have `session_type = 'supplemental'` (assuming no blackouts). Open a supplemental session — notes should contain only the supplemental content, not the full phase description. ✓

---

## Phase 4: Training Plan Dialog UI

**Purpose**: User configures the split when creating a plan and can edit it after.

- [x] **T020** Add split-input section to `src/components/goals/training-plan-dialog.tsx` (between the existing periodization-model section and the limitation checkboxes):
  - Two `<Input type="number">` fields side by side: "Training sessions/week" and "Supplemental sessions/week".
  - Default values from `defaultSplit(goal.sessionsPerWeek)`.
  - Inline validation: red helper text below the inputs if `training + supplemental !== goal.sessionsPerWeek`.
  - Disable the save button while the values are invalid.

- [x] **T021** Add the non-blocking hint when `goal.sessionsPerWeek === 2` (FR-014). Position: below the split inputs. Styling: `text-muted-foreground text-sm`:
  > "The source material recommends supplemental work alongside training. If your schedule allows more than 2 sessions per week, the default will add supplemental sessions automatically."

- [x] **T022** Add two preferred-day pickers below the split inputs:
  - Chip-style weekday toggles (Mon–Sun) matching the existing pattern in `goals-form.tsx` or `scheduler-settings.tsx` (use whichever already exists — reuse, don't recreate).
  - Labels: "Training preferred days" and "Supplemental preferred days".
  - Both optional. Empty = "any day" fallback in the scheduler.

- [x] **T023** Add an edit mode to the dialog:
  - When opened for an existing plan, pre-fill all fields (split values, preferred days, etc.).
  - Save button calls `PATCH /api/training-plans/[id]` instead of POST.
  - Title changes from "Create training plan" to "Edit training plan".

- [x] **T024** Add the reconcile warning banner:
  - When the dialog opens for an existing plan AND `(training + supplemental) !== goal.sessionsPerWeek`, show a banner at the top of the dialog body.
  - Use existing `bg-amber-50 dark:bg-amber-950` pattern (warm OKLCH, not blue — verify against the design system).
  - Include a "Reset to default" button that recalculates from `defaultSplit(goal.sessionsPerWeek)` and pre-fills the inputs.
  - Non-blocking — user can still save without resetting if they choose.

- [x] **T025** Wire `training_plans/[id]` editing into the goal detail page (or wherever the user currently opens the training plan view). Add an "Edit plan" button that opens the dialog in edit mode.

**Checkpoint**: Create a goal with `sessionsPerWeek = 3`. Open the training plan dialog — split shows 2 + 1. Change to 1 + 2 and save. Reopen — values persist. Change goal's `sessionsPerWeek` to 5 from the goal form. Reopen training plan dialog — reconcile warning is visible. Click "Reset to default" — values become 3 + 2. Save. Persist. ✓

---

## Phase 5: Calendar Visual Treatment

**Purpose**: Supplemental sessions are visually distinct everywhere they appear.

- [x] **T026** Create a shared styling helper at `src/lib/session-type-styles.ts`:
  ```ts
  export function getSessionTypeCardClasses(sessionType: "training" | "supplemental"): string {
    return sessionType === "supplemental"
      ? "bg-muted/50 border-border"
      : "bg-card border-border";
  }

  export function shouldShowSupplementalBadge(sessionType: "training" | "supplemental"): boolean {
    return sessionType === "supplemental";
  }
  ```
  Keep it tiny. Adjustments later are easy.

- [x] **T026.5** **Discovery** — enumerate every activity-card render site in the codebase before applying the helper. Grep for patterns like `activity.title`, `activity.startTime`, `activity.notes`, `activity.id`. List every site in this task description before moving on.

  Known render sites (verified):
  - `src/components/monthly-plan/day-column.tsx` (~line 83, inline render)
  - `src/components/monthly-plan/weekly-plan-view.tsx`
  - `src/components/monthly-plan/schedule-preview.tsx` (proposal preview before applying)
  - `src/components/daily/daily-view.tsx`

  The implementer must verify this list is complete by running the grep before T027 begins. If 3+ sites share substantively similar markup, propose extracting a shared `ActivityCard` component as a follow-up — but only if the duplication is real, not theoretical.

- [x] **T027** Apply the helper + supplemental badge to every render site enumerated in T026.5:
  - `src/components/monthly-plan/day-column.tsx`
  - `src/components/monthly-plan/weekly-plan-view.tsx`
  - `src/components/monthly-plan/schedule-preview.tsx`

  In each site:
  - Conditionally render `<Badge variant="secondary">Supplemental</Badge>` top-right when `activity.sessionType === "supplemental"`.
  - Replace the card's background class with `getSessionTypeCardClasses(activity.sessionType)`.

- [x] **T028** Apply the same treatment to `src/components/daily/daily-view.tsx`. Reuse the helper — do not duplicate logic.

- [x] **T029** Verify drag-and-drop preserves the type and visual treatment:
  - Drag a supplemental session to a different day.
  - On drop, the card retains its `bg-muted/50` background and `Supplemental` badge.
  - The PATCH that updates `activityDate` should not touch `sessionType` — confirm in the existing handler.

**Checkpoint**: Generate a schedule with mixed training and supplemental sessions. Open the monthly plan, today view, and daily view in turn. In each, supplemental sessions render visibly differently (muted background + badge). Drag a supplemental session to another day — visual treatment persists. ✓

---

## Phase 6: Activity Edit Form (FR-008)

**Purpose**: User can manually flip an activity's session type.

- [x] **T030** Add a session-type `<Select>` to `src/components/monthly-plan/activity-form.tsx`:
  - Two options: "Training" (default) and "Supplemental".
  - Only show the field when `activity.goalId` is set AND that goal has a training plan. Otherwise hide entirely.
  - Wire to the existing form state and PATCH handler. Backend route already accepts `sessionType` (T019).

**Checkpoint**: Open an existing supplemental session in the edit form. Change the type to "Training" and save. The card now renders as a training session. Verify in SQLite. ✓

---

## Phase 7: Tests & Verification

**Purpose**: Lock in correctness for the parts that can break silently.

- [ ] **T031** Create `src/lib/__tests__/training-supplemental-split.test.ts`:
  - Test `defaultSplit()` for `sessionsPerWeek` values 1 through 7. Verify every row of the table in `spec.md`.
  - Test `buildClimbingPhaseContent()` returns the same strings as `PHASE_CONTENT` for each phase type, discipline, and level (including beginner overrides).
  - Test that `buildClimbingPhaseDescription()` (the wrapper) still produces the original concatenated string — proves we haven't broken the legacy path.
  - **Test the backfill SQL itself.** Open `new Database(':memory:')`, run a minimal subset of the schema (`goals` + `training_plans` only — enough to make the FK work), seed `goals` rows at `sessions_per_week` values 1 through 7, insert matching `training_plans` rows with NULL split columns, then run the exact UPDATE statement from `apply-schema.js` (T005). Assert each row's resulting split matches the formula table from `spec.md`. This catches any SQLite-specific quirk in `MIN()`/`MAX()` scalar usage before it reaches production.

- [ ] **T032** Create or extend scheduler tests in `src/lib/__tests__/scheduler.test.ts` (or equivalent):
  - Given a goal with split 2 + 1 and a 4-week month with no blackouts, assert the scheduler returns exactly 8 training + 4 supplemental.
  - Given training preferred days `[1, 3]` (Mon/Wed) and supplemental `[5]` (Fri), assert training sessions land on Mon/Wed and supplemental on Fri.
  - Given empty preferred days, assert the scheduler still places the correct counts (fallback path works).
  - Given a goal in a rest/recovery phase, assert no sessions of either type are generated.

- [ ] **T033** Manual integration test (walkthrough):
  1. Create fresh climbing goal with `sessionsPerWeek = 3`.
  2. Open training-plan dialog — verify defaults are 2 + 1, hint is NOT shown.
  3. Create the plan.
  4. Generate a schedule for the current month.
  5. Verify the calendar shows 2 training cards and 1 supplemental card per week (or as close as preferred-day constraints allow).
  6. Open a supplemental session — verify notes are supplemental-only.
  7. Open a training session — verify notes are sport focus + mental game.
  8. Edit the plan, change split to 1 + 2, regenerate the schedule.
  9. Verify the new counts.
  10. Restart the cycle. Verify the split is preserved (NOT reset to default).

- [ ] **T034** Manual regression test:
  - Open an existing tennis or running training plan. Verify it still renders correctly.
  - Verify scheduled sessions for those sports show the existing `description` content (fallback path works).
  - Verify all existing climbing sessions default to `session_type = "training"` and render with current styling.

- [x] **T035** Update `Life App/ROADMAP.md`:
  - Add a new section "Training vs. Supplemental Session Split" under the appropriate place.
  - Status: Built (climbing). Tennis V1.1 and running V1.2 planned.
  - Link to `feature requests/training-supplemental-split/spec.md`.

- [x] **T035a** Update `Life App/specs/master/data-model.md` — the constitution lists this as a source of truth for the database schema. Add the new columns on `training_plans`, `training_phases`, and `activities` with their types and defaults. Do not remove or restructure existing entries — this is additive.

- [x] **T035b** Update `Life App/specs/master/contracts/api-routes.md` — the constitution lists this as the source of truth for all REST endpoints. **Done (2026-05-11):** training plans + schedule sections as before; **`GET`/`POST`/`PATCH /api/activities`** document `sessionType` (GET returns column; POST optional; PATCH optional for form edits).

- [x] **T035c** Update `Life App/specs/master/tasks.md` with the feature-shipping entry: date, summary line, link to the spec at `feature requests/training-supplemental-split/spec.md`. Match the format of the most recent entries.

---

## Dependencies & Execution Order

| Phase | Depends on | Notes |
|---|---|---|
| Phase 1 (Schema & Migration) | Nothing | Must complete first. Verify backfill against a copy of prod. |
| Phase 2 (Climbing content emission) | Phase 1 | Tennis/running unchanged — no work here. |
| Phase 3 (Scheduler logic) | Phase 1, Phase 2 | Reads the new columns. |
| Phase 4 (Dialog UI) | Phase 1, Phase 2 | API endpoints from Phase 2 must accept the new fields. |
| Phase 5 (Calendar styling) | Phase 1, Phase 3 | Needs `sessionType` on activities. |
| Phase 6 (Activity edit form) | Phase 3 (PATCH accepts `sessionType`) | Small, late. |
| Phase 7 (Tests) | All above | Final verification before shipping. |

Phases 4 and 5 can run in parallel after Phase 3 completes.

---

## Important Notes

- **The legacy `description` column stays populated** on climbing phases. We write both the three new columns AND the concatenated string. Cost is negligible. Protects any code path that still reads `description` and decouples this feature from a future cleanup.
- **`apply-schema.js` backfill UPDATE is gated by `IS NULL`.** Never overwrites user values. Safe to run repeatedly.
- **The scheduler's fallback to "any available day" is the default behavior** when preferred-day sets are empty. Users opt in. SC-002 in the spec has a parenthetical for this reason.
- **Cycle restart preserves the split.** This is FR-009. The restart logic must not touch the new columns on `training_plans`. Verify this explicitly during T013.
- **Tennis and running content rollout is V1.1 / V1.2.** Don't be tempted to "while we're in there" restructure their content during V1. Out of scope.
- **No automated UI tests in V1.** The manual walkthrough in T033 is the integration test. Keeping the UI test surface minimal is consistent with the project's existing convention.

---

## Out of Scope (reminder)

These have appeared in conversation. None are part of V1. If they come up during implementation, file them separately:

- Goal-level color picker.
- Phase-specific split overrides.
- Analytics filters / charts for supplemental volume.
- A separate activity type for supplemental sessions.
- Automatic reconciliation when `sessionsPerWeek` changes (warning + manual reset only).
- Tennis and running phase content restructuring (deferred to V1.1, V1.2).
