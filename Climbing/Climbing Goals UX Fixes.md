# Feature Specification: Climbing Goals UX Fixes

**Spec ID**: `climbing-goals-ux-fixes`
**Created**: 2026-03-14
**Status**: Built (complete)
**Author**: Climbing Agent
**Depends on**: Climbing Training Periodization V1 (built)

> Four targeted UX issues identified after using the climbing training plan feature. These are not new features -- they are corrections to how climbing goals interact with the existing goal system.

---

## Problem Summary

1. **Target value is a number, should be a grade**: The goal form shows "Target Value: 7" + "Unit" for climbing goals. For climbing, the target is a grade (e.g., "7a"), not a number. The current display shows "0 / 7" which is meaningless.
2. **Bouldering uses V-scale, should use French grading**: The training plan dialog uses V-scale (V0-V14) for bouldering but French grades (5a-8a+) for sport climbing. Both should use French grading.
3. **Training plan form doesn't clarify what grades mean**: "Max Boulder Grade" and "Max Sport Grade" are ambiguous -- is it your current ability or your target? It's your current ability (used for level assessment and safety gates), but the form doesn't say that.
4. **"Log Progress" doesn't make sense for climbing goals with training plans**: The tally-based "+1" progress button was designed for countable goals (books, km). For climbing goals with training plans, progress means completing scheduled training sessions, not logging a count.

---

## Change 1: French Grading for Bouldering

### What changes

Replace the V-scale grade order in the periodization engine with the same French scale used for sport climbing.

### Why

The user climbs in a French-grading environment (Belgium/Europe). V-scale is primarily used in the US. Both disciplines should use the same grading system for consistency and because the user thinks in French grades.

### Current code

In `src/lib/training/periodization.ts`:

```typescript
const BOULDER_GRADE_ORDER = [
  "V0", "V1", "V2", "V3", "V4", "V5", "V6", "V7",
  "V8", "V9", "V10", "V11", "V12", "V13", "V14",
];

const SPORT_GRADE_ORDER = [
  "5a", "5a+", "5b", "5b+", "5c", "5c+",
  "6a", "6a+", "6b", "6b+", "6c", "6c+",
  "7a", "7a+", "7b", "7b+", "7c", "7c+",
  "8a", "8a+",
];
```

Two separate functions `boulderGradeToLevel()` and `sportGradeToLevel()` with different thresholds.

### Proposed code

Replace both with a single shared grade order and a single level function:

```typescript
const GRADE_ORDER = [
  "5a", "5a+", "5b", "5b+", "5c", "5c+",
  "6a", "6a+", "6b", "6b+", "6c", "6c+",
  "7a", "7a+", "7b", "7b+", "7c", "7c+",
  "8a", "8a+",
];

function gradeToLevel(grade: string): ClimberLevel {
  const idx = GRADE_ORDER.indexOf(grade);
  if (idx < 0 || idx <= 5) return "beginner";   // 5a through 5c+
  if (idx <= 12) return "intermediate";           // 6a through 7a
  return "advanced";                              // 7a+ and above
}
```

`assessLevel()` calls `gradeToLevel()` for both boulder and sport grades instead of two separate functions.

### Files to change

| File | Change |
|------|--------|
| `src/lib/training/periodization.ts` | Replace `BOULDER_GRADE_ORDER` + `SPORT_GRADE_ORDER` with single `GRADE_ORDER`. Replace `boulderGradeToLevel` + `sportGradeToLevel` with single `gradeToLevel`. Update exports. |
| `src/components/goals/training-plan-dialog.tsx` | Update import: replace `BOULDER_GRADE_ORDER, SPORT_GRADE_ORDER` with `GRADE_ORDER`. Both dropdowns use `GRADE_ORDER`. |
| `src/lib/__tests__/periodization.test.ts` | Update all test cases using V-scale: `"V1"` → `"5b"`, `"V5"` → `"6b+"`, `"V8"` → `"7b+"`, `"V9"` → `"7c"`, etc. |

### Data migration

Any existing `training_plans` rows with V-scale `maxBoulderGrade` values (e.g., "V4") need to be converted. Since this is a single-user app and the feature is new, the simplest approach is: if the user has an existing plan, delete and recreate it. Alternatively, add a simple mapping in the API that converts V-scale to French on read.

### Test cases

