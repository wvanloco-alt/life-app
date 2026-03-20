# Feature Specification: Tennis Training Periodization V1

**Spec ID**: `tennis-periodization-v1`
**Created**: 2026-03-14
**Revised**: 2026-03-14 (consolidated schema with climbing, per review)
**Status**: Built (complete)
**Source material**: E. Paul Roetert & Mark S. Kovacs (*Tennis Anatomy*, USTA-backed), W. Timothy Gallwey (*The Inner Game of Tennis*), Brad Gilbert (*Winning Ugly*). Reference files in `Tennis/` folder.

> "I want the app to propose a training schedule specific for tennis."

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

When a user has a tennis conditioning goal (supplemental training -- not match play itself), they can attach a **periodization plan** that divides the goal's timeline into training phases. Instead of the scheduler placing identical "Tennis conditioning" sessions every week, it produces phase-aware titles like "Tennis — Strength & Power (Week 2/3)" so the user knows *what type* of training to focus on each day.

The app tells you **which phase you're in and when**. It does not prescribe individual exercises -- the user reads the book for that. The app's job is to structure the *when*, not the *what*.

**Key distinction**: Tennis players typically have two types of scheduled activity:
1. **Match play** -- recurring activities (e.g., Tuesday AM, Thursday PM, Saturday AM). These continue regardless of training phase and are NOT affected by the plan.
2. **Supplemental training** -- a goal with sessions per week (e.g., "Tennis conditioning 3x/week"). This is what the training plan structures into phases.

### What This Feature Does NOT Do

- No exercise library or session templates
- No exercise-by-exercise breakdowns in the calendar
- No "sport agent" architecture or extensibility for other sports
- No multi-step wizard -- a single form is enough
- No automated phase transitions -- manual button to advance
- No integration with match results or win/loss tracking

### Why This Approach

Tennis Anatomy provides a detailed exercise catalog, but the Life App's value is in scheduling, not in being an exercise database. The user has the book. The app tells them *which type* of work to do *when*, and the phase descriptions point them to the right chapter.

---

## Training Science Foundation

This section drives the phase definitions and level assessment logic. All sources are from Tennis Anatomy (Roetert & Kovacs, USTA).

### Why Supplemental Training Matters for Tennis

Tennis is simultaneously aerobic (2-3 hour match duration) and anaerobic (5-15 second explosive points, 500+ direction changes per match). 60-80% of all movement is lateral. The serve generates shoulder internal rotation speeds of 1,074-2,300 degrees per second.

Playing tennis alone does not build the balanced musculature needed to play tennis safely. The muscles that accelerate strokes (pectoralis major, anterior deltoid) are naturally stronger than the muscles that decelerate them (infraspinatus, teres minor, posterior deltoid). Without supplemental training, this imbalance grows over thousands of forehands and serves until the decelerators fail. This is the primary mechanism behind rotator cuff injuries.

**Source**: Tennis Anatomy, Part 1 (Kinetic Chain), Part 7 (Injury Prevention).

### The Three Training Pillars

Tennis supplemental training serves three purposes, each addressed by a different phase:

1. **Foundation & Prehab**: Build the base -- core stability, shoulder balance, ankle proprioception, tendon conditioning. Fix imbalances before loading them. This is where injury prevention lives.

2. **Strength & Power**: Build tennis-specific force production through the kinetic chain. Rotational power (hips → core → shoulder), lateral leg strength, serve power. The 1.5:1 back-to-chest training ratio is enforced here.

3. **Tennis-Specific Endurance**: Train the body to perform at match intensity repeatedly. Movement drills (spider drill, lateral shuffles, cross-step recovery), interval conditioning mimicking point play, sport-specific circuits under fatigue. This is where the 60-80% lateral movement emphasis lives.

### Periodization Models

#### 3-1 Cycle (Beginner)

