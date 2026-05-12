# Scope: Training vs. Supplemental Session Split

**Feature ID:** `training-supplemental-split`
**Priority sport:** Climbing (most urgent — primary user is a climber)
**Applies to:** All sports with periodization plans (climbing, tennis, running)
**Status:** Implementation in progress — **Phases 1–4 delivered** (schema through climbing plan UI + scheduler + apply). Calendar styling and activity PATCH remain.
**Last updated:** 2026-05-11 (documentation sync)

---

## Problem Statement

When the scheduler generates sessions for a sport goal that has a training plan, all sessions are visually and structurally identical. A user cannot tell from the calendar whether a given day is meant for actual sport training (climbing / on-court tennis / running) or for supplemental gym work.

The phase description — which contains both sport focus and supplemental guidance — is attached as notes to every session, producing a wall of text that doesn't change based on what the user is actually supposed to do that day.

---

## Goal

Give users a clear, at-a-glance understanding of what type of training a given session requires, without changing how sessions count toward goals or how the activity log works.

---

## Research: What the Source Material Says

A subagent investigation of the climbing, tennis, and running training documents found:

- **Climbing**: Supplemental work is consistently prescribed at **≥2×/week** ("antagonist work is non-negotiable"). No explicit climbing-sessions-per-week count is given per phase.
- **Tennis**: No explicit on-court-vs-supplemental session count per week, per phase. Guidance is in terms of exercise mix and relative volume (e.g., "reduce supplemental volume by ~30% in Performance phase").
- **Running**: Strength training is recommended **2×/week, 20–35 minutes** as general guidance. Running frequency per phase is given in some cases (e.g., "two quality sessions/week" in Intermediate Phase 3), but a clean training-vs-supplemental ratio per phase is not.

**Implication:** We cannot reliably automate the training/supplemental ratio from source material. The split must be **user-configurable** with sensible defaults.

---

## What We're Building

### 1. Session type field on scheduled activities
Each scheduled activity gets a `session_type` — either `"training"` or `"supplemental"`. Stored on the activity and surfaced in the calendar view as a visual label.

### 2. Configurable split at training plan creation
When creating a training plan, the user specifies: of the goal's `sessionsPerWeek`, how many are sport training and how many are supplemental.

> Example UI: "Of your 3 sessions per week: [2] training · [1] supplemental"

### 3. Scheduler places sessions using the configured split
The scheduler uses the split to alternate session types across the week and month. If 2 training + 1 supplemental, it produces a rotating pattern (Train → Train → Supplemental → Train → Train → Supplemental...), distributing them using the existing preferred-days logic.

### 4. Session-type-aware notes
Instead of attaching the full phase description to every session, the scheduler attaches only the relevant layer:
- **Training session** → sport focus content (climbing focus / on-court / running focus) + mental game
- **Supplemental session** → supplemental content only

### 5. Clear visual distinction in the calendar
- **Training sessions:** current style (no change)
- **Supplemental sessions:** muted card styling + "Supplemental" badge

No new color system, no goal-level color picker. Distinction must still be clear at a glance.

### 6. Rollout: climbing only in V1

V1 ships the schema, scheduler, and UI changes — and restructures **climbing** phase content into the three content layers (sport focus / supplemental / mental game). **Tennis follows in V1.1, running in V1.2** — same code, sport-by-sport content rollout. Until a sport's content is restructured, the scheduler falls back to the existing `description` field.

---

## What We're Not Building (Now)

- **Goal-level custom colors.** Separate feature, added to the roadmap for after this is done.
- **Per-phase ratio changes.** The split applies across all phases of the plan. Phase-specific overrides are out of scope for V1.
- **A separate activity type for supplemental sessions.** The session stays linked to the sport activity type (Climbing, Tennis, Running) so it logs against the goal correctly.
- **Changing how activity logs work.** Logging a supplemental session still completes that activity as normal.

---

## Decisions Made

| Question | Decision |
|---|---|
| Activity type for supplemental sessions? | Stays as the sport (Climbing/Tennis/Running) so progress still counts toward the goal. |
| Automate ratio from periodization model? | No — source material doesn't support it. User configures it. |
| Visual differentiation? | Muted card + "Supplemental" badge. No color system rework. |
| Which sports? | **Climbing only in V1.** Tennis V1.1, running V1.2. Same code, sport-by-sport content rollout. |

---

## Resolved Decisions

| Question | Decision |
|---|---|
| Cycle restart behavior | **Preserves the split** — cycle restart resets phase progress only. The training/supplemental split is a deliberate user preference and persists across cycles. |
| Editing after creation | **Yes, editable** at any time from the goal / training plan view. |
| Supplemental threshold | Supplemental only kicks in when **sport training ≥ 2 sessions/week**. Below that, the user isn't committed enough to add gym work on top. |
| Defaults | **Yes, applied automatically** based on the rule below. User can override. |
| Distribution algorithm | **Dual preferred-days model.** Training plan stores separate `trainingPreferredDays` and `supplementalPreferredDays`. Scheduler places each session type on its own preferred days. Training takes priority if a day appears in both. Falls back to "any available day" when preferred days are insufficient. |

---

## Default Split Formula (proposed)

Applies to all three sports. Driven by the research finding that **climbing and running both prescribe supplemental work at ~2×/week** as the baseline, and the user's rule that supplemental shouldn't appear unless the user is training the sport at least 2×/week.

```
supplemental = min(2, max(0, sessionsPerWeek − 2))
training     = sessionsPerWeek − supplemental
```

| `sessionsPerWeek` | Training | Supplemental |
|---|---|---|
| 1 | 1 | 0 |
| 2 | 2 | 0 † |
| 3 | 2 | 1 |
| 4 | 2 | 2 |
| 5 | 3 | 2 |
| 6 | 4 | 2 |

† At `sessionsPerWeek = 2`, the training-plan dialog surfaces a non-blocking hint: *"The source material recommends supplemental work alongside training. If your schedule allows more than 2 sessions per week, the default will add supplemental sessions automatically."* The user can still keep the 2 + 0 default — this is a human-reality override of the source recommendation, not a bug.

The supplemental count is capped at 2 because the source material doesn't justify going higher, and adding more risks under-recovery.

**This applies uniformly to all three sports.** Sport-specific tuning is an explicit non-goal for V1.

---

## Next Steps

1. ~~User confirms the default formula above~~ (confirmed 2026-05-11)
2. ~~Move to formal spec (`spec.md`)~~ (drafted and reviewed 2026-05-11)
3. Plan (`plan.md`)
4. Tasks (`tasks.md`)
5. Implement V1 (climbing only — schema + scheduler + UI + climbing content restructure)
6. V1.1 — tennis content restructure
7. V1.2 — running content restructure
