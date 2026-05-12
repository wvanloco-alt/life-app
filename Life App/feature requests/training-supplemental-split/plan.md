# Implementation Plan: Training vs. Supplemental Session Split

**Spec ID**: `training-supplemental-split`
**Created**: 2026-05-11
**Status**: In execution — Phases 1–4 complete; 5–7 pending (see `tasks.md`)
**Sister docs**: [`scope.md`](./scope.md), [`spec.md`](./spec.md), [`review.md`](./review.md)

---

## Reading order

This plan assumes the reader has already read `spec.md`. The plan does not restate requirements — it describes **how** they will be built.

---

## Architecture-Critical Finding

The climbing phase content is **already structured as three layers in code**. `src/lib/training/periodization.ts` defines `PHASE_CONTENT` with `climbing`, `supplemental`, and `mentalGame` fields per phase type. The function `buildClimbingPhaseDescription` concatenates them into a single string before writing to `training_phases.description`.

**Implication:** The "content restructuring" work the review flagged as heaviest is mostly a save-side change. We add three columns and emit each layer to its own column at generation time. No content rewriting required for climbing.

For tennis and running, V1 keeps the existing single-`description` path (per `review.md` decision). The scheduler falls back to `description` when the three layer columns are empty.

---

## Data Model Changes

### `training_plans` — five new columns

| Column | Type | Default | Purpose |
|---|---|---|---|
| `training_sessions_per_week` | INTEGER | NULL → backfilled | Number of sport-training sessions per week (FR-002). |
| `supplemental_sessions_per_week` | INTEGER | NULL → backfilled | Number of supplemental sessions per week (FR-002). |
| `training_preferred_days` | TEXT (JSON array) | `"[]"` | Weekday indices 0–6 preferred for training sessions (FR-013). |
| `supplemental_preferred_days` | TEXT (JSON array) | `"[]"` | Weekday indices 0–6 preferred for supplemental sessions (FR-013). |

The split columns are backfilled by the migration using the default formula:
```
supplemental = min(2, max(0, sessionsPerWeek − 2))
training     = sessionsPerWeek − supplemental
```

The preferred-days columns are backfilled to empty arrays (existing behavior preserved — scheduler falls back to "any available day").

### `training_phases` — three new columns

| Column | Type | Default | Purpose |
|---|---|---|---|
| `sport_focus_content` | TEXT | NULL | Sport-specific focus content per phase (FR-007). |
| `supplemental_content` | TEXT | NULL | Gym / strength / prehab content per phase (FR-007). |
| `mental_game_content` | TEXT | NULL | Mental game content per phase (FR-007). |

Existing `description` retained as fallback. No data migration to backfill the new columns for existing rows — instead, climbing plans can be refreshed via the existing `POST /api/training-plans/refresh-descriptions` endpoint (extended to write the three columns).

### `activities` — one new column

| Column | Type | Default | Purpose |
|---|---|---|---|
| `session_type` | TEXT | `'training'` | One of `"training"` or `"supplemental"` (FR-001). |

All existing rows default to `"training"`. No backfill needed beyond the default.

---

## Migration Strategy

All migrations go through `apply-schema.js` (production rule — never `drizzle-kit migrate` in production). Each statement uses `ALTER TABLE ADD COLUMN IF NOT EXISTS` (or equivalent try/skip pattern already in `apply-schema.js`).

Order:
1. Add columns to `training_plans`.
2. Add columns to `training_phases`.
3. Add column to `activities`.
4. Backfill `training_sessions_per_week` and `supplemental_sessions_per_week` using the default formula joined against `goals.sessionsPerWeek`. Guard with `WHERE training_sessions_per_week IS NULL`.

Idempotency: all statements are safe to run repeatedly. Backfill UPDATE is gated by `IS NULL` so it never overwrites user values.

`src/db/schema.ts` is updated in parallel so Drizzle's type inference picks up the new columns. The Drizzle schema is the source of truth at the application layer; `apply-schema.js` is the source of truth at the database layer. Both must agree.

---

## Scheduler Changes

The scheduler (`src/lib/scheduler.ts`) currently picks a day for each session based on preferred days and constraints, then commits the session via `commitSession()`. Two changes are needed.

### 1. Per-week type assignment

For each goal in each week:
- Compute target counts: `training_sessions_per_week` training, `supplemental_sessions_per_week` supplemental.
- Place training sessions first using `trainingPreferredDays` if configured, else fall back to existing "any available day" logic.
- Then place supplemental sessions using `supplementalPreferredDays`, falling back the same way.
- If a day appears in both preferred-day sets, training takes priority on first pass.

### 2. Notes attachment by session type

`commitSession()` currently sets `notes` from `gs.trainingPhase.description`. Replace with:
- If `session_type === "training"` and the phase has `sportFocusContent`: notes = `sportFocusContent` + (if present) `mentalGameContent`.
- If `session_type === "supplemental"` and the phase has `supplementalContent`: notes = `supplementalContent`.
- Else (no structured content — tennis, running, legacy rows): notes = existing `description` (fallback).
- Limitation notes (`limitationNotes`) continue to append as today.

