# Feature Specification: Training vs. Supplemental Session Split

**Spec ID**: `training-supplemental-split`
**Created**: 2026-05-11
**Updated**: 2026-05-11 (implementation + docs sync)
**Status**: **Phases 1–4 implemented** — climbing end-to-end for split, layers, scheduler, apply, and plan dialog. Phases 5–7 (calendar UI, activity edit, full test/doc sweep) outstanding.

---

## Overview

Today, every scheduled session for a sport goal with a training plan looks identical on the calendar. Whether the user is supposed to climb, do gym work, run, or do prehab — the card is the same, the title is the same, and the description (the full phase content) is attached to every single session.

This feature introduces a clean separation between **training** sessions (the sport itself) and **supplemental** sessions (gym / strength / prehab / antagonist work). The user configures how many of each per week when creating a training plan, the scheduler distributes them across the calendar, and each session shows only the content relevant to that day.

Activity type stays the same (Climbing, Tennis, Running) so completing a supplemental session still counts toward the goal — but the user can finally tell at a glance what kind of day they're looking at.

---

## User Scenarios & Testing

### User Story 1 — Configure the Split When Creating a Training Plan (Priority: P1)

The user creates a climbing training plan for a goal with 3 sessions/week. The training plan dialog shows a clear split: "2 training · 1 supplemental" (the default for 3 sessions/week). The user can adjust those numbers, but the sum must always equal the goal's sessions/week.

**Why this priority**: Without configuring the split, the feature has no input. This is the foundation everything else builds on.

**Independent Test**: Create a climbing training plan for a goal with 4 sessions/week. Verify the dialog shows training/supplemental inputs that default to 2 + 2. Change to 3 + 1 and save. Verify the saved values persist.

**Acceptance Scenarios**:

1. **Given** a goal with `sessionsPerWeek = 3`, **When** the user opens the training plan creation dialog, **Then** the split shows 2 training + 1 supplemental by default.
2. **Given** a goal with `sessionsPerWeek = 1`, **When** the user opens the dialog, **Then** the split shows 1 training + 0 supplemental, and the supplemental field is allowed but warns that supplemental is not recommended below 2 training sessions/week.
3. **Given** the user changes training to 4 and supplemental to 0 on a goal with `sessionsPerWeek = 3`, **When** they try to save, **Then** validation prevents save with a message that training + supplemental must equal sessions/week.
4. **Given** the user saves a valid split, **When** the training plan is created, **Then** the split values are persisted with the training plan.

---

### User Story 2 — Scheduler Places Sessions by Type (Priority: P1)

The user has a climbing goal with 3 sessions/week, configured as 2 training + 1 supplemental. They click "Generate Schedule" for the month. The scheduler places 3 sessions per week using the existing distribution logic, but each session is now tagged as either training or supplemental according to the configured split.

**Why this priority**: Without the scheduler honoring the split, the configuration is meaningless. This is what turns the user's choice into a calendar.

**Independent Test**: Configure 2 training + 1 supplemental on a climbing goal with 3 sessions/week. Generate a schedule for a 4-week month. Verify that 8 sessions are tagged "training" and 4 are tagged "supplemental" across the month.

**Acceptance Scenarios**:

1. **Given** a goal with split 2 training + 1 supplemental, **When** the scheduler generates a 4-week month, **Then** exactly 8 training and 4 supplemental sessions are created (assuming no blackout dates or rest phase).
2. **Given** a goal with split 1 training + 0 supplemental, **When** the scheduler generates a month, **Then** all generated sessions are tagged "training".
3. **Given** a goal in a rest/recovery phase, **When** the scheduler runs, **Then** no sessions of either type are created for that goal (existing behavior preserved).
4. **Given** existing scheduled sessions before this feature was built, **When** the user opens the calendar, **Then** those sessions default to "training" type (no migration needed beyond a default).

---

### User Story 3 — Visual Distinction in the Calendar (Priority: P1)

The user opens their monthly calendar. Training sessions show with the standard card styling. Supplemental sessions show with a clearly different visual treatment — a "Supplemental" badge and muted card styling — making it instantly obvious which days are sport training and which are gym days.

**Why this priority**: The whole point of the feature is visible distinction. Without this, configuring the split achieves nothing the user can see.

**Independent Test**: Generate a schedule with 2 training + 1 supplemental for a climbing goal. Open the monthly view. Verify that supplemental sessions render visibly differently from training sessions on every visible day.

**Acceptance Scenarios**:

1. **Given** a calendar with mixed training and supplemental sessions, **When** the user views the monthly plan, **Then** supplemental sessions are visually distinguishable from training sessions without hovering or clicking.
2. **Given** a supplemental session card, **When** the user looks at it, **Then** a "Supplemental" label/badge is clearly present.
3. **Given** the user drags a supplemental session to a different day, **When** the drop completes, **Then** the session retains its supplemental type and visual treatment.
4. **Given** a user with `prefers-reduced-motion` enabled, **When** the calendar loads, **Then** the distinction is still clear without relying on animation.

---