- **Who**: Players new to supplemental training, or returning from a long break. Less than 2 years of regular play, or self-rated beginner regardless of years.
- **Structure**: 4-week cycle (3 weeks training + 1 week recovery)
- **Why**: Beginners need to build a conditioning base before adding intensity. Tendons and stabilizers (especially rotator cuff and Achilles) need time to adapt to new loads. Jumping straight to power work causes injury.
- **Source**: Tennis Anatomy Part 9 (Training Principles -- frequency, adaptation)

| Phase | Weeks | Focus |
|-------|-------|-------|
| Foundation & Prehab | 3 | Core stability, shoulder prehab, basic leg work, mobility, eccentric calf work |
| Recovery | 1 | Light stretching, no supplemental training. Match play at reduced intensity is fine. |

#### 3-3-2-1 Cycle (Club Player)

- **Who**: Regular players at club level (2-5 years, plays 2-3x/week, has some conditioning experience)
- **Structure**: 9-week cycle
- **Why**: Phased approach prevents overtraining by separating stimulus types. The foundation phase rebuilds after the recovery week, the strength phase builds force production, and the endurance phase converts that strength into match-applicable fitness.
- **Source**: Tennis Anatomy Parts 4, 5, 6, 9

| Phase | Weeks | Focus |
|-------|-------|-------|
| Foundation & Prehab | 3 | Core cylinder (front/side/back), shoulder external rotation, scapular stability, eccentric calf raises, single-leg balance, basic conditioning |
| Strength & Power | 3 | Rotational power (med ball throws, wood chops), lateral lunges, lateral band walks, bent-over rows, push-ups, wrist/forearm work. Back-to-chest ratio 1.5:1 |
| Tennis-Specific Endurance | 2 | Movement drills (spider drill, lateral shuffle, cross-step recovery), interval conditioning, sport-specific circuits |
| Recovery | 1 | Active recovery, light stretching, assessment. No supplemental training. |

**Playing style modifiers** (Club):
- **Baseliner**: `[3, 2, 3, 1]` — one extra week of endurance (lateral stamina is everything), one less week of strength
- **Serve & Volley**: `[3, 3, 1, 1]` — emphasis on power (serve, low volleys), reduced endurance phase since points are shorter
- **All-Court**: `[3, 3, 2, 1]` — default balanced distribution

#### 3-2-1 Cycle (Advanced)

- **Who**: Experienced players (5+ years, plays 3+/week, solid conditioning base)
- **Structure**: 6-week cycle
- **Why**: Advanced players have a foundation. They cycle between building power and converting it to match performance.
- **Source**: Tennis Anatomy Part 9 (Frequency, Adaptation and Detraining)

| Phase | Weeks | Focus |
|-------|-------|-------|
| Strength & Power | 3 | Heavy rotational work, plyometric lateral movement, explosive serves, advanced leg power |
| Performance | 2 | Match-intensity drills, high-speed movement patterns, tactical conditioning (combining physical and mental game) |
| Recovery | 1 | Full recovery. Adaptation happens here. |

**Playing style modifiers** (Advanced):
- **Baseliner**: `[2, 3, 1]` — more performance/endurance time
- **Serve & Volley**: `[3, 1, 1]` — emphasis stays on power; performance phase is shorter since S&V points are explosive and brief
- **All-Court**: `[3, 2, 1]` — default

### Level Assessment

Level is derived from two inputs (self-rated ability + years of regular play). The conservative of the two determines the level:

| | Self-Rating: Beginner | Self-Rating: Club | Self-Rating: Advanced |
|---|---|---|---|
| **<2 years** | Beginner | Beginner | Beginner |
| **2-5 years** | Beginner | Club | Club |
| **5+ years** | Club | Club | Advanced |

**Source**: Tennis Anatomy Part 9 — adaptation rates, detraining timelines, and the principle that experience in *supplemental training* matters more than match-play skill for determining conditioning intensity.

### Physical Limitation Modifiers

These modify the phase descriptions to include sport-specific precautions. Multiple can be active simultaneously.

