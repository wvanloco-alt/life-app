# Feature Specification: Goals V2 -- Hierarchy, Dashboard & Flexible Tracking

**Feature Branch**: `goals-v2`
**Created**: 2026-03-12
**Status**: Specified
**Input**: User feedback after first real use of the Goals section.

> "There is no main goal to work towards and there is no dashboard. My goals are yearly, but then we subdivide them into monthly brackets, which should be used as a benchmark for weekly scheduled activities. I also can't set targets that make sense for things like reading books."

---

## Overview

The current Goals section is a flat list. Every goal is at the same level, there is no sense of direction or progress over time, and the only progress tracking is a small per-week progress bar. This redesign introduces:

1. **Two-level hierarchy**: Yearly goals with monthly benchmarks under them.
2. **Cumulative pace tracking**: For a yearly goal of "12 books", the system computes whether you are ahead, on track, or behind based on where you are in the year -- not whether you hit exactly 1 per month.
3. **Simple tally logging**: A "+1" button for non-athletic goals (books read, podcasts finished, journal entries) that does not require activity types or duration tracking.
4. **Goals Dashboard**: A visual default view replacing the flat list -- yearly goal cards with progress rings, a "This Month" section, and a pace indicator for each goal.
5. **Scheduler integration**: The monthly plan's auto-scheduler uses the current month's benchmark (monthly sub-goal) to determine how many sessions to schedule, not just the flat `sessionsPerWeek` value.

### Key Concepts

- **Yearly Goal**: The big objective. "Read 12 books in 2026." "Run 500km in 2026." "Save €10,000 by December." Has a yearly target value and optional activity type. The target year is derived from `targetDate` (user sets targetDate to Dec 31 of the target year).
- **Monthly Benchmark**: A monthly sub-goal under a yearly goal. Can be auto-generated (target / 12) or set manually. Answers the question: "What do I need to do this month to stay on track?"
- **Pace**: Whether cumulative progress is keeping up with the fraction of the year elapsed. By month 3, you should have ~25% of your yearly target done. If you have 33%, you are ahead.
- **Tally Log**: A simple count entry on a goal. No activity type, no duration required. Date + count + optional note. The tally `count` is always expressed in the same unit as the goal's `targetUnit` -- if the goal is "Run 500 km", a tally of count=5 means 5 km logged.
- **Standalone Goal**: A goal with no horizon -- unchanged from today. Backward compatible.

---

## Clarifications

### Session 2026-03-12

- Q: Should monthly benchmarks be auto-generated or manually created? → A: Either. User can set a yearly goal and manually add monthly benchmarks for any months they want to plan. No forced auto-generation.
- Q: What is the "on track" threshold? → A: Cumulative progress ≥ expected progress (fraction of year × yearly target). Small tolerance: within 5% is considered on track.
- Q: Should tally goals also support activity type tracking? → A: Yes -- both mechanisms can be used. Activity type tracking for athletic goals, simple tally for everything else, or both together.
- Q: When the scheduler generates activities for a month, which target does it use? → A: The monthly sub-goal's `sessionsPerWeek` if one exists for that month. Otherwise falls back to the yearly goal's `sessionsPerWeek`.
- Q: Do monthly goals require a yearly parent? → A: No. A monthly goal can be standalone (e.g., "Read 2 books in March 2026" as a one-off, not linked to a yearly plan).

---

## User Stories & Acceptance Scenarios

### User Story 1 -- Goals Dashboard (Priority: P1)

As a user, when I open the Goals section, I want to see a visual overview of my yearly goals with their current progress and pace status -- not a flat list.

**Why this priority**: The dashboard is the entry point. Every other Goals V2 feature surfaces through it. Without it, the new hierarchy has no home.

**Independent Test**: Navigate to `/goals`. Verify the default view shows cards with progress indicators, not a plain list.

**Acceptance Scenarios**:

