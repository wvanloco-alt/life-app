# Feature Specification: Climbing Training Periodization V1

**Spec ID**: `climbing-periodization-v1`
**Created**: 2026-03-14
**Revised**: 2026-03-14 (simplified from original spec after review; schema consolidated for multi-sport support)
**Status**: Built (complete)
**Source material**: Eric Hörst (*Training for Climbing*, 1st & 2nd editions), Carlos Tkacz (*Training for Bouldering*, 2nd edition). Reference files in `Climbing/` folder.

> "I want the app to propose a training schedule specific for climbing."

---

## Table of Contents

1. [Overview](#overview)
2. [Training Science Foundation](#training-science-foundation)
3. [What Gets Built](#what-gets-built)
4. [Data Model](#data-model)
5. [API Routes](#api-routes)
6. [Periodization Engine](#periodization-engine)
7. [Scheduler Integration](#scheduler-integration)
8. [UI Changes](#ui-changes)
9. [Task Breakdown](#task-breakdown)
10. [Scope Boundaries](#scope-boundaries)

---

## Overview

### What This Feature Does

When a user has a climbing goal, they can attach a **periodization plan** that divides the goal's timeline into training phases. Instead of the scheduler placing identical "Climbing" sessions every week, it produces phase-aware titles like "Climbing — Max Strength (Week 2/3)" so the user knows *what type* of training to do on each day.

The app tells you **which phase you're in and when**. It does not prescribe individual exercises -- the user reads the book for that. The app's job is to structure the *when*, not the *what*.

### What This Feature Does NOT Do

- No exercise library or session templates
- No exercise-by-exercise breakdowns in the calendar
- No "sport agent" architecture or extensibility for other sports
- No multi-step wizard -- a single form is enough
- No automated phase transitions -- manual button to advance

### Why This Approach

The original spec proposed 6 new tables, 44 seeded exercises, a 5-step wizard, and a full exercise breakdown system. That's a second app, not a feature. This simplified version delivers the core value (periodized scheduling) with minimal schema changes and no modifications to the existing scheduler algorithm.

---

## Training Science Foundation

This section is preserved from the original spec. The science drives the phase definitions and level assessment logic.

### Periodization Models

Periodization means cycling through distinct training phases rather than doing the same workload year-round. Each phase has a specific physiological target.

#### 4-1 Cycle (Beginner)

- **Who**: Climbers below V3 / below 5.10, or less than 2 years experience
- **Structure**: 5-week cycle (4 weeks training + 1 week rest)
- **Why**: Beginners improve through skill acquisition, not strength training. Tendons are not adapted to high loads.
- **Source**: Hörst, Table 8.2; Tkacz warns against hangboarding before V3-V5

| Phase | Weeks | Focus |
|-------|-------|-------|
| Skill & Volume | 4 | Technique drills, volume climbing 0.5-2 grades below max, basic conditioning |
| Rest | 1 | Active recovery, light stretching, no climbing |

#### 4-3-2-1 Cycle (Intermediate)

- **Who**: Climbers V3-V7 / 5.10-5.12, with 2-5 years experience
- **Structure**: 10-week cycle
- **Why**: Phased approach prevents overtraining by separating stimulus types.
- **Source**: Hörst, Ch. 8

| Phase | Weeks | Focus |
|-------|-------|-------|
| Skill & Stamina | 4 | Volume climbing, technique, stamina. No projecting. |
| Max Strength & Power | 3 | Hard bouldering, fingerboard, high intensity / low volume / long rest |
| Anaerobic Endurance | 2 | Interval climbing, 4x4s, short rest |
| Rest | 1 | Full rest, then light activity |

**Bouldering modifier**: Reduce anaerobic endurance to 1 week, add 1 week to max strength → `[4, 4, 1, 1]`

#### 3-2-1 Cycle (Advanced)

- **Who**: Climbers V7+ / 5.12+, with 5+ years experience
- **Structure**: 6-week cycle
- **Source**: Hörst, Ch. 8

| Phase | Weeks | Focus |
|-------|-------|-------|
| Max Strength & Power | 3 | Hard bouldering, HIT, campus board |
| Anaerobic Endurance | 2 | Route intervals, traverse training, 4x4s |
| Rest | 1 | Full recovery |

**Bouldering modifier**: `[4, 1, 1]`

### Level Assessment

Level is derived from two inputs (max grade + years experience). The conservative of the two determines the level for safety:

| | Grade: Beginner (<V3) | Grade: Intermediate (V3-V7) | Grade: Advanced (V7+) |
|---|---|---|---|
| **<2 years** | Beginner | Beginner | Beginner |
| **2-5 years** | Beginner | Intermediate | Intermediate |
| **5+ years** | Intermediate | Intermediate | Advanced |

**Source**: Hörst, Table 8.1; Tkacz, "Avoid hangboard/campus before V3-V5 and 2+ years."

### Phase Descriptions (What to Do)

These descriptions tell the user what to focus on during each phase. The app displays these -- the user applies them in the gym.

- **Skill & Stamina**: High-volume climbing at submaximal intensity (0.5-2 grades below max). Focus on technique, movement economy, and route-reading. Include basic conditioning (core, antagonist work). No projecting.
- **Max Strength & Power**: High intensity, low volume, long rest (3-5 min between sets). Hard bouldering at V-max. Fingerboard work (intermediate+). Keep sessions short and intense.
- **Anaerobic Endurance**: Short rest intervals (1-2 min). 4x4s, route intervals, traverse training. Train your body to climb while pumped.
- **Rest**: No structured training. Light activity only (walking, stretching, easy traversing). This is where adaptation happens -- not optional.

---

## What Gets Built

### New capabilities

1. **Periodization plan on a goal**: A climbing goal can have an attached plan with a cycle model, discipline, start date, and auto-generated phases with date ranges.
2. **Level assessment**: The user enters their max grade and experience. The app derives their level (beginner/intermediate/advanced) and recommends a cycle model.
3. **Phase-aware scheduler titles**: When the scheduler places sessions for a goal with a plan, the activity title includes the current phase name and week number (e.g., "Climbing — Skill & Stamina (Week 2/4)").
4. **Phase timeline on goal detail**: The goal page shows a visual timeline of phases with the active one highlighted.
5. **Manual phase transition**: A button to mark the current phase complete and activate the next one.

### What changes in existing code

| Area | Change | Risk |
|------|--------|------|
| `src/db/schema.ts` | Add 2 new tables (`training_plans`, `training_phases`) | Low -- additive |
| `src/types/index.ts` | Add interfaces for new entities | None |
| `src/lib/scheduler.ts` | When building activity title, check for active training phase and append phase name + week | Low -- title string only, no algorithm change |
| Goal detail UI | Add "Create Training Plan" button and phase timeline display | Low -- new section |
| `ROADMAP.md` | Document feature | None |

### What does NOT change

- Scheduler algorithm (slot finding, rest constraints, time windows, weekly spread)
- Existing session patterns system (continues to work independently)
- Roles, budget, analytics, mission statement, activity logging
- Goals without training plans work exactly as before

---

## Data Model

### Tables (consolidated for multi-sport support)

The `training_plans` and `training_phases` tables are shared across all sports (climbing, tennis, running). Sport-specific profile data is stored in a JSON `sport_profile` column. See the Tennis Periodization V1 spec for the full consolidated schema.

#### `training_plans`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | integer | PK, autoIncrement | |
| `goal_id` | integer | FK → goals.id, NOT NULL, unique, CASCADE | One plan per goal |
| `sport` | text | NOT NULL | "climbing" or "tennis" |
| `periodization_model` | text | NOT NULL | "4-1", "4-3-2-1", "3-2-1", etc. |
| `player_level` | text | NOT NULL | "beginner", "intermediate", "club", "advanced" |
| `years_experience` | integer | NOT NULL | |
| `sport_profile` | text | NOT NULL, default '{}' | JSON: `{ discipline, maxBoulderGrade, maxSportGrade }` for climbing |
| `start_date` | text | NOT NULL | ISO date |
| `status` | text | NOT NULL, default "active" | "active", "paused", "completed" |
| `created_at` | text | NOT NULL, default now | |
| `updated_at` | text | NOT NULL, default now | |

#### `training_phases`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | integer | PK, autoIncrement | |
| `training_plan_id` | integer | FK → training_plans.id, NOT NULL, CASCADE | |
| `phase_type` | text | NOT NULL | "skill-stamina", "max-strength-power", "anaerobic-endurance", "rest" |
| `order_index` | integer | NOT NULL | Position in the cycle (0-based) |
| `duration_weeks` | integer | NOT NULL | |
| `start_date` | text | NOT NULL | Calculated from plan start + preceding phases |
| `end_date` | text | NOT NULL | start_date + (duration_weeks * 7) |
| `status` | text | NOT NULL, default "upcoming" | "upcoming", "active", "completed" |
| `description` | text | NOT NULL | What to focus on during this phase |
| `limitation_notes` | text | nullable | Extra precautions (used by tennis, null for climbing) |
| `created_at` | text | NOT NULL, default now | |
| `updated_at` | text | NOT NULL, default now | |

**Total: 2 tables** (shared with tennis, down from 6 in the original spec).

---

## API Routes

### `POST /api/training-plans/assess-level`

Preview level assessment without creating a plan. Accepts a `sport` parameter to dispatch to the correct engine.

**Request (climbing)**:
```json
{
  "sport": "climbing",
  "maxBoulderGrade": "V4",
  "maxSportGrade": "6b+",
  "yearsExperience": 3
}
```

**Response** `200`:
```json
{
  "derivedLevel": "intermediate",
  "recommendedModel": "4-3-2-1",
  "explanation": "Your grades (V4, 6b+) fall in the intermediate range, and you have 3 years of experience. Intermediate climbers benefit from structured periodization."
}
```

### `GET /api/training-plans?goalId=5`

Returns the training plan for a goal (if one exists), with phases. The `sport` and `sportProfile` fields distinguish climbing from tennis plans.

**Response** `200`:
```json
{
  "id": 1,
  "goalId": 5,
  "sport": "climbing",
  "periodizationModel": "4-3-2-1",
  "playerLevel": "intermediate",
  "yearsExperience": 3,
  "sportProfile": {
    "discipline": "bouldering",
    "maxBoulderGrade": "V4",
    "maxSportGrade": "6b+"
  },
  "startDate": "2026-03-20",
  "status": "active",
  "phases": [
    {
      "id": 1,
      "phaseType": "skill-stamina",
      "orderIndex": 0,
      "durationWeeks": 4,
      "startDate": "2026-03-20",
      "endDate": "2026-04-17",
      "status": "active",
      "description": "High-volume climbing at submaximal intensity...",
      "limitationNotes": null
    }
  ]
}
```

### `POST /api/training-plans`

Create a training plan with auto-generated phases. Now accepts `sport` and `sportProfile`.

**Request (climbing)**:
```json
{
  "goalId": 5,
  "sport": "climbing",
  "yearsExperience": 3,
  "startDate": "2026-03-20",
  "sportProfile": {
    "discipline": "bouldering",
    "maxBoulderGrade": "V4",
    "maxSportGrade": "6b+"
  }
}
```

The level and periodization model are derived server-side from the profile inputs.

**Response** `201`: The created plan with all generated phases.

### `DELETE /api/training-plans/:id`

Delete a plan and its phases (cascade).

### `POST /api/training-phases/:id/transition`

Advance to the next phase.

**Response** `200`:
```json
{
  "completedPhase": { "id": 1, "phaseType": "skill-stamina", "status": "completed" },
  "activatedPhase": { "id": 2, "phaseType": "max-strength-power", "status": "active" },
  "message": "Transitioned from Skill & Stamina to Max Strength & Power"
}
```

If no next phase exists, sets plan status to "completed" and returns `"message": "Cycle complete"`.

### `POST /api/training-plans/:id/restart`

Start a new cycle (reset all phases to "upcoming", activate the first, recalculate dates from today).

---

## Periodization Engine

A pure function (no side effects, no DB access). Testable in isolation.

```typescript
interface PeriodizationInput {
  level: "beginner" | "intermediate" | "advanced";
  discipline: "bouldering" | "sport";
  startDate: string;
}

interface GeneratedPhase {
  phaseType: string;
  orderIndex: number;
  durationWeeks: number;
  startDate: string;
  endDate: string;
  description: string;
}

function generatePhases(input: PeriodizationInput): GeneratedPhase[];
function assessLevel(maxBoulderGrade: string, maxSportGrade: string, yearsExperience: number): {
  level: "beginner" | "intermediate" | "advanced";
  recommendedModel: string;
  explanation: string;
};
```

The model is derived from the level (beginner → 4-1, intermediate → 4-3-2-1, advanced → 3-2-1). The user does not choose the model -- it follows from their assessment.

Phase descriptions are hardcoded strings in the engine, sourced from the Training Science Foundation section above.

---

## Scheduler Integration

The change to the scheduler is minimal -- **title and reason only**. No algorithm changes.

### Current behavior

When the scheduler creates an activity for a goal:
```
title: "Run 100k per month"
reason: "Session 3/12 — personal time"
```

### New behavior (when goal has an active training plan)

```
title: "Climbing — Max Strength & Power (Week 2/3)"
reason: "Session 3/12 [Max Strength & Power phase] — personal time"
```

### Implementation

In `commitSession` (or `buildReason`), after determining the goal:

1. Check if the goal has a training plan (passed as lookup data, not a DB call)
2. If yes, find the active phase
3. Calculate which week of the phase we're in (from phase start date and activity date)
4. Append phase name and week to the title
5. If the active phase is "rest", set `totalSessionsNeeded = 0` for this goal (skip it)

This is a ~20-line change in `scheduler.ts` and a data lookup in the generate route.

### Interaction with session patterns

Session patterns (the "4km, 4km, 10km" cycling system) continue to work independently. If a climbing goal has both a training plan and session patterns, both apply -- the title gets the phase name, and the session pattern cycles its labels. This is fine because they operate at different levels (phase = macro, pattern = micro).

---

## UI Changes

### Goal Detail -- Training Plan Section

On the goal detail/edit view, for goals linked to a climbing activity type:

- **No plan**: Show a "Create Training Plan" button
- **Has plan**: Show:
  - Climber level badge (e.g., "Intermediate")
  - Phase timeline: horizontal bar with colored segments, active phase highlighted
  - Current phase: name, week X of Y, description text
  - "Advance to Next Phase" button (disabled if on last phase)
  - "Restart Cycle" button (when cycle is complete)
  - "Delete Plan" option

### Monthly Plan Calendar

No change to the calendar itself. The phase-aware titles naturally appear because the scheduler produces them. Activities show "Climbing — Skill & Stamina (Week 2/4)" instead of just "Climbing".

### Training Plan Form

A single dialog (not a wizard) with:
- Discipline: Bouldering / Sport Climbing (radio)
- Max boulder grade (dropdown, V0-V14)
- Max sport grade (dropdown, 5a-8a+)
- Years of experience (number input)
- Start date (date picker, default today)
- Live level assessment preview (updates as inputs change)
- "Create Plan" button

---

## Task Breakdown

### Task 1: Schema, Types & Periodization Engine
**Files**: `src/db/schema.ts`, `src/types/index.ts`, `src/lib/training/periodization.ts`
- Add `training_plans` and `training_phases` tables
- Add TypeScript interfaces
- Implement `assessLevel()` and `generatePhases()` pure functions
- Unit tests for level assessment and phase generation
- **Effort**: Small-Medium

### Task 2: API Routes
**Files**: `src/app/api/training-plans/`, `src/app/api/training-phases/`
- CRUD for training plans (GET, POST, DELETE)
- Level assessment endpoint
- Phase transition endpoint
- Restart cycle endpoint
- **Effort**: Small-Medium

### Task 3: Scheduler Integration
**Files**: `src/lib/scheduler.ts`, `src/app/api/schedule/generate/route.ts`
- Fetch training plans for focus goals in the generate route
- Pass active phase data to the scheduler
- Modify title/reason in `commitSession` to include phase info
- Skip goals in rest phase
- **Effort**: Small

### Task 4: UI -- Training Plan Form & Goal Detail
**Files**: `src/components/goals/goal-form-standalone.tsx` or new component, `src/components/goals/goals-page.tsx`
- Training plan creation dialog
- Phase timeline visualization on goal detail
- Phase transition and restart buttons
- **Effort**: Medium

**Total: 4 tasks** (down from 11 in the original spec).

---

## Scope Boundaries

### In Scope (V1)
- Level assessment from grade + experience
- 3 periodization models (4-1, 4-3-2-1, 3-2-1) with bouldering/sport modifier
- Auto-generated phases with date ranges and descriptions
- Phase-aware scheduler titles
- Manual phase transitions
- Cycle restart
- Phase timeline on goal detail

### Out of Scope (deferred)
| Feature | Why Deferred |
|---------|-------------|
| Exercise library & session templates | The user reads the book. The app structures *when*, not *what*. |
| Exercise-by-exercise calendar breakdown | Adds 4 tables and massive content burden for marginal value. |
| Multi-step wizard | A single form captures everything needed. |
| Automated phase transitions | Manual button is sufficient. User knows when they're ready. |
| Sport-agent architecture | Build for climbing only. No extensibility tax. |
| Strength-Power-Send model (Tkacz) | 3 models covers beginner through advanced. Add later if needed. |
| Target date validation | Nice-to-have but not critical for V1. |
| Phase duration editing | Use the generated defaults. Reassess by deleting and recreating. |

---

## Grade Reference

### Boulder Grades (V-Scale → Level)

| Grade | Level |
|-------|-------|
| V0-V2 | Beginner |
| V3-V7 | Intermediate |
| V8+ | Advanced |

### Sport Grades (French → Level)

| French | Level |
|--------|-------|
| 5a-5c | Beginner |
| 6a-7a | Intermediate |
| 7a+-8a+ | Advanced |

---

*End of specification. Ready for implementation after approval.*
