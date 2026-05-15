# Implementation plan: Goal progress ignores activity logs when metric is "Sessions"

**Plan ID**: `goal-progress-sessions-fix`
**Created**: 2026-05-14
**Status**: Draft. Pending user approval before `tasks.md` and implementation.
**Source documents**: `scope.md`, `spec.md`

---

## 1. Strategy

Smallest viable change that resolves the user-visible bug. Two code edits in one file (`src/app/api/goals/[id]/progress/route.ts`), nothing else. No schema, no migration, no form changes, no new tests, no new files.

The two edits are sibling changes: same shape applied to the yearly and monthly branches. Both branches today have a gate of the form `if (goal.activityTypeId != null && metric != null)` around the activity-log query. After the fix, both branches query unconditionally and default the metric to `"count"` when `null`.

This is one PR, one commit set. Hotfix.

---

## 2. Verification gates

| Gate | Command | Pass criterion |
|---|---|---|
| Type check | `npx tsc --noEmit` | Clean, zero errors. The change is two small TypeScript edits inside an existing function. |
| Tests | `npm run test -- --run` | All previously-passing tests still pass. No new tests are added by this hotfix. Existing test count of 116+ must not regress. |
| Lint baseline | `npx eslint src/app/api/goals/\[id\]/progress/route.ts` | No new errors or warnings introduced in this file versus master. |
| Manual smoke | Walk through `spec.md` Success Criteria SC-001, SC-002, SC-003 | All three pass on the deployed Railway URL. |

No new test files are required because the route has no existing test coverage. Adding coverage now would require extracting the helper functions into a separate module, which is scope creep for a hotfix. The test gap is recorded in `scope.md` Out of Scope and will be a separate small-change follow-up.

---

## 3. Branching and PR strategy

| Item | Value |
|---|---|
| Branch | `fix/goal-progress-sessions` |
| Base | `master` |
| Commits planned | Single commit. Docs (scope, spec, plan, tasks) are committed once at branch creation; the code change is the second and final commit. |
| PR title | `fix(goals): yearly/monthly goal progress ignores activity logs when metric is "Sessions"` |
| PR base | `wvanloco-alt:master` |
| Ordering | Ships ahead of `role-scheduling-rules-removal`. That branch can rebase onto master after this lands. |

PR body cites `spec.md` and `scope.md` (both in the diff). The PR description explicitly calls out:

- The user's existing two activity logs on goal 30 will start counting after deploy, advancing the goal from 0 to 2. This is the intended fix, not a side effect. Naming it in the PR body avoids "wait, why did the number change" confusion.
- No tests added. Manual smoke checklist below.
- Form cleanup deferred to follow-up.

---

## 4. Per-area implementation plan

Single area: the progress route. Two edits.

### 4.1 Yearly branch (FR-001, FR-002)

**File**: `src/app/api/goals/[id]/progress/route.ts`

**Current code at lines 138-150**:

```ts
if (goal.activityTypeId != null && metric != null) {
  const logs = await db
    .select({ durationMinutes: activityLogs.durationMinutes, metrics: activityLogs.metrics })
    .from(activityLogs)
    .where(
      and(
        inArray(activityLogs.goalId, allGoalIds),
        gte(activityLogs.date, from),
        lte(activityLogs.date, to)
      )
    );
  current += sumMetricFromLogs(logs, metric);
}
```

**Edit**: remove the conditional; default `metric` to `"count"` when `null`. Resulting shape:

```ts
const logs = await db
  .select({ durationMinutes: activityLogs.durationMinutes, metrics: activityLogs.metrics })
  .from(activityLogs)
  .where(
    and(
      inArray(activityLogs.goalId, allGoalIds),
      gte(activityLogs.date, from),
      lte(activityLogs.date, to)
    )
  );
current += sumMetricFromLogs(logs, metric ?? "count");
```

The `inArray` filter on `goalId` already correctly scopes to this goal and its monthly children. If no logs match (the common case for goals without activity tracking), the query returns zero rows and contributes 0. Removing the gate is therefore safe.

