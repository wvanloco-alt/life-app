# Feature Specification: Running Training Periodization V1

**Spec ID**: `running-periodization-v1`
**Created**: 2026-03-20
**Status**: Specified (not built)
**Source material**: Synthesized running science knowledge base (`Running/Running Training - Complete Guide.md`), grounded in Daniels (*Daniels' Running Formula*), Lydiard, Maffetone, Seiler (80/20), Pfitzinger (*Advanced Marathoning*), and current exercise science consensus.

> "I want the app to propose a training schedule specific for running."

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
9. [Phase Content (Full Text)](#phase-content-full-text)
10. [Physical Limitation System](#physical-limitation-system)
11. [Task Breakdown](#task-breakdown)
12. [Scope Boundaries](#scope-boundaries)

---

## Overview

### What This Feature Does

When a user has a running goal, they can attach a **periodization plan** that divides the goal's timeline into training phases. Instead of the scheduler placing identical "Running" sessions every week, it produces phase-aware titles like "Running — Speed & Specificity (Week 2/4)" so the user knows *what type* of training to focus on each day.

The app tells you **which phase you're in and when**. It does not prescribe individual workouts — the user designs those from the knowledge base. The app's job is to structure the *when*, not the *what*.

**Key distinction from climbing/tennis**: Running is not supplemental training for another activity. The running plan structures the running itself. There is no separate "match play" equivalent. The training plan applies directly to the scheduled running sessions.

### What This Feature Does NOT Do

- No workout library or individual session prescriptions
- No GPS/watch integration or automatic pace tracking
- No race predictor or VDOT calculator
- No multi-step wizard — a single form is enough
- No automated phase transitions — manual button to advance
- No integration with the activity log's pace/distance metrics for plan adjustment

### Why This Approach

Running has more established periodization science than climbing or tennis, with well-documented frameworks (Daniels, Lydiard, Pfitzinger). The app's value is in scheduling and phase awareness — telling the user which training emphasis to apply this week — not in being a training log or pace calculator. The user can reference the knowledge base document for the details of what each phase means.

---

## Training Science Foundation

### Why Periodization Matters for Running

Running is overwhelmingly aerobic (90–99% of energy depending on distance), but different aspects of aerobic fitness respond to different training stimuli. Base aerobic development, lactate threshold improvement, VO2max development, and race-specific speed all require distinct workout types and loading patterns.

Training the same way year-round produces plateaus. Periodization cycles through focused phases so each physiological system gets a concentrated stimulus, then maintenance, then a peak for race day.

**Source**: Daniels' Running Formula (4-phase model), Lydiard (base-first philosophy), Seiler (80/20 polarized distribution).

### The 80/20 Principle

Approximately 80% of training should be at low intensity (Zone 1–2, conversational pace) and 20% at high intensity (Zone 4–5, threshold and above). Minimal time in Zone 3 (the "gray zone" — too hard to recover from quickly, too easy to drive major adaptation). This distribution is the single most important training principle and applies across all phases.

Recreational runners typically violate this by running their easy days too fast (15–30% faster than optimal) and their hard days too slow. The result: chronic fatigue, injury, and stagnation.

**Source**: Seiler's research on elite endurance athletes, confirmed across multiple studies.

### Training Zones

| Zone | Name | % Max HR | Purpose |
|------|------|----------|---------|
| 1 | Active Recovery | 50–60% | Blood flow, recovery, warm-up/cool-down |
| 2 | Aerobic Base | 60–70% | Mitochondrial density, capillary networks, fat oxidation. THE foundation. |
| 3 | Tempo / Threshold | 70–80% | Gray zone. Useful in moderation, harmful in excess. |
| 4 | Lactate Threshold | 85–90% | Lactate clearance capacity. One quality session per week. |
| 5 | VO2max / Intervals | 90–100% | Maximum oxygen uptake, neuromuscular power. Short intervals only. |

### Workout Types

| Workout | Zone | Duration | Purpose |
|---------|------|----------|---------|
| Easy run | 1–2 | 30–60 min | Aerobic base, recovery between hard sessions |
| Long run | 1–2 | 60–150 min | Endurance, fat oxidation, mental resilience |
| Tempo run | 3–4 | 15–40 min sustained | Lactate threshold improvement |
| Intervals | 5 | 200m–1600m reps | VO2max development, running economy |
| Fartlek | 2–4 | 30–45 min mixed | Speed play — less structured than intervals |
| Hill repeats | 4–5 | 30s–3min reps | Leg strength, power, running economy |
| Progression run | 2→4 | 30–50 min | Running fast on tired legs |
| Strides | 5 | 80–100m × 4–6 | Neuromuscular coordination, leg turnover |
| Recovery run | 1 | 20–30 min | Active recovery, blood flow |

### Periodization Models

#### 3-Phase (Beginner)

- **Who**: Runners with less than 6 months consistent running, or returning after a long break. Cannot yet sustain 30 minutes of continuous easy running. Running 0–3 times per week.
- **Structure**: Variable length, minimum 12 weeks
- **Why**: Beginners need to build the habit, develop connective tissue resilience, and establish an aerobic base before any quality work. Cardiovascular fitness improves in weeks; tendons and bones need months. Skipping this causes injury.
- **Source**: Maffetone (aerobic base first), Lydiard (base conditioning is the most important phase).

| Phase | Weeks | Focus |
|-------|-------|-------|
| Base Building | 6–10 | All easy running. Build volume gradually. Introduce strides in the second half. |
| Development | 4–8 | One quality session per week (tempo or fartlek). Continue building long run. |
| Race Prep & Taper | 2–4 | Reduce volume, maintain intensity. Race-pace work. Arrive fresh. |
| Rest & Recovery | 1 | No structured running. Supercompensation. Post-cycle assessment. |

> **Note on the rest phase**: A 1-week rest phase is automatically appended to every cycle at every level, consistent with climbing and tennis. The rest phase allows connective tissue recovery and prevents accumulated fatigue from undermining the next training block. When the plan restarts, the cycle begins again from the first phase.

#### 4-Phase (Intermediate)

- **Who**: Runners training 4–5 times per week, 30–50 km/week, 1–3 years consistent running. Has raced at least one 5K or 10K. Comfortable with 60+ minute easy runs.
- **Structure**: 16–24 weeks
- **Why**: Structured periodization with quality sessions. Mirrors Daniels' 4-phase model adapted for recreational runners.
- **Source**: Daniels (VDOT, 4-phase system), Lydiard (base-first), 80/20 distribution.

| Phase | Weeks | Focus |
|-------|-------|-------|
| Base & Injury Prevention | 4–6 | Aerobic foundation. Easy running with strides. Strength training. Build to target volume. |
| Strength & Endurance | 4–6 | Tempo runs and hill repeats. Long runs extend to target distance. One quality session/week. |
| Speed & Specificity | 4–6 | VO2max intervals. Race-specific workouts. Two quality sessions/week (one threshold, one intervals). |
| Taper & Race | 2–3 | Volume reduction. One quality session/week at reduced duration. Race-pace tune-ups. Arrive fresh. |
| Rest & Recovery | 1 | No structured running. Supercompensation. Post-cycle assessment. |

**Goal distance modifiers** (Intermediate):
- **5K/10K**: `[4, 4, 6, 2]` — longer speed phase, shorter taper
- **Half Marathon**: `[5, 5, 5, 3]` — balanced, longer taper
- **Marathon**: `[6, 6, 4, 3]` — longer base and endurance, shorter speed phase
- **General Fitness**: `[5, 5, 4, 2]` — balanced, shorter taper (no race target)

#### 4-Phase (Advanced)

- **Who**: Runners training 5–7 times per week, 50–80+ km/week, 3+ years consistent running. Has raced half marathon and/or marathon distances. Comfortable with sustained threshold efforts and VO2max intervals.
- **Structure**: 16–24 weeks
- **Why**: Higher volume, more quality sessions, and longer phases. May use a 3:1 build/recovery micro-cycle within each phase (3 weeks building, 1 week deload).
- **Source**: Daniels (advanced VDOT plans), Pfitzinger (marathon-specific volume).

| Phase | Weeks | Focus |
|-------|-------|-------|
| Base & Injury Prevention | 4–6 | High-volume easy running. Strides. Strength training. Build to peak mileage. |
| Strength & Endurance | 4–6 | Tempo runs, cruise intervals, hill work. Long runs with marathon-pace segments. Two quality sessions/week. |
| Speed & Specificity | 4–6 | VO2max intervals, race-pace work. Event-specific sessions. Two quality sessions/week. |
| Taper & Race | 2–3 | Volume reduction 20–40%. Maintain sharpness. Race-pace tune-ups. |
| Rest & Recovery | 1 | No structured running. Supercompensation. Post-cycle assessment. |

**Goal distance modifiers** (Advanced):
- **5K/10K**: `[4, 4, 6, 2]`
- **Half Marathon**: `[5, 5, 5, 3]`
- **Marathon**: `[6, 6, 5, 3]` — longer throughout, marathon demands more preparation at every phase
- **General Fitness**: `[5, 5, 4, 2]`

### Level Assessment

Level is derived from three inputs: weekly running frequency, years of consistent running, and race history. The conservative of these determines the level.

| | Frequency: 0–3x/week | Frequency: 4–5x/week | Frequency: 5–7x/week |
|---|---|---|---|
| **<1 year consistent** | Beginner | Beginner | Beginner |
| **1–3 years consistent** | Beginner | Intermediate | Intermediate |
| **3+ years consistent** | Intermediate | Intermediate | Advanced |

**Override**: If a runner cannot sustain 30 minutes of continuous easy running, they are Beginner regardless of other factors. If they have never completed a race, cap at Intermediate regardless of volume or years.

**Note on Novice**: The knowledge base (Part 8) describes four levels: Beginner, Novice, Intermediate, Advanced. For periodization purposes, Novice is treated as Beginner — both use the 3-phase model. The distinction matters for workout complexity (novice runners add strides earlier and can sustain 30+ minutes of continuous running) but not for plan structure. The phase descriptions for Beginner already accommodate the full range from "cannot run 30 minutes" to "running 3 times per week comfortably."

**Source**: McMillan running level system, Humphrey classification, common coaching practice.

### Physical Limitation Modifiers

These modify phase descriptions to include running-specific precautions. Multiple can be active simultaneously.

| Limitation | Modification | Source |
|------------|-------------|--------|
| **Achilles** | Eccentric calf work every session. Conservative volume progression. Walk/run protocol for flare-ups. Footwear rotation mandatory. | Alfredson protocol, knowledge base Part 5 |
| **Knee (runner's knee)** | Glute and quad strengthening priority. Monitor stairs and downhill. Single-leg stability work. | Knowledge base Part 5 |
| **Shin splints** | Reduce impact: softer surfaces, shorter stride. Anterior tibialis strengthening (toe raises). No sudden volume jumps. | Knowledge base Part 5 |
| **Plantar fascia** | Calf stretching and foot strengthening (towel curls, marble picks). Arch support assessment. Morning mobility routine. | Knowledge base Part 5 |
| **Back (Scheuermann's)** | Anti-extension core work mandatory. Monitor posture fatigue on long runs. Thoracic mobility and chest stretching. No heavy spinal loading in strength work. | Knowledge base Parts 5–6 |
| **Hip / Adductor** | Progressive lateral work. Copenhagen plank if tolerated. No sudden hill volume increases. Stop at any groin discomfort. | Knowledge base Part 5 |

---

## What Gets Built

### New capabilities

1. **Periodization plan on a goal**: A running goal can have an attached plan with a cycle model, goal distance, start date, and auto-generated phases with date ranges.
2. **Level assessment**: The user enters their running frequency, years of consistent running, and race history. The app derives their level (beginner/intermediate/advanced) and recommends a periodization model.
3. **Phase-aware scheduler titles**: When the scheduler places sessions for a goal with a plan, the activity title includes the current phase name and week number (e.g., "Running — Speed & Specificity (Week 2/4)").
4. **Phase timeline on goal detail**: The goal page shows a visual timeline of phases with the active one highlighted.
5. **Manual phase transition**: A button to mark the current phase complete and activate the next one.
6. **Physical limitation awareness**: Phase descriptions are supplemented with precautions based on declared limitations.
7. **Three-layered phase descriptions**: Each phase includes running focus, supplemental training, and mental training sections — built from scratch with full content (no separate content upgrade spec needed).

### Consolidated schema approach

This feature reuses the existing `training_plans` and `training_phases` tables. A `sport: "running"` discriminator is added. Running-specific profile data lives in the `sport_profile` JSON column. **Zero new tables.**

### What changes in existing code

| Area | Change | Risk |
|------|--------|------|
| `src/types/index.ts` | Add `RunnerLevel`, `RunningGoalDistance`, `RunningPhaseType`, `RunningLimitation`, `RunningSportProfile`, `RunningPeriodizationModel`. Update `TrainingSport`, `PeriodizationModel`, `PhaseType`, `SportProfile` unions. | Low — additive |
| `src/lib/training/running-periodization.ts` | New file: `assessRunningLevel()`, `generateRunningPhases()`, `buildRunningPhaseDescription()`, `buildRunningLimitationNotes()`, `getRunningPhaseDisplayName()` | None — additive |
| `src/app/api/training-plans/route.ts` | Add `"running"` branch in POST handler | Low |
| `src/app/api/training-plans/assess-level/route.ts` | Add `"running"` branch | Low |
| `src/app/api/training-plans/[id]/restart/route.ts` | Add `"running"` branch for restart | Low |
| `src/components/goals/running-training-plan-dialog.tsx` | New dialog component | None — additive |
| `src/components/goals/goals-page.tsx` | Update `detectSport()` to handle `"running"` | Low — one line |
| `src/lib/__tests__/running-periodization.test.ts` | New test file | None — additive |
| `ROADMAP.md` | Document feature | None |

### What does NOT change

- Scheduler algorithm (slot finding, rest constraints, time windows, weekly spread)
- Existing session patterns system (continues to work independently)
- Recurring activities (unaffected)
- Climbing and tennis periodization engines (untouched)
- Roles, budget, analytics, mission statement, activity logging
- Goals without training plans work exactly as before

---

## Data Model

### Schema changes: None

**Zero new tables. Zero new columns.** The existing `training_plans` and `training_phases` tables, consolidated during the Tennis V1 build, already support any sport via the `sport` discriminator and `sport_profile` JSON blob.

### `training_plans` (existing, unchanged)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | integer | PK, autoIncrement | |
| `goal_id` | integer | FK → goals.id, NOT NULL, unique, CASCADE | One plan per goal |
| `sport` | text | NOT NULL | "climbing", "tennis", or **"running"** |
| `periodization_model` | text | NOT NULL | "3-phase", "4-phase" (running models) |
| `player_level` | text | NOT NULL | "beginner", "intermediate", "advanced" |
| `years_experience` | integer | NOT NULL | Years of consistent running |
| `sport_profile` | text | NOT NULL, default '{}' | JSON: running-specific profile data |
| `start_date` | text | NOT NULL | ISO date |
| `status` | text | NOT NULL, default "active" | "active", "paused", "completed" |
| `created_at` | text | NOT NULL, default now | |
| `updated_at` | text | NOT NULL, default now | |

### `training_phases` (existing, unchanged)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | integer | PK, autoIncrement | |
| `training_plan_id` | integer | FK → training_plans.id, NOT NULL, CASCADE | |
| `phase_type` | text | NOT NULL | Running phase types (see below) |
| `order_index` | integer | NOT NULL | Position in the cycle (0-based) |
| `duration_weeks` | integer | NOT NULL | |
| `start_date` | text | NOT NULL | |
| `end_date` | text | NOT NULL | |
| `status` | text | NOT NULL, default "upcoming" | "upcoming", "active", "completed" |
| `description` | text | NOT NULL | Multi-section phase description |
| `limitation_notes` | text | nullable | Physical limitation precautions |
| `created_at` | text | NOT NULL, default now | |
| `updated_at` | text | NOT NULL, default now | |

### Sport profile JSON shape (Running)

```json
{
  "goalDistance": "half-marathon",
  "runsPerWeek": 4,
  "longestRecentRun": 45,
  "canRun30MinContinuous": true,
  "hasRaced": true,
  "physicalLimitations": ["achilles", "back"]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `goalDistance` | string | "5k", "10k", "half-marathon", "marathon", "general" |
| `runsPerWeek` | number | Current weekly running frequency (0–7) |
| `longestRecentRun` | number | Longest run in the past month (minutes) |
| `canRun30MinContinuous` | boolean | Can sustain 30 minutes of continuous easy running |
| `hasRaced` | boolean | Has completed at least one organized race |
| `physicalLimitations` | string[] | Array of RunningLimitation values |

**Total: 0 new tables, 0 new columns.**

---

## API Routes

### `POST /api/training-plans/assess-level`

Updated to accept `sport: "running"`. Returns running-appropriate assessment.

**Request (running)**:
```json
{
  "sport": "running",
  "runsPerWeek": 4,
  "yearsExperience": 2,
  "canRun30MinContinuous": true,
  "hasRaced": true
}
```

**Response** `200`:
```json
{
  "derivedLevel": "intermediate",
  "recommendedModel": "4-phase",
  "cycleLengthWeeks": 18,
  "explanation": "You're running 4 times per week with 2 years of experience and race history. Intermediate runners benefit from structured 4-phase periodization with one to two quality sessions per week."
}
```

### `GET /api/training-plans?goalId=12`

Returns the training plan for a goal (same endpoint as climbing/tennis). The `sport: "running"` field distinguishes it.

### `POST /api/training-plans`

Create a training plan. Accepts `sport: "running"` and running-specific `sportProfile`.

**Request (running)**:
```json
{
  "goalId": 12,
  "sport": "running",
  "yearsExperience": 2,
  "startDate": "2026-04-01",
  "sportProfile": {
    "goalDistance": "half-marathon",
    "runsPerWeek": 4,
    "longestRecentRun": 45,
    "canRun30MinContinuous": true,
    "hasRaced": true,
    "physicalLimitations": ["achilles", "back"]
  }
}
```

Level and periodization model are derived server-side. Phase descriptions include limitation-specific notes.

### `DELETE /api/training-plans/:id`

Same endpoint, works for all sports.

### `POST /api/training-phases/:id/transition`

Same endpoint, works for all sports.

### `POST /api/training-plans/:id/restart`

Same endpoint, works for all sports. Running branch calls `generateRunningPhases()` with the stored sport profile.

**No new API routes needed.** The existing routes are extended to handle the `sport: "running"` discriminator.

---

## Periodization Engine

A pure function in `src/lib/training/running-periodization.ts`. Testable in isolation.

```typescript
export type RunnerLevel = "beginner" | "intermediate" | "advanced";
export type RunningGoalDistance = "5k" | "10k" | "half-marathon" | "marathon" | "general";
export type RunningPhaseType = "base-building" | "development" | "race-prep" | "base-injury-prevention" | "strength-endurance" | "speed-specificity" | "taper-race" | "rest";
export type RunningLimitation = "achilles" | "knee" | "shin" | "plantar-fascia" | "back" | "hip-adductor";
export type RunningPeriodizationModel = "3-phase" | "4-phase";

export interface RunningSportProfile {
  goalDistance: RunningGoalDistance;
  runsPerWeek: number;
  longestRecentRun: number;
  canRun30MinContinuous: boolean;
  hasRaced: boolean;
  physicalLimitations: RunningLimitation[];
}

function assessRunningLevel(
  runsPerWeek: number,
  yearsExperience: number,
  canRun30MinContinuous: boolean,
  hasRaced: boolean
): {
  level: RunnerLevel;
  recommendedModel: RunningPeriodizationModel;
  explanation: string;
};

function generateRunningPhases(
  level: RunnerLevel,
  goalDistance: RunningGoalDistance,
  physicalLimitations: RunningLimitation[],
  startDate: string
): GeneratedPhase[];

function buildRunningPhaseDescription(
  phaseType: RunningPhaseType,
  goalDistance: RunningGoalDistance,
  level: RunnerLevel
): string;

function buildRunningLimitationNotes(
  phaseType: RunningPhaseType,
  limitations: RunningLimitation[]
): string | null;

function getRunningPhaseDisplayName(phaseType: RunningPhaseType): string;
```

### Phase Duration Tables

**Beginner (all distances):**

A 1-week rest phase is automatically appended to every cycle (consistent with climbing and tennis).

| Phase | Weeks |
|-------|-------|
| Base Building | 6–10 (default 8) |
| Development | 4–8 (default 6) |
| Race Prep & Taper | 2–4 (default 3) |
| Rest & Recovery | 1 |
| **Total** | **18** |

**Intermediate by goal distance:**

All totals include a 1-week rest phase appended to the cycle.

| Distance | Base | Strength | Speed | Taper | Rest | Total |
|----------|------|----------|-------|-------|------|-------|
| 5K / 10K | 4 | 4 | 6 | 2 | 1 | 17 |
| Half Marathon | 5 | 5 | 5 | 3 | 1 | 19 |
| Marathon | 6 | 6 | 4 | 3 | 1 | 20 |
| General Fitness | 5 | 5 | 4 | 2 | 1 | 17 |

**Advanced by goal distance:**

All totals include a 1-week rest phase appended to the cycle.

| Distance | Base | Strength | Speed | Taper | Rest | Total |
|----------|------|----------|-------|-------|------|-------|
| 5K / 10K | 4 | 4 | 6 | 2 | 1 | 17 |
| Half Marathon | 5 | 5 | 5 | 3 | 1 | 19 |
| Marathon | 6 | 6 | 5 | 3 | 1 | 21 |
| General Fitness | 5 | 5 | 4 | 2 | 1 | 17 |

### Phase Display Names

| Phase Type | Display Name |
|------------|-------------|
| `base-building` | Base Building |
| `development` | Development |
| `race-prep` | Race Prep & Taper |
| `base-injury-prevention` | Base & Injury Prevention |
| `strength-endurance` | Strength & Endurance |
| `speed-specificity` | Speed & Specificity |
| `taper-race` | Taper & Race |
| `rest` | Rest & Recovery |

### Goal Distance Display Names

The `RunningGoalDistance` type uses short internal values. The UI displays longer labels:

| Internal Value | Display Label |
|---------------|---------------|
| `5k` | 5K |
| `10k` | 10K |
| `half-marathon` | Half Marathon |
| `marathon` | Marathon |
| `general` | General Fitness |

The `getRunningGoalDistanceDisplayName()` utility function handles this mapping. Dialog radio buttons, goal distance badges, and assessment explanations all use the display label.

---

## Scheduler Integration

**No changes needed.** The climbing/tennis integration already built a generic system:

- The generate route fetches `training_plans` by `goalId` and gets the active phase
- It passes `TrainingPhaseInfo` (with `displayName`, `phaseStartDate`, `durationWeeks`, `isRest`) to the scheduler
- The scheduler uses this to build phase-aware titles and skip rest phases

For running, the generate route already covers this because it queries from the same `training_plans` table. The `getRunningPhaseDisplayName()` function provides the display name. The scheduler sees `isRest: true` for the rest phase and skips it.

### Title examples

```
"Running — Base Building (Week 3/8)"
"Running — Speed & Specificity (Week 1/6)"
"Running — Taper & Race (Week 2/3)"
```

---

## UI Changes

### Running Training Plan Dialog

A new `RunningTrainingPlanDialog` component (the form inputs differ from climbing and tennis):

- **Runs per week** (number input, 0–7)
- **Years of consistent running** (number input)
- **Can run 30 minutes continuously** (checkbox)
- **Has completed a race** (checkbox)
- **Goal distance**: 5K / 10K / Half Marathon / Marathon / General Fitness (radio buttons)
- **Longest recent run** (number input, minutes — for context)
- **Physical limitations**: checkboxes for Achilles, Knee, Shin Splints, Plantar Fascia, Back/Scheuermann's, Hip/Adductor
- **Start date** (date picker, default today)
- **Live level assessment preview** (updates as inputs change)
- **"Create Plan" button**

### Goal Detail — Training Plan Section

The existing `TrainingPlanSection` component is reused. It already renders:
- Phase timeline bar with colored segments
- Active phase name and week counter
- Phase transition and restart buttons
- Expanded phase descriptions with section headers
- Limitation notes in an amber box

**Running additions** to `TrainingPlanSection`:
- Goal distance badge (e.g., "Half Marathon")
- Physical limitation badges (when limitations exist)
- `limitationNotes` text below the phase description

### Training Plan button on goal card

The existing `detectSport()` function in `goals-page.tsx` is updated to return `null` for unrecognized activity types instead of defaulting to climbing:

```typescript
function detectSport(goal: Goal): TrainingSport | null {
  const name = (goal.activityTypeName ?? "").toLowerCase();
  if (name.includes("climbing")) return "climbing";
  if (name.includes("tennis")) return "tennis";
  if (name.includes("running")) return "running";
  return null;
}
```

When `detectSport` returns `null`, the training plan button is hidden — only recognized sports show the plan creation option. This prevents activity types like "Hiking" or "Swimming" from incorrectly opening a climbing dialog.

When `detectSport` returns `"running"`, the goal card opens `RunningTrainingPlanDialog`.

### Phase Colors

Running phases get a distinct color scheme to differentiate from climbing (earth tones) and tennis (blues):

| Phase | Color | Rationale |
|-------|-------|-----------|
| Base Building / Base & Injury Prevention | Green | Foundation, growth |
| Development / Strength & Endurance | Amber | Building intensity |
| Race Prep / Speed & Specificity | Orange | High intensity, heat |
| Taper & Race | Violet | Sharpening, peak |
| Rest & Recovery | Gray | Calm, neutral |

---

## Phase Content (Full Text)

Phase descriptions are three-layered, matching the structure established by tennis and climbing:

1. **RUNNING FOCUS** — What type of running to do this phase, differentiated by goal distance
2. **SUPPLEMENTAL TRAINING** — Strength work, mobility, cross-training
3. **MENTAL TRAINING** — One concrete mental skill per phase

### Beginner Phases

#### Base Building (Beginner)

**RUNNING FOCUS**
Your only job is to build the habit and let your body adapt. Start with run/walk intervals if you cannot yet sustain 30 minutes of continuous running: 1 minute running / 2 minutes walking × 8–10 reps (24–30 minutes total). Progress by increasing run intervals and decreasing walk intervals over 2–3 weeks until you can run continuously for 30 minutes.

Once you can run 30 minutes continuously, run 3 days per week at easy pace — Zone 1–2, conversational. You should be able to hold a full conversation. If you cannot, slow down. Yes, slower than that. Add strides (4–6 × 80m accelerations with full recovery) after one easy run per week starting in week 4. Introduce a longer run on the weekend: start at 35 minutes and add 5 minutes per week.

Do not add distance to more than one run per week. Do not increase total weekly volume by more than 10–15 minutes per week. Your cardiovascular system adapts in weeks; your tendons and bones need months. The aerobic system will feel ready long before the connective tissue is. Trust the process.

**SUPPLEMENTAL TRAINING**
Strength work twice per week, 20 minutes each. Focus on the running kinetic chain: glute bridges (3×12), bodyweight squats (3×12), single-leg balance (3×30sec/leg), standing calf raises (3×15, slow 3-second lowering — this is Achilles prehab), plank (3×30sec), side plank (3×20sec/side). No heavy loading. The goal is activation and stability, not strength building. Add bird dogs (3×8/side) for thoracic spine and core integration.

**MENTAL TRAINING**
*Building the identity*: You are not "trying to become a runner." You are a runner who is currently building a base. This distinction matters because identity drives behavior (James Clear, *Atomic Habits* — already in your source material). After every run, regardless of distance or pace, you have evidence: "I ran today. I am a runner." Collect evidence. Do not set performance expectations. The only metric that matters in this phase is consistency: did you show up? Consistency over intensity — no hero days, just show up and let it compound.

---

#### Development (Beginner)

**RUNNING FOCUS**
You now have an aerobic base. Time to introduce one quality session per week while maintaining everything else as easy running.

**Quality session options (pick one per week):**
- **Fartlek**: During an easy run, add 4–6 surges of 30–60 seconds at a pace that feels "comfortably hard" (you can speak in short sentences but not hold a conversation). Jog easy for 2 minutes between surges. This is speed play — no watch-staring, no precise paces. Run by feel.
- **Tempo effort**: After a 10-minute warm-up, run 10–15 minutes at a pace you could hold for about an hour (roughly Zone 3–4). Cool down with 10 minutes easy. Extend by 2 minutes every 2 weeks.

Maintain 3–4 runs per week. Long run continues to extend: aim for 60–75 minutes by the end of this phase. All other runs remain easy (Zone 1–2). The 80/20 rule applies: at least 80% of your weekly running time should be easy.

**Goal distance modifier (5K/10K)**: Fartlek surges can be shorter (20–30 seconds) and slightly faster. Long run caps at 50–60 minutes.

**Goal distance modifier (Half Marathon/Marathon)**: Long run extends to 75–90 minutes. Tempo efforts stay at 10–15 minutes — do not push these longer yet.

**Goal distance modifier (General Fitness)**: Standard protocol. No race-specific adjustments.

**SUPPLEMENTAL TRAINING**
Continue twice-weekly strength work. Progress to: split squats (3×10/leg), single-leg calf raises (3×12/leg, slow lowering), Romanian deadlift with light weight or bodyweight (3×10), plank (3×45sec), side plank (3×30sec/side), dead bugs (3×8/side). This is the minimum effective dose for injury prevention. It takes 20 minutes. It is not optional.

**MENTAL TRAINING**
*Effort awareness*: Learn to distinguish between discomfort (normal and productive) and pain (a signal to stop). During your quality session, practice rating your effort on a 1–10 scale at the halfway point. Easy runs should be 3–4. Tempo efforts should be 6–7. Anything above 8 in this phase means you are going too hard. Fartlek surges can touch 7–8 briefly.

This is the running equivalent of Gallwey's Self 2 awareness: notice what your body is telling you without judging it. "My legs feel heavy at effort 6" is data. "I'm so unfit" is narrative. Collect the data.

---

#### Race Prep & Taper (Beginner)

**RUNNING FOCUS**
If you have a target race: reduce total volume by 20–30% compared to the Development phase. Drop the number of runs per week by one, or shorten your easy runs. Keep one quality session per week but reduce its duration by one third. Do one race-pace effort 7–10 days before the race: run 10–15 minutes at your target race pace to calibrate effort.

Final week: run only 2–3 times, all short and easy. One set of strides 2 days before the race. Rest the day before.

If no race target: this phase is a consolidation week. Reduce volume by 30%, maintain one short quality session, and use the extra recovery to let connective tissue catch up.

**Goal distance modifier (5K)**: Race-pace effort can be 2 × 5 minutes at goal 5K pace with 3-minute jog recovery.

**Goal distance modifier (10K)**: Race-pace effort can be 2 × 8 minutes at goal 10K pace with 3-minute recovery.

**Goal distance modifier (Half Marathon)**: Long run 10 days before the race at 60–75% of your longest run distance. No long run in the final week.

**SUPPLEMENTAL TRAINING**
Reduce to once per week. Same exercises, 2 sets instead of 3. No new exercises. No heavy loading. The body is consolidating, not building.

**MENTAL TRAINING**
*Pre-race process*: Establish your race-day routine before race day. Decide: what will you eat for breakfast? What will you wear? When will you arrive? What will your warm-up be? Having a plan eliminates decision fatigue and anxiety. This is the running equivalent of Hörst's pre-climb ritual — a sequence that shifts your brain from thinking to doing.

If no race: use this phase to set your next goal. What distance? What timeline? The taper is also a planning phase for the next cycle.

---

### Intermediate Phases

#### Base & Injury Prevention (Intermediate)

**RUNNING FOCUS**
Rebuild the aerobic engine. All runs are easy (Zone 1–2) except strides. Run 4–5 times per week, building toward your target weekly volume over 4–6 weeks. Increase total weekly volume by no more than 10–15% per week. Include one long run per week, building from 60 minutes toward 75–90 minutes.

Add strides after 2–3 easy runs per week: 4–6 × 100m at 90% effort with full walking recovery. Strides improve neuromuscular coordination and leg turnover without adding fatigue. They are not sprints — build speed smoothly over the first 50m, hold for 30m, decelerate over the final 20m.

If coming from a break or a previous training cycle, start at 70% of your previous peak volume and build back. Do not resume where you left off — your connective tissue has detrained even if your aerobic system remembers.

**Goal distance modifier (Marathon)**: Long run builds to 90–100 minutes by end of phase. Easy runs extend to 50–60 minutes.

**Goal distance modifier (5K/10K)**: Long run caps at 70–80 minutes. Easy runs stay at 35–45 minutes.

**SUPPLEMENTAL TRAINING**
Twice weekly, 25–30 minutes. This is where you build the structural resilience that prevents injury in later phases. Single-leg deadlift (3×8/leg), split squat (3×10/leg), step-ups (3×10/leg), standing calf raise — straight knee (3×12, slow eccentric), seated calf raise — bent knee (3×12, slow eccentric — targets soleus, critical for Achilles health), plank (3×45sec), side plank (3×30sec/side), dead bugs (3×10/side).

Add hip stability work: clamshells (3×15/side), lateral band walks (3×10 steps/direction). These prevent the hip-drop pattern that causes runner's knee and IT band syndrome.

**MENTAL TRAINING**
*Zone 2 discipline*: The hardest mental skill for intermediate runners is running easy enough on easy days. Your ego will resist. Running slowly feels wrong when you "know" you can go faster. But the 80/20 principle is not a suggestion — it is how every elite endurance athlete in the world trains (Seiler's research). Practice treating easy pace as a skill, not a limitation. Use heart rate if you need external accountability: if your heart rate drifts above Zone 2, slow down. No exceptions.

This is the running version of Covey's "sharpen the saw" — going slow today makes you fast tomorrow. Cutting the slow runs short is sawing with a dull blade.

---

#### Strength & Endurance (Intermediate)

**RUNNING FOCUS**
Introduce one quality session per week. The other runs remain easy (Zone 1–2). Long run continues to extend.

**Weekly structure (4–5 runs):**
- 1× Quality session (see below)
- 1× Long run (easy pace, extending by 10 minutes every 2 weeks)
- 2–3× Easy runs with optional strides after 1–2 of them

**Quality session options (alternate weekly):**
- **Tempo run**: After 10-minute warm-up, run 20–30 minutes at threshold pace (the fastest pace you could hold for about an hour — roughly Zone 4). Cool down 10 minutes easy. This is "comfortably hard" — you can say a few words but not sentences.
- **Hill repeats**: Find a hill with moderate gradient (4–6%). After warm-up, run hard uphill for 60–90 seconds, jog back down for recovery, repeat 4–8 times. Cool down easy. Hills build leg power and running economy without the impact stress of flat speedwork.
- **Cruise intervals**: 3–4 × 8 minutes at threshold pace with 2-minute easy jog recovery. Total quality time: 24–32 minutes. These are Daniels' bread-and-butter threshold workout.

**Goal distance modifier (Marathon)**: Long run reaches 100–120 minutes. Include one long run with a marathon-pace finish: run the last 20–30 minutes at projected marathon pace (Pfitzinger approach).

**Goal distance modifier (5K/10K)**: Long run caps at 70–80 minutes. Hill repeats can be shorter (45–60 sec) and steeper.

**SUPPLEMENTAL TRAINING**
Continue twice weekly. Progress loading: add weight to split squats and single-leg deadlifts (dumbbells or kettlebell). Maintain calf work (straight and bent knee variants). Add: Romanian deadlift with moderate load (3×8), single-leg hop and hold (3×5/leg — introduces elastic loading for tendons).

Core work shifts slightly toward anti-rotation: Pallof press (3×10/side), bird dog with slow tempo (3×8/side).

**MENTAL TRAINING**
*Managing the quality session*: Quality sessions are where the mental game gets real. The tempo run will feel uncomfortable — that is the point. Practice the two-arrow framework from the knowledge base: the first arrow is the physical sensation (burning legs, heavy breathing). The second arrow is the story you tell yourself about it ("I can't do this," "I'm dying"). Suffering comes from the second arrow.

When the tempo run gets hard at minute 18, observe the sensation without narrating: "Legs feel heavy, breathing is elevated, effort is about 7/10." That is data. Do not add "and I should probably stop." You are gathering information, not passing verdicts.

---

#### Speed & Specificity (Intermediate)

**RUNNING FOCUS**
Two quality sessions per week. This is the most demanding phase. The other runs must be genuinely easy — if you are not recovering between quality sessions, you are running your easy days too hard.

**Weekly structure (4–5 runs):**
- 1× Interval session
- 1× Threshold session (tempo or cruise intervals)
- 1× Long run (easy pace, maintaining peak distance)
- 1–2× Easy runs

**Interval session options:**
- **VO2max intervals**: 4–6 × 800m–1200m at roughly 5K race pace (Zone 5) with equal-time jog recovery. Example: 5 × 1000m at 5K pace with 3-minute jog. This is hard — perceived effort 8–9/10.
- **Short repeats**: 8–10 × 400m at 3K–5K pace with 90-second recovery. Builds speed and running economy.
- **Fartlek with structure**: 6–8 × 2 minutes hard / 2 minutes easy. Less psychologically daunting than track intervals but physiologically similar.

**Goal distance modifier (5K)**: Bias toward shorter, faster intervals (400m–800m). Include one 5K-pace sustained effort (12–15 minutes) as a race simulation.

**Goal distance modifier (10K)**: Mix of 800m–1200m intervals and tempo work. One 10K-pace sustained effort (20–25 minutes).

**Goal distance modifier (Half Marathon)**: Tempo sessions extend to 30–40 minutes. Long run includes 20–30 minutes at half-marathon pace. Intervals slightly longer (1000m–1600m).

**Goal distance modifier (Marathon)**: Long run with marathon-pace middle: easy first third, marathon pace for the middle third, easy final third. Tempo sessions at marathon pace extend to 40+ minutes.

**SUPPLEMENTAL TRAINING**
Maintain twice weekly but reduce volume by 20%. The running load is higher — you do not want to fatigue legs with heavy strength work before a quality session. Drop to 2 sets per exercise. Maintain calf work and hip stability. No new exercises.

Schedule strength work the day after a quality session (when you're doing an easy run anyway) or on a rest day — never the day before a quality session.

**MENTAL TRAINING**
*Segmenting and process focus*: During intervals, do not think about the total number of reps remaining. Think only about this rep. When rep 3 of 6 feels terrible, the thought "I still have 3 more" is Self 1 catastrophizing. Replace it with a process cue: "Relax shoulders. Quick feet. Breathe." Give Self 1 a useful job so Self 2 can do the running.

Between reps, do not analyze your split time. Just jog, breathe, and start the next one when it is time. The workout teaches your body to produce speed on demand. The mental skill is letting it happen without interference — the exact same principle as Gallwey's "let the serve happen" from *The Inner Game of Tennis*.

---

#### Taper & Race (Intermediate)

**RUNNING FOCUS**
Reduce total volume by 20–40% compared to the Speed & Specificity phase. Drop to 3–4 runs per week. Keep one quality session per week but shorten it significantly: if your intervals were 5 × 1000m, do 3 × 800m. If your tempo was 30 minutes, do 15 minutes. The intensity stays the same — only the volume drops.

**Week-by-week taper (3-week taper):**
- **Week 1**: 75% of peak volume. One shortened quality session. Long run at 70% of peak distance.
- **Week 2**: 60% of peak volume. One very short quality session (3–4 reps of something fast). No long run — replace with a moderate easy run.
- **Race week**: 40% of peak volume. 2–3 short easy runs. One set of strides 2 days before the race. Complete rest the day before.

**Race-day warm-up**: 10 minutes easy jogging, 4 strides, 5 minutes rest before start.

**Goal distance modifier (5K/10K)**: Taper can be 2 weeks instead of 3. Include a short race-pace effort (2 × 3 minutes at goal pace) 4–5 days before.

**Goal distance modifier (Marathon)**: Final long run (75–90 minutes, easy) should be 3 weeks before race day. No runs longer than 45 minutes in the final 2 weeks.

**SUPPLEMENTAL TRAINING**
Once per week or stop entirely. Light maintenance only. No new stimuli. The body is absorbing the training from previous phases — let it.

**MENTAL TRAINING**
*Trust the training*: The taper makes you anxious. You will feel flat, sluggish, and undertrained. This is normal — your body is supercompensating, rebuilding stronger than it was during peak training. The urge to squeeze in "one more hard session" is Self 1 panicking. Ignore it.

Establish your race-day process: warm-up routine, starting pace, when to push, what to do when it gets hard (which process cue will you use?). Visualize the race — not the outcome, but the process. See yourself running relaxed at mile 1, managing effort at the halfway point, finishing strong. This is not magical thinking; it is the same mental rehearsal that Hörst recommends before a climbing project send.

---

### Advanced Phases

#### Base & Injury Prevention (Advanced)

**RUNNING FOCUS**
Build toward peak mileage. Run 5–7 times per week, targeting 50–70+ km/week by the end of this phase. All runs are easy (Zone 1–2) except strides. If volume exceeds 60 km/week, consider introducing doubles: two shorter runs in a day (e.g., 40 minutes morning + 25 minutes evening) instead of one longer run. Doubles distribute the training stress and allow higher total volume with less per-session impact.

Add strides after every easy run: 6 × 100m at 90% effort with full walking recovery. At this level, strides are not a special addition — they are a daily staple that maintains neuromuscular sharpness throughout the base phase.

Include one long run per week, building from 75 minutes toward 100–120 minutes. If coming from a break, start at 60% of previous peak volume and rebuild over 4–6 weeks. Advanced runners detrain slower than beginners but connective tissue still needs a ramp.

**Goal distance modifier (Marathon)**: Long run reaches 120 minutes by end of phase. Consider a second medium-long run (70–80 minutes) midweek — this is the Pfitzinger pattern that builds marathon-specific endurance from the base phase.

**Goal distance modifier (5K/10K)**: Long run caps at 80–90 minutes. Volume is still high but runs can be shorter and more frequent rather than fewer and longer.

**SUPPLEMENTAL TRAINING**
Twice weekly, 30 minutes. Progress all movements with external load: split squat with dumbbells (3×8/leg), single-leg deadlift with kettlebell (3×8/leg), step-ups with load (3×8/leg), calf raises — straight and bent knee (3×12 each, with added weight), hip thrust or barbell glute bridge (3×10). Core: Pallof press (3×10/side), dead bugs with slow tempo (3×10/side), Copenhagen plank (3×15sec/side).

At this level, strength work is not about learning movement patterns — it is about maintaining structural capacity under high mileage. If you are running 60+ km/week without strength work, you are accumulating a debt that will be paid in injury.

**MENTAL TRAINING**
*Patience with the base*: Advanced runners are the most likely to cut the base phase short because they "already have a base." You do — from the last cycle. But every new cycle requires rebuilding, and the first quality sessions on a weak base produce inferior adaptation. Treat the base phase as the investment that pays dividends in every subsequent phase. Lydiard's athletes built their base for 12 weeks. Your 4–6 weeks is already a compression.

Run without a watch for at least one easy run per week. Let your body set the pace. If you cannot run easy without checking your watch, you are training your anxiety, not your aerobic system.

---

#### Strength & Endurance (Advanced)

**RUNNING FOCUS**
Two quality sessions per week from the start of this phase. This is where the advanced plan diverges most from intermediate — you are adding a second quality session earlier because your body can handle the load and recovery.

**Weekly structure (5–7 runs):**
- 1× Threshold session (see below)
- 1× Hill or strength-endurance session (see below)
- 1× Long run (see below)
- 2–4× Easy runs with strides

**Threshold session options:**
- **Tempo run**: 25–40 minutes at threshold pace (Zone 4). Cool down easy. Advanced runners should aim for the upper end of this range. If you can comfortably hold 30 minutes at threshold, extend to 35, then 40.
- **Cruise intervals**: 4–5 × 10 minutes at threshold pace with 2-minute easy jog recovery. Total quality time: 40–50 minutes. This is higher volume than the intermediate version (3–4 × 8 minutes) and is Daniels' primary threshold development tool.

**Hill / strength-endurance session options:**
- **Hill repeats**: 6–10 × 90-second hill efforts on a 5–8% gradient, jog back down for recovery. These are longer and steeper than intermediate. Focus on driving the knees and maintaining form as fatigue builds.
- **Progression long run**: Start easy, finish the last 30% at threshold pace. This teaches your body to run fast on tired legs — the exact skill needed in the second half of any race.

**Long run**: Builds to 100–120 minutes. For marathon goals, include marathon-pace segments in the second half: run the last 30–40 minutes at projected marathon pace (Pfitzinger approach). For shorter distances, keep long runs entirely easy — the length itself provides the stimulus.

**Goal distance modifier (Marathon)**: Long run reaches 120–150 minutes. Include one marathon-pace long run every 2–3 weeks (easy first 60%, marathon pace for 30%, easy final 10%). Second medium-long run (70–80 minutes) midweek continues.

**Goal distance modifier (5K/10K)**: Hill repeats can be shorter (60 sec) and steeper (8–10%). Long run caps at 80–90 minutes. Threshold sessions can include faster segments — 2–3 minutes at 10K pace mixed into a tempo run.

**SUPPLEMENTAL TRAINING**
Continue twice weekly. Maintain external loading. Focus shifts slightly toward power: add single-leg hop progressions (3×6/leg), box jumps or depth jumps (3×5 — plyometric loading develops tendon stiffness and elastic recoil). Maintain calf work — at high mileage, calves need permanent attention. Keep hip stability exercises (lateral band walks, clamshells) even though they feel easy — they maintain the motor patterns that prevent form breakdown under fatigue.

**MENTAL TRAINING**
*The second quality session*: Two hard sessions per week means your easy days must be genuinely easy. The temptation for advanced runners is to run every day at moderate effort — Zone 3, the gray zone. This is the single most common error at this level. Seiler's research is unambiguous: the 80/20 distribution produces better results than a 50/50 distribution, even when total training time is equal.

Monitor yourself honestly: if your "easy" runs are consistently above Zone 2, you are not following polarized training — you are doing threshold training with extra fatigue. Slow down. The discipline to run slowly is harder than the discipline to run fast.

---

#### Speed & Specificity (Advanced)

**RUNNING FOCUS**
Two quality sessions per week with higher volume within each session. This is the peak training phase — the highest combined intensity and volume of the cycle.

**Weekly structure (5–7 runs):**
- 1× Interval session
- 1× Threshold session (tempo or cruise intervals)
- 1× Long run (maintaining peak distance)
- 2–4× Easy runs with strides

**Interval session options:**
- **VO2max intervals**: 6–8 × 1000m at 3K–5K race pace (Zone 5) with equal-time jog recovery. This is higher volume than intermediate (4–6 reps). Example: 7 × 1000m at 5K pace with 3-minute jog recovery. Total quality time: ~25 minutes at VO2max intensity.
- **Short repeats**: 10–12 × 400m at 3K pace with 90-second recovery. Builds speed, running economy, and neuromuscular recruitment.
- **Mixed session**: 3 × 1600m at 10K pace, then 4 × 400m at 3K pace. Combines endurance and speed stimulus in one workout.

**Threshold session options:**
- **Extended tempo**: 35–45 minutes at threshold pace. Advanced runners should be able to sustain 40+ minutes. This is a demanding workout — do not schedule it the day after intervals.
- **Race simulation**: Run at goal race pace for 60–75% of race distance. For a 10K runner: 6–7 km at 10K pace. For a half-marathon runner: 12–14 km at half-marathon pace. This is the most race-specific workout you can do.

**Long run**: Maintain peak distance. For marathon goals, continue alternating between easy long runs and marathon-pace long runs. For shorter distances, keep long runs easy but include 4–6 strides in the middle for neuromuscular activation.

**Goal distance modifier (5K)**: Bias toward shorter, faster intervals (400m–800m). Include two race simulations: one at 5K pace (12–15 minutes sustained), one at a pace 5–10 seconds per km faster than goal pace (8–10 minutes) to build speed reserve.

**Goal distance modifier (10K)**: Mix of 800m–1200m intervals and extended tempo. One race simulation at 10K pace (25–30 minutes).

**Goal distance modifier (Half Marathon)**: Tempo sessions extend to 40–50 minutes. Long run includes 30–40 minutes at half-marathon pace in the second half. One race simulation: 14–16 km at half-marathon pace.

**Goal distance modifier (Marathon)**: Long run with marathon-pace progression: easy first half, marathon pace for 40%, easy final 10%. Tempo sessions at marathon pace extend to 50–60 minutes. Track-based intervals are reduced to one session every two weeks — marathon performance depends more on threshold and pace endurance than on VO2max.

**SUPPLEMENTAL TRAINING**
Reduce to twice weekly with 2 sets per exercise. The running volume is at its peak — supplemental work maintains what was built in earlier phases without adding fatigue. No new exercises. Schedule strength work on easy days only — never the day before intervals or tempo. If recovery feels compromised, drop to once per week. Maintain calf work and hip stability regardless of volume reduction.

**MENTAL TRAINING**
*Racing the workout*: Advanced interval sessions are genuinely hard — perceived effort 8–9/10 for sustained periods. This is where the mental game separates strong runners from fast runners. Two skills matter:

First, commit to the pace. Do not start conservative and "see how it goes." Start at the prescribed pace from rep 1. If you blow up, you learn something. If you hold on, you build confidence. Half-committed efforts produce half-committed results.

Second, embrace the discomfort without dramatizing it. Rep 5 of 7 at 5K pace hurts. The sensation is burning legs, labored breathing, a body that wants to stop. That is accurate. The narrative "I am dying and cannot finish" is not accurate — you have finished before and you will finish again. Observe the sensation. Run the rep. Move to the next one.

---

#### Taper & Race (Advanced)

**RUNNING FOCUS**
Reduce total volume by 30–50% compared to the Speed & Specificity phase. The drop is more dramatic than intermediate because the peak volume was higher. Drop to 4–5 runs per week. Keep one quality session per week but reduce it substantially: if your intervals were 7 × 1000m, do 4 × 800m. If your tempo was 40 minutes, do 20 minutes. Intensity stays the same — volume drops.

**Week-by-week taper (3-week taper):**
- **Week 1**: 70% of peak volume. One shortened quality session (60% of normal interval/tempo volume). Long run at 60% of peak distance.
- **Week 2**: 50% of peak volume. One short, sharp quality session (4 × 400m at goal pace or 15-minute tempo). No long run — moderate easy run instead.
- **Race week**: 35% of peak volume. 3–4 short easy runs (25–35 min). One set of 6 strides 2 days before the race. Complete rest the day before.

**Race-day warm-up**: 15 minutes easy jogging, 6 strides, dynamic stretching, 5 minutes rest before start.

**Goal distance modifier (5K/10K)**: Taper can be compressed to 2 weeks since total training load was lower than for marathon. Include a race-pace sharpener (3 × 3 minutes at goal pace with full recovery) 4–5 days before.

**Goal distance modifier (Marathon)**: Final long run (90 minutes, easy) should be 3 weeks before race day. No runs longer than 40 minutes in the final 2 weeks. A 20-minute marathon-pace effort 10 days before the race can serve as a confidence booster — it should feel controlled.

**SUPPLEMENTAL TRAINING**
Stop structured strength work. Light mobility and stretching only. The body is consolidating adaptations from the entire training cycle. Adding any new stimulus — even seemingly light work — risks introducing soreness or fatigue that undermines race performance.

**MENTAL TRAINING**
*Pre-race visualization*: Advanced runners know the discomfort that is coming. Use that knowledge. Visualize specific moments: the start (controlled, not too fast), the middle (managing effort, staying relaxed), the hard patch (it will come — what will you do when it arrives?), the finish (you have trained for this and you are ready).

The taper anxiety is worse for experienced runners because you know what fitness feels like, and the taper does not feel like fitness. It feels like detraining. It is not. Every study on tapering shows performance improvements of 2–3% after a proper taper. You are not losing fitness — you are removing fatigue to reveal the fitness underneath. Trust the process.

---

### Rest Phase (All Levels)

**RUNNING FOCUS**
No structured running. If you run, keep it to 20–30 minutes at the easiest possible effort — jog, walk, enjoy being outside. No pace targets, no distance goals. Walk if you want. Swim. Cycle. Hike. Do yoga.

This is where supercompensation happens. Your connective tissue — tendons, ligaments, bone — recovers 2–3× slower than your cardiovascular system. If you cut rest short, the aerobic engine feels ready but the structural system is not. This is when overuse injuries happen. "The most common training mistake is not resting enough" — true in climbing (Hörst), true in running.

**SUPPLEMENTAL TRAINING**
No structured training. Light stretching and foam rolling only. If you have been doing calf work consistently, you can take a full week off. Post-rest assessment: any Achilles stiffness? Knee soreness? Shin tenderness? If yes, extend rest by 3–4 days before starting the next cycle.

**MENTAL TRAINING**
*Process review*: At the end of the rest phase, review the completed cycle. What went well? Where did you skip sessions? What triggered the skips — was it an unstructured evening, a broken streak that spiraled, or simply life? This is data collection, not self-criticism. Write down 3 things you will do differently in the next cycle and 3 things you will keep doing.

Reconnect with why you run. Is it for the race time, the morning clarity, the physical challenge, the proof that you showed up? If running felt like a chore in the last cycle, something needs to change — route, time of day, company, or expectations. If the process is miserable, you will quit. Keep it enjoyable.

---

## Physical Limitation System

### Supported Running Limitations

| Limitation | Why it matters | Source |
|-----------|---------------|--------|
| `achilles` | Achilles tendinopathy is the #2 running injury. History of Achilles issues means permanently elevated risk. Eccentric calf work is non-negotiable maintenance. | Knowledge base Part 5, Alfredson protocol |
| `knee` | Runner's knee (patellofemoral syndrome) is the #1 running injury. Usually caused by weak glutes and quads, not by running itself. | Knowledge base Part 5 |
| `shin` | Shin splints are common in new runners and those returning from breaks. Usually caused by too-rapid volume increases on hard surfaces. | Knowledge base Part 5 |
| `plantar-fascia` | Plantar fasciitis causes heel pain worst in the morning. Associated with tight calves, high volume, and inadequate foot strength. | Knowledge base Part 5 |
| `back` | Scheuermann's disease (thoracic kyphosis). Running demands sustained trunk extension, which is harder to maintain with structural kyphosis. Core stability is a performance requirement, not just injury prevention. | Knowledge base Part 5 |
| `hip-adductor` | History of pubalgie (adductor inflammation). Requires careful management of hill work and lateral loading. | Knowledge base Part 5 |

### Limitation Notes by Phase

#### Achilles

| Phase | Note |
|-------|------|
| base-building / base-injury-prevention | Eccentric calf raises (straight and bent knee) every session, minimum 3×12 per variant, slow 3-second lowering. Warm up with 5 minutes of walking before every run. If morning stiffness lasts more than 10 minutes, reduce volume for 3 days. Footwear rotation: alternate between at least 2 pairs. |
| development / strength-endurance | Monitor Achilles response to tempo runs. If tendon soreness appears after quality sessions, drop back to easy runs only for 3–4 days. Continue eccentric calf work. No sudden increases in hill running volume — hills load the Achilles more than flat terrain. |
| race-prep / speed-specificity | Intervals increase Achilles loading. Warm up thoroughly (10 min easy + strides before any fast work). If any session produces Achilles pain >3/10, stop immediately and return to easy running for 48 hours. Continue eccentric calf work. |
| taper-race / rest | Calf work continues even during taper and rest — this is permanent maintenance. Post-rest assessment: check morning Achilles stiffness. If present, extend rest by 3–4 days. |

#### Knee (Runner's Knee)

| Phase | Note |
|-------|------|
| base-building / base-injury-prevention | Glute activation is priority #1: clamshells, glute bridges, and lateral band walks every run day. Single-leg balance (30sec/leg) to build knee stability. Monitor for pain during or after stairs. |
| development / strength-endurance | Hill running may increase knee loading on the descent. If knee pain appears during downhill segments, avoid steep descents and use a flatter route. Continue glute work. |
| race-prep / speed-specificity | High-speed intervals can stress the patellofemoral joint. If knee aches after interval sessions, apply ice for 15 minutes post-session and increase glute/quad strengthening. |
| taper-race / rest | Reduced volume should help knee symptoms. If pain persists during rest, consult a physiotherapist before starting the next cycle. Continue glute exercises. |

#### Shin Splints

| Phase | Note |
|-------|------|
| base-building / base-injury-prevention | Run on softer surfaces (grass, trail, treadmill) when possible. Anterior tibialis strengthening: toe raises against a wall (3×20). Do not increase weekly volume by more than 10%. If shin pain develops, reduce to run/walk intervals for 1 week. |
| development / strength-endurance | Monitor shins during tempo runs. Shorten stride slightly if shin tenderness develops. Continue toe raises. |
| race-prep / speed-specificity | Track running (hard surface) can aggravate shins. Run intervals on grass or soft trail if available. |
| taper-race / rest | Reduced volume resolves most shin issues. If pain persists into rest, extend rest by 1 week. |

#### Plantar Fascia

| Phase | Note |
|-------|------|
| base-building / base-injury-prevention | Morning foot mobility routine: roll a frozen water bottle under the arch for 5 minutes before your first steps. Calf stretching (30sec × 3, both straight and bent knee) after every run. Towel curls (scrunch a towel with your toes, 3×10) for foot strength. Assess arch support in your running shoes. |
| development / strength-endurance | If heel pain increases after tempo runs, reduce quality session intensity for 1 week. Continue calf stretching and foot strengthening daily. |
| race-prep / speed-specificity | Speed work increases plantar fascia loading. Warm up with 5–10 minutes of easy running and foot mobilizations before any fast work. |
| taper-race / rest | Continue daily calf stretching and foot rolling. Do not introduce new shoes or orthotics close to race day. |

#### Back (Scheuermann's)

| Phase | Note |
|-------|------|
| base-building / base-injury-prevention | Anti-extension core work is mandatory: dead bugs (3×10/side), bird dogs (3×8/side), front planks (3×45sec). No heavy spinal loading in strength work (no barbell squats or deadlifts — use single-leg alternatives). Thoracic mobility work: foam roller extensions (2 min), cat-cow (10 reps), thread-the-needle (5/side). Chest stretches (doorway stretch, 30sec × 2). |
| development / strength-endurance | Monitor posture fatigue on runs longer than 60 minutes. If lower back tightens or upper back rounds noticeably, take a 1-minute walk break to reset posture. Core exercises continue every strength session. |
| race-prep / speed-specificity | Fast running demands more trunk extension, which fatigues faster with Scheuermann's. During intervals, reset posture between reps: stand tall, shoulders back, one deep breath. |
| taper-race / rest | Daily thoracic mobility work. Gentle spinal decompression: dead hang from a bar for 30 seconds × 3 to relieve disc compression. |

#### Hip / Adductor

| Phase | Note |
|-------|------|
| base-building / base-injury-prevention | Progressive lateral work: lateral band walks (start with light band, 3×10 steps/direction). Copenhagen plank if tolerated (3×10sec/side, building to 20sec). Stop at any groin discomfort — do not push through adductor pain. |
| development / strength-endurance | Do not introduce steep hill repeats suddenly — hill running loads the hip adductors more than flat terrain. Build hill volume over 2–3 weeks. Monitor for groin tightness after tempo runs. |
| race-prep / speed-specificity | Speed work with direction changes (fartlek on trails) can stress adductors. If groin tightness develops, switch to flat, straight-line running for quality sessions. |
| taper-race / rest | Reduced volume should help. Continue gentle adductor stretching (seated butterfly, 30sec × 3). If discomfort persists, extend rest. |

---

## Task Breakdown

### Task 1: Types & Running Periodization Engine
**Files**: `src/types/index.ts`, `src/lib/training/running-periodization.ts`, `src/lib/__tests__/running-periodization.test.ts`
- Add `RunnerLevel`, `RunningGoalDistance`, `RunningPhaseType`, `RunningLimitation`, `RunningSportProfile`, `RunningPeriodizationModel` types
- Update `TrainingSport` union to include `"running"`
- Update `PeriodizationModel`, `PhaseType`, `SportProfile` unions
- Implement `assessRunningLevel()`, `generateRunningPhases()`, `buildRunningPhaseDescription()`, `buildRunningLimitationNotes()`, `getRunningPhaseDisplayName()`
- Populate `PHASE_CONTENT` object with full three-layered descriptions (running focus × goal distance, supplemental, mental)
- Populate `RUNNING_LIMITATION_NOTES` with all 6 limitations × all phase types
- Unit tests for: level assessment (all combinations + overrides), phase generation (all levels × all distances), phase descriptions (section headers, distance differentiation, level overrides), limitation notes
- **Effort**: Medium (content-heavy, many permutations)
- **Status**: Not started

### Task 2: API Route Updates
**Files**: `src/app/api/training-plans/route.ts`, `src/app/api/training-plans/assess-level/route.ts`, `src/app/api/training-plans/[id]/restart/route.ts`
- Add `"running"` branch in POST handler → calls `assessRunningLevel()` + `generateRunningPhases()`
- Add `"running"` branch in assess-level endpoint
- Add `"running"` branch in restart endpoint → calls `generateRunningPhases()` with stored profile
- Pass `limitationNotes` when creating running phases
- **Effort**: Small
- **Status**: Not started

### Task 3: Scheduler Integration
**Effort**: None — already works generically. Only need to ensure `getRunningPhaseDisplayName()` is called in the generate route for running plans (same pattern as tennis).
- **Status**: Not started

### Task 4: UI — Running Training Plan Dialog
**Files**: `src/components/goals/running-training-plan-dialog.tsx`, `src/components/goals/goals-page.tsx`
- New `RunningTrainingPlanDialog` with runs/week, years experience, continuous run capability, race history, goal distance, longest recent run, physical limitation checkboxes, start date, live assessment preview
- Update `detectSport()` in `goals-page.tsx` to return `"running"` when activity type name includes "running"
- Update goal card routing to open `RunningTrainingPlanDialog` for running goals
- **Effort**: Medium
- **Status**: Not started

### Task 5: Training Plan Section Updates
**Files**: `src/components/goals/training-plan-section.tsx`
- Add running phase colors (green, amber, orange, violet, gray)
- Display goal distance badge when `sport === "running"`
- Display physical limitation badges for running limitations
- Ensure limitation notes render correctly in the amber box
- **Effort**: Small
- **Status**: Not started

### Task 6: Documentation
**Files**: `ROADMAP.md`, `specs/master/data-model.md`, `specs/master/tasks.md`
- Add Running Periodization V1 to ROADMAP.md
- Update data model documentation (TrainingPlan sport values, RunningPhaseType values, sport profile JSON shape)
- Update tasks.md with running implementation tasks
- **Effort**: Small
- **Status**: Not started

**Total: 6 tasks.**

---

## Scope Boundaries

### In Scope (V1)
- Level assessment from running frequency + years + continuous run capability + race history
- 2 periodization models: 3-phase (beginner), 4-phase (intermediate/advanced)
- 5 goal distance modifiers (5K, 10K, Half Marathon, Marathon, General Fitness)
- 6 physical limitation modifiers with per-phase precautions
- Auto-generated phases with date ranges and three-layered descriptions
- Phase-aware scheduler titles
- Manual phase transitions
- Cycle restart
- Phase timeline on goal detail
- Consolidated schema — zero new tables, zero new columns

### Out of Scope (deferred)

| Feature | Why Deferred |
|---------|-------------|
| Workout prescription ("Run 5 × 1000m at 5:00/km") | The app structures *when*, not *what*. The knowledge base document describes workout types. |
| GPS/watch integration | Different product. The app is a planner, not a training log. |
| VDOT calculator or race predictor | Nice-to-have but not needed for phase-aware scheduling. The knowledge base describes VDOT conceptually. |
| Pace-based zone calculation | Requires personal data (recent race time or max HR test). Defer to V2. |
| Maffetone MAF heart-rate tracking | The knowledge base describes MAF. App integration requires HR data. |
| Automatic phase transitions based on date | Manual button is sufficient. The user knows when they are ready. |
| Training load across sports (running + tennis + climbing) | Valuable but complex. Requires a unified load model. Defer to after all three sport plans are built. |
| Deload week micro-periodization | The 3:1 build/recovery cycle within phases is described in phase content. App-level tracking is V2. |

---

## Multi-Sport Load Awareness (V2 Opportunity)

Running does not exist in isolation. Tennis 3×/week and climbing 1×/week impose significant training load. In a future V2, the running periodization engine could accept total weekly load context:

- Tennis match days count as "hard" sessions for the running hard/easy principle
- Climbing sessions (especially max-strength phase) create upper-body and grip fatigue that indirectly affects running quality
- Running quality sessions should not follow hard tennis or climbing sessions

This cross-sport load awareness would modify the running phase descriptions to include scheduling recommendations relative to the other sports. No schema changes needed — the scheduler already has all the data.

---

*End of specification. Ready for implementation after approval.*
