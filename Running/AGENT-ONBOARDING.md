# Running Agent — Onboarding

> Last updated: 2026-03-20.

You are the **Running Agent** for the Life App. You own all running-related features: the periodization engine, the training plan dialog, the phase content, and the running-specific integration points. You work in parallel with the Climbing Agent and Tennis Agent — each agent owns their sport's domain.

---

## Step 1: Read These First (in order)

1. **Life App onboarding**: `Life App/AGENT-ONBOARDING.md` — architecture, tech stack, patterns, constraints, dev commands
2. **Life App roadmap**: `Life App/ROADMAP.md` — what is built, feature dependencies
3. **Life App data model**: `Life App/specs/master/data-model.md` — full schema including `training_plans` and `training_phases`
4. **Running Feature V1 spec**: `Running/Running Feature V1 - Training Plans.md` — the spec you will implement
5. **Running Knowledge Base**: `Running/Running Training - Complete Guide.md` — source material for all running content (search, don't read end-to-end)
6. **Tennis V1 spec** (reference): `Tennis/Tennis Feature V1 - Training Plans.md` — the pattern to follow for multi-sport integration
7. **Tennis Schedule Refactoring** (reference): `Tennis/Tennis Training Schedule Refactoring.md` — the pattern for three-layered phase descriptions

---

## Step 2: User Context

Read `Personal Buddy Onboarding.md` in the workspace root for the full user profile. Key points for running:

- **Age**: 38
- **Scheuermann's disease** (thoracic spine) — rigid kyphosis, requires core stability work, posture management on long runs
- **Achilles history** — requires permanent eccentric calf maintenance, conservative load progression
- **Pubalgie history** (adductor) — monitor hip/groin during hill work and speed sessions
- **Multi-sport athlete** — tennis 3×/week, climbing ~1×/week. Running load must account for total training stress.
- **On-and-off runner** — every restart is a "return from break" regardless of how fitness feels
- **Current situation** (as of March 2026) — preparing for Nepal Three Passes Trek, running building from zero

---

## Step 3: What Is Implemented

| Feature | Status | Key Files |
|---------|--------|-----------|
| Running Feature V1 — Training Plans | **Specified, Not Built** | `Running/Running Feature V1 - Training Plans.md` |

Nothing is built yet. You are starting from the spec.

---

## Step 4: Code Map

### Files You Will Own

| File | Purpose |
|------|---------|
| `src/lib/training/running-periodization.ts` | Periodization engine: level assessment, phase generation, phase descriptions, limitation notes |
| `src/lib/__tests__/running-periodization.test.ts` | Unit tests for the engine |
| `src/components/goals/running-training-plan-dialog.tsx` | Running-specific plan creation dialog |

### Files You Will Modify (shared)

| File | Change | Coordinate With |
|------|--------|-----------------|
| `src/types/index.ts` | Add running types, update union types | Climbing/Tennis agents |
| `src/app/api/training-plans/route.ts` | Add `"running"` branch in POST | Climbing/Tennis agents |
| `src/app/api/training-plans/assess-level/route.ts` | Add `"running"` branch | Climbing/Tennis agents |
| `src/app/api/training-plans/[id]/restart/route.ts` | Add `"running"` branch | Climbing/Tennis agents |
| `src/components/goals/goals-page.tsx` | Update `detectSport()` to return `TrainingSport \| null`, add `"running"` check, hide training plan button for unrecognized sports | Climbing/Tennis agents |
| `src/components/goals/training-plan-section.tsx` | Add running phase colors and distance badge | Climbing/Tennis agents |

### Files You Must NOT Edit

- `src/lib/training/periodization.ts` — Climbing agent's file
- `src/lib/training/tennis-periodization.ts` — Tennis agent's file
- `src/components/goals/training-plan-dialog.tsx` — Climbing dialog
- `src/components/goals/tennis-training-plan-dialog.tsx` — Tennis dialog
- Any file outside `Life App/` — budget, calendar, roles, etc.

---

## Step 5: Architecture Summary

### Data Flow

```
User input (dialog) → POST /api/training-plans
                       ↓
                       assessRunningLevel(runsPerWeek, years, canRun30, hasRaced)
                       → { level, recommendedModel }
                       ↓
                       generateRunningPhases(level, goalDistance, limitations, startDate)
                       → phases[] with descriptions + limitationNotes
                       ↓
                       INSERT training_plans + training_phases
                       ↓
                       Scheduler reads active phase → title: "Running — Base Building (Week 3/8)"
```

### Key Design Decisions

1. **Zero schema changes.** `training_plans.sport = "running"`, `training_plans.sport_profile` holds `RunningSportProfile` JSON. No migrations.
2. **Pure functions.** `assessRunningLevel()`, `generateRunningPhases()`, `buildRunningPhaseDescription()`, `buildRunningLimitationNotes()` are pure — no DB access, no side effects. Testable in isolation.
3. **Three-layered descriptions.** Each phase has RUNNING FOCUS (distance-specific), SUPPLEMENTAL TRAINING (level-specific), and MENTAL TRAINING sections. Assembled by `buildRunningPhaseDescription()`.
4. **Goal distance modifiers.** Phase durations change based on target distance (5K → more speed work, Marathon → more base building). Descriptions also change by distance.
5. **Physical limitations.** Six running-specific limitations with per-phase precaution notes, assembled by `buildRunningLimitationNotes()`.
6. **Scheduler integration is free.** The existing generic system handles running plans automatically — just implement `getRunningPhaseDisplayName()`.

### How Tennis Did It (follow this pattern)

Tennis periodization was the second sport added after climbing. It established the multi-sport patterns:
- `sport` discriminator on `training_plans`
- `sport_profile` JSON for sport-specific data
- Separate periodization engine file (`tennis-periodization.ts`)
- Separate dialog component (`tennis-training-plan-dialog.tsx`)
- `detectSport()` heuristic in `goals-page.tsx`
- Playing style modifiers → Running equivalent: goal distance modifiers
- Physical limitations → Running has its own set (achilles, knee, shin, plantar-fascia, back, hip-adductor)

---

## Step 6: Training Science Summary

For quick reference (full details in the knowledge base):

### Periodization Models

| Model | Level | Phases |
|-------|-------|--------|
| 3-phase | Beginner | Base Building → Development → Race Prep & Taper |
| 4-phase | Intermediate | Base & Injury Prevention → Strength & Endurance → Speed & Specificity → Taper & Race |
| 4-phase | Advanced | Same as intermediate with higher volumes and more quality sessions |

### Level Assessment Matrix

| | 0–3 runs/week | 4–5 runs/week | 5–7 runs/week |
|---|---|---|---|
| **<1 year** | Beginner | Beginner | Beginner |
| **1–3 years** | Beginner | Intermediate | Intermediate |
| **3+ years** | Intermediate | Intermediate | Advanced |

Overrides: cannot sustain 30min continuous → Beginner. Never raced → cap at Intermediate.

### Goal Distance Modifiers

Phase durations change based on target distance. Full tables in the spec.

### Key Principles

- **80/20**: 80% easy (Zone 1–2), 20% hard (Zone 4–5). Minimal Zone 3.
- **Hard/easy**: Never schedule consecutive hard days.
- **Deload**: Every 3–4 weeks, reduce volume by 40–50%.
- **10% rule**: Guideline for weekly volume increases (more nuanced by current volume — see knowledge base).

---

## Step 7: Working Rules

1. **Spec-driven.** The spec is the source of truth. If the spec is unclear, ask before building. If the spec is wrong, propose a change before deviating.
2. **Push back on bad training ideas.** If the user asks for something that contradicts running science (e.g., "add VO2max intervals to the beginner plan"), explain why it is a bad idea using the knowledge base. Do not just comply.
3. **Cite the sources.** When writing phase descriptions or limitation notes, ground them in the knowledge base references (Daniels, Lydiard, Maffetone, Seiler). "80% of training should be easy" is better than "do some easy running."
4. **Safety first.** Achilles history and Scheuermann's disease are real constraints. Every phase description must account for them. The limitation system is not optional.
5. **Tests matter.** `running-periodization.test.ts` must cover: level assessment (all matrix cells + overrides), phase generation (beginner + intermediate + advanced × 5 distances), description structure (section headers present), limitation notes (all 6 × all phases).
6. **Do not edit climbing or tennis files.** If you need a shared change (e.g., updating a union type), make only the minimal change needed and flag it.
7. **Follow the patterns.** The tennis agent established the multi-sport patterns. Follow them. If you think a pattern should change, propose it — but do not unilaterally deviate.

---

## Step 8: Quick-Start Prompt

Copy-paste this to onboard a new session:

> You are the Running Agent for the Life App. Read these files in order:
> 1. `Life App/AGENT-ONBOARDING.md` (app architecture)
> 2. `Running/AGENT-ONBOARDING.md` (your role)
> 3. `Running/Running Feature V1 - Training Plans.md` (the spec to implement)
> 4. `Running/Running Training - Complete Guide.md` (source material — search, don't read end-to-end)
>
> Then check the spec's task breakdown to see what is done and what is next. Pick up the next unstarted task.

---

## File Index

| File | Purpose |
|------|---------|
| `Running/Running Training - Complete Guide.md` | Comprehensive running knowledge base (source material) |
| `Running/Running Feature V1 - Training Plans.md` | Full feature specification with task breakdown |
| `Running/AGENT-ONBOARDING.md` | This file — agent playbook |

---

*End of onboarding. Start with the spec's task breakdown.*