- `assessLevel("5b", "5b", 1)` → beginner
- `assessLevel("6b+", "6b+", 3)` → intermediate
- `assessLevel("7c", "7b", 6)` → advanced
- `assessLevel("7b+", "7a+", 1)` → beginner (experience caps it)
- `assessLevel("5b", "7a", 4)` → beginner (lower grade caps it)

---

## Change 2: Grade-Based Target for Climbing Goals

### What changes

When the selected activity type has a `gradeSystem` (the Climbing activity type already has `gradeSystem: "french"` in the database), the goal form replaces the numeric Target Value + text Unit fields with a French grade dropdown.

### Why

A climbing goal like "Become a 7a climber" has a grade as its target, not a number. The current form forces the user to enter "7" as a target value, which displays as "0 / 7" -- meaningless and impossible to track.

### Current UX

```
Target Value    Unit
[  7  ]         [e.g. books, km, ...]

→ Displays on card as: "0 / 7"
```

### Proposed UX

When activity type has `gradeSystem`:

```
Target Grade
[  7a  ▼]

→ Displays on card as: "Target: 7a"
```

When activity type does NOT have `gradeSystem` (reading, running, etc.): unchanged.

### Data storage

No schema changes needed. Reuse existing fields:
- `targetUnit` stores the grade string (e.g., `"7a"`)
- `targetValue` stores the numeric index from `GRADE_ORDER` (e.g., `12` for `"7a"`) for potential sorting/comparison
- `targetMetric` set to `"grade"` to distinguish from other target types

### Files to change

| File | Change |
|------|--------|
| `src/components/goals/goal-form-standalone.tsx` | Detect `selectedActivityType?.gradeSystem`. When present, render a grade dropdown (using `GRADE_ORDER`) instead of the Target Value number input + Unit text input. Set `targetUnit` to the selected grade, `targetValue` to its index, `targetMetric` to `"grade"`. |

### Acceptance scenarios

1. **Given** I create a new goal and select "Climbing (Gym)" as activity type, **When** the form renders, **Then** I see "Target Grade" with a French grade dropdown instead of "Target Value" + "Unit".
2. **Given** I select activity type "Running" (no gradeSystem), **When** the form renders, **Then** I see the normal "Target Value" + "Unit" fields (unchanged).
3. **Given** I edit an existing climbing goal that was created with the old numeric target, **When** the form opens, **Then** the grade dropdown is shown and I can select the correct grade.

---

## Change 3: Clarify Training Plan Grade Labels

### What changes

Update labels in the training plan creation dialog to make it clear that grades entered are the user's **current ability**, not their target.

### Why

The training plan uses grades to assess the climber's level and determine which exercises are safe. Entering a target grade instead of a current grade could result in an overly aggressive program and increase injury risk (e.g., a 6a climber entering 7a gets placed in an intermediate/advanced program with fingerboard and campus board exercises they're not ready for).

### Current labels

```
Max Boulder Grade    Max Sport Grade
[V3  ▼]             [6a  ▼]
```

### Proposed labels

```
Current Boulder Grade    Current Sport Grade
[6a  ▼]                 [6a  ▼]

ℹ Enter the hardest grade you can currently climb consistently
  (not your project grade). This determines your training level
  and which exercises are safe for you.
```

### Files to change

| File | Change |
|------|--------|
| `src/components/goals/training-plan-dialog.tsx` | Change `<Label>` text from "Max Boulder Grade" to "Current Boulder Grade" and "Max Sport Grade" to "Current Sport Grade". Add a `<p>` with help text below the grade selectors. |

---

## Change 4: Hide Log Progress for Climbing Goals with Training Plans

### What changes

Hide the "Log Progress" (tally) button on the yearly goal card when the goal has an attached training plan. For these goals, progress is measured by completing scheduled training sessions, which is already tracked by the activities system.

### Why

The tally system was designed for countable goals: "+1 book", "+5 km". For a climbing goal with a training plan, there's nothing meaningful to tally. Progress is: are you doing your scheduled sessions? That's already visible on the calendar and tracked by activity completion.

Showing the "Log Progress" button on a climbing goal with a training plan creates confusion: the user clicks it, sees a number input, and has no idea what number to enter.

### Current code

In `yearly-goal-card.tsx`, the button always renders:

```tsx
<Button variant="outline" size="sm" className="h-7 text-xs" onClick={onLogTally}>
  <Plus className="mr-1 h-3 w-3" /> Log Progress
</Button>
```