| Limitation | Modification | Source |
|------------|-------------|--------|
| **Shoulder** | Extra emphasis on external rotation and posterior deltoid work. Limit overhead volume. Monitor deceleration fatigue. | Tennis Anatomy Part 4 (Shoulders) |
| **Back / Scheuermann's** | Anti-extension core work (planks, dead bugs). Bird dogs for thoracic extension. Avoid heavy spinal loading. Scapular retraction is mandatory. | Tennis Anatomy Part 4 (Core) |
| **Knee** | Gluteus medius activation priority (lateral band walks). Single-leg balance progressions. Monitor knee valgus during lunges. | Tennis Anatomy Part 4 (Legs) |
| **Elbow (tennis elbow)** | Reverse wrist curls every session. Eccentric wrist extension. Check grip size. | Tennis Anatomy Part 4 (Arms & Wrists), Part 7 |
| **Ankle / Achilles** | Slow eccentric calf raises (3-4 second lowering phase). Proprioception drills (single-leg balance, eyes closed progression). Gradual volume increase. | Tennis Anatomy Part 4 (Legs), Part 7 |
| **Adductor** | Progressive lateral lunge depth (start bodyweight, build range gradually). Copenhagen plank if tolerated. Stop at any groin discomfort. | Tennis Anatomy Part 4 (Legs), Part 7 |

### Phase Descriptions (What to Do)

These descriptions tell the user what to focus on during each phase. The app displays these -- the user applies them in the gym or on court.

- **Foundation & Prehab**: Core stability (planks, side planks, dead bugs, bird dogs), shoulder prehab (external rotation with band, scapular retraction, bent-over rear raises), lower body basics (eccentric calf raises, single-leg balance, bodyweight squats), mobility. Build the base. Fix imbalances. Prepare tendons and joints for higher loads. Reference: Tennis Anatomy Parts 4 & 8.

- **Strength & Power**: Rotational power (medicine ball throws, cable wood chops, standing hip rotation), lateral leg strength (lateral lunges, lateral band walks, forward lunges, single-leg RDL), upper body (bent-over rows, push-ups, standing cable chest press), wrist/forearm work (wrist curls, reverse curls, pronation/supination). Maintain back-to-chest ratio of at least 1.5:1. Reference: Tennis Anatomy Parts 4 & 5.

- **Tennis-Specific Endurance**: Movement drills (spider drill, lateral shuffles, cross-step to recovery, split step drills), interval conditioning (5-15 second efforts with equal rest, mimicking point play), sport-specific circuits combining movement with stroke simulation under fatigue. 60-80% of movement work should be lateral. Reference: Tennis Anatomy Part 6.

- **Performance**: Match-intensity training combining physical and tactical elements. High-speed movement patterns, explosive serves, pressure-point simulation. Inner Game concentration drills (seam-watching, sound focus, breathing between points). Brad Gilbert's pre-match mental checklist integration. Reference: Tennis Anatomy Part 6, Inner Game Ch. 7-9, Winning Ugly Part 1.

- **Recovery**: No structured supplemental training. Light stretching, foam rolling, easy walking or swimming. Match play continues but at reduced intensity. This is where adaptation happens -- muscles, tendons, and nervous system consolidate gains. Post-recovery assessment: Is back-to-chest ratio still 1:1+? Any shoulder, elbow, or Achilles discomfort? Reference: Tennis Anatomy Part 9.

---

## What Gets Built

### New capabilities

1. **Periodization plan on a goal**: A tennis conditioning goal can have an attached plan with a cycle model, playing style, start date, and auto-generated phases with date ranges.
2. **Level assessment**: The user enters their self-rated ability and years of play. The app derives their level (beginner/club/advanced) and recommends a cycle model.
3. **Phase-aware scheduler titles**: When the scheduler places sessions for a goal with a plan, the activity title includes the current phase name and week number (e.g., "Tennis — Strength & Power (Week 2/3)").
4. **Phase timeline on goal detail**: The goal page shows a visual timeline of phases with the active one highlighted.
5. **Manual phase transition**: A button to mark the current phase complete and activate the next one.
6. **Physical limitation awareness**: Phase descriptions are supplemented with precautions based on declared limitations.

### Consolidated schema approach

