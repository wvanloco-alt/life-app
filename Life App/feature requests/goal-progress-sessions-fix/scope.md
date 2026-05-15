# Scope: Goal progress ignores activity logs when metric is "Sessions"

**Feature ID:** `goal-progress-sessions-fix`
**Priority:** High, production bug affecting an active user. Hotfix.
**Status:** Scope confirmed by user 2026-05-14. Moving to spec.
**Last updated:** 2026-05-14

---

## Problem statement

Yearly and monthly goals configured with the "Sessions" metric do not advance when the user logs activities via the activity tracker, even though the activity log carries the correct `goalId`. The "Log Progress" button still works because it writes to a different table (`goalTallies`) that is summed unconditionally.

Reproduced today 2026-05-14:

1. User created a new activity type "no drinking alcohol".
2. User created a yearly goal linked to that activity type, with "Sessions" picked as the metric (target value of roughly 25 days/month or similar).
3. User logged two days in the activity tracker. The resulting `activity_logs` rows had `goalId` set (verified via the browser network tab, screenshot retained).
4. Goal progress card still showed 0 sessions. The "Log Progress" button advanced it; activity-tracker logs did not.

The user has been working around this by clicking the "Log Progress" button manually. The activity log entries silently fail to contribute to the goal.

---

## Root cause (verified at master, 2026-05-14)

Two pieces compound:

**Form (`src/components/goals/goal-form-standalone.tsx:244-247`)**: when the user picks "Sessions" as the metric on the goal form, the submit handler explicitly nulls `targetMetric`, `targetValue`, and `targetPeriod` on the payload. The follow-up block at lines 254-256 re-sets `targetValue` for yearly/monthly horizons if a value was entered, but `targetMetric` stays `null`. The resulting goal record has `activityTypeId` set, `targetValue` set, and `targetMetric = null`.

**Progress route (`src/app/api/goals/[id]/progress/route.ts:138` for yearly, `:192` for monthly)**: the gate that decides whether to query activity logs is:

```ts
if (goal.activityTypeId != null && metric != null) { ... }
```

When `metric` is `null` (which is exactly the state the form just produced), the entire activity-log query is skipped. Only the `goalTallies` sum below runs.

The standalone goal branch (lines 280-303) does not have this gate: it queries `activity_logs` by `goalId` unconditionally and uses `logs.length` as the session count. So the bug is specific to the yearly and monthly branches; the standalone case was already correct.

`sumMetricFromLogs` (line 51) already supports a `"count"` metric value: `if (metric === "count") return logs.length;`. The form never writes that value, but the helper handles it correctly when called.

---

## What we're fixing

**Required (route)**: yearly and monthly branches of the progress endpoint stop skipping activity logs when `targetMetric` is `null`. They always query `activity_logs` by `goalId` and default to a "count" sum when no metric is configured. This matches the existing standalone-fallback behavior, applied consistently across all three horizons.

**Optional (form), deferred**: the form's "sessions → null" mapping is a code smell that produces ambiguous goal records. Cleaning it up to write an explicit metric value (e.g., `"count"`) is a follow-up. The route fix alone resolves the user-visible bug for both existing and future goals, so the form cleanup is not on this hotfix.

---

## What we're NOT touching

- The form's metric-to-payload mapping. Deferred to a follow-up cleanup item.
- The "phantom progress" issue from `small-changes-batch-1` Change #1. Different bug, different code path, different decision. The "belt-only" fix there does not apply here because that bug was about cross-activity-type leakage, not metric=null skipping.
- The `goal_session_patterns` table. Unrelated.
- The "monthly target within yearly" UX gap (the user said "25 days per month for the year" but yearly progress sums over the whole year, so the target value is ambiguous). Separate UX question, not this bug.
- The `goalTallies` path. Already works; not in scope.

---

## Decisions made

| Question | Decision |
|---|---|
| Route fix only, form fix only, or both? | **Route fix only.** The route fix solves both existing and future goals (existing goals already have `targetMetric = null` in the DB; the form fix would not help them). Form cleanup is a separate item. |
| Default metric value when `targetMetric` is `null` on the goal? | **"count"** (i.e., count of log rows). Matches the existing standalone-fallback behavior at lines 280-303 and the existing `sumMetricFromLogs("count")` handling at line 55. |
| Should the gate be removed entirely, or kept with a wider condition? | **Removed.** A log can only get `goalId` set via the workout-log form's goal picker. If a user picked a goal, they want the log to count. There is no scenario where a log carries `goalId` and should not contribute. |
| Backfill existing goals to set `targetMetric = "count"` in the DB? | **No.** The route fix handles `null` by defaulting to "count". No migration needed. Cleaner than running a one-off SQL update. |
| Unit test for this change? | **No automated test for the route in this hotfix.** The progress route has zero existing test coverage (verified by `Glob src/**/__tests__`). Adding a test now would require extracting `sumMetricFromLogs` into a helper file and standing up an integration test harness, neither of which fits a hotfix. Manual smoke check is the verification. A test-coverage follow-up is named in Out of Scope. |
| Ship ahead of `role-scheduling-rules-removal` or fold in? | **Ship ahead.** Confirmed by user. The role-scheduling work is paused on the open `sessionsPerWeek` validation question anyway. |

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Removing the gate causes goals with `goalId`-linked logs to over-count when the user intended to track manually only. | Very low. The only way a log gets `goalId` set is the workout-log form's goal picker, which is a deliberate user action. | Low. The user can edit/delete the log if they did not intend the link. | None needed beyond the documentation note. |
| The user's existing two logged sessions advance the goal from 0 to 2 after deploy, surprising them. | Certain. This is the intended fix. | Positive. | Mention in PR body so the user is not surprised. |
| Some scheduler or planning code somewhere else assumes `targetMetric != null` for activity-tracking goals. | Low. The progress endpoint is the only consumer of `targetMetric` I am aware of. | Medium if missed. | `rg "targetMetric"` sweep before commit; verify no other code path gates on it in a way the fix breaks. |

---

## Out of scope (deferred)

- Form cleanup: change "sessions → null" to "sessions → 'count'" in the form's submit handler. Future cleanup; route fix is sufficient.
- Integration tests for `src/app/api/goals/[id]/progress/route.ts`. The route has no test coverage today. Extracting `sumMetricFromLogs` and `getPeriodRange` into a testable helper module is a separate small-change item.
- Documenting the difference between "Sessions" (form label) and `"count"` (internal metric value). Confusing but stable; rename is a separate UX item.
- Activity-type picker improvements on the workout-log form. The picker is already filtering correctly per `small-changes-batch-1` Change #1.

---

## Next steps

1. ~~User confirms scope.~~ Done 2026-05-14.
2. **Draft `spec.md`** (user stories, FRs, acceptance criteria).
3. `plan.md` (per-area edits, verification gates, branching).
4. `tasks.md` (sequential tasks with acceptance).
5. Implement.