1. **Given** the Goals page loads, **When** I view it, **Then** I see a dashboard with yearly goal cards, a "This Month" section, and a compact standalone goals list -- not a scrollable text list.
2. **Given** I have 3 yearly goals, **When** I view the dashboard, **Then** each goal has its own card with: title, role badge(s), a progress indicator showing current vs. target, and a pace badge (On Track / Ahead / Behind / No Data).
3. **Given** a yearly goal has monthly sub-goals, **When** I view that goal's card, **Then** I see the current month's benchmark and its progress (e.g., "March: 1/1 book").
4. **Given** no yearly goals exist, **When** I view the dashboard, **Then** I see an empty state with a prompt to create my first yearly goal.
5. **Given** I have standalone goals (no horizon), **When** I view the dashboard, **Then** they appear in a compact "Standalone Goals" section below the yearly goals, preserving backward compatibility.

---

### User Story 2 -- Create a Yearly Goal (Priority: P1)

As a user, I want to create a goal with a yearly horizon so that I can define a big objective for the year with a measurable total target.

**Why this priority**: The entire hierarchy starts here. Without yearly goals, there are no monthly benchmarks.

**Independent Test**: Create a yearly goal. Verify it appears on the dashboard. Verify it is distinguishable from a standalone goal.

**Acceptance Scenarios**:

1. **Given** I click "New Goal", **When** the form opens, **Then** I see a Horizon selector at the top: "Yearly" | "Monthly" | "Standalone" (default: Yearly).
2. **Given** I select "Yearly" horizon, **When** I fill in the form, **Then** I see: title, role(s), target date (defaults to Dec 31 of current year), optional activity type, target value, target unit, and sessions per week. The target year for pace calculations is derived from `targetDate`.
3. **Given** I set a yearly goal of "Read 12 books" with target value 12 and no activity type, **When** I save it, **Then** it appears on the dashboard as a yearly goal card with "0 / 12" progress.
4. **Given** I set a yearly goal of "Run 500km" linked to the Running activity type with target value 500 and metric "distance_km", **When** I save it, **Then** it tracks running distance from activity logs.
5. **Given** I save a yearly goal, **When** I view it on the dashboard, **Then** the pace shows "No Data" until at least one log or tally is entered.

---

### User Story 3 -- Set Monthly Benchmarks (Priority: P1)

As a user, I want to add monthly benchmarks under a yearly goal so that the year is broken into manageable chunks and the scheduler knows what to plan each month.

**Why this priority**: Without monthly benchmarks, the hierarchy is incomplete and the scheduler integration is impossible.

**Independent Test**: Add a monthly benchmark to a yearly goal. Verify it shows up under the goal. Verify the scheduler uses it when generating a schedule for that month.

**Acceptance Scenarios**:

1. **Given** I have a yearly goal, **When** I open it, **Then** I see a "Monthly Benchmarks" section listing all months with sub-goals defined, and an "Add Benchmark" button.
2. **Given** I click "Add Benchmark", **When** the form opens, **Then** I can pick a month (e.g., March 2026), set a target value for that month, and set sessions per week for that month.
3. **Given** a yearly goal with target 12 and no benchmarks, **When** I click "Auto-generate benchmarks", **Then** I see a toggle with two options:
   - **"Plan for whole year"** (default): creates 12 monthly benchmarks each with target = 1. This allows me to backtrack progress on past months.
   - **"Plan from now"**: creates benchmarks only for the current month onward, dividing the remaining target evenly across remaining months.
   Sessions per week are inherited from the yearly goal. All generated benchmarks are editable after generation.
4. **Given** I have a yearly goal "Run 500km" and add a March benchmark of 50km, **When** the auto-scheduler generates activities for March, **Then** it uses the March benchmark's `sessionsPerWeek` to determine how many running sessions to schedule.
5. **Given** a month with no benchmark defined, **When** the scheduler generates for that month, **Then** it falls back to the yearly goal's `sessionsPerWeek`.
6. **Given** I have added benchmarks for some months but not all, **When** I view the yearly goal, **Then** months with benchmarks are highlighted and months without benchmarks are shown as empty slots.

---

### User Story 4 -- Track Cumulative Pace (Priority: P1)

As a user, I want to see whether I am on track toward my yearly goal based on cumulative progress relative to where I am in the year -- not whether I hit an exact monthly quota.