### 4.2 Monthly branch (FR-003)

**File**: `src/app/api/goals/[id]/progress/route.ts`

**Current code at lines 192-204**:

```ts
if (goal.activityTypeId != null && metric != null) {
  const logs = await db
    .select({ durationMinutes: activityLogs.durationMinutes, metrics: activityLogs.metrics })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.goalId, goalId),
        gte(activityLogs.date, from),
        lte(activityLogs.date, to)
      )
    );
  current += sumMetricFromLogs(logs, metric);
}
```

**Edit**: same shape as 4.1, with `eq` instead of `inArray` (monthly goals do not aggregate children):

```ts
const logs = await db
  .select({ durationMinutes: activityLogs.durationMinutes, metrics: activityLogs.metrics })
  .from(activityLogs)
  .where(
    and(
      eq(activityLogs.goalId, goalId),
      gte(activityLogs.date, from),
      lte(activityLogs.date, to)
    )
  );
current += sumMetricFromLogs(logs, metric ?? "count");
```

### 4.3 Standalone branches (FR-004, no change)

The standalone metric-based branch (lines 232-277) is untouched. The standalone session-fallback branch (lines 279-312) is untouched. Both are already correct.

### 4.4 Form (FR-005, no change)

`src/components/goals/goal-form-standalone.tsx:244-247` is untouched in this hotfix.

### 4.5 Final sweep

After the two edits, grep for any other code path that gates on `targetMetric != null` in a way the fix might break. Quick check:

```
rg "targetMetric" src/
```

Confirm the only consumer of the field that gates behavior on `!= null` is the progress route (which this fix updates). Form references, type definitions, and DB writes are not affected.

---

## 5. Risk and rollback

| Area | Risk | Worst case | Mitigation |
|---|---|---|---|
| Route change | Removing the gate causes a goal with logs linked by `goalId` to over-count when the user did not intend the link | A goal's progress jumps unexpectedly | Logs can only get `goalId` set via the workout-log form's picker, which is a deliberate action. The over-count scenario requires a user to have linked a log by accident, which is rare and easily corrected by editing the log. |
| Existing goal jumps | The user's goal 30 goes from 0 to 2 sessions on deploy | Positive surprise, but a surprise | Call out in PR body. |
| Hidden consumer | Some other code path silently relies on `targetMetric != null` as a flag for "metric-based goal" | Latent behavior change | `rg "targetMetric"` sweep before commit (step 4.5). |

### Rollback

If a problem surfaces, `git revert <merge-commit>` restores the previous gate. The route immediately returns to skipping activity logs when `targetMetric` is `null`. No data loss; no migration to undo.

---

## 6. Execution order

Linear sequence:

1. Verify branch state (`fix/goal-progress-sessions` cut from current `master`).
2. Commit the four spec docs as a single docs commit on the branch.
3. Apply edit 4.1 (yearly branch).
4. Apply edit 4.2 (monthly branch).
5. Run `rg "targetMetric" src/` to confirm no other consumer is affected.
6. Run all gates (Section 2): tsc, tests, lint per-file.
7. Commit the code change.
8. Push branch, open PR against `wvanloco-alt:master`.
9. User verifies manually per SC-001, SC-002, SC-003 on the deployed app.

---

## 7. Definition of done

- Two edits applied in `src/app/api/goals/[id]/progress/route.ts`. No other file changed.
- All four verification gates pass.
- PR is merged into `wvanloco-alt:master`.
- The user confirms goal 30 advances from 0 to 2 sessions on the deployed app.
- The user confirms at least one other previously-working goal still shows correct progress.
- PR body honestly names the destructive-ish behavior change (existing goals with `goalId`-linked logs will start counting on deploy).
- The branch is deleted (local and remote).

No master-docs sync is needed for this hotfix. `specs/master/contracts/api-routes.md` documents the progress endpoint's response shape, which is unchanged; the internal aggregation logic is not part of the API contract.