The proposed activity gains a `sessionType` field. The apply endpoint persists it on the `activities` row.

### 3. New types

`TrainingPhaseInfo` (in `src/lib/scheduler.ts`) gains:
```
sportFocusContent?: string
supplementalContent?: string
mentalGameContent?: string
```

`ProposedActivity` gains `sessionType: "training" | "supplemental"`.

Training plan split + preferred-days passed in via a new parallel map (analogous to existing `trainingPhaseMap`).

---

## API Changes

### `POST /api/training-plans`
- Accepts new body fields: `trainingSessionsPerWeek`, `supplementalSessionsPerWeek`, `trainingPreferredDays`, `supplementalPreferredDays`.
- Validates `trainingSessionsPerWeek + supplementalSessionsPerWeek === goal.sessionsPerWeek` (FR-003). Returns 400 with a clear message if not.
- When creating climbing phases, calls a new helper `buildClimbingPhaseContent()` that returns the three layer strings, then writes both the three new columns **and** the legacy `description` (for backward compatibility with anything still reading `description`).

### `PATCH /api/training-plans/[id]`
- New endpoint (or extend existing if present — confirm during implementation). Allows editing the split and preferred-day arrays. Same validation as POST.

### `POST /api/training-plans/[id]/restart`
- **No behavior change** — the split is preserved across restarts (FR-009). The restart logic regenerates phases but does not touch the split columns on `training_plans`.

### `POST /api/training-plans/refresh-descriptions`
- Extended to also write `sport_focus_content`, `supplemental_content`, `mental_game_content` for climbing phases. Tennis and running rows unchanged (only the legacy `description` is refreshed).

### `POST /api/schedule/generate`
- Fetches the new training-plan columns and passes them to `generateSchedule()`.

### `POST /api/schedule/apply`
- Reads `sessionType` from the proposal and writes it to the new `activities.session_type` column.

### `PATCH /api/activities/[id]`
- Accepts an optional `sessionType` field (FR-008). All other behavior unchanged.

All routes already call `auth()` and scope by `user_id` — that pattern is preserved on the new columns and endpoints.

---

## UI Changes

### Training plan dialog (`src/components/goals/training-plan-dialog.tsx`)

New form section, placed after the existing periodization-model selection:

- **Sessions split** — two number inputs side by side, defaulting from the formula. Validation message inline if they don't sum to `goal.sessionsPerWeek`.
- **Non-blocking hint** at `sessionsPerWeek = 2` (FR-014) — small text below the inputs, using `text-muted-foreground`.
- **Preferred days** — two day pickers (Mon–Sun chip toggles), one for training, one for supplemental. Optional fields. Existing `goals.preferredDays` is **not** removed — it remains as the fallback when training-plan-level preferred days are empty.

For an existing plan (edit mode): same controls, pre-populated. Save button calls the new PATCH route.

**Reconcile warning**: when the dialog opens and `trainingSessionsPerWeek + supplementalSessionsPerWeek !== goal.sessionsPerWeek`, show a non-blocking warning banner above the form with a "Reset to default" action.

### Activity card (multiple files)

There is **no shared `ActivityCard` component** in the codebase — activity rendering is inline in several views. Every render site must apply the supplemental treatment independently. Tasks include a discovery step (T026.5) to enumerate every render site before applying the styling.

Known render sites (verified against the codebase):
- `src/components/monthly-plan/day-column.tsx` (activities are rendered inline, ~line 83)
- `src/components/monthly-plan/weekly-plan-view.tsx`
- `src/components/monthly-plan/schedule-preview.tsx` (proposal preview before applying)
- `src/components/daily/daily-view.tsx`

A small helper (e.g. `getSessionTypeCardClasses(sessionType)` in `src/lib/session-type-styles.ts`) keeps the styling DRY. The badge uses the existing shadcn `<Badge variant="secondary">` — no new tokens. If T026.5 reveals that the rendering markup is substantively similar across 3+ sites, the implementer should consider extracting a shared component — but only if the duplication is real, not theoretical.

### Activity edit form (`src/components/monthly-plan/activity-form.tsx`)

Add a `<Select>` for `sessionType` with options "Training" and "Supplemental". Only shown when the activity has a `goalId` linked to a training plan — otherwise hidden (the field defaults to "training" but is meaningless without a plan).

---

## Implementation Phases (build order)

The phases are ordered so each one is independently shippable to a development branch and verifiable.

### Phase 1 — Schema and migration (foundation)
1. Update `src/db/schema.ts` with the new columns.
2. Update `apply-schema.js` with `ALTER TABLE` statements and the backfill UPDATE.
3. Update `src/types/index.ts` with new interface fields (`SessionType`, training plan split fields, phase content layers).
4. Verify by running the app locally against a fresh DB and against a copy of the production DB.

**Done when:** Tables and types reflect the new shape. App still works exactly as before — no behavior changes.