### User Story 4 — Session-Type-Aware Notes (Priority: P1)

The user clicks into a supplemental session. The notes show only the supplemental content for the current phase (gym exercises, antagonist work, sets/reps). They click into a training session. The notes show only the sport focus content for the phase (on-wall work, technique, mental game). Neither dumps the full phase description.

**Why this priority**: This is the stated value of the feature. The problem statement is "a wall of text that doesn't change based on what the user is supposed to do that day." Shipping Stories 1–3 without 4 would produce a half-feature that looks finished but still shows the same wall of text on every session. Filtered notes are the core value, not a refinement.

**Independent Test**: Open a training session in a Max Strength & Power phase — verify notes contain climbing focus content and not gym exercises. Open a supplemental session in the same phase — verify notes contain gym content and not climbing instructions.

**Acceptance Scenarios**:

1. **Given** a training session in the Skill & Stamina climbing phase, **When** the user opens it, **Then** the notes contain the sport focus + mental game content only.
2. **Given** a supplemental session in the same phase, **When** the user opens it, **Then** the notes contain the supplemental content only.
3. **Given** a goal without a training plan (no phases), **When** sessions are generated, **Then** notes fall back to the goal description as before (no regression).

---

### User Story 5 — Edit the Split After Plan Creation (Priority: P2)

A few weeks into their training, the user realizes they have time for more gym work. They open the goal's training plan section, change the split from 2 + 1 to 1 + 2, and save. The next time they generate or regenerate a schedule, the new split is used.

**Why this priority**: The user explicitly asked for this. It's not blocking initial value (a user can delete and recreate the plan if needed), but it's expected behavior.

**Independent Test**: Edit an existing training plan's split, regenerate the schedule, verify the new distribution is applied.

**Acceptance Scenarios**:

1. **Given** a training plan with split 2 + 1, **When** the user edits it to 1 + 2 and saves, **Then** the new split is persisted.
2. **Given** the split has been edited, **When** the user regenerates the schedule for a future month, **Then** the new split is applied to that month's sessions.
3. **Given** the split has been edited mid-month, **When** the user does NOT regenerate, **Then** existing sessions in that month keep their original type (no silent in-place rewrite).
4. **Given** the new split values don't sum to the goal's `sessionsPerWeek`, **When** the user tries to save, **Then** the save is blocked with a validation message.

---

## Edge Cases

