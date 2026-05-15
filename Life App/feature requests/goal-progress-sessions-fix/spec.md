# Feature specification: Goal progress ignores activity logs when metric is "Sessions"

**Spec ID**: `goal-progress-sessions-fix`
**Created**: 2026-05-14
**Updated**: 2026-05-14
**Status**: Draft. Pending user approval before plan phase.

---

## Overview

Yearly and monthly goals with the "Sessions" metric do not advance when the user logs activities via the activity tracker. The activity log carries the correct `goalId`, but the progress endpoint's gate (`if (goal.activityTypeId != null && metric != null)`) at `src/app/api/goals/[id]/progress/route.ts:138` and `:192` skips the log query entirely when `targetMetric` is `null`. The form's "sessions → null" mapping in `src/components/goals/goal-form-standalone.tsx:244-247` produces exactly that goal shape.

The standalone goal branch in the same file (lines 280-303) already counts logs by `goalId` unconditionally; the bug is that the yearly and monthly branches do not. This spec extends the standalone fallback behavior to yearly and monthly, with `"count"` as the default metric when none is configured on the goal.

The form is not modified in this hotfix. Goals already in the database with `targetMetric = null` are fixed by the route change alone.

---

## User scenarios and testing

### User story 1, yearly goal with "Sessions" metric counts activity logs (priority P1)

A user creates a yearly goal linked to an activity type, picks "Sessions" as the metric, and logs activities via the activity tracker. The goal progress card reflects the logged sessions immediately, the same way the "Log Progress" button does today.

**Why this priority**: this is the literal reported bug. P1 because the user is actively using a manual workaround in production.

**Independent test**: on the live app with the user's existing "no drinking alcohol" yearly goal (which already has two activity-log entries linked via `goalId` from 2026-05-14), open the goals page and observe the progress card. After the fix is deployed, the card shows 2 sessions of progress, not 0.

**Acceptance scenarios**:

1. **Given** a yearly goal with `activityTypeId` set and `targetMetric = null`, and one or more activity logs linked to it via `goalId`, **When** the progress endpoint is hit, **Then** the response `current` value equals the count of those logs (plus any `goalTallies` rows in the same year).
2. **Given** the same goal, **When** the user creates a new activity log via the workout-log form with that goal picked, **Then** the next progress fetch shows the updated count, including the new log.
3. **Given** a yearly goal with `activityTypeId` set and `targetMetric` set to a non-null value (e.g., `"duration"`), **When** the progress endpoint is hit, **Then** the existing per-metric sum behavior is preserved (no regression for goals that already use a specific metric).
4. **Given** a yearly goal with `activityTypeId = null` and `targetMetric = null` (e.g., a tally goal with no activity type linked), **When** the progress endpoint is hit, **Then** any logs linked by `goalId` still count (no gate on `activityTypeId` either).

### User story 2, monthly goal with "Sessions" metric counts activity logs (priority P1)

The same behavior as User Story 1 applies to monthly goals. The monthly branch at line 192 has the same gate and the same bug.

**Acceptance scenarios**: same as User Story 1, but with `horizon = "monthly"` and the per-month date range (`getPeriodRange("monthly", goal.month)`).

### User story 3, no regression for existing working goal types (priority P1)

Goals that are already producing correct progress (those with explicit metric values like `"duration"`, `"count"`, `"distance_km"`, or grade-based goals) continue to produce the same numbers after the fix.

**Independent test**: pick any existing goal in the user's account that currently shows correct progress. Note the current value. Deploy the fix. Refresh the goal. Confirm the same value.

**Acceptance scenarios**:

1. **Given** a yearly goal with `targetMetric = "duration"`, **When** the progress endpoint is hit, **Then** `current` is the sum of `durationMinutes` across linked logs in the year, unchanged from pre-fix behavior.
2. **Given** a yearly goal with `targetMetric = "grade"` (climbing), **When** the progress endpoint is hit, **Then** the grade-based progress calculation is unaffected.
3. **Given** any standalone goal, **When** the progress endpoint is hit, **Then** the existing standalone fallback behavior is unchanged.

---

## Edge cases