### Phase 2 — Climbing content emission
1. Refactor climbing phase generation: replace single `buildClimbingPhaseDescription` call with a function that returns `{ sportFocusContent, supplementalContent, mentalGameContent }`. Existing `buildClimbingPhaseDescription` stays but becomes a thin wrapper that concatenates them (for the legacy `description` column).
2. Update `POST /api/training-plans` to write all four fields (three layers + concatenated legacy).
3. Extend `POST /api/training-plans/refresh-descriptions` to write the three layers for climbing rows.
4. Tennis and running unchanged.

**Done when:** Creating a climbing plan populates the three layer columns. Refresh endpoint backfills existing climbing plans. Tennis/running plans still populate only `description`.

### Phase 3 — Scheduler logic
1. Extend `TrainingPhaseInfo` and `ProposedActivity` with the new fields.
2. Add a new parallel map in `POST /api/schedule/generate` for training-plan split + preferred days (analogous to `trainingPhaseMap`).
3. Update `generateSchedule()` to honor the dual preferred-days model and tag each proposed activity with `sessionType`.
4. Update `commitSession()` to attach session-type-aware notes with fallback to `description`.
5. Update `POST /api/schedule/apply` to persist `sessionType` on the activity row.

**Done when:** Generating a schedule for a climbing goal with split 2 + 1 produces 8 training and 4 supplemental sessions in a 4-week month, each with the correct notes.

### Phase 4 — Training plan dialog UI
1. Add split inputs with inline validation and the non-blocking hint at `sessionsPerWeek = 2`.
2. Add dual preferred-day pickers.
3. Add edit mode (calls `PATCH /api/training-plans/[id]`).
4. Add reconcile warning when split doesn't match goal `sessionsPerWeek`.

**Done when:** User can configure and edit the split, see the hint at 2 sessions/week, and reconcile after a `sessionsPerWeek` change.

### Phase 5 — Calendar visual treatment
1. Implement `getSessionTypeClasses(sessionType)` helper.
2. Apply to monthly plan, today view, daily view.
3. Verify drag-and-drop preserves the type and visual treatment.

**Done when:** Supplemental sessions render with `bg-muted/50` and a "Supplemental" badge top-right on every view. Drag-and-drop works.

### Phase 6 — Activity edit form
1. Add session-type select field, gated on the activity having a goal with a training plan.

**Done when:** User can manually flip an activity's session type from the edit form.

### Phase 7 — Tests and verification
1. Unit tests for the default formula (`src/lib/__tests__/training-supplemental-split.test.ts` — to be created).
2. Unit tests for scheduler distribution (assert correct counts per week given various splits).
3. Manual smoke test: existing data (sessions, plans created before this feature) continues to render correctly.

**Done when:** All tests pass. Manual smoke test confirms no regression.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `apply-schema.js` backfill UPDATE runs against a production DB and silently produces wrong split values. | Low | High | Guard with `WHERE training_sessions_per_week IS NULL`. Test on a copy of prod first. Verify the SQL produces correct math via a Vitest test against an in-memory SQLite. |
| Scheduler week-by-week placement falls back to "any available day" so often that SC-002 fails in practice. | Medium | Medium | Default preferred-day sets are empty — users explicitly opt in. The fallback IS the expected path for V1. SC-002 has the parenthetical "*assuming preferred days are configured*." |
| Climbing content emission diverges between the per-layer write and the legacy `description` write. | Medium | Medium | Single helper builds both. Write a test that asserts `description === [sportFocus, supplemental, mentalGame].join("\n\n")`. |
| Refresh-descriptions endpoint blows away user-customized descriptions on existing rows. | Low | High | Endpoint is opt-in (user clicks a button). Behavior is unchanged from today — it has always overwritten. Documented in the UI. |
| FR-008 (manual session-type toggle on activity form) introduces inconsistency with what the scheduler generated. | Low | Low | Acceptable. User-overridden values persist; no automatic rewrite. |
| Tennis and running users see fallback notes (the full `description`) and assume the feature is broken. | Medium | Low | Document the V1.1/V1.2 rollout in the UI release note. The visual distinction and split configuration still work — only notes filtering is a no-op for those sports. |

---

## What This Plan Does Not Cover

- **Goal-level color picker** — separate spec.
- **Tennis and running content restructuring** — V1.1 / V1.2.
- **Phase-specific split overrides** — out of scope.
- **Analytics filters for supplemental-only volume** — out of scope.

These are explicit non-goals from `spec.md` and `scope.md`. If they surface during implementation, they get filed as separate items, not absorbed.

---

## Test Strategy

- **Vitest unit tests** for: the default formula, the scheduler's per-week placement counts, climbing content emission consistency (per-layer vs concatenated).
- **Manual integration test** flow: create a fresh climbing goal → create training plan with split 2 + 1 → generate schedule for a 4-week month → assert 8 training / 4 supplemental → open a supplemental session → assert only `supplementalContent` in notes → edit split to 1 + 2 → regenerate → assert new counts.
- **Manual regression test**: confirm existing climbing/tennis/running plans created before this feature still render correctly (all sessions default to "training", legacy `description` shown in notes).
- **No automated UI tests** — the project's UI test surface is small and these flows are easier to verify by hand for V1.

---

## Next Step

Generate `tasks.md` from this plan — ordered, dependency-aware, actionable task list per phase.