### Proposed code

```tsx
{!trainingPlan && (
  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onLogTally}>
    <Plus className="mr-1 h-3 w-3" /> Log Progress
  </Button>
)}
```

### Files to change

| File | Change |
|------|--------|
| `src/components/goals/yearly-goal-card.tsx` | Wrap the "Log Progress" button in a conditional that hides it when `trainingPlan` prop is present. |

### Acceptance scenarios

1. **Given** a yearly goal with a training plan, **When** I view the goal card, **Then** the "Log Progress" button is not shown.
2. **Given** a yearly goal without a training plan (e.g., "Read 12 books"), **When** I view the goal card, **Then** the "Log Progress" button is shown as before.

---

## Change 5: Update Target Display on Goal Card

### What changes

When a climbing goal has a grade-based target (stored in `targetUnit` as a grade string with `targetMetric` = `"grade"`), the yearly goal card displays the target as "Target: 7a" instead of the current "0 / 7" format.

### Why

"0 / 7" implies a countable progress metric (like "3 / 12 books"). Climbing grades are not countable -- you either climb the grade or you don't. The display should reflect that the target is a milestone grade, not a quantity.

### Current display logic

In `yearly-goal-card.tsx`:

```tsx
const targetDisplay = goal.targetValue
  ? `${goal.targetValue}${goal.targetUnit ? ` ${goal.targetUnit}` : ""}`
  : null;

// Renders as: "0 / 7"  (progress.current / targetDisplay)
{targetDisplay && (
  <p className="text-xs text-muted-foreground mt-0.5">
    {progress?.current ?? 0} / {targetDisplay}
  </p>
)}
```

### Proposed display logic

```tsx
const isGradeTarget = goal.targetMetric === "grade" && goal.targetUnit;
const targetDisplay = isGradeTarget
  ? null  // Don't show "0 / 7a" -- it makes no sense
  : goal.targetValue
    ? `${goal.targetValue}${goal.targetUnit ? ` ${goal.targetUnit}` : ""}`
    : null;

// For grade targets, show "Target: 7a" instead
{isGradeTarget && (
  <p className="text-xs text-muted-foreground mt-0.5">
    Target: {goal.targetUnit}
  </p>
)}
{!isGradeTarget && targetDisplay && (
  <p className="text-xs text-muted-foreground mt-0.5">
    {progress?.current ?? 0} / {targetDisplay}
  </p>
)}
```

### Files to change

| File | Change |
|------|--------|
| `src/components/goals/yearly-goal-card.tsx` | Update the target display logic to detect grade-based targets and render them differently. |

### Acceptance scenarios

1. **Given** a climbing goal with `targetMetric: "grade"` and `targetUnit: "7a"`, **When** I view the card, **Then** I see "Target: 7a" (not "0 / 7").
2. **Given** a reading goal with `targetValue: 12` and `targetUnit: "books"`, **When** I view the card, **Then** I see "3 / 12 books" as before.

---

## Task Breakdown

| # | Task | Files | Effort | Depends on |
|---|------|-------|--------|------------|
| 1 | Replace V-scale with French grading, consolidate grade functions | `periodization.ts`, `periodization.test.ts` | Small | Nothing |
| 2 | Update training plan dialog to use unified grades + clarify labels | `training-plan-dialog.tsx` | Small | Task 1 |
| 3 | Add grade dropdown to goal form for climbing activity types | `goal-form-standalone.tsx` | Medium | Task 1 |
| 4 | Hide "Log Progress" when training plan exists | `yearly-goal-card.tsx` | Tiny | Nothing |
| 5 | Update target display for grade-based goals | `yearly-goal-card.tsx` | Small | Task 3 |

Tasks 1 and 4 can be done in parallel. Tasks 2 and 3 depend on Task 1 (shared grade order). Task 5 depends on Task 3 (needs the `targetMetric: "grade"` convention).

---

## Scope

**No new tables.** No new API routes. No new pages. All changes are in:
- 1 lib file (`periodization.ts`)
- 1 test file (`periodization.test.ts`)
- 3 component files (`goal-form-standalone.tsx`, `training-plan-dialog.tsx`, `yearly-goal-card.tsx`)

**No breaking changes** to existing non-climbing goals. The tally system, numeric targets, and progress rings all continue to work for goals that use them (reading, running, etc.).

---

*End of specification. Ready for review and implementation.*