**Why this priority**: This is the core value of the yearly horizon. Without it, the yearly goal is just a number with no meaningful progress feedback.

**Independent Test**: Create a yearly goal, log some progress, and verify the pace badge reflects cumulative progress vs. fraction of year elapsed.

**Acceptance Scenarios**:

1. **Given** a yearly goal of 12 books and today is March 31 (25% through the year), **When** I have read 4 books (33% of target), **Then** the pace badge shows "Ahead".
2. **Given** a yearly goal of 12 books and today is March 31 (25% through the year), **When** I have read 3 books (25% of target), **Then** the pace badge shows "On Track".
3. **Given** a yearly goal of 12 books and today is March 31 (25% through the year), **When** I have read 1 book (8% of target), **Then** the pace badge shows "Behind".
4. **Given** a yearly goal with no logs or tallies, **When** I view it, **Then** the pace badge shows "No Data" (not "Behind").
5. **Given** a yearly goal, **When** I view the progress indicator, **Then** I see "X / Y (unit)" alongside a visual bar or ring showing percentage complete.

---

### User Story 5 -- Log Progress via Simple Tally (Priority: P1)

As a user, I want to log "+1 book read" directly on a goal without needing to create an activity type, log a duration, or track calories. A simple count with a date is enough.

**Why this priority**: This is the non-athletic tracking gap. Without it, goals like "Read 12 books" or "Write 52 journal entries" cannot be tracked in a meaningful way.

**Independent Test**: On a goal without an activity type, click "Log Progress". Enter count = 1. Verify it updates the goal's progress.

**Acceptance Scenarios**:

1. **Given** a yearly goal with no activity type linked, **When** I view its card, **Then** I see a "Log Progress" button.
2. **Given** I click "Log Progress", **When** the mini-form opens, **Then** I see: date (default today), count (default 1, editable), and optional note.
3. **Given** I log count = 2 today (e.g., I finished 2 books this weekend), **When** I save, **Then** the goal's progress updates by 2 and shows today's entry in a tally log list.
4. **Given** I made a mistake on a tally entry, **When** I view the tally list, **Then** I can delete individual entries.
5. **Given** a goal linked to both an activity type AND tally logging, **When** I view its progress, **Then** both activity log sessions and tally entries contribute to the total count.

---

### User Story 6 -- Monthly Goals (Standalone or Linked) (Priority: P2)

As a user, I want to create a goal scoped to a specific month -- either as a standalone monthly target ("Read 2 books in March") or as a child benchmark of a yearly goal.

**Why this priority**: The hierarchy needs to work both top-down (create yearly → add monthly benchmarks) and bottom-up (create a monthly goal first, optionally link to a yearly parent later).

**Independent Test**: Create a standalone monthly goal for March. Verify it appears in the "This Month" section during March. Verify it has no pace indicator (monthly goals don't have cumulative pace -- they either meet the monthly target or they don't).

**Acceptance Scenarios**:

1. **Given** I create a goal with "Monthly" horizon, **When** I fill the form, **Then** I see: title, role(s), month picker, target value, optional "link to yearly goal" dropdown, sessions per week.
2. **Given** it is currently March 2026, **When** I view the Goals dashboard, **Then** the "This Month" section shows all monthly goals for March 2026 (standalone and linked).
3. **Given** a monthly goal for March, **When** I view it, **Then** I see: progress bar, target value, current count, and an "On Track" or "Not Met" status based on whether target is reached by end of month.
4. **Given** a monthly goal linked to a yearly parent, **When** I view the yearly parent's card, **Then** the March benchmark shows progress from this monthly goal.
5. **Given** it is April and I have an incomplete March monthly goal, **When** I view the dashboard, **Then** March goals appear in an "Incomplete" section rather than "This Month", so they are not forgotten.

---

### User Story 7 -- Scheduler Uses Monthly Benchmarks (Priority: P2)

As a user, when I generate a schedule in the Monthly Plan for a given month, I want the scheduler to use that month's benchmark (not the yearly default) to figure out how many sessions to plan.