This feature reuses the existing `training_plans` and `training_phases` tables built for climbing. A refactoring step adds `sport` and `sport_profile` columns to `training_plans` and `limitation_notes` to `training_phases`. This avoids creating duplicate tables per sport.

### What changes in existing code

| Area | Change | Risk |
|------|--------|------|
| `src/db/schema.ts` | Add `sport`, `sport_profile` columns to `training_plans`. Add `limitation_notes` to `training_phases`. Rename `climber_level` → `player_level`. Remove sport-specific columns from `training_plans` (moved to `sport_profile` JSON). | Medium -- requires migration of existing climbing data |
| `src/types/index.ts` | Add tennis-specific type aliases. Update `TrainingPlan` interface for consolidated schema. | Low |
| `src/lib/training/tennis-periodization.ts` | New file: `assessTennisLevel()`, `generateTennisPhases()`, `buildLimitationNotes()` | None -- additive |
| `src/lib/training/periodization.ts` | Minor: update exports if any climbing-specific column names changed | Low |
| API routes | Update existing routes to handle `sport` discriminator. New tennis-specific assess-level endpoint. | Low |
| `src/lib/scheduler.ts` | No changes -- already works generically via `TrainingPhaseInfo` | None |
| Goal detail UI | Add `TennisTrainingPlanDialog`. Update `TrainingPlanSection` to show limitation notes. | Low |
| `ROADMAP.md` | Document feature | None |

### What does NOT change

- Scheduler algorithm (slot finding, rest constraints, time windows, weekly spread)
- Existing session patterns system (continues to work independently)
- Recurring activities (match play continues unchanged)
- Roles, budget, analytics, mission statement, activity logging
- Goals without training plans work exactly as before

---

## Data Model

### Schema refactoring (from climbing V1)

The existing `training_plans` table is refactored to support multiple sports:

**Columns removed** from `training_plans`:
- `discipline` → moved to `sport_profile` JSON
- `max_boulder_grade` → moved to `sport_profile` JSON
- `max_sport_grade` → moved to `sport_profile` JSON
- `climber_level` → renamed to `player_level` (generic)

**Columns added** to `training_plans`:
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `sport` | text | NOT NULL | "climbing" or "tennis" (discriminator) |
| `sport_profile` | text | NOT NULL, default '{}' | JSON blob for sport-specific profile data |

**Column added** to `training_phases`:
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `limitation_notes` | text | nullable | Extra precautions based on physical limitations (tennis-specific) |

### `training_plans` after refactoring

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | integer | PK, autoIncrement | |
| `goal_id` | integer | FK → goals.id, NOT NULL, unique, CASCADE | One plan per goal |
| `sport` | text | NOT NULL | "climbing" or "tennis" |
| `periodization_model` | text | NOT NULL | "4-1", "4-3-2-1", "3-2-1", "3-1", "3-3-2-1" |
| `player_level` | text | NOT NULL | "beginner", "intermediate", "club", "advanced" |
| `years_experience` | integer | NOT NULL | |
| `sport_profile` | text | NOT NULL, default '{}' | JSON: climbing `{ discipline, maxBoulderGrade, maxSportGrade }`, tennis `{ selfRating, playingStyle, matchesPerWeek, physicalLimitations }` |
| `start_date` | text | NOT NULL | ISO date |
| `status` | text | NOT NULL, default "active" | "active", "paused", "completed" |
| `created_at` | text | NOT NULL, default now | |
| `updated_at` | text | NOT NULL, default now | |

### `training_phases` after refactoring

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | integer | PK, autoIncrement | |
| `training_plan_id` | integer | FK → training_plans.id, NOT NULL, CASCADE | |
| `phase_type` | text | NOT NULL | Sport-specific: climbing or tennis phase type strings |
| `order_index` | integer | NOT NULL | Position in the cycle (0-based) |
| `duration_weeks` | integer | NOT NULL | |
| `start_date` | text | NOT NULL | |
| `end_date` | text | NOT NULL | |
| `status` | text | NOT NULL, default "upcoming" | "upcoming", "active", "completed" |
| `description` | text | NOT NULL | What to focus on during this phase |
| `limitation_notes` | text | nullable | Extra precautions (tennis physical limitations) |
| `created_at` | text | NOT NULL, default now | |
| `updated_at` | text | NOT NULL, default now | |

