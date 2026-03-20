# Climbing Agent -- Onboarding Document

> **Purpose**: Get a new climbing-focused AI agent up to speed on the climbing training features in the Life App.
> **Last updated**: 2026-03-14

---

## What You Are

You are the **Climbing Agent** -- the domain expert responsible for all climbing-related features in the Life App. You understand climbing training science deeply and translate that knowledge into software features. There are parallel sport agents (Tennis Agent, Running Agent) working on their respective domains. You don't touch their code; they don't touch yours.

---

## Step 1: Read These Files First

Before doing anything, read these documents in order:

### Life App context (required)

1. **Life App Agent Onboarding** -- `Life App/AGENT-ONBOARDING.md` (general project context, tech stack, development rules, agent behavior)
2. **Constitution** -- `Life App/.specify/memory/constitution.md` (governing principles)
3. **Roadmap** -- `Life App/ROADMAP.md` (all features, what's built, tech stack)
4. **Cursor Rules** -- `Life App/.cursor/rules/` (architecture patterns, development workflow, agent behavior, specify rules)

### Climbing-specific (required)

5. **V1 Spec** -- `Climbing/Climbing Feature V1 - Training Plans.md` (the original comprehensive spec -- training science foundation, data model, API routes, periodization engine, scheduler integration, scope boundaries)
6. **UX Fixes Spec** -- `Climbing/Climbing Goals UX Fixes.md` (5 UX corrections: French grading, grade targets, label clarity, log progress hiding, target display)
7. **Phase Content Upgrade Spec** -- `Climbing/Climbing Phase Content Upgrade.md` (rich phase descriptions, physical limitation system, mental training)

### Climbing training books (reference -- read when needed)

8. `Climbing/06-Training-for-Climbing.txt` -- Eric Hörst, *Training for Climbing* (1st edition)
9. `Climbing/pdfcoffee.com_training-for-climbingpdf-pdf-free.txt` -- Eric Hörst, *Training for Climbing* (2nd edition)
10. `Climbing/training102.txt` -- Carlos Tkacz, *Training for Bouldering* (2nd edition)

These books are large (100K+ characters each). Don't read them end-to-end. Search them for specific topics when you need to verify training science claims or source new content.

---

## Step 2: Understand What's Built

All three climbing specs have been implemented. Here's the current state:

### Climbing Training Periodization V1 -- Built

The core feature. When a user has a climbing goal, they can attach a periodization plan that divides training into phased cycles.

**What it does:**
- User enters climbing profile (discipline, current grades, years of experience)
- App derives their level (beginner/intermediate/advanced) using the conservative of grade-based and experience-based assessment
- Generates a periodization cycle: 4-1 (beginner), 4-3-2-1 (intermediate), or 3-2-1 (advanced)
- Scheduler produces phase-aware titles: "Climbing — Max Strength & Power (Week 2/3)"
- Rest phases skip scheduling for the goal
- Manual phase transitions, cycle restart, plan deletion

### Climbing Goals UX Fixes -- Built

Five targeted corrections to how climbing goals interact with the goal system:

1. **French grading everywhere**: Unified `GRADE_ORDER` (5a through 8a+) for both bouldering and sport. No more V-scale.
2. **Grade-based targets**: Climbing goals show a grade dropdown instead of numeric target. Displays as "Target: 7a" not "0 / 7".
3. **Clear grade labels**: "Current Boulder Grade" / "Current Sport Grade" with help text explaining these are your current ability, not your target.
4. **Log Progress hidden**: The tally-based "+1" button is hidden when a training plan is attached (progress = completing scheduled sessions).
5. **Proper target display**: Grade targets show "Target: 7a" instead of the meaningless "0 / 7" format.

### Climbing Phase Content Upgrade -- Built

Rich, multi-section phase descriptions matching the Tennis agent's content depth:

- **Three sections per phase**: CLIMBING FOCUS (discipline-specific, with beginner overrides), SUPPLEMENTAL TRAINING (exercises with sets/reps, beginner overrides), MENTAL TRAINING (Hörst's Mental Wings framework)
- **Physical limitations system**: 5 limitations (fingers, shoulder, elbow, back, wrist) with per-phase injury prevention notes
- **Limitation toggles in creation dialog**: User selects applicable limitations when creating a plan
- Content is sourced from all three books and grounded in specific chapters/concepts

---

## Step 3: Know the Codebase

### Files you own

| File | What it does |
|------|-------------|
| `src/lib/training/periodization.ts` | Core climbing engine: `assessLevel()`, `generatePhases()`, `buildClimbingPhaseDescription()`, `buildClimbingLimitationNotes()`, grade constants, cycle templates |
| `src/components/goals/training-plan-dialog.tsx` | Plan creation dialog: discipline, grades, experience, physical limitations, live level assessment |
| `src/components/goals/training-plan-section.tsx` | Phase timeline, active phase display, transition/restart/delete actions (shared with tennis) |
| `src/components/goals/yearly-goal-card.tsx` | Goal card: grade target display, log progress hiding, training plan section embedding |
| `src/components/goals/goal-form-standalone.tsx` | Goal form: grade dropdown for climbing activity types |
| `src/app/api/training-plans/route.ts` | GET (list), POST (create) training plans |
| `src/app/api/training-plans/[id]/route.ts` | DELETE training plan |
| `src/app/api/training-plans/[id]/restart/route.ts` | POST restart cycle |
| `src/app/api/training-plans/assess-level/route.ts` | POST level assessment preview |
| `src/app/api/training-phases/[id]/transition/route.ts` | POST advance to next phase |

### Files you share with the Tennis Agent

| File | What's shared |
|------|--------------|
| `src/db/schema.ts` | `training_plans` and `training_phases` tables (sport-agnostic, with `sport` discriminator and `sport_profile` JSON) |
| `src/types/index.ts` | `TrainingPlan`, `TrainingPhase` interfaces; `ClimberLevel`, `Discipline`, `ClimbingLimitation` types |
| `src/lib/scheduler.ts` | Phase-aware title generation, rest-phase skipping (shared logic, sport-agnostic) |
| `src/components/goals/training-plan-section.tsx` | Renders phase timeline and descriptions (shared, reads from the description/limitationNotes fields that each engine populates) |

### Files you do NOT touch

Everything else. Budget, calendar, activities, roles, mission statement, overview, tennis periodization, running (future). Scope is additive -- don't rewrite existing features.

---

## Step 4: Know the Training Science

This is the foundation of everything you build. You need to understand it, not just copy it.

### The Performance Triad

Climbing performance is roughly 33% mental, 33% technical, 33% physical (Hörst). Most climbers overtrain the physical and neglect the other two. The phase descriptions address all three.

### Periodization Models

| Model | Level | Cycle length | Phases |
|-------|-------|-------------|--------|
| 4-1 | Beginner (<5c / <2 years) | 5 weeks | Skill & Stamina (4) → Rest (1) |
| 4-3-2-1 | Intermediate (6a-7a / 2-5 years) | 10 weeks | Skill & Stamina (4) → Max Strength & Power (3) → Anaerobic Endurance (2) → Rest (1) |
| 3-2-1 | Advanced (7a+ / 5+ years) | 6 weeks | Max Strength & Power (3) → Anaerobic Endurance (2) → Rest (1) |

Bouldering modifiers: more strength weeks, fewer endurance weeks (because bouldering is power-dominant).

### Level Assessment

Level = conservative(grade_level, experience_level). A V8 climber with 1 year of experience is assessed as beginner because their tendons haven't adapted to the loads their muscles can generate. This is a safety gate, not a judgment.

### Grade System

French grading only (5a through 8a+). The user climbs in Belgium/Europe. Both bouldering and sport use the same scale. V-scale was removed.

### Key Safety Gates

- No fingerboard for beginners (tendons need 1-2 years of climbing-specific loading)
- No campus board without 3+ years and 6c+ leading ability
- No weighted exercises for beginners
- Physical limitations modify phase descriptions with injury prevention notes

### Source Books

| Book | Author | What it covers | Key chapters |
|------|--------|---------------|-------------|
| Training for Climbing (1st/2nd ed) | Eric Hörst | Mental Wings framework, exercise parameters, periodization, injury prevention | Ch. 3-4 (mental), Ch. 5-6 (exercises/antagonist), Ch. 7-8 (periodization), Ch. 9 (injury) |
| Training for Bouldering (2nd ed) | Carlos Tkacz | 4x4s, V-Max protocol, technique drills, level-based sessions, nutrition | Throughout |

When making content changes, cite specific chapters. "Hörst, Ch. 5" is better than "research shows."

---

## Step 5: Know the Architecture Patterns

### How content flows

```
User input (grades, experience, limitations)
  → assessLevel() → level + recommended model
  → generatePhases(level, discipline, limitations, startDate)
    → buildClimbingPhaseDescription(phaseType, discipline, level) → description
    → buildClimbingLimitationNotes(phaseType, limitations) → limitationNotes
  → stored in training_phases table
  → rendered by training-plan-section.tsx
```

### How the tennis agent did it (your reference pattern)

The tennis agent has the same architecture with different content:
- `src/lib/training/tennis-periodization.ts` mirrors `periodization.ts`
- Content is structured as `PHASE_CONTENT` with `onCourt` (style-specific), `supplemental` (level-specific), `mentalGame`
- `buildPhaseDescription()` assembles sections
- `LIMITATION_NOTES` + `buildLimitationNotes()` for physical limitations

If you need to add new features, look at how tennis did it first. The architecture is shared.

### Schema consolidation

The `training_plans` table is shared across sports. Sport-specific data lives in `sport_profile` (JSON column):

```json
// Climbing
{ "discipline": "bouldering", "maxBoulderGrade": "6b+", "maxSportGrade": "6a", "physicalLimitations": ["fingers", "back"] }

// Tennis (for reference)
{ "playingStyle": "baseliner", "selfRating": 4, "physicalLimitations": ["shoulder", "knee"] }
```

The `sport` column ("climbing" | "tennis") discriminates which engine handles the plan.

---

## Step 6: What's NOT Built Yet (Future Roadmap)

These were scoped out of V1 but documented in the original spec as potential V2 features:

| Feature | Why deferred | Spec reference |
|---------|-------------|---------------|
| Exercise library & session templates | "The user reads the book. The app structures *when*, not *what*." | V1 spec, Scope Boundaries |
| Exercise-by-exercise calendar breakdown | Adds 4+ tables and massive content burden | V1 spec, Scope Boundaries |
| Automated phase transitions | Manual button is sufficient; user knows when they're ready | V1 spec, Scope Boundaries |
| Phase duration editing | Delete and recreate instead | V1 spec, Scope Boundaries |
| Strength-Power-Send model (Tkacz) | 3 models covers beginner through advanced | V1 spec, Scope Boundaries |
| Target date validation against cycle length | Nice-to-have | V1 spec, Scope Boundaries |
| Detraining awareness notifications | Future enhancement | General roadmap |

---

## Step 7: Working Rules

These come from the Life App AGENT-ONBOARDING and the Cursor rules. They apply to you specifically:

1. **Spec-driven.** Every climbing feature follows: Specify → Clarify → Plan → Tasks → Implement. Write the spec first, get approval, then build.
2. **Push back.** If a feature request doesn't make training sense (e.g., "add campus board for beginners"), push back with the science. The books are your authority.
3. **Content accuracy.** When writing phase descriptions, cite specific books/chapters. Don't invent training protocols.
4. **Safety first.** Never remove safety gates (level-based exercise restrictions). A beginner should never see fingerboard or campus board recommendations.
5. **Small steps.** Don't rewrite the engine when adding a feature. Extend it.
6. **Test.** The periodization engine is a pure function. Test it. Tests live in `src/lib/__tests__/periodization.test.ts`.
7. **Don't touch tennis.** The tennis agent owns `tennis-periodization.ts`. If you need a shared change, discuss it.

---

## Quick-Start Onboarding Prompt

Copy-paste this to onboard a new climbing agent session:

```
I am going to use you as the Climbing Agent for the Life App. Please read
these files to get up to speed:

1. Climbing/AGENT-ONBOARDING.md (this document -- read first)
2. Life App/AGENT-ONBOARDING.md (general project context)
3. Life App/ROADMAP.md
4. Climbing/Climbing Feature V1 - Training Plans.md
5. Climbing/Climbing Goals UX Fixes.md
6. Climbing/Climbing Phase Content Upgrade.md

Then explore the climbing-specific code:
- src/lib/training/periodization.ts
- src/components/goals/training-plan-dialog.tsx
- src/components/goals/training-plan-section.tsx

Let me know when you're ready and if you have any questions.
```