**Why this priority**: This is the bridge between Goals V2 and the existing scheduling system. Without it, the monthly benchmarks exist but do nothing.

**Independent Test**: Set a yearly goal with `sessionsPerWeek = 3`. Add a March benchmark with `sessionsPerWeek = 5`. Generate a schedule for March. Verify the scheduler plans ~5 sessions per week for that goal, not 3.

**Acceptance Scenarios**:

1. **Given** a yearly goal with 3 sessions/week and a March benchmark with 5 sessions/week, **When** I generate a schedule for March, **Then** the schedule contains ~5 sessions per week for that goal.
2. **Given** a yearly goal with no March benchmark, **When** I generate a schedule for March, **Then** the schedule uses the yearly goal's `sessionsPerWeek` (fallback behavior unchanged).
3. **Given** a monthly benchmark says "50km in March" and I have already run 20km this month, **When** I generate a schedule for the remaining weeks of March, **Then** the scheduler targets the remaining 30km spread across the remaining weeks.
4. **Given** I run the scheduler in "month" scope, **When** it generates activities, **Then** the schedule preview shows which benchmark target was used for each goal.

---

### User Story 8 -- Goal Lifecycle Management (Priority: P2)

As a user, I want to complete, archive, and delete yearly goals and their monthly benchmarks without losing the history of what I accomplished.

**Why this priority**: The existing lifecycle (active/completed/archived) applies to the new hierarchy and needs to work correctly.

**Independent Test**: Complete a yearly goal. Verify its monthly sub-goals are also marked completed. Verify past logs and tallies remain visible.

**Acceptance Scenarios**:

1. **Given** a yearly goal I have finished, **When** I mark it as completed, **Then** it moves to the "Completed" section and all its monthly sub-goals are also marked completed.
2. **Given** a completed yearly goal, **When** I view it, **Then** I can see the full history of tallies and activity logs that contributed to its completion.
3. **Given** a yearly goal I want to pause, **When** I archive it, **Then** it is hidden from the dashboard but its monthly sub-goals and progress history are preserved.
4. **Given** I delete a yearly goal, **When** I confirm the delete, **Then** all its monthly sub-goals and tally logs are also deleted (cascade).
5. **Given** I delete a monthly sub-goal that is a child of a yearly goal, **When** I confirm, **Then** only that month's benchmark is removed; the yearly goal and other months are unaffected.

---

## Edge Cases

- **What if a user enters tally logs for a month where no benchmark exists?** The tally still counts toward the yearly total. The monthly progress shows actual vs. "no benchmark set".
- **What if a yearly goal is linked to an activity type AND has tally logs?** Both sources count toward progress. The dashboard shows a combined total.
- **What if a monthly benchmark target is higher than the yearly goal remaining?** The benchmark shows >100% progress; the user is over-delivering for that month, which is fine.
- **What if the year changes and the goal is not completed?** Yearly goals persist across year boundaries. A "Run 500km in 2026" goal stays active until completed or archived, regardless of the year rollover.
- **What if no monthly benchmarks are created for a yearly goal?** The yearly goal still tracks cumulative progress. Benchmarks are optional.
- **What if the user has existing standalone goals when upgrading to Goals V2?** Existing goals have `horizon = null` and continue to function unchanged. They appear in the "Standalone Goals" section of the dashboard.
- **What if the scheduler is run for a week that spans two months?** Use the monthly benchmark for the month that contains the majority of the week (4+ days).
- **What if a monthly goal is linked to a yearly parent but the tally/activity log is on the monthly goal, not the yearly?** Progress rolls up: the yearly goal's total includes progress logged against any of its monthly children.

---

## Functional Requirements

### Dashboard