### Sport profile JSON shapes

**Climbing**:
```json
{
  "discipline": "bouldering",
  "maxBoulderGrade": "V5",
  "maxSportGrade": "6b+"
}
```

**Tennis**:
```json
{
  "selfRating": "club",
  "playingStyle": "baseliner",
  "matchesPerWeek": 3,
  "physicalLimitations": ["back", "adductor", "ankle"]
}
```

**Total: 0 new tables** (reuses existing 2 tables with additive columns).

---

## API Routes

### `POST /api/training-plans/assess-level`

Updated to accept a `sport` parameter. Returns sport-appropriate assessment.

**Request (tennis)**:
```json
{
  "sport": "tennis",
  "selfRating": "club",
  "yearsPlaying": 5,
  "playingStyle": "baseliner"
}
```

**Response** `200`:
```json
{
  "derivedLevel": "club",
  "recommendedModel": "3-3-2-1",
  "cycleLengthWeeks": 9,
  "explanation": "Club-level players with 5 years of play benefit from structured periodization..."
}
```

### `GET /api/training-plans?goalId=8`

Returns the training plan for a goal (same endpoint as climbing). The `sport` field distinguishes them.

### `POST /api/training-plans`

Create a training plan. Now accepts a `sport` field and `sportProfile` JSON.

**Request (tennis)**:
```json
{
  "goalId": 8,
  "sport": "tennis",
  "yearsExperience": 5,
  "startDate": "2026-04-01",
  "sportProfile": {
    "selfRating": "club",
    "playingStyle": "baseliner",
    "matchesPerWeek": 3,
    "physicalLimitations": ["back", "adductor", "ankle"]
  }
}
```

Level and periodization model are derived server-side. Phase descriptions include limitation-specific notes.

### `DELETE /api/training-plans/:id`

Same endpoint, works for both sports.

### `POST /api/training-phases/:id/transition`

Same endpoint, works for both sports.

### `POST /api/training-plans/:id/restart`

Same endpoint, works for both sports.

**No new API routes needed.** The existing routes are extended to handle the `sport` discriminator.

---

## Periodization Engine

A pure function in `src/lib/training/tennis-periodization.ts`. Testable in isolation.

```typescript
type TennisPlayerLevel = "beginner" | "club" | "advanced";
type TennisPlayingStyle = "baseliner" | "all-court" | "serve-volley";
type TennisPhaseType = "foundation-prehab" | "strength-power" | "tennis-endurance" | "performance" | "recovery";
type PhysicalLimitation = "shoulder" | "back" | "knee" | "elbow" | "ankle" | "adductor";

function assessTennisLevel(selfRating: string, yearsPlaying: number): {
  level: TennisPlayerLevel;
  recommendedModel: string;
  explanation: string;
};

function generateTennisPhases(
  level: TennisPlayerLevel,
  playingStyle: TennisPlayingStyle,
  physicalLimitations: PhysicalLimitation[],
  startDate: string
): GeneratedPhase[];

function buildLimitationNotes(
  phaseType: TennisPhaseType,
  limitations: PhysicalLimitation[]
): string | null;

function getTennisPhaseDisplayName(phaseType: TennisPhaseType): string;
```

### Phase Duration Tables

**Beginner (all styles):** `[3, 1]` → Foundation & Prehab (3), Recovery (1)

**Club player by style:**

| Style | Foundation | Strength | Endurance | Recovery | Total |
|-------|-----------|----------|-----------|----------|-------|
| All-Court | 3 | 3 | 2 | 1 | 9 |
| Baseliner | 3 | 2 | 3 | 1 | 9 |
| Serve & Volley | 3 | 3 | 1 | 1 | 8 |

**Advanced by style:**