- **Goal with `activityTypeId = null` and `targetMetric = null` (free-form tally goal)**: logs linked by `goalId` should still count. The new behavior makes this case work; today it does not. This is intended.
- **Log with `goalId` set but `activityTypeId` mismatched** (the phantom-progress scenario from `small-changes-batch-1` Change #1): the log still contributes to the goal count, as it does today. The phantom-progress concern was about preventing the mismatch from happening at picker level; the progress endpoint does not filter by activity type even today. This fix does not change that behavior.
- **Log with `goalId = null`**: not affected. The `inArray(activityLogs.goalId, allGoalIds)` filter (yearly) or `eq(activityLogs.goalId, goalId)` filter (monthly) excludes unlinked logs. The fix does not loosen those filters.
- **Goal with `targetMetric` set to a key that does not appear in any log's `metrics` JSON**: `sumMetricFromLogs` returns 0 for that case, as it does today. Behavior unchanged.
- **`goalTallies` contributions**: unaffected. The tallies sum below the gate runs unconditionally today and continues to.

---

## Requirements

### Functional requirements

- **FR-001**: The yearly-goal branch of `GET /api/goals/[id]/progress` (`src/app/api/goals/[id]/progress/route.ts:138-150`) MUST query `activity_logs` for the goal IDs in `allGoalIds` regardless of whether `goal.targetMetric` is `null` or `goal.activityTypeId` is `null`. The existing date-range filter (`gte(activityLogs.date, from)`, `lte(activityLogs.date, to)`) is preserved.
- **FR-002**: When `goal.targetMetric` is `null`, the yearly-goal branch MUST default the metric argument to `"count"` when calling `sumMetricFromLogs`. `sumMetricFromLogs("count", logs)` returns `logs.length` and is already implemented at line 55. No change to the helper.
- **FR-003**: The monthly-goal branch (`src/app/api/goals/[id]/progress/route.ts:192-204`) MUST apply the same change: unconditional log query, default metric `"count"` when `null`.
- **FR-004**: The standalone-goal branch (lines 232-277 and the fallback 279-312) MUST NOT change. It is already correct.
- **FR-005**: The form (`src/components/goals/goal-form-standalone.tsx`) MUST NOT change in this hotfix. Form cleanup is deferred to a separate item.
- **FR-006**: No schema change. No migration. No new tables, columns, or fields.
- **FR-007**: The fix MUST be backward compatible with all existing goal types: grade-based, duration-based, count-based, custom-metric-based, and session-based. All other code paths in the progress route are untouched.

### Key entities

No new entities. No schema changes. The only change is to the runtime behavior of the progress endpoint for two existing code paths.

---

## Success criteria

- **SC-001**: The user's "no drinking alcohol" yearly goal shows 2 sessions of progress (matching the two existing activity-log entries dated 2026-05-16 with `goalId` set), not 0. Verified manually after deploy.
- **SC-002**: Creating a new activity-tracker log for that goal increases the progress count by 1 on the next page load. Verified manually.
- **SC-003**: At least one other existing goal that already showed correct progress before the fix shows the identical progress value after the fix. Picked goal recorded in PR body. Verified manually.
- **SC-004**: `npx tsc --noEmit` is clean.
- **SC-005**: `npm run lint` per-file baseline for `src/app/api/goals/[id]/progress/route.ts` is unchanged versus master (no new errors or warnings introduced by the fix).
- **SC-006**: `npm run test -- --run` continues to pass green at the existing 116+ test count. No tests are added in this hotfix; existing tests must not regress.

---

## Out of scope

- Form cleanup of `src/components/goals/goal-form-standalone.tsx:244-247`. Deferred follow-up.
- Adding integration tests for `src/app/api/goals/[id]/progress/route.ts`. The route has zero coverage today; adding it now requires a refactor (extract `sumMetricFromLogs` and `getPeriodRange` to a helper module). Separate item.
- Backfilling existing goal records with `targetMetric = "count"`. Not needed; the route fix handles `null` correctly.
- UX clarification on the difference between the form label "Sessions" and the internal `"count"` metric value. Separate cosmetic item.
- The "monthly target within yearly" UX gap. Separate UX question, unrelated to this bug.
- The phantom-progress scenario from `small-changes-batch-1` Change #1. Decided "belt only" there; not revisited here.