- **FR-001**: System MUST display a Goals Dashboard as the default view at `/goals`, replacing the flat list as the primary interface.
- **FR-002**: Dashboard MUST show a summary line: "X of Y yearly goals on track" at the top.
- **FR-003**: Dashboard MUST show yearly goal cards with: title, role badge(s), progress indicator (current / target), and pace status badge.
- **FR-004**: Dashboard MUST include a "This Month" section showing all monthly goals (linked or standalone) for the current calendar month.
- **FR-005**: Dashboard MUST include a compact "Standalone Goals" section at the bottom for goals with no horizon set.
- **FR-006**: Pace status badge MUST show one of: "Ahead", "On Track", "Behind", "No Data". Thresholds: Ahead = achieved% > elapsed% + 5%, On Track = within ±5%, Behind = achieved% < elapsed% - 5%.

### Yearly Goals

- **FR-007**: System MUST allow creating a goal with `horizon = 'yearly'` via a Horizon selector in the goal form.
- **FR-008**: Yearly goals MUST support an optional `targetValue` (numeric) and `targetUnit` (free text label stored in the `target_unit` column, e.g., "books", "km", "entries"). Both are used for dashboard display (e.g., "4 / 12 books").
- **FR-009**: Yearly goals MUST support both activity-type-based tracking (via `activityTypeId` + `targetMetric`) and tally-based tracking (via `goal_tallies`).
- **FR-010**: Progress for a yearly goal MUST aggregate: direct activity logs linked to this goal + activity logs linked to any of its monthly sub-goals + tally entries linked to this goal or its monthly sub-goals.

### Monthly Benchmarks

- **FR-011**: System MUST allow creating a goal with `horizon = 'monthly'` and a specific `month` (YYYY-MM format).
- **FR-012**: Monthly goals MUST support an optional `parentGoalId` linking them to a yearly parent.
- **FR-013**: System MUST provide an "Auto-generate benchmarks" action on yearly goals with a toggle:
  - **"Plan for whole year"** (default): creates 12 monthly sub-goals with `targetValue = yearlyTarget / 12`. This allows backtracking progress on past months.
  - **"Plan from now"**: creates monthly sub-goals only for the current month onward, with `targetValue = remainingTarget / remainingMonths`.
  - Both options inherit `sessionsPerWeek` from the yearly goal. All generated sub-goals are editable after generation.
- **FR-014**: Monthly goal progress MUST be calculated from logs and tallies scoped to that specific month only.

### Tally Logging

- **FR-015**: System MUST provide a `goal_tallies` table for storing simple count-based progress entries (goalId, date, count, notes).
- **FR-016**: Any goal (regardless of horizon) MUST support tally logging via a "Log Progress" button on its card.
- **FR-017**: The tally form MUST accept: date (default today), count (default 1, minimum 1), optional note.
- **FR-018**: Individual tally entries MUST be deletable.
- **FR-019**: The tally log history MUST be visible on the goal detail view (list of past entries with date, count, note).
- **FR-019a**: Tally `count` MUST be interpreted in the same unit as the goal's `targetUnit`. Both tallies and activity-log metrics contribute to the same cumulative total. For example, a goal of "Run 500 km" can accumulate progress from activity logs (distance_km metric) and tallies (count in km) simultaneously.

### Scheduler Integration

- **FR-020**: When `POST /api/schedule/generate` is called for a specific month, the scheduler MUST check for a monthly sub-goal for each focus goal for that month.
- **FR-021**: If a monthly sub-goal exists, the scheduler MUST use its `sessionsPerWeek` value instead of the parent yearly goal's value.
- **FR-022**: If a monthly sub-goal exists with a remaining metric target, the scheduler MUST distribute remaining sessions across the remaining weeks of the month.

### Incomplete Past Months

- **FR-025**: Dashboard MUST show an "Incomplete" section for monthly goals from past months that did not meet their target. These goals are displayed separately from the "This Month" section so they are not forgotten.

### Backward Compatibility

- **FR-023**: Existing goals with `horizon = null` (standalone goals) MUST continue to function without any changes to data or behavior.
- **FR-024**: The `status`, `isCompleted`, `roles`, `targetDate`, `sessionsPerWeek`, and existing progress tracking MUST remain unchanged for standalone goals.

---

## Key Entities (New and Modified)

### Goal (modified)