- **Cycle restart.** Cycle restart resets phase progress only. The training/supplemental split is preserved as a deliberate user preference and persists across cycles.
- **`sessionsPerWeek` is changed on the goal after the plan exists.** The saved split is preserved. The training-plan dialog shows a non-blocking warning when the split doesn't match the goal's current `sessionsPerWeek`, with an option to reconcile (apply the default formula). Until the user reconciles, the scheduler falls back to the default formula for new generations. The saved values are never silently overwritten.
- **User deletes the training plan.** All existing sessions retain their type (they're independent records). No cascade rewrite.
- **Goal has no `activityTypeId`.** No training plan can exist (existing constraint). Feature does not apply.
- **`sessionsPerWeek` is set to 0.** The training plan UI hides the split inputs entirely. Scheduler generates nothing.
- **A logged or completed session's type.** Type is preserved as it was when scheduled. Logging doesn't change the type. The user can manually change the type on an individual activity if they want (low priority, see FR-008).
- **Manually-created activities (not from scheduler).** Default to "training" type. User can change it if they want.
- **A sport without restructured content (tennis, running in V1).** The scheduler falls back to the existing `description` field for both training and supplemental sessions until that sport's content rollout (V1.1, V1.2). The visual distinction and configurable split still work — only the notes filtering is a no-op for those sports.

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST persist a `session_type` field on every scheduled activity, with values `"training"` or `"supplemental"`. Existing rows default to `"training"`.
- **FR-002**: System MUST persist a training/supplemental split (two integers, `trainingSessionsPerWeek` and `supplementalSessionsPerWeek`) on each training plan.
- **FR-003**: System MUST validate that `trainingSessionsPerWeek + supplementalSessionsPerWeek === goal.sessionsPerWeek` on any save of the training plan split.
- **FR-004**: System MUST apply the following default formula when a training plan is created:
  - `supplemental = min(2, max(0, sessionsPerWeek − 2))`
  - `training = sessionsPerWeek − supplemental`
  This formula is identical for climbing, tennis, and running.
- **FR-005**: System MUST allow the user to override the default split at training plan creation and edit it at any time after.
- **FR-006**: Scheduler MUST tag each generated session with the appropriate `session_type` such that, per week, the count of each type matches the configured split (as best the distribution logic allows when blackouts or other constraints reduce the available days).
- **FR-007**: Scheduler MUST attach session-type-aware notes:
  - **Training sessions** → `sportFocusContent` + `mentalGameContent` for the current phase.
  - **Supplemental sessions** → `supplementalContent` for the current phase.
  - **Fallback**: when a phase has no structured content (legacy rows, or sports not yet migrated — tennis and running in V1), the existing `description` field is used. The fallback applies to both session types until the sport's content is restructured.
- **FR-008**: The activity edit form MUST expose the `session_type` field so users can manually change a session's type if needed.
- **FR-009**: Cycle restart MUST preserve the training/supplemental split. Cycle restart resets phase progress only — the split is a deliberate user preference and persists across cycles.
- **FR-010**: The calendar UI (monthly plan, today view, daily view) MUST visually distinguish supplemental sessions from training sessions using the following design tokens (no new color system introduced):

  | Property | Training (unchanged) | Supplemental |
  |---|---|---|
  | Background | `bg-card` | `bg-muted/50` |
  | Border | `border-border` | `border-border` *(same — keep the shape consistent)* |
  | Title weight | `font-medium` | `font-medium` *(same — don't reduce contrast on real work)* |
  | Title color | `text-foreground` | `text-foreground` *(same)* |
  | Meta / time | `text-muted-foreground` | `text-muted-foreground` *(same)* |
  | Top-right badge | none | `<Badge variant="secondary">Supplemental</Badge>` |

  Badge label: `Supplemental` (sentence case, Plus Jakarta Sans, `text-xs`, `font-medium`). Not uppercase. Position: top-right of the card. Dark mode is covered by existing token variants in `globals.css` — no new dark-mode tokens needed.
- **FR-011**: Manually-created activities (not generated by the scheduler) MUST default to `session_type = "training"`.
- **FR-012**: The activity type on a supplemental session MUST remain the sport's activity type (Climbing / Tennis / Running) so logging counts toward the goal.
- **FR-013**: The training plan MUST store two separate sets of preferred weekdays — `trainingPreferredDays` and `supplementalPreferredDays`. The scheduler honors each set for its respective session type. Training takes priority if a day appears in both. If fewer preferred days are configured than sessions per week, the scheduler falls back to "any available day" (existing behavior, unchanged).
- **FR-014**: The training-plan creation dialog MUST surface a non-blocking hint at `sessionsPerWeek = 2` informing the user that the source material recommends supplemental work alongside training, and that the default will automatically include supplemental sessions at higher weekly volumes.
- **FR-015**: Migration MUST backfill the training/supplemental split and preferred-days fields for existing training plans using the default formula against the plan's goal `sessionsPerWeek`. Migration MUST be idempotent — safe to run repeatedly against both a fresh DB and a production DB with existing data.

### Key Entities

- **Session Type**: A string enum on each activity row: `"training"` or `"supplemental"`. Drives both visual treatment and which phase content is attached as notes.
- **Training Plan Split**: A pair of integers stored on `training_plans`: `trainingSessionsPerWeek` and `supplementalSessionsPerWeek`. Must sum to the goal's `sessionsPerWeek`. Used by the scheduler when generating sessions for that goal.
- **Phase Content Layers**: Three text fields on `training_phases` — `sportFocusContent`, `supplementalContent`, `mentalGameContent`. Replaces the single `description` field's role for sports whose content has been restructured. Existing `description` is retained as a fallback for legacy rows and for sports that haven't been migrated yet (tennis, running in V1).
- **Preferred Days Split**: Two JSON-array text fields on `training_plans` — `trainingPreferredDays` and `supplementalPreferredDays`. Each holds an array of weekday indices (0–6). Used by the scheduler to place each session type on its own preferred days.

---

## Success Criteria

- **SC-001**: A user creating a climbing training plan for a 3-sessions/week goal sees the default split 2 + 1 pre-filled.
- **SC-002**: After generating a 4-week month with split 2 + 1, the calendar contains exactly 8 training and 4 supplemental sessions *(assuming no blackouts and sufficient preferred days are configured)*.
- **SC-003**: Opening any supplemental session shows supplemental content in the notes — never the full phase description.
- **SC-004**: A user can tell within 1 second of opening the monthly calendar which days are training and which are supplemental, without hovering or clicking.
- **SC-005**: A user changing the split mid-cycle and regenerating the schedule sees the new ratio applied to the next regenerated month.
- **SC-006**: Cycle restart on a plan with a manually-edited split preserves the split (does not reset to default).
- **SC-007**: Existing data (sessions, plans created before this feature) continues to display correctly with all sessions treated as "training".

---

## Out of Scope

The following are explicitly NOT part of V1 and are deferred to future work:

- Goal-level custom colors (separate spec).
- Phase-specific split overrides (one split per plan, applies across all phases).
- Sport-specific default formulas (one formula across all sports).
- A separate activity type for supplemental sessions (sport activity type is preserved).
- Smart re-balancing if `sessionsPerWeek` changes after the plan exists (warning + manual reconcile only — never silent overwrite).
- Analytics filters or charts that split training vs supplemental volume (Activities dashboard untouched).
- **Tennis and running phase content restructuring** (deferred to V1.1 and V1.2 respectively — V1 ships the schema and scheduler universally, but only climbing content gets restructured).
- Automatic reconciliation when `sessionsPerWeek` changes on the goal (manual reconcile only, with non-blocking warning).