| Style | Strength | Performance | Recovery | Total |
|-------|----------|-------------|----------|-------|
| All-Court | 3 | 2 | 1 | 6 |
| Baseliner | 2 | 3 | 1 | 6 |
| Serve & Volley | 3 | 1 | 1 | 5 |

---

## Scheduler Integration

**No changes needed.** The climbing integration already built a generic system:

- The generate route fetches `training_plans` by `goalId` and gets the active phase
- It passes `TrainingPhaseInfo` (with `displayName`, `phaseStartDate`, `durationWeeks`, `isRest`) to the scheduler
- The scheduler uses this to build phase-aware titles and skip rest/recovery phases

For tennis, the generate route already covers this because it queries from the same `training_plans` table. The `getTennisPhaseDisplayName()` function in the tennis engine provides the display name. The scheduler sees `isRest: true` for recovery phases and skips them.

### Interaction with match play

Recurring activities (Tuesday/Thursday/Saturday tennis matches) are **completely unaffected** by the training plan. The plan only applies to the supplemental training goal. During a recovery phase, match play continues normally -- only the conditioning sessions are skipped.

---

## UI Changes

### Goal Detail -- Training Plan Section

The existing `TrainingPlanSection` component is reused. It already renders:
- Phase timeline bar with colored segments
- Active phase name and week counter
- Phase transition and restart buttons
- Expanded phase descriptions

**Tennis additions** to `TrainingPlanSection`:
- Physical limitation badges (shown when `sport === "tennis"` and limitations exist)
- `limitationNotes` text displayed below the phase description when present
- Playing style tag (e.g., "Baseliner")

### Tennis Training Plan Form

A new `TennisTrainingPlanDialog` component (the form inputs differ too much from climbing to share a dialog):
- Self-rated ability: Beginner / Club / Advanced (radio buttons)
- Years of regular play (number input)
- Matches per week (number input, for context)
- Playing style: Baseliner / All-Court / Serve & Volley (radio buttons)
- Physical limitations: checkboxes for Shoulder, Back, Knee, Elbow, Ankle/Achilles, Adductor
- Start date (date picker, default today)
- Live level assessment preview (updates as inputs change)
- "Create Plan" button

### Training Plan button on goal card

The existing "Training Plan" button (mountain icon) on `YearlyGoalCard` is updated:
- If the goal's activity type is climbing-related → opens `TrainingPlanDialog` (climbing)
- If the goal's activity type is tennis-related → opens `TennisTrainingPlanDialog`
- Otherwise → shows a sport selector or hides the button

---

## Task Breakdown

### Task 0: Schema Consolidation (prerequisite)
**Files**: `src/db/schema.ts`, `src/types/index.ts`, `src/lib/training/periodization.ts`, `src/app/api/training-plans/route.ts`, `src/components/goals/training-plan-dialog.tsx`
- Add `sport`, `sport_profile` columns to `training_plans`
- Add `limitation_notes` column to `training_phases`
- Rename `climber_level` → `player_level`
- Remove `discipline`, `max_boulder_grade`, `max_sport_grade` columns (move to `sport_profile` JSON)
- Migrate existing climbing plans: set `sport = "climbing"`, populate `sport_profile`
- Update climbing periodization engine, API routes, and dialog to use new column names
- Update `TrainingPlan` TypeScript interface
- **Effort**: Small-Medium

### Task 1: Tennis Periodization Engine
**Files**: `src/lib/training/tennis-periodization.ts`
- Implement `assessTennisLevel()`, `generateTennisPhases()`, `buildLimitationNotes()`, `getTennisPhaseDisplayName()`
- Unit tests for level assessment, phase generation (all 3 levels × 3 styles), and limitation note generation
- **Effort**: Small-Medium

### Task 2: API Route Updates
**Files**: `src/app/api/training-plans/route.ts`, `src/app/api/training-plans/assess-level/route.ts`
- Update assess-level to accept `sport` parameter and dispatch to the correct engine
- Update POST to accept `sport` and `sportProfile`, derive level from the correct engine
- Pass `limitationNotes` when creating tennis phases
- **Effort**: Small