Four new optional fields:
- `horizon`: `'yearly' | 'monthly' | null` -- defines the time scope of the goal
- `parentGoalId`: integer FK → `goals.id` (CASCADE DELETE) -- links a monthly goal to its yearly parent. Deleting the yearly parent cascades to all monthly sub-goals.
- `month`: text (YYYY-MM) -- for monthly goals, which month this benchmark covers
- `targetUnit`: text -- free-text display label for the target value (e.g., "books", "km", "entries"). Used in the dashboard to render "4 / 12 books".

### GoalTally (new)

A simple count-based progress entry. Used when tracking a goal that does not require an activity type.

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER PK | Auto-increment |
| goalId | INTEGER FK → goals.id | The goal this tally counts toward (CASCADE DELETE) |
| date | TEXT (ISO date) | The date this progress was made |
| count | INTEGER default 1 | How many units completed (e.g., 1 book, 2 podcast episodes) |
| notes | TEXT nullable | Optional context (e.g., "Finished 'Atomic Habits'") |
| createdAt | TEXT | ISO 8601 timestamp |

---

## Schema Changes

### Modify `goals` table (additive -- no existing data affected)

```sql
ALTER TABLE goals ADD COLUMN horizon TEXT;           -- 'yearly' | 'monthly' | null
ALTER TABLE goals ADD COLUMN parent_goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE;
ALTER TABLE goals ADD COLUMN month TEXT;             -- YYYY-MM, for monthly goals
ALTER TABLE goals ADD COLUMN target_unit TEXT;       -- free-text display label, e.g. 'books', 'km', 'entries'
```

### New `goal_tallies` table

```sql
CREATE TABLE goal_tallies (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id     INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  date        TEXT NOT NULL,
  count       INTEGER NOT NULL DEFAULT 1,
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## API Changes

### Modified endpoints

- `GET /api/goals` -- add query params: `?horizon=yearly|monthly|standalone`, `?parentId=<id>`, `?month=YYYY-MM`
- `GET /api/goals/:id/progress` -- aggregate across child monthly goals for yearly horizon; support tally-based progress
- `POST /api/goals` -- accept `horizon`, `parentGoalId`, `month` in request body
- `PATCH /api/goals/:id` -- accept `horizon`, `parentGoalId`, `month` in request body
- `POST /api/schedule/generate` -- look up monthly sub-goal for each focus goal; use its `sessionsPerWeek` if found

### New endpoints

- `GET /api/goals/:id/children` -- returns all monthly sub-goals for a yearly goal, each with progress
- `GET /api/goal-tallies?goalId=X&from=YYYY-MM-DD&to=YYYY-MM-DD` -- list tally entries
- `POST /api/goal-tallies` -- create a tally entry (`goalId`, `date`, `count`, `notes`)
- `DELETE /api/goal-tallies/:id` -- delete a tally entry

---

## Success Criteria

- **SC-001**: A user can create a yearly goal, add monthly benchmarks, and see progress on the dashboard in under 5 minutes of first use.
- **SC-002**: Logging a tally entry ("+1 book") takes fewer than 3 taps/clicks from the Goals dashboard.
- **SC-003**: Generating a monthly schedule for a goal with a monthly benchmark uses the benchmark's `sessionsPerWeek`, verified by checking the generated schedule against a known benchmark value.
- **SC-004**: All existing standalone goals display correctly on the dashboard with no data migration or manual changes by the user.
- **SC-005**: Pace status updates correctly after each tally or activity log is added (no manual refresh required).
- **SC-006**: A yearly goal with 12 monthly benchmarks auto-generated from one click shows the correct targets and can have each month edited independently.

---

## Review & Acceptance Checklist

- [x] All P1 user stories have independently testable acceptance scenarios
- [x] All P2 user stories have independently testable acceptance scenarios
- [x] Schema changes are additive (no data loss for existing goals)
- [x] Functional requirements are technology-agnostic
- [x] Edge cases are documented
- [x] Backward compatibility with standalone goals is explicitly required
- [x] Success criteria are measurable and specific
- [x] Spec aligns with Constitution: visual feedback, simplicity, modular design, local-first
- [x] No scope creep -- AI features, Strava, authentication not included