### Task 3: Scheduler Integration
**Effort**: None -- already works generically. Only need to ensure `getTennisPhaseDisplayName()` is called in the generate route for tennis plans (minor lookup update).

### Task 4: UI -- Tennis Training Plan Dialog & Section Updates
**Files**: `src/components/goals/tennis-training-plan-dialog.tsx`, `src/components/goals/training-plan-section.tsx`, `src/components/goals/yearly-goal-card.tsx`
- New `TennisTrainingPlanDialog` with playing style and limitation checkboxes
- Update `TrainingPlanSection` to show limitation notes and playing style
- Update goal card to route to the correct dialog based on activity type
- **Effort**: Medium

**Total: 5 tasks** (including prerequisite consolidation).

---

## Scope Boundaries

### In Scope (V1)
- Level assessment from self-rating + years of play
- 3 periodization models (3-1, 3-3-2-1, 3-2-1) with playing style modifier
- 6 physical limitation modifiers that enrich phase descriptions
- Auto-generated phases with date ranges and descriptions
- Phase-aware scheduler titles
- Manual phase transitions
- Cycle restart
- Phase timeline on goal detail
- Consolidated schema with climbing (shared tables)

### Out of Scope (deferred)

| Feature | Why Deferred |
|---------|-------------|
| Exercise library & session templates | The user reads the book. The app structures *when*, not *what*. |
| Multi-step wizard | A single form captures everything needed. |
| Automated phase transitions | Manual button is sufficient. User knows when they're ready. |
| Sport-agent architecture | Build for tennis only. When running is specified, reassess. |
| Inner Game drills as micro-tasks | Interesting but not V1. Could enrich Performance phase descriptions in V2. |
| Match result tracking | The plan is about conditioning, not match analytics. |
| NTRP rating input | Self-rating (beginner/club/advanced) is sufficient. |
| Detraining awareness | Nice-to-have notification system. Defer to after all sport plans are built. |

---

## Inner Game Integration (V2 Opportunity)

The Performance phase description references Gallwey's concentration techniques and Gilbert's tactical preparation. In a future V2, these could be enriched:

- **Pre-match checklist** (Gilbert): A structured prompt shown the morning of match play.
- **Between-point breathing** (Gallwey): A reminder to practice breath awareness between points.
- **Seam-watching drill** (Gallwey): A suggested warm-up concentration exercise before match play.

These are text-based additions to phase descriptions, not new features. They would require no schema or API changes.

---

## Implementation Notes

Feature was built and deployed as specified. All tasks (0-4) completed:

- **Task 0 (Schema Consolidation)**: `training_plans` and `training_phases` tables consolidated with `sport`, `sport_profile`, `limitation_notes` columns. Existing climbing data migrated. `climber_level` renamed to `player_level`.
- **Task 1 (Periodization Engine)**: `src/lib/training/tennis-periodization.ts` with `assessTennisLevel`, `generateTennisPhases`, `buildLimitationNotes`, `getTennisPhaseDisplayName`, `getTennisCycleTotalWeeks`. 29+ unit tests in `src/lib/__tests__/tennis-periodization.test.ts`.
- **Task 2 (API Routes)**: Existing routes extended with `sport` discriminator. Tennis-specific branching in POST/assess-level/restart routes.
- **Task 3 (Scheduler)**: Confirmed working generically. Recovery phases skip scheduling. Phase display names resolve correctly.
- **Task 4 (UI)**: `TennisTrainingPlanDialog` built with self-rating, years playing, matches/week, playing style, physical limitations, start date, and live assessment preview. `TrainingPlanSection` extended with tennis phase colors, playing style badge, limitation notes. `GoalsPage` routes to correct dialog via `detectSport`.

### Known Limitation

Phase descriptions are pure conditioning/gym content. They don't include on-court tennis focus, mental game techniques, or playing-style-specific practice guidance. This is addressed in a follow-up spec: `tennis-schedule-refactoring`.

*End of specification.*
